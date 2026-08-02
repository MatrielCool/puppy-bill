import { ICON_PATHS } from './iconPaths.mjs';

export type IconName = keyof typeof ICON_PATHS;

/**
 * 扁平线性图标，取代 emoji。
 *
 * 路径来自 iconPaths.mjs（同一份数据也供 scripts/preview-icons.mjs 渲染成图检查）。
 * 内容是静态的作者自有字符串，不含任何用户输入，所以 innerHTML 在此是安全的。
 */
export function Icon({
  name,
  size = 24,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // 兜底到通用图标：分类的 icon 在数据库里是普通字符串，
      // 万一对不上（如旧备份、手改数据），宁可画个标签也不要空白格子
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] ?? ICON_PATHS.other }}
    />
  );
}
