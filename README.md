# 🐶 小狗账单

一只小狗帮你记账。装在 iPhone 主屏、完全离线、数据只存在你自己手机上的记账 PWA。

## 为什么是 PWA 而不是原生 app

在 Windows 上开发 + 免费 Apple ID 的组合下，无法把开发版装到 iPhone（需要 Mac 本地编译或 $99 开发者账号）。
Expo Go 虽然免费，但要求电脑开着 dev server、手机连同一 WiFi —— 而记账恰恰发生在人在外面花钱的时候。

iOS 16.4+ 的主屏 Web App 有独立图标、全屏运行、完全离线、支持角标，零成本。
关键前提已核实：**Safari 的「7 天清除脚本可写存储」不适用于添加到主屏的 Web App**
（[WebKit 官方说明](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)，
并称删除主屏 Web App 的数据属于 "a serious bug"）。

## 开发

```bash
npm install
npm run icons     # 从 scripts/icon.mjs 的 SVG 生成全套图标（首次必跑）
npm run dev       # 开发服务器
```

**Service Worker 只存在于生产构建**，测离线必须用：

```bash
npm run build
npm run preview   # http://localhost:4173/puppy-bill/
```

## 部署

推送到 `main` 即自动部署到 GitHub Pages（见 `.github/workflows/deploy.yml`）。
仓库 Settings → Pages → Source 需设为 **GitHub Actions**。

### ⚠️ base 路径：改仓库名时必须同步

GitHub Pages 项目页服务于 `https://<user>.github.io/<repo>/` 而非域名根。
`vite.config.ts` 顶部的 `BASE` 常量驱动三处，任一不符都会导致
**app 能打开但 manifest 被忽略，iOS 只创建普通书签而非 Web App**：

1. `base`
2. manifest 的 `start_url` 和 `scope`（vite-plugin-pwa **不会**从 `base` 推导）
3. `workbox.navigateFallback`

`index.html` 里的 `apple-touch-icon` 和 `favicon` 链接也是硬编码绝对路径，同样要改。

验证方法：构建后检查 `dist/` 里每个 URL 都带 `/<repo>/` 前缀。

## 装到 iPhone

1. **必须用 Safari**（Chrome、微信内置浏览器都无法添加到主屏）打开部署地址
2. 等 ~3 秒让 Service Worker 注册
3. 分享 → 添加到主屏幕 → iOS 26 上确认「以网页 App 打开」开关为**开**
4. **从主屏图标启动**，进「我的」页确认：启动方式 = 主屏 App、Service Worker = 已激活
5. 开飞行模式冷启动，app 必须仍能打开

### ⚠️ 主屏 App 与 Safari 的数据库是分开的

安装测试时在 Safari 标签页里录入的数据**不会**出现在已安装的 app 里。
**只从主屏图标录入真实数据。**

同理，每日提醒的快捷指令里**绝不能加「打开 URL」动作** —— 那会用 Safari 打开，你会看到一个空账本。

## 技术选型说明

| 选择 | 理由 |
|---|---|
| 自写 40 行哈希路由，不用 react-router | GH Pages 项目页深链 404，`404.html` hack 又与 SW 的 navigateFallback 冲突。且只有 4 个标签页、无嵌套路由，用不上路由库。顺带避开了 react-router 的 RSC CSRF 公告。 |
| `@resvg/resvg-wasm` 生成图标，不用 sharp | 纯 WASM，无原生二进制、无 npm 安装脚本，Windows 与 CI 行为一致。sharp 被 `@vite-pwa/assets-generator` 锁在有 libvips CVE 的旧版本上。 |
| 金额存整数分 | 永不用浮点做钱的运算。 |
| 冗余 `dateKey` / `monthKey` | 月/日视图和预算汇总变成单索引等值查找；手机跨时区时数据仍稳定。 |
| 软删除 `deletedAt` | 换来撤销删除、安全合并导入、误触不丢数据。 |

## Dexie schema 版本规则

1. 已发布的 `version(n)` 块**永不修改**
2. 加字段 → 升版本 + `.upgrade()` 回填默认值
3. 主键**永不变更**
4. `SCHEMA_VERSION` 嵌入每个导出文件；导入时拒绝更新版本的文件、正向迁移旧版本

## 数据安全

数据只存在这台手机的 IndexedDB 里。删除主屏图标、或在 设置→Safari→清除历史记录与网站数据 中清除，**都会导致账本丢失**。

安装后请立刻做一次导出（Phase 2 功能），把文件存到「文件」App 的 iCloud 云盘目录。
**没测过恢复的备份不算备份。**
