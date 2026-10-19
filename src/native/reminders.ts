import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { liveQuery } from 'dexie';
import { db } from '../db/db';
import { navigate } from '../lib/router';
import { isNativeIOS } from './platform';
import { ReminderController } from './reminderController';
import { reminderRoute } from './reminderPlan';

// 按设备保存，不进入账本备份。导入别人的备份不应替这台手机开启通知。
const PREFERENCES_KEY = 'puppy-bill.local-reminders.v1';

export const reminders = new ReminderController({
  api: LocalNotifications,
  readPreferences: async () => {
    const { value } = await Preferences.get({ key: PREFERENCES_KEY });
    if (!value) return null;
    try { return JSON.parse(value); } catch { return null; }
  },
  writePreferences: (value) => Preferences.set({ key: PREFERENCES_KEY, value: JSON.stringify(value) }),
  readRows: () => db.receivables.toArray(),
});

/** 应用级订阅覆盖新增、结清、撤销、延期、删除和备份导入，不改变账本事务。 */
export function startNativeReminders(): () => void {
  if (!isNativeIOS()) return () => {};
  let disposed = false;
  const refresh = () => {
    if (!disposed) void reminders.refresh().catch(() => { /* 状态由设置页显示 */ });
  };
  const subscription = liveQuery(() => db.receivables.toArray()).subscribe({
    next: refresh,
    error: (error) => reminders.reportError(error),
  });
  const handles = [
    LocalNotifications.addListener('localNotificationActionPerformed', ({ notification, actionId }) => {
      if (disposed || actionId !== 'tap') return;
      const route = reminderRoute(notification);
      if (route) navigate(route);
    }),
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); }),
    LocalNotifications.addListener('localNotificationReceived', refresh),
  ];
  handles.forEach((handle) => { void handle.catch((error) => reminders.reportError(error)); });
  const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    disposed = true;
    subscription.unsubscribe();
    document.removeEventListener('visibilitychange', onVisible);
    handles.forEach((handle) => { void handle.then((h) => h.remove()).catch(() => {}); });
  };
}
