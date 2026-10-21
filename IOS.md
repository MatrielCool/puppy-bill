# iOS 本地通知验证版

更新：2026-10-21。路线为现有 React 界面 + Capacitor 8，已生成 `ios/` Xcode 工程。
此版本接入本地通知，账本仍使用 Dexie / IndexedDB；尚未迁移 SQLite，也未完成 iPhone 真机验收。

**当前进度：你已反馈完成下面第 4 步（勾选自动签名并选择 Team），接下来从[第 5 步：设置自己的 App 标识](#step-5)继续。** 以下操作在 Mac 和 iPhone 上进行；按钮保留英文，方便对照 Xcode。

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

### 第 1 步：获取项目

按 `Command + 空格`，搜索「终端」并打开。Mac 上还没有项目时逐行运行：

```bash
cd ~/Documents
git clone --branch codex/ios-local-notifications https://github.com/MatrielCool/puppy-bill.git
cd puppy-bill
```

已有项目就使用原文件夹，不必再克隆。进入项目目录的方法是：终端输入 `cd`，打一个空格，把 Finder 中的项目文件夹拖进终端，再按回车。输入 `ls`，应能看到 `package.json`、`capacitor.config.ts`、`src`、`ios` 和 `IOS.md`；这里指包含这些文件的根目录。

已有克隆需要切换分支时，先保留本地改动，再运行 `git fetch origin` 和 `git switch codex/ios-local-notifications`。当前 `main` 尚未合入这一阶段代码。无需复制 Windows 的 `node_modules/`、`dist/`、`dist-native/` 或 `ios/App/App/public/`。

### 第 2 步：准备 Mac 开发工具

安装 Node.js 24、Xcode 26.0 或更新兼容版本。首次启动 Xcode，按提示完成组件安装。若提示缺少 iOS 平台支持，按界面的 `Get` / 下载按钮安装；组件入口随版本可能叫 `Components` 或 `Platforms`。

登录账号入口：屏幕顶部菜单 `Xcode → Settings… → Apple Accounts`，部分版本叫 `Accounts`。添加自己的 Apple 账号并完成登录。免费账号可以完成本地通知验证。

### 第 3 步：构建资源并打开工程

在第 1 步的项目根目录逐条运行，等上一条完成再执行下一条；出现错误就先处理，不继续往下输入：

```bash
npm ci
npm run ios:sync
npm run ios:open
```

最后一条会打开 Xcode 中的 App 工程。已有 `ios/` 工程，不需要再运行 `cap add ios`。使用 Swift Package Manager，首次由 Xcode 下载 Capacitor Swift 依赖，无需 CocoaPods。

### 第 4 步：选择自动签名和自己的 Team（你已完成）

1. 在 Xcode 按 `Command + 1`，点击最左边文件列表顶部、蓝色项目图标旁的 `App`。
2. 中间的项目设置区域有 `PROJECT` 和 `TARGETS` 两组，选择 **`TARGETS` 下面的 `App`**。
3. 点击顶部 `General` 旁的 **`Signing & Capabilities`**。
4. 勾选 **`Automatically manage signing`**；若弹窗询问是否开启，确认启用。
5. 在 **`Team`** 下拉框选择自己的姓名，免费账号通常显示 `姓名 (Personal Team)`。没有姓名时，回到第 2 步登录账号。

若当前版本显示 `Set Up Signing`，点击它，在弹窗里选择 Team，并按第 5 步设置唯一的 Bundle Identifier。自动签名已选中、Team 已显示自己的名字，就完成了这一项；后续仍需完成实际编译安装。[Apple 真机运行与签名说明](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)。

<a id="step-5"></a>

### 第 5 步：设置自己的 App 标识

`Bundle Identifier` 是系统识别这个 App 的唯一编号。当前源码中的 `com.puppybill.app` 是开发占位，需要在首次安装前换成自己的标识；下面用 `com.matrielcool.puppybill` 演示。可以使用这个格式，不需要为此购买域名；若 Xcode 提示已被占用，再换一个独特的英文昵称或加数字。

**先在 Xcode 中修改：**

1. 保持在 `TARGETS → App → Signing & Capabilities` 页面。
2. 如果上方有 `All / Debug / Release` 切换，先选 `All`。
3. 找到 **`Bundle Identifier`** 输入框，将 `com.puppybill.app` 改为你选定的标识，例如 `com.matrielcool.puppybill`。
4. 点击输入框外，再按 `Command + S` 保存；确认 Team 仍是自己的账号。

**再把项目配置中的标识改成完全相同的值：**

1. 回到 Mac 的终端，确认仍在包含 `package.json` 的项目根目录。
2. 输入下面这条，用 Xcode 打开配置文件：

   ```bash
   open -a Xcode capacitor.config.ts
   ```

3. 找到这一行：

   ```ts
   appId: 'com.puppybill.app',
   ```

4. 把引号里的内容改成刚才的标识。例如：

   ```ts
   appId: 'com.matrielcool.puppybill',
   ```

5. 保留引号和行末逗号，按 `Command + S` 保存，然后回到终端运行：

   ```bash
   npm run ios:sync
   npm run ios:open
   ```

完成标志：Xcode 的 Bundle Identifier 和 `capacitor.config.ts` 的 `appId` 相同，`ios:sync` 成功。`ios:sync` 用来复制资源和配置，不能代替修改 Xcode 里的 App 标识。以后覆盖更新要一直使用这个标识和同一个 Team；改标识会被系统视为另一个 App。标识的含义见 [Apple Bundle Identifier 说明](https://developer.apple.com/documentation/xcode/changing-the-bundle-identifier)。

### 第 6 步：连接并准备 iPhone

1. 用支持数据传输的 USB 数据线连接 iPhone 和 Mac，解锁 iPhone。
2. 手机若弹出「要信任此电脑吗」，点击「信任」，输入手机锁屏密码；Mac 若询问是否允许配件连接，也允许本次连接。
3. 在 Xcode 顶部工具栏找到运行设备的下拉菜单。它在 `App` 这个方案名称附近，可能当前显示 `Any iOS Device` 或一个模拟器名称。点开后选 **你这台真实 iPhone 的名称**。
4. 如果看不到手机，可从设备菜单进入 `Manage Devices…` / `Device Hub`；部分版本入口为 `Window → Devices and Simulators`。按界面提示完成配对，确认手机已解锁、信任电脑。
5. iOS 16 及以上通常还需要开启开发者模式：在 iPhone 打开 **设置 → 隐私与安全性 → 开发者模式**，打开开关并按提示重启。
6. 重启后解锁手机，在确认框中点击开启，并按要求输入锁屏密码。重新连接或保持连接，回到 Xcode 等待设备准备完成。

若找不到「开发者模式」，先完成连接和 Xcode 配对，再查看手机设置；也可以先在 Xcode 选择这台手机运行一次，按提示开启。较早的 iOS 没有这一开关。开发者模式的开启和重启确认见 [Apple 官方步骤](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)。

完成标志：Xcode 能选择你的真实 iPhone，设备没有待解锁或待开启开发者模式的提示。第一次显示 `Preparing…`、下载设备支持文件或解析依赖时，保持联网并等待。

### 第 7 步：安装并启动小狗账单

1. 确认 Xcode 顶部的方案是 **`App`**，运行设备是 **你的 iPhone**。
2. 点击工具栏的三角形 **▶ Run**，或按 **`Command + R`**。
3. 等待 Xcode 下载依赖、编译并安装，第一次通常比后续慢。进度在窗口顶部显示。
4. 如果 Mac 弹出 `codesign` 使用签名密钥的钥匙串提示，确认是本次 Xcode 构建请求后，输入「登录」钥匙串密码并允许；默认情况下它与 Mac 登录密码相同。密码含义见 [Apple 钥匙串说明](https://support.apple.com/en-lamr/guide/keychain-access/kyca2612/mac)。
5. 成功后通常会出现 `Build Succeeded`，并在手机上打开「小狗账单」。只有手机上确实出现并能打开 App，才算安装完成。

如果手机提示「不受信任的开发者」，打开 **设置 → 通用 → VPN 与设备管理**，在开发者 App 项目中选择你自己的账号，按界面提示建立信任，再回到 Xcode 运行或从主屏打开。仅在出现这个提示时处理；没有这个项目也不必主动安装描述文件。此路径可参考 [Apple 的 Personal Team 示例说明](https://developer.apple.com/documentation/swiftui/food-truck-building-a-swiftui-multiplatform-app)。

安装成功后，点击 Xcode 工具栏的方形 **■ Stop** 结束调试，再从 iPhone 主屏点击小狗账单图标打开。之后下面的通知和离线测试都从手机主屏进入。App 不需要 Mac 一直开着，也不需要网页开发服务器一直运行。

### 第 8 步：先发一条 10 秒测试通知

1. 在 iPhone 上打开小狗账单，点底部 **「我的」**，找到 **「提醒」** 区域。
2. 点击 **「发送测试提醒」**。
3. 首次出现系统通知授权时，选择 **「允许」**。
4. 页面提示「已安排，锁屏等待约 10 秒查看通知」后，按手机侧边键锁屏，等待通知。
5. 预期收到标题为 **「小狗来报到啦」** 的通知。点击通知，应打开 App 的「我的」页。

测试按钮不会自动开启每日提醒。若没有收到，先到手机「设置 → 通知 → 小狗账单」检查允许通知、锁屏显示和声音；测试时暂时关闭专注模式，并检查是否被安排进定时摘要。回到 App 检查有无「提醒尚未同步」错误，再重试。

### 第 9 步：验证每日提醒与待入账提醒

**每日记账提醒：** 在「我的 → 提醒」把「记账提醒时间」设为当前时间的 2～3 分钟后，开启「每日记账提醒」，锁屏等待。收到后改回自己日常想用的时间；不想继续每天提醒就关闭开关。

**待入账提醒：** 用一条测试记录检查，不要导入覆盖原来的真实账本。

1. 在「我的 → 提醒」把「待入账提醒时间」设为当前时间的 3～5 分钟后，并开启「待入账提醒」。
2. 进入底部「待入账」，点击新增；「款项内容」填「通知测试」，「项目款」填 `1` 元，报销款可留为 `0`，联系人等可留空。
3. 将 **「提醒我催款」设为今天**，保存。回到「我的」，应显示已安排的提醒日数量。
4. 锁屏等待，预期收到待入账提醒，点击后进入「待入账」列表。
5. 另建一条未来时间的测试提醒，在通知到达前将款项全部结清或删除，检查对应提醒已取消。若同一天还有其他未结清款项，合并通知仍会保留。

操作超过了所选时间，就把提醒时间再向后调整几分钟。已过的时间不会补发。测试完成后，将两类提醒改成日常时间，或关闭不需要的开关。

### 第 10 步：验证独立运行、备份与覆盖更新

首次原生 App 是独立账本，网页/PWA 的数据不会自动出现。先使用少量测试记录验证：

1. 从手机主屏打开 App，记一笔测试账目，再关闭并重新打开，确认仍能看到。
2. 开启飞行模式，关闭 App 后从主屏重新打开，确认可以查看和记账；测试完成后恢复联网。
3. 在「我的」尝试导出 JSON 备份，确认在手机「文件」中真正保存了一份；再用测试账本做一次导入核对。原生导入导出尚未真机验收，若无法保存或选择文件，记录现象并反馈。
4. 保留测试记录，按下文的更新流程再次用 Xcode Run 覆盖安装，确认账目、提醒开关和时间仍在。覆盖安装前保持相同 Bundle Identifier 和 Team，不要先删除 App。

这几项确认后再迁移真实账本。完整的通知授权、结清/撤销等验收项目仍保留在文末。

免费 Personal Team 的安装描述文件在签发后 **7 天到期**，到期需用同一项目、标识和 Team 重新构建安装。TestFlight 和 App Store 分发需要付费 Apple Developer Program。[Apple 免费账号限制](https://developer.apple.com/help/account/basics/about-your-developer-account)。本项目只用本地通知，**不需要添加 Push Notifications capability、APNs 密钥或通知服务器**。

## 常见提示怎么处理

| 看到的情况 | 先做什么 |
| --- | --- |
| Team 下没有自己的名字 | `Xcode → Settings → Apple Accounts` 登录后再选择。 |
| `Bundle Identifier is not available` / 无法注册 App ID | 在第 5 步换一个唯一标识，并同步修改两处。仅首次安装前确定标识；已有账目后先反馈错误再处理。 |
| 提示没有可用设备、无法生成 Provisioning Profile | 先按第 6 步连接并选择真实 iPhone，保持解锁；自动签名下若出现 `Register` / `Try Again`，按提示操作。仍失败时记录具体错误。 |
| iPhone 不在设备列表，或显示未配对 | 检查数据线、手机解锁和信任提示，再进入设备管理完成配对。 |
| `Developer Mode disabled` | 在手机开启开发者模式，重启后再次确认开启，再 Run。 |
| 提示缺少 iOS 平台组件，或系统版本不受支持 | 根据 Xcode 提示下载对应组件；若仍提示不兼容，再核对 Xcode 与手机系统版本。无需为了真机测试随意下载所有模拟器。 |
| `Missing package product` / Swift 包解析失败 | 先在项目根目录确认 `npm ci`、`npm run ios:sync` 成功，再回 Xcode 等待依赖解析；可用 `File → Packages → Resolve Package Versions` 重试。有网络错误时保留具体信息。 |
| `Build Failed` | 按 `Command + 5` 打开错误列表，查看第一条红色错误；反馈时复制完整文字或截图，单独的 `Build Failed` 不足以定位原因。 |
| App 装好了，手机说开发者不受信任 | 按第 7 步在手机设置中信任自己的开发者账号。 |
| 提醒区域仍是网页快捷指令说明 | 确认打开的是本次 Xcode 安装的小狗账单，并从 iOS 开发分支重新同步资源；网页/PWA 不显示原生提醒开关。 |
| 本周能用，几天后 App 打不开 | 免费签名可能已到期；连接 Mac，使用原标识和 Team 再次 Run 覆盖安装。 |

遇到表中步骤不能解决的错误，保留现场，发出问题的步骤编号、Xcode 第一条红字或手机提示；不必删除 App 或重新创建项目。

## 后续更新到 iPhone

目前采用 GitHub 保存代码、Mac 安装到手机的流程。每次功能或设计更新后，在 Mac 的同一项目根目录，先查看当前分支和本地改动：

```bash
git branch --show-current
git status --short
```

当前应为 `codex/ios-local-notifications`。你刚设置的 Team 和 App 标识可能使 `capacitor.config.ts`、`ios/App/App.xcodeproj/project.pbxproj` 出现在改动列表中，这是需要保留的配置。首次安装成功后应把这些配置整理进开发分支，避免换电脑时恢复成占位标识；同步时不要提交签名证书或私钥。

然后逐条执行；任一步报错就停在该步：

```bash
git pull --ff-only
npm ci
npm run ios:sync
npm run ios:open
```

然后在 Xcode 选择原来的 iPhone，按 `Command + R` 覆盖安装。若 Git 提示本地改动会被覆盖或分支分叉，先保留并整理改动，把提示发来处理；不要用 reset/clean 强行覆盖。保持首次安装时确定的 App 标识和 Team，核对原有账目和提醒设置仍在。

只为查看最新版操作说明，可以直接在 Mac 浏览器打开[本分支的 IOS.md](https://github.com/MatrielCool/puppy-bill/blob/codex/ios-local-notifications/IOS.md)，无需重新克隆、重做签名或删除手机 App。

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
