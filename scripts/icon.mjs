/**
 * 小狗账单图标的唯一来源。
 *
 * scale 控制小狗在画布中的占比：
 *   - 普通图标用 1（铺满，视觉更饱满）
 *   - maskable 图标用 0.72（内容收进内 80% 安全区，被圆形/水滴形遮罩裁切也不会切到脸）
 *
 * 背景必须完全不透明 —— iOS 对 apple-touch-icon 只加圆角遮罩，不合成背景，
 * 任何透明区域都会渲染成黑色。
 */
export function puppySvg(scale = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#FFC183"/>
      <stop offset="1" stop-color="#F09148"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 268) scale(${scale}) translate(-256 -268)">
    <!-- 耳朵（在头后面） -->
    <ellipse cx="136" cy="262" rx="56" ry="96" fill="#A85F2C" transform="rotate(-16 136 262)"/>
    <ellipse cx="376" cy="262" rx="56" ry="96" fill="#A85F2C" transform="rotate(16 376 262)"/>
    <!-- 头 -->
    <ellipse cx="256" cy="252" rx="148" ry="134" fill="#FFE9CE"/>
    <!-- 左眼上的褐色斑块，给小狗一点性格 -->
    <ellipse cx="194" cy="216" rx="56" ry="50" fill="#C9813F" opacity="0.5"/>
    <!-- 眼睛 -->
    <circle cx="198" cy="230" r="21" fill="#3B2A1E"/>
    <circle cx="314" cy="230" r="21" fill="#3B2A1E"/>
    <circle cx="205" cy="223" r="7.5" fill="#FFFFFF"/>
    <circle cx="321" cy="223" r="7.5" fill="#FFFFFF"/>
    <!-- 腮红 -->
    <ellipse cx="146" cy="296" rx="27" ry="16" fill="#FF8E77" opacity="0.35"/>
    <ellipse cx="366" cy="296" rx="27" ry="16" fill="#FF8E77" opacity="0.35"/>
    <!-- 口鼻 -->
    <ellipse cx="256" cy="316" rx="78" ry="57" fill="#FFF8EC"/>
    <!-- 舌头 -->
    <path d="M238 344 h36 a18 18 0 0 1 -36 0 z" fill="#FF8FA3"/>
    <path d="M232 340 h48 v6 a24 20 0 0 1 -48 0 z" fill="#FF8FA3"/>
    <!-- 鼻子 -->
    <ellipse cx="256" cy="296" rx="27" ry="20" fill="#3B2A1E"/>
    <!-- 嘴（w 形） -->
    <path d="M256 316 v10 M256 326 q-20 20 -38 3 M256 326 q20 20 38 3"
          stroke="#3B2A1E" stroke-width="8" stroke-linecap="round" fill="none"/>
  </g>
</svg>`;
}
