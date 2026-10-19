/**
 * 小狗品牌图形的统一几何源，使用 64 × 64 设计网格。
 * 已确认的圆脸版：短垂耳、椭圆眼睛与淡色椭圆口鼻块。
 * 小图保留脸、耳朵与五官；大图增加眼斑、口鼻色块和项圈。
 * 两种细节等级共用轮廓，避免把主屏图标直接缩小后糊成一团。
 */
export const PUPPY_COLORS = {
  'puppy-face': '#fff8e9',
  'puppy-ear': '#b49a7d',
  'puppy-patch': '#e2c8a7',
  'puppy-muzzle': '#f3e9d4',
  'puppy-ink': '#554b40',
  'puppy-collar': '#879b76',
  'puppy-tag': '#d9b866',
};

const ears = `
  <path class="puppy-ear" d="M20.1 18.6C16 14.4 11.2 15.6 7.8 21.2 4.9 26 3.6 32.8 5.8 36.9c1.8 3.5 5.1 3.8 7.8 1.1 3.4-3.4 5.8-9.1 7.1-14.5Z"/>
  <path class="puppy-ear" d="M43.9 18.7c4.3-4.1 9.1-2.7 12.3 2.9 2.8 4.9 4.1 11.2 1.8 15.3-1.9 3.4-5.2 3.6-7.9.8-3.3-3.5-5.6-9.1-6.9-14.5Z"/>`;

const face = `<path class="puppy-face" d="M13.3 26.4C14.5 17 21.7 12 31.7 12c10.4 0 17.8 5.2 19 14.7.4 3.1 2.7 6.7 2.8 10.7.2 10.2-9 16-21.4 16.1C19.5 53.6 10 47.8 10.3 37.6c.1-4.3 2.6-7.9 3-11.2Z"/>`;

function faceArtwork(detailed) {
  const collar = detailed ? `
    <path class="puppy-collar" d="M20.5 49.2c7.2 3.1 15.8 3.1 23-.1l-.7 5.2c-6.7 3.4-14.9 3.5-21.6.1Z"/>
    <circle class="puppy-tag" cx="32" cy="56" r="2.9"/>` : '';
  const details = detailed ? `
    <path class="puppy-patch" stroke="none" d="M17.2 25.8c1.4-4.9 5-8.2 8.3-7.2 3.8 1.2 4.3 6.1 3.4 10.9-.9 5.2-3.7 8.3-7.3 7.6-4.1-.8-5.9-6-4.4-11.3Z"/>
    <path class="puppy-muzzle" stroke="none" d="M20.1 41.3c.1-4.4 5.7-7 11.9-7 6.4 0 12 2.7 12 7.1 0 4.5-5.3 7.1-12 7.1-6.8 0-12-2.8-11.9-7.2Z"/>` : '';
  return `<g stroke="#554b40" stroke-width="${detailed ? 2.1 : 3.6}" stroke-linecap="round" stroke-linejoin="round">
    ${collar}${ears}${face}${details}
    <ellipse class="puppy-ink" stroke="none" cx="24.4" cy="32.7" rx="1.65" ry="1.95"/>
    <ellipse class="puppy-ink" stroke="none" cx="39.2" cy="32.9" rx="1.65" ry="1.95"/>
    <path class="puppy-ink" stroke="none" d="M28.4 38.2c.9-1.4 6.3-1.5 7.2-.1.9 1.4-1.7 3.5-3.5 3.6-1.8.1-4.7-2.1-3.7-3.5Z"/>
    <path d="M32.1 41.1v2.1m0 0c-1.1 1.5-2.5 1.8-4 .8m4-.8c1.1 1.5 2.5 1.7 4 .7" fill="none" stroke-width="${detailed ? 1.65 : 2.5}"/>
  </g>`;
}

function colorize(artwork) {
  return artwork.replace(/class="(puppy-[a-z]+)"/g, (_, name) => `fill="${PUPPY_COLORS[name]}"`);
}

export const PUPPY_ICON = `<g transform="scale(.375)">${colorize(faceArtwork(false))}</g>`;
export const PUPPY_PORTRAIT = `<g transform="translate(0 -.75) scale(.375)">${colorize(faceArtwork(true))}</g>`;

/** 导出为完全自包含的 SVG，不依赖应用 CSS，也供 PWA 图标生成使用。 */
export function puppyStandalone({ detailed = true, background = null, scale = 1 } = {}) {
  const artwork = detailed ? PUPPY_PORTRAIT : PUPPY_ICON;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${background ? `<rect width="24" height="24" fill="${background}"/>` : ''}<g transform="translate(12 12) scale(${scale}) translate(-12 -12)">${artwork}</g></svg>`;
}
