/**
 * iconPaths.mjs 的类型声明。
 *
 * 显式列出每个图标名，这样 IconName 是字面量联合类型而不是 string ——
 * 写错图标名在编译期就会报错，而不是在手机上显示成空白格子。
 */
export declare const ICON_COLORS: Record<string, string>;

export declare const ICON_PATHS: Record<
  | 'record'
  | 'list'
  | 'budget'
  | 'profile'
  | 'food'
  | 'transit'
  | 'shopping'
  | 'home'
  | 'fun'
  | 'health'
  | 'study'
  | 'social'
  | 'pet'
  | 'other'
  | 'salary'
  | 'bonus'
  | 'redpacket'
  | 'calendar'
  | 'backspace'
  | 'chevronLeft'
  | 'chevronRight'
  | 'close',
  string
>;
