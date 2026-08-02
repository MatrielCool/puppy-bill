import { registerSW } from 'virtual:pwa-register';

/**
 * 注册 Service Worker（离线能力的来源）。
 *
 * registerType 是 'autoUpdate'：新版本会在下次启动时自动接管。
 * 注意 iOS 上通常需要**冷启动两次**才会切到新版本 —— 第一次下载，第二次激活。
 * 设置页的构建时间可以用来确认到底跑的是哪一版。
 */
export function setupServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(url) {
      console.info('[sw] 已注册', url);
    },
    onRegisterError(error) {
      console.error('[sw] 注册失败', error);
    },
  });
}
