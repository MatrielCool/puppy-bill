import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { formatBytes, getStorageStatus, requestPersistentStorage } from '../../lib/persist';
import styles from './StatusPanel.module.css';

/**
 * Phase 0 的核心交付物：在手机上肉眼确认整条管线是否真的通了。
 *
 * 之所以必须做成 app 内的页面而不是靠开发者工具：Windows 上无法连接
 * Safari Web Inspector，手机上出问题时这里是唯一的观测窗口。
 */

type Tone = 'ok' | 'bad' | 'warn' | undefined;

interface Status {
  standalone: boolean;
  swState: string;
  persisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
  online: boolean;
}

function detectStandalone(): boolean {
  // iOS 16.4+ 支持 display-mode 媒体查询；更老的 iOS 只有私有的 navigator.standalone
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia('(display-mode: standalone)').matches || legacy === true;
}

async function readStatus(): Promise<Status> {
  const storage = await getStorageStatus();
  const registration = await navigator.serviceWorker?.getRegistration?.();
  const swState = registration?.active
    ? '已激活'
    : registration?.installing
      ? '安装中'
      : registration?.waiting
        ? '等待接管'
        : '未注册';

  return {
    standalone: detectStandalone(),
    swState,
    persisted: storage.persisted,
    usageBytes: storage.usageBytes,
    quotaBytes: storage.quotaBytes,
    online: navigator.onLine,
  };
}

export function StatusPanel() {
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(() => {
    void readStatus().then(setStatus);
  }, []);

  useEffect(refresh, [refresh]);

  const handlePersist = async () => {
    await requestPersistentStorage();
    refresh();
  };

  const handleCopy = async () => {
    const report = [
      `构建时间: ${__BUILD_TIME__}`,
      `UA: ${navigator.userAgent}`,
      `standalone: ${status?.standalone}`,
      `serviceWorker: ${status?.swState}`,
      `persisted: ${status?.persisted}`,
      `usage: ${formatBytes(status?.usageBytes ?? null)} / ${formatBytes(status?.quotaBytes ?? null)}`,
      `online: ${status?.online}`,
    ].join('\n');
    await navigator.clipboard.writeText(report);
    alert('诊断信息已复制');
  };

  const rows: { key: string; value: string; tone: Tone }[] = status
    ? [
        {
          key: '启动方式',
          value: status.standalone ? '主屏 App ✓' : '浏览器标签页',
          tone: status.standalone ? 'ok' : 'warn',
        },
        {
          key: 'Service Worker',
          value: status.swState,
          tone: status.swState === '已激活' ? 'ok' : 'warn',
        },
        {
          key: '存储持久化',
          value: status.persisted ? '已锁定 ✓' : '未锁定',
          tone: status.persisted ? 'ok' : 'warn',
        },
        {
          key: '存储用量',
          value: `${formatBytes(status.usageBytes)} / ${formatBytes(status.quotaBytes)}`,
          tone: undefined,
        },
        {
          key: '网络',
          value: status.online ? '在线' : '离线',
          tone: status.online ? undefined : 'ok',
        },
        { key: '构建时间', value: new Date(__BUILD_TIME__).toLocaleString('zh-CN'), tone: undefined },
      ]
    : [];

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>运行状态</h1>
      <p className={styles.hint}>
        用来确认 app 是否真的以主屏 Web App 的方式在跑。
        「启动方式」必须是「主屏 App」，「Service Worker」必须是「已激活」，
        否则离线打不开。
      </p>

      <div className={styles.card}>
        {rows.map(({ key, value, tone }) => (
          <div key={key} className={styles.row}>
            <span className={styles.key}>{key}</span>
            <span className={clsx(styles.value, tone && styles[tone])}>{value}</span>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.btn} onClick={handlePersist}>
          锁定存储
        </button>
        <button className={clsx(styles.btn, styles.btnGhost)} onClick={handleCopy}>
          复制诊断
        </button>
      </div>
    </div>
  );
}
