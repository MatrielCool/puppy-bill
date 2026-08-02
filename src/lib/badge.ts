/**
 * 图标角标。
 *
 * iOS 16.4+ 支持，但要求已安装到主屏 **且** 已授予通知权限。
 *
 * 重要限制：PWA 只能在运行时调用 setAppBadge。所以角标只能表达
 * "上次关闭 app 时你处于超支状态"，**无法**表达"你今天还没记账"——
 * 后者需要 app 在没被打开的那天运行，而那正是它要解决的问题本身。
 * 这是诚实的做法：角标不会因为你没打开 app 而变得过期误导。
 */

export function badgeSupported(): boolean {
  return 'setAppBadge' in navigator;
}

export async function syncBadge(overCount: number): Promise<void> {
  if (!badgeSupported()) return;
  try {
    if (overCount > 0) await navigator.setAppBadge?.(overCount);
    else await navigator.clearAppBadge?.();
  } catch {
    // 未授予通知权限时会抛错，静默忽略即可
  }
}

/**
 * 请求通知权限。
 *
 * 只能从设置里的显式开关调用 —— 首次启动就弹权限请求是最快拿到永久
 * "拒绝"的方式，那会永久失去角标能力。
 */
export async function requestBadgePermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function badgePermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!badgeSupported() || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
