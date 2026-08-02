/**
 * 图标路径的唯一来源。
 *
 * 风格：多色扁平填充 —— 圆润厚实的色块，暗色主体配亮色点缀，配合小狗账单的可爱调性。
 * 视框统一 24×24。
 *
 * 配色不写死，走 global.css 里的 .ic-* 类（映射到 tokens.css 的 --ic-* 变量），
 * 这样深浅色主题能自动切换。用 class 而非 fill="var(...)" 是因为后者在
 * SVG 呈现属性里的支持度不如 CSS 类可靠。
 *
 * 用 .mjs 而非 .tsx，是为了让 Icon 组件和 scripts/preview-icons.mjs 共用同一份数据 ——
 * 手写路径极易画歪，而 Windows 上连不了 Safari 调试，必须能渲染成图肉眼检查。
 */

/** @type {Record<string, string>} */
export const ICON_PATHS = {
  // ── 底部标签 ──
  record: [
    '<circle cx="12" cy="12" r="9.6" class="ic-peach"/>',
    '<rect x="10.4" y="5.8" width="3.2" height="12.4" rx="1.6" class="ic-ink"/>',
    '<rect x="5.8" y="10.4" width="12.4" height="3.2" rx="1.6" class="ic-ink"/>',
  ].join(''),
  list: [
    '<rect x="3.4" y="4.2" width="17.2" height="17.4" rx="3.4" class="ic-peach"/>',
    '<rect x="8.4" y="1.8" width="7.2" height="4.6" rx="2.3" class="ic-mint"/>',
    '<rect x="7" y="9.6" width="10" height="2.4" rx="1.2" class="ic-ink"/>',
    '<rect x="7" y="14.2" width="6.6" height="2.4" rx="1.2" class="ic-ink"/>',
  ].join(''),
  budget: [
    '<circle cx="12" cy="12" r="9.8" class="ic-ink"/>',
    '<circle cx="12" cy="12" r="6.4" class="ic-peach"/>',
    '<circle cx="12" cy="12" r="3" class="ic-mint"/>',
  ].join(''),
  profile: [
    // 小狗脸：垂耳在头后，圆脸配大眼和口鼻
    '<ellipse cx="5.2" cy="10.4" rx="3.1" ry="4.6" class="ic-ink" transform="rotate(-16 5.2 10.4)"/>',
    '<ellipse cx="18.8" cy="10.4" rx="3.1" ry="4.6" class="ic-ink" transform="rotate(16 18.8 10.4)"/>',
    '<circle cx="12" cy="12.2" r="7.6" class="ic-peach"/>',
    '<circle cx="9.4" cy="11" r="1.35" class="ic-ink"/>',
    '<circle cx="14.6" cy="11" r="1.35" class="ic-ink"/>',
    '<ellipse cx="12" cy="14.6" rx="2.1" ry="1.55" class="ic-ink"/>',
  ].join(''),

  // ── 支出分类 ──
  food: [
    // 面碗：暗色碗身 + 亮色汤面 + 薄荷热气
    '<path class="ic-mint" d="M9.3 2.6a1.15 1.15 0 0 1 1.6 1.6c-.75.9-.75 1.6 0 2.5a1.15 1.15 0 0 1-1.6 1.6c-1.6-1.8-1.6-3.9 0-5.7Z"/>',
    '<path class="ic-mint" d="M14.3 2.6a1.15 1.15 0 0 1 1.6 1.6c-.75.9-.75 1.6 0 2.5a1.15 1.15 0 0 1-1.6 1.6c-1.6-1.8-1.6-3.9 0-5.7Z"/>',
    '<path class="ic-ink" d="M2.3 10.1h19.4a1.2 1.2 0 0 1 1.2 1.35A11 11 0 0 1 12 21.3 11 11 0 0 1 1.1 11.45 1.2 1.2 0 0 1 2.3 10.1Z"/>',
    '<path class="ic-peach" d="M4.4 12.5h15.2A7.9 7.9 0 0 1 12 18.7a7.9 7.9 0 0 1-7.6-6.2Z"/>',
    '<rect x="4.6" y="21" width="14.8" height="2.3" rx="1.15" class="ic-ink"/>',
  ].join(''),
  transit: [
    // 公交车：车身占满视框，车轮明确探出车底
    '<rect x="2.6" y="2" width="18.8" height="16.4" rx="3.8" class="ic-peach"/>',
    '<rect x="5.4" y="5.2" width="13.2" height="6" rx="2.1" class="ic-ink"/>',
    '<circle cx="7.4" cy="14.9" r="1.8" class="ic-mint"/>',
    '<circle cx="16.6" cy="14.9" r="1.8" class="ic-mint"/>',
    '<rect x="4.8" y="17.4" width="3.8" height="4.6" rx="1.9" class="ic-ink"/>',
    '<rect x="15.4" y="17.4" width="3.8" height="4.6" rx="1.9" class="ic-ink"/>',
  ].join(''),
  shopping: [
    // 购物袋。把手用描边而非实心挖洞（实心块的镂空依赖填充规则，易糊成一坨），
    // 且必须明显窄于袋身 —— 把手一旦和袋子等宽，整体就读成一把挂锁。
    '<path class="ic-ink-stroke" d="M9.4 9.8V6.6a2.6 2.6 0 0 1 5.2 0v3.2"/>',
    '<path class="ic-peach" d="M3.8 8.8h16.4a1.5 1.5 0 0 1 1.49 1.67l-1.05 9.3A2.9 2.9 0 0 1 17.76 22.3H6.24a2.9 2.9 0 0 1-2.88-2.53l-1.05-9.3A1.5 1.5 0 0 1 3.8 8.8Z"/>',
    '<circle cx="12" cy="15.2" r="1.9" class="ic-mint"/>',
  ].join(''),
  home: [
    // 房子：屋顶做成实心三角并出檐，压在墙体上方（细线屋顶显得单薄）
    '<path class="ic-peach" d="M4.6 10.4h14.8v9a2.2 2.2 0 0 1-2.2 2.2H6.8a2.2 2.2 0 0 1-2.2-2.2Z"/>',
    '<path class="ic-ink" d="M11 2.35a1.6 1.6 0 0 1 2 0l9.3 7.15a1.5 1.5 0 0 1-.92 2.7H2.62a1.5 1.5 0 0 1-.92-2.7Z"/>',
    '<rect x="9.8" y="14.6" width="4.4" height="7" rx="2.2" class="ic-mint"/>',
  ].join(''),
  fun: [
    // 游戏手柄
    '<path class="ic-peach" d="M7.6 6.4h8.8a5.6 5.6 0 0 1 5.6 5.6v1.6a3.8 3.8 0 0 1-6.9 2.2l-1-1.5H9.9l-1 1.5A3.8 3.8 0 0 1 2 13.6V12a5.6 5.6 0 0 1 5.6-5.6Z"/>',
    '<rect x="5.8" y="9.9" width="4.4" height="2" rx="1" class="ic-ink"/>',
    '<rect x="7" y="8.7" width="2" height="4.4" rx="1" class="ic-ink"/>',
    '<circle cx="16.3" cy="10.4" r="1.4" class="ic-mint"/>',
    '<circle cx="18.4" cy="12.6" r="1.4" class="ic-ink"/>',
  ].join(''),
  health: [
    // 药箱 + 十字
    '<path class="ic-ink" d="M9.4 2.4h5.2a2.2 2.2 0 0 1 2.2 2.2v2.2h-2.9V5.3H10.1v1.5H7.2V4.6a2.2 2.2 0 0 1 2.2-2.2Z"/>',
    '<rect x="2.4" y="6.4" width="19.2" height="15.2" rx="3.4" class="ic-peach"/>',
    '<rect x="10.4" y="9.9" width="3.2" height="8.2" rx="1.6" class="ic-ink"/>',
    '<rect x="7.9" y="12.4" width="8.2" height="3.2" rx="1.6" class="ic-ink"/>',
  ].join(''),
  study: [
    // 翻开的书：暗色封面 + 亮色书页 + 薄荷书签
    '<path class="ic-ink" d="M3.2 4.1c3.4-.3 6.4.4 8.8 2.2v14.4c-2.4-1.8-5.4-2.5-8.8-2.2a1.3 1.3 0 0 1-1.2-1.3V5.4a1.3 1.3 0 0 1 1.2-1.3Z"/>',
    '<path class="ic-ink" d="M20.8 4.1c-3.4-.3-6.4.4-8.8 2.2v14.4c2.4-1.8 5.4-2.5 8.8-2.2A1.3 1.3 0 0 0 22 17.2V5.4a1.3 1.3 0 0 0-1.2-1.3Z"/>',
    '<path class="ic-peach" d="M4.4 6.5c2.4 0 4.6.6 6.4 1.8v10.3c-1.8-1.2-4-1.8-6.4-1.8Z"/>',
    '<path class="ic-peach" d="M19.6 6.5c-2.4 0-4.6.6-6.4 1.8v10.3c1.8-1.2 4-1.8 6.4-1.8Z"/>',
    '<rect x="16.4" y="2.2" width="2.8" height="6.4" rx="1.4" class="ic-mint"/>',
  ].join(''),
  social: [
    // 礼物盒：蝴蝶结用两个实心椭圆探出盒盖，比描线的结更清楚
    '<ellipse cx="8.5" cy="5.4" rx="3.4" ry="2.7" class="ic-mint"/>',
    '<ellipse cx="15.5" cy="5.4" rx="3.4" ry="2.7" class="ic-mint"/>',
    '<rect x="2.4" y="7.2" width="19.2" height="5" rx="1.7" class="ic-ink"/>',
    '<path class="ic-peach" d="M4.2 12.6h15.6v7.1a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2Z"/>',
    '<rect x="10.4" y="7.2" width="3.2" height="14.5" rx="1.1" class="ic-ink"/>',
  ].join(''),
  pet: [
    // 爪印：暗色脚趾 + 亮色肉垫
    '<ellipse cx="6.1" cy="8.9" rx="2.35" ry="3.05" class="ic-ink" transform="rotate(-18 6.1 8.9)"/>',
    '<ellipse cx="11.1" cy="6.6" rx="2.3" ry="3.15" class="ic-ink"/>',
    '<ellipse cx="16.4" cy="7.7" rx="2.3" ry="3.1" class="ic-ink" transform="rotate(14 16.4 7.7)"/>',
    '<ellipse cx="20.5" cy="12.1" rx="2.1" ry="2.7" class="ic-ink" transform="rotate(30 20.5 12.1)"/>',
    '<path class="ic-peach" d="M11.4 11.9c3.2 0 5.9 2.4 5.9 5.2 0 2.4-1.9 4-4.2 4-.75 0-1.25-.25-1.7-.25s-.95.25-1.7.25c-2.3 0-4.2-1.6-4.2-4 0-2.8 2.7-5.2 5.9-5.2Z"/>',
  ].join(''),
  other: [
    // 标签
    '<path class="ic-peach" d="M10.9 2.6h8.3A2.2 2.2 0 0 1 21.4 4.8v8.3a2.6 2.6 0 0 1-.76 1.84l-6.7 6.7a2.2 2.2 0 0 1-3.11 0l-7.47-7.47a2.2 2.2 0 0 1 0-3.11l6.7-6.7A2.6 2.6 0 0 1 10.9 2.6Z"/>',
    '<circle cx="16.4" cy="7.6" r="2.1" class="ic-ink"/>',
  ].join(''),

  // ── 收入分类 ──
  salary: [
    // 钱包 + 硬币
    '<path class="ic-ink" d="M4.6 3.9h12.2a2.4 2.4 0 0 1 2.4 2.4v2.1H4.6Z"/>',
    '<rect x="1.9" y="7.2" width="20.2" height="14.2" rx="3.4" class="ic-peach"/>',
    '<path class="ic-ink" d="M16.2 11.6h5.9a1.4 1.4 0 0 1 1.4 1.4v2.6a1.4 1.4 0 0 1-1.4 1.4h-5.9a2.7 2.7 0 0 1 0-5.4Z"/>',
    '<circle cx="17.6" cy="14.3" r="1.25" class="ic-butter"/>',
  ].join(''),
  bonus: [
    // 闪光
    '<path class="ic-butter" d="M10.4 2.6a1.15 1.15 0 0 1 2.2 0l1.62 4.72a1.15 1.15 0 0 0 .72.72l4.72 1.62a1.15 1.15 0 0 1 0 2.2l-4.72 1.62a1.15 1.15 0 0 0-.72.72l-1.62 4.72a1.15 1.15 0 0 1-2.2 0L8.78 14.2a1.15 1.15 0 0 0-.72-.72L3.34 11.86a1.15 1.15 0 0 1 0-2.2l4.72-1.62a1.15 1.15 0 0 0 .72-.72Z"/>',
    '<path class="ic-mint" d="M18.5 15.4a.85.85 0 0 1 1.6 0l.5 1.5 1.5.5a.85.85 0 0 1 0 1.6l-1.5.5-.5 1.5a.85.85 0 0 1-1.6 0l-.5-1.5-1.5-.5a.85.85 0 0 1 0-1.6l1.5-.5Z"/>',
  ].join(''),
  redpacket: [
    // 红包
    '<rect x="4.6" y="2.4" width="14.8" height="19.2" rx="3" class="ic-coral"/>',
    '<path class="ic-ink" d="M4.6 5.4a3 3 0 0 1 3-3h8.8a3 3 0 0 1 3 3v.6c-2.9 2.8-5.36 4.2-7.4 4.2S8.5 8.8 5.6 6Z"/>',
    '<circle cx="12" cy="14.6" r="3.1" class="ic-butter"/>',
    '<circle cx="12" cy="14.6" r="1.2" class="ic-ink"/>',
  ].join(''),

  // ── 功能图标（界面构件，保持单色描边）──
  calendar: [
    '<rect x="2.6" y="4.6" width="18.8" height="17" rx="3.4" class="ic-peach"/>',
    '<path class="ic-ink" d="M2.6 8a3.4 3.4 0 0 1 3.4-3.4h12a3.4 3.4 0 0 1 3.4 3.4v2.1H2.6Z"/>',
    '<rect x="6.7" y="1.6" width="2.8" height="5.4" rx="1.4" class="ic-ink"/>',
    '<rect x="14.5" y="1.6" width="2.8" height="5.4" rx="1.4" class="ic-ink"/>',
    '<circle cx="12" cy="15.6" r="2.2" class="ic-mint"/>',
  ].join(''),
  backspace: [
    '<path class="ic-peach" d="M9.1 3.9h10.3a3.4 3.4 0 0 1 3.4 3.4v9.4a3.4 3.4 0 0 1-3.4 3.4H9.1a2.4 2.4 0 0 1-1.77-.78l-5.2-5.7a2.4 2.4 0 0 1 0-3.24l5.2-5.7A2.4 2.4 0 0 1 9.1 3.9Z"/>',
    '<path class="ic-ink" d="M11.9 8.5a1.3 1.3 0 0 1 1.84 0L15.6 10.36l1.86-1.86a1.3 1.3 0 0 1 1.84 1.84L17.44 12.2l1.86 1.86a1.3 1.3 0 0 1-1.84 1.84L15.6 14.04l-1.86 1.86a1.3 1.3 0 0 1-1.84-1.84l1.86-1.86-1.86-1.86a1.3 1.3 0 0 1 0-1.84Z"/>',
  ].join(''),
  chevronLeft:
    '<path class="ic-stroke" d="M14.8 5.4 8.2 12l6.6 6.6"/>',
  chevronRight:
    '<path class="ic-stroke" d="M9.2 5.4 15.8 12l-6.6 6.6"/>',
  close: '<path class="ic-stroke" d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"/>',
};

/** 图标配色，供预览脚本注入内联样式（浏览器里走 global.css 的 .ic-* 类） */
export const ICON_COLORS = {
  'ic-ink': '#4A4440',
  'ic-peach': '#FFC0A4',
  'ic-mint': '#5FD3A8',
  'ic-butter': '#FFD37E',
  'ic-coral': '#FF8E77',
  'ic-paper': '#FFFAF4',
};
