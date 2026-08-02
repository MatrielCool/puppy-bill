/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** 构建时间戳，由 vite.config.ts 的 define 注入。用于确认手机上跑的是不是最新版。 */
declare const __BUILD_TIME__: string;
