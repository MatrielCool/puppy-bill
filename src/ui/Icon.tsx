import { ICON_PATHS } from './iconPaths.mjs';
import { PUPPY_PORTRAIT } from './puppyArtwork.mjs';

export type IconName = keyof typeof ICON_PATHS;

/**
 * 柔彩细描边图标。
 *
 * 路径来自 iconPaths.mjs（同一份数据也供 scripts/preview-icons.mjs 渲染成图检查）。
 * 24px 网格、1.6px 圆头描边、单一柔彩填充，配色通过 .ic-* 类跟随主题。
 * 小狗品牌图形独立使用奶油色与灰褐色；40px 以上显示头像细节版。
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
      dangerouslySetInnerHTML={{
        __html: (name === 'profile' || name === 'dog') && size >= 40
          ? PUPPY_PORTRAIT
          : ICON_PATHS[name] ?? ICON_PATHS.other,
      }}
    />
  );
}
