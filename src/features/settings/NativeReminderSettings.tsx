import { useState, useSyncExternalStore } from 'react';
import { reminders } from '../../native/reminders';
import type { ReminderController } from '../../native/reminderController';
import type { ReminderPreferences } from '../../native/reminderPlan';
import type { ToastData } from '../../ui/Toast';
import { Icon } from '../../ui/Icon';
import styles from './SettingsScreen.module.css';

export function NativeReminderSettings({ onToast, controller = reminders }: {
  onToast: (toast: ToastData) => void;
  controller?: ReminderController;
}) {
  const status = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [busy, setBusy] = useState(false);
  const preferences = status.preferences;

  const run = async (action: () => Promise<void>, message?: string) => {
    setBusy(true);
    try {
      await action();
      if (message) onToast({ id: Date.now(), text: message });
    } catch (error) {
      onToast({ id: Date.now(), text: error instanceof Error ? error.message : '提醒设置失败，请重试。' });
    } finally {
      setBusy(false);
    }
  };
  const save = (patch: Partial<ReminderPreferences>) => run(() => controller.save(patch));

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>提醒</p>
      <div className={styles.card}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>系统通知</span>
          <span className={styles.value}>
            {status.permission === 'granted' ? '已允许'
              : status.permission === 'denied' ? '未允许'
                : status.permission === 'unknown' ? '检测中' : '开启提醒时授权'}
          </span>
        </div>
        <label className={styles.row}>
          <span className={styles.rowIcon}><Icon name="bell" size={23} /></span>
          <span className={styles.rowMain}>
            <span className={styles.rowLabel}>每日记账提醒</span>
            <span className={styles.rowSub}>每天固定时间，小狗陪你记一笔</span>
          </span>
          <input className={styles.reminderSwitch} type="checkbox" role="switch"
            aria-label="每日记账提醒" checked={preferences.dailyEnabled}
            disabled={busy || !status.ready}
            onChange={(event) => void save({ dailyEnabled: event.target.checked })} />
        </label>
        <label className={styles.row}>
          <span className={styles.rowLabel}>记账提醒时间</span>
          <input className={styles.reminderTime} type="time" aria-label="记账提醒时间"
            value={preferences.dailyTime} disabled={busy || !status.ready}
            onChange={(event) => { if (event.target.value) void save({ dailyTime: event.target.value }); }} />
        </label>
        <label className={styles.row}>
          <span className={styles.rowMain}>
            <span className={styles.rowLabel}>待入账提醒</span>
            <span className={styles.rowSub}>按提醒日期通知，同一天的款项合成一条</span>
          </span>
          <input className={styles.reminderSwitch} type="checkbox" role="switch"
            aria-label="待入账提醒" checked={preferences.pendingEnabled}
            disabled={busy || !status.ready}
            onChange={(event) => void save({ pendingEnabled: event.target.checked })} />
        </label>
        <label className={styles.row}>
          <span className={styles.rowLabel}>待入账提醒时间</span>
          <input className={styles.reminderTime} type="time" aria-label="待入账提醒时间"
            value={preferences.pendingTime} disabled={busy || !status.ready}
            onChange={(event) => { if (event.target.value) void save({ pendingTime: event.target.value }); }} />
        </label>
        <button className={`${styles.row} ${styles.rowBtn}`} disabled={busy || !status.ready}
          onClick={() => void run(controller.test, '已安排，锁屏等待约 10 秒查看通知。')}>
          <span className={styles.rowLabel}>发送测试提醒</span>
          <span className={styles.value}>10 秒后</span>
        </button>
      </div>
      {status.permission === 'denied' && (
        <p className={styles.note}>请在 iPhone「设置 → 通知 → 小狗账单」中允许通知。返回这里会自动更新。</p>
      )}
      {status.permission === 'granted' && preferences.pendingEnabled && (
        <p className={styles.note}>已安排 {status.pendingDays} 个提醒日。
          {status.skippedPast > 0 && `有 ${status.skippedPast} 笔已过提醒时间，请到「待入账」查看或延期。`}
          {status.deferredDays > 0 && `另有 ${status.deferredDays} 个较远的提醒日，将在后续打开 App 时补充安排。`}
        </p>
      )}
      <p className={styles.note}>
        提醒按手机当地时间安排，通知不显示金额和联系人。已过时间的提醒不补发；结清、延期或删除后自动调整。
        通知显示与声音以系统设置和专注模式为准。
      </p>
      {status.error && (
        <div className={styles.banner} role="alert">
          <span className={styles.bannerText}>提醒尚未同步：{status.error}</span>
          <button className={styles.bannerBtn} disabled={busy}
            onClick={() => void run(controller.refresh)}>重试</button>
        </div>
      )}
    </div>
  );
}
