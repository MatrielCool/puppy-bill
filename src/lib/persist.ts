/**
 * 请求"持久化存储"，避免系统在磁盘紧张时回收本 app 的 IndexedDB。
 *
 * WebKit 从 Safari 17 起真实支持，且**不需要通知权限**；它的授予启发式明确
 * 包含"是否作为主屏 Web App 打开"—— 所以从主屏图标启动时成功率最高。
 *
 * 必须在一次用户手势之后调用（否则部分浏览器直接拒绝）。
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function getStorageStatus(): Promise<{
  persisted: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}> {
  const persisted = (await navigator.storage?.persisted?.()) ?? false;
  const estimate = await navigator.storage?.estimate?.();
  return {
    persisted,
    usageBytes: estimate?.usage ?? null,
    quotaBytes: estimate?.quota ?? null,
  };
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}
