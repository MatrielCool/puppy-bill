import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * GitHub Pages 项目页服务于 https://<user>.github.io/<repo>/ 而非域名根。
 * 改仓库名时只改这一行，前后斜杠都不能少。
 *
 * 下面三处必须与它一致，否则 app 能打开但 manifest 会被忽略，
 * iOS 只会创建一个普通书签而不是 Web App（没有独立图标、没有离线）：
 *   1. base
 *   2. manifest 的 start_url 和 scope
 *   3. workbox 的 navigateFallback
 */
const BASE = '/puppy-bill/';

export default defineConfig({
  base: BASE,
  // 注入构建时间，设置页显示它 —— 手机上确认"我到底跑的是不是刚推上去的那一版"
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null, // 在 src/registerSW.ts 里手动注册，以便控制更新时机
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: BASE,
        name: '小狗账单',
        short_name: '小狗账单',
        description: '一只小狗帮你记账',
        lang: 'zh-CN',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF8F0',
        theme_color: '#F5A25D',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: `${BASE}index.html`,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      // Service Worker 只在生产构建里测：npm run build && npm run preview
      devOptions: { enabled: false },
    }),
  ],
});
