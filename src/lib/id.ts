/**
 * 生成主键。
 *
 * crypto.randomUUID 需要安全上下文（HTTPS 或 localhost）；GitHub Pages 和本地
 * 预览都满足，但保留降级路径以防万一 —— 主键生成失败会让整个 app 无法记账。
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
