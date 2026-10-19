# iOS 本地通知验证版

更新：2026-10-20。路线为现有 React 界面 + Capacitor 8，已生成 `ios/` Xcode 工程。
此版本接入本地通知，账本仍使用 Dexie / IndexedDB；尚未迁移 SQLite，也未完成 iPhone 真机验收。

## 已接入的行为

- 「我的 → 提醒」提供每日记账与待入账两个开关、各自的时间，以及 10 秒测试通知。
- 默认关闭。只有主动开启或测试才请求系统授权，启动、导入和返回前台不主动请求。
- 每日提醒按手机当地日历时间重复，默认 21:00，每天都会提醒，不判断当天是否已记账。
- 待入账按提醒日和选择的时间通知，默认 09:00。同一日未结清款项合成一条，不显示项目名、金额或联系人。
- 已过时间的提醒不补发，保留页面内「该催了」提示；需要再次通知时修改提醒日或使用「7 天后再提醒」。
- 结清、撤销、编辑、延期、软删除、恢复和 JSON 导入都会触发重新核对。部分到账但仍有余额的款项继续提醒。
- 点击每日通知进入记账；点击待入账通知进入待入账列表；点击测试通知进入「我的」。
- 开关和时间通过 Preferences 保存在当前设备，不进入 JSON 账本备份。
- 最多安排最近 62 个待入账提醒日，另留每日和测试通知位置。超过时设置页显示未安排数量，后续打开 App 时补充。
- 返回前台时重新检查系统权限、日期、时区与队列；跨时区后先打开一次 App，让一次性待入账提醒按当地时间重新安排。
- 调度失败会显示错误和重试入口，不影响账本写入；如出现错误，重新同步成功前系统可能仍保留旧提醒。
- 网页/PWA 保留快捷指令说明，不调用原生插件来模拟系统提醒。

## 在 Mac 上安装

1. 在 Mac 的终端获取 iOS 开发分支：

   ```bash
   git clone --branch codex/ios-local-notifications https://github.com/MatrielCool/puppy-bill.git
   cd puppy-bill
   ```

   已有克隆时，在确认本地改动已保存后运行 `git fetch origin` 和 `git switch codex/ios-local-notifications`。当前 `main` 尚未合入这一阶段代码。无需复制 Windows 的 `node_modules/`、`dist/`、`dist-native/` 或 `ios/App/App/public/`。
2. 安装 Node 24、Xcode 26.0 或更新兼容版本。首次启动 Xcode，完成组件安装，在 Xcode 设置中登录自己的 Apple 账号。
3. 在项目目录运行：

   ```bash
   npm ci
   npm run ios:sync
   npm run ios:open
   ```

   已有 `ios/` 工程，不需要再运行 `cap add ios`。使用 Swift Package Manager，首次由 Xcode 下载 Capacitor Swift 依赖，无需 CocoaPods。

4. 在 Xcode 选择 App target → Signing & Capabilities → Automatically manage signing，选择自己的 Team。
5. 当前 Bundle Identifier 是开发占位 `com.puppybill.app`。首次安装前改为自己的唯一标识，并同时修改 `capacitor.config.ts` 和 Xcode target 中的 Bundle Identifier。开始存储数据后保持该标识稳定。
6. 连接、信任 iPhone，在手机按系统提示开启开发者模式；Xcode 选择这台 iPhone，点击 Run。需要时在手机「设置 → 通用 → VPN 与设备管理」信任开发者。
7. 进入「我的 → 提醒」，点击「发送测试提醒」，允许通知，锁屏等约 10 秒。

免费账号可以做这项本地通知验证。免费 Personal Team 描述文件 7 天到期，需要重新构建安装；TestFlight 和 App Store 分发需要付费 Apple Developer Program。这里只用本地通知，**不要添加 Push Notifications capability，也不需要 APNs 密钥或通知服务器**。

首次确定的 Bundle Identifier 和工程签名配置也应记录到开发分支，避免以后换电脑或更新时恢复成占位标识。

## 后续更新到 iPhone

目前采用 GitHub 保存代码、Mac 安装到手机的流程。在 Mac 的同一项目目录、同一开发分支执行：

```bash
git pull --ff-only
npm ci
npm run ios:sync
npm run ios:open
```

然后在 Xcode 选择原来的 iPhone，点击 Run 覆盖安装。若 Git 提示本地改动或分支分叉，先保留并整理改动，不要用 reset/clean 强行覆盖。保持首次安装时确定的 App 标识和 Team，使用测试账本验证覆盖更新后的数据保留。

