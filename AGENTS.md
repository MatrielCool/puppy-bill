# 项目接续

开始接续开发时，先读根目录 `HANDOFF.md`，再查看 `git status` 和本次任务涉及的源码。用户后续指令优先于交接中的历史计划。

- 当前视觉基线是柔彩日记；小狗以 `design/soft-journal/reference/user-approved-round.jpg` 中间的圆脸版为准，源码为 `src/ui/puppyArtwork.mjs`。
- 接续时保留任何已有未提交改动，不要重置或覆盖不属于本次任务的内容。
- 本地预览操作会写入该浏览器来源的真实 IndexedDB。验证功能使用隔离环境，不要清空现有账本或导入示例账目覆盖它。
- 用户已确认 Capacitor iOS 本地通知和上传开发分支；接下来先做 Mac / iPhone 验收，进度见 `HANDOFF.md`。其他建议事项不能当成用户已确认的需求。
