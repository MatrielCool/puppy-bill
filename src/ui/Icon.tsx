import { ICON_PATHS } from './iconPaths.mjs';

export type IconName = keyof typeof ICON_PATHS;

/**
 * 多色扁平图标。
 *
 * 路径来自 iconPaths.mjs（同一份数据也供 scripts/preview-icons.mjs 渲染成图检查）。
 * 配色由图标内部的 .ic-* 类驱动，见 global.css —— 因此深浅色主题会自动跟随。
 *
 * 内容是静态的作者自有字符串，不含任何用户输入，innerHTML 在此是安全的。
 */
export function Icon({
  name,
  size = 28,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      // 兜底到通用图标：分类的 icon 在数据库里是普通字符串，
      // 万一对不上（如旧备份、手改数据），宁可画个标签也不要空白格子
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? ICON_PATHS.other }}
    />
  );
}