GitHub 的 `Project checks` 会在 `main`、`codex/**` 推送及面向 `main` 的 PR 上自动运行 lint、测试、网页构建和 `ios:sync`。这是代码与资源检查，尚不生成签名安装包。推送开发分支不会触发现有 Pages 自动发布；更新 Pages 或运行网页开发服务器也不会更新手机里的原生安装包。

真机验收通过后，再接入 Xcode Cloud → TestFlight：首次在 Mac 设置自己的 App 标识、签名、共享 Scheme、App Store Connect App 和 GitHub 访问，并配置云端在 Xcode 构建前安装 Node 24、执行 `npm ci` 与 `npm run ios:sync`，随后构建并分发到自己的内部测试组。当前尚未配置这些云端步骤，不能只连接仓库便假定可打包。

Xcode Cloud / TestFlight 需要 Apple Developer Program；会员包含每月 25 小时 Xcode Cloud 额度，手机可在 TestFlight 开启自动更新，每个构建最多使用 90 天。初期建议每批验收后的改动再触发分发，不必每次修改都装到手机。会员开通、Apple 账号连接及真机步骤仍由用户在自己的设备上完成。

官方说明：[Xcode Cloud](https://developer.apple.com/xcode-cloud/)、[首次配置](https://developer.apple.com/documentation/xcode/configuring-your-first-xcode-cloud-workflow)、[TestFlight 更新和有效期](https://testflight.apple.com/)。

## 真机验收清单（待执行）

使用独立测试账本，保留原网页账本和 JSON 备份。网页与 iOS App 不共享数据库；本轮也尚未将原生文件导入导出列为已验收能力。

1. 首次启动不弹通知授权。首次开启时出现授权，拒绝后开关不误报成功；去系统设置允许后返回 App，状态更新。
2. 测试通知锁屏到达、声音符合系统设置。前台也能显示通知；测试通知点击回到「我的」。
3. 把每日时间设为接下来几分钟，锁屏等待；次日重复。改时间后旧时间不再响，关闭后不再响。
4. 新增今天/未来的测试待入账；同一天两笔合成一条。部分到账后仍提醒，全部结清或删除后取消；撤销结清、恢复、延期后重新安排。
5. 在通知到达前终止 App，等待锁屏通知，点击冷启动进入正确页面。先关闭专注模式验证普通到达，再检查系统通知设置下的表现。
6. 验证权限从系统撤回、时区改变后返回 App 的行为，以及过去日期不会反复补发。
7. 断网冷启动、苹方排版、安全区、键盘遮挡和浅深色模式。
8. 安装覆盖更新后，测试账本和提醒开关保留。JSON 导出并重新导入，核对账目、预算和待入账；不要先删除 App 来更新，删除会移除本地数据。

## 工程入口与验证

| 入口 | 用途 |
| --- | --- |
| `src/native/reminderPlan.ts` | 本地时间计算、同日合并、数量限制和通知点击路由 |
| `src/native/reminderController.ts` | 授权、串行调度、差异取消/新增、失败重试 |
| `src/native/reminders.ts` | 设备设置、账本 liveQuery、前后台与通知点击订阅 |
| `src/features/settings/NativeReminderSettings.tsx` | iOS 提醒设置 |
| `capacitor.config.ts` | App 标识、资源目录、前台通知展示 |
| `ios/App/App/PrivacyInfo.xcprivacy` | Preferences 使用 UserDefaults 的原因声明，已加入 Xcode Resources |
| `scripts/gen-icons.mjs` | 从已确认圆脸小狗生成网页与 iOS 图标、启动图 |

`npm run build` 生成 `dist/`，保留 GitHub Pages 路径和 Service Worker。
`npm run build:ios` 生成 `dist-native/`，使用根路径、停用 PWA 缓存；`npm run ios:sync` 再复制进 iOS 工程。

Windows 已验证：网页构建、iOS 网页资源构建及 Capacitor 同步、lint、99 项单元/集成测试（包含应用级通知订阅与点击导航）。
这些结果**不代表 Xcode 编译、签名或 iPhone 系统通知已通过**。本地设置页的隔离预览仅模拟通知 API。

官方参考：[Capacitor 环境](https://capacitorjs.com/docs/getting-started/environment-setup)、[本地通知](https://capacitorjs.com/docs/apis/local-notifications)、[Preferences 隐私声明](https://capacitorjs.com/docs/apis/preferences)、[Apple 免费账号限制](https://developer.apple.com/help/account/basics/about-your-developer-account)。
