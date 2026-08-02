import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import clsx from 'clsx';
import { db } from '../../db/db';
import { formatBytes, getStorageStatus, requestPersistentStorage } from '../../lib/persist';
import { getSetting, setSetting, SETTING_LAST_BACKUP_AT } from '../../lib/settings';
import { exportCsv, exportJson } from '../backup/exportBackup';
import { importBackup, type ImportMode } from '../backup/importBackup';
import { BackupError } from '../backup/backupSchema';
import { badgePermissionState, requestBadgePermission, syncBadge } from '../../lib/badge';
import { getMonthBudgetView } from '../../db/budgets';
import { currentMonthKey } from '../../lib/dates';
import { ReminderGuide } from './ReminderGuide';
import type { ToastData } from '../../ui/Toast';
import styles from './SettingsScreen.module.css';

const DAY_MS = 24 * 60 * 60 * 1000;

interface StorageInfo {
  standalone: boolean;
  swState: string;
  persisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}

function detectStandalone(): boolean {
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || legacy === true;
}

export function SettingsScreen({ onToast }: { onToast: (toast: ToastData) => void }) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [badgeState, setBadgeState] = useState(badgePermissionState);
  const [guideOpen, setGuideOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importModeRef = useRef<ImportMode>('merge');

  const txCount = useLiveQuery(
    async () => (await db.transactions.toArray()).filter((r) => r.deletedAt === null).length,
    [],
  );

  const refresh = useCallback(async () => {
    const storage = await getStorageStatus();
    const registration = await navigator.serviceWorker?.getRegistration?.();
    setInfo({
      standalone: detectStandalone(),
      swState: registration?.active ? '已激活' : registration ? '安装中' : '未注册',
      persisted: storage.persisted,
      usageBytes: storage.usageBytes,
      quotaBytes: storage.quotaBytes,
    });
    setLastBackupAt(await getSetting<number | null>(SETTING_LAST_BACKUP_AT, null));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleExport = async (kind: 'json' | 'csv') => {
    try {
      const method = kind === 'json' ? await exportJson() : await exportCsv();
      // 只有真的送出去了才算备份过 —— 打开分享面板不算
      if (kind === 'json') {
        await setSetting(SETTING_LAST_BACKUP_AT, Date.now());
        await refresh();
      }
      onToast({
        id: Date.now(),
        text: method === 'share' ? '已导出，记得存到「文件」App' : '已下载备份文件',
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return; // 用户取消
      onToast({ id: Date.now(), text: `导出失败：${(error as Error).message}` });
    }
  };

  const startImport = (mode: ImportMode) => {
    if (mode === 'replace') {
      const ok = window.confirm(
        '覆盖导入会清空当前所有账目，用备份文件的内容替换。\n\n导入前会自动留一份快照，但仍请确认你选的是正确的备份文件。\n\n确定要继续吗？',
      );
      if (!ok) return;
    }
    importModeRef.current = mode;
    fileRef.current?.click();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 清空 value，否则连续选同一个文件不会触发 change
    event.target.value = '';
    if (!file) return;

    try {
      const result = await importBackup(await file.text(), importModeRef.current);
      onToast({
        id: Date.now(),
        text: `导入完成：新增 ${result.added} · 更新 ${result.updated} · 跳过 ${result.skipped}`,
      });
    } catch (error) {
      onToast({
        id: Date.now(),
        text: error instanceof BackupError ? error.message : `导入失败：${(error as Error).message}`,
      });
    }
  };

  const handleBadgeToggle = async () => {
    const granted = await requestBadgePermission();
    setBadgeState(badgePermissionState());
    if (granted) {
      const view = await getMonthBudgetView(currentMonthKey());
      await syncBadge(view.overCount);
      onToast({ id: Date.now(), text: '超支时会在图标上显示数字' });
    } else {
      onToast({
        id: Date.now(),
        text: '未获得权限。可在 iPhone 设置 → 通知 → 小狗账单 中开启',
      });
    }
  };

  const handlePersist = async () => {
    const granted = await requestPersistentStorage();
    await refresh();
    onToast({
      id: Date.now(),
      text: granted ? '存储已锁定，系统不会自动清理' : '系统暂未授予，请多用几次后再试',
    });
  };

  const daysSinceBackup =
    lastBackupAt === null ? null : Math.floor((Date.now() - lastBackupAt) / DAY_MS);
  const needsBackup =
    (txCount ?? 0) > 0 && (lastBackupAt === null || (daysSinceBackup ?? 0) >= (info?.persisted ? 14 : 7));
  const urgent = (daysSinceBackup ?? 0) >= 30 || (lastBackupAt === null && (txCount ?? 0) >= 20);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>我的</h1>

      {needsBackup && (
        <div className={clsx(styles.banner, urgent && styles.bannerUrgent)}>
          <span className={styles.bannerText}>
            {lastBackupAt === null
              ? `你已经记了 ${txCount} 笔，还没备份过。数据只存在这台手机上。`
              : `距上次备份已 ${daysSinceBackup} 天。`}
          </span>
          <button className={styles.bannerBtn} onClick={() => handleExport('json')}>
            备份
          </button>
        </div>
      )}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>备份与恢复</p>
        <div className={styles.card}>
          <button className={clsx(styles.row, styles.rowBtn)} onClick={() => handleExport('json')}>
            <span className={styles.rowMain}>
              <span className={styles.rowLabel}>导出备份</span>
              <span className={styles.rowSub}>
                {lastBackupAt ? `上次 ${daysSinceBackup} 天前` : '从未备份'} · 共 {txCount ?? 0} 笔
              </span>
            </span>
            <span className={styles.chevron}>›</span>
          </button>

          <button className={clsx(styles.row, styles.rowBtn)} onClick={() => handleExport('csv')}>
            <span className={styles.rowMain}>
              <span className={styles.rowLabel}>导出 CSV</span>
              <span className={styles.rowSub}>给 Excel 看，不能用来恢复</span>
            </span>
            <span className={styles.chevron}>›</span>
          </button>

          <button className={clsx(styles.row, styles.rowBtn)} onClick={() => startImport('merge')}>
            <span className={styles.rowMain}>
              <span className={styles.rowLabel}>合并导入</span>
              <span className={styles.rowSub}>只补充和更新，不删除现有账目</span>
            </span>
            <span className={styles.chevron}>›</span>
          </button>

          <button className={clsx(styles.row, styles.rowBtn)} onClick={() => startImport('replace')}>
            <span className={styles.rowMain}>
              <span className={clsx(styles.rowLabel, styles.dangerText)}>覆盖导入</span>
              <span className={styles.rowSub}>清空后用备份替换（导入前自动留快照）</span>
            </span>
            <span className={styles.chevron}>›</span>
          </button>
        </div>
        <p className={styles.note}>
          备份文件请存到「文件」App 的 iCloud 云盘目录，或发给自己 ——
          放在这台手机里的备份救不了这台手机。<strong>没测过恢复的备份不算备份。</strong>
        </p>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>提醒</p>
        <div className={styles.card}>
          <button className={clsx(styles.row, styles.rowBtn)} onClick={() => setGuideOpen(true)}>
            <span className={styles.rowMain}>
              <span className={styles.rowLabel}>设置每日提醒</span>
              <span className={styles.rowSub}>用 iPhone 快捷指令，设置一次即可</span>
            </span>
            <span className={styles.chevron}>›</span>
          </button>

          {badgeState !== 'unsupported' && (
            <button
              className={clsx(styles.row, styles.rowBtn)}
              onClick={handleBadgeToggle}
              disabled={badgeState !== 'default'}
            >
              <span className={styles.rowMain}>
                <span className={styles.rowLabel}>图标显示超支提醒</span>
                <span className={styles.rowSub}>
                  小狗账单不会推送通知（它做不到），权限只用于画角标
                </span>
              </span>
              <span
                className={clsx(
                  styles.value,
                  badgeState === 'granted' && styles.ok,
                  badgeState === 'denied' && styles.bad,
                )}
              >
                {badgeState === 'granted' ? '已开启' : badgeState === 'denied' ? '已拒绝' : '开启'}
              </span>
            </button>
          )}
        </div>
        <p className={styles.note}>
          iOS 不允许网页 App 自己定时弹通知，所以每日提醒要借助系统的「快捷指令」。
          图标角标只反映你上次关闭 app 时的超支状态。
        </p>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>运行状态</p>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>启动方式</span>
            <span className={clsx(styles.value, info?.standalone ? styles.ok : styles.warn)}>
              {info?.standalone ? '主屏 App ✓' : '浏览器标签页'}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>离线支持</span>
            <span className={clsx(styles.value, info?.swState === '已激活' && styles.ok)}>
              {info?.swState ?? '检测中'}
            </span>
          </div>
          <button className={clsx(styles.row, styles.rowBtn)} onClick={handlePersist}>
            <span className={styles.rowMain}>
              <span className={styles.rowLabel}>存储持久化</span>
              <span className={styles.rowSub}>
                {info?.persisted ? '系统不会自动清理数据' : '点击尝试锁定'}
              </span>
            </span>
            <span className={clsx(styles.value, info?.persisted ? styles.ok : styles.warn)}>
              {info?.persisted ? '已锁定 ✓' : '未锁定'}
            </span>
          </button>
          <div className={styles.row}>
            <span className={styles.rowLabel}>存储用量</span>
            <span className={styles.value}>
              {formatBytes(info?.usageBytes ?? null)} / {formatBytes(info?.quotaBytes ?? null)}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>版本</span>
            <span className={styles.value}>{new Date(__BUILD_TIME__).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        className={styles.hiddenInput}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
      />

      {guideOpen && (
        <ReminderGuide
          onClose={() => setGuideOpen(false)}
          onCopy={() => onToast({ id: Date.now(), text: '提醒文案已复制' })}
        />
      )}
    </div>
  );
}
