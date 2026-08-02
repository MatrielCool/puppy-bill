/**
 * 把全部图标渲染成一张对照图，用于肉眼检查手写路径有没有画歪。
 *
 * Windows 上连不了 Safari Web Inspector，这个脚本让图标质量随时可验证。
 * 配色从 iconPaths.mjs 导入后注入为内联 <style>，与浏览器里 global.css 的取值一致。
 *
 * 运行：npm run icons:preview  → 输出 scratch/icons-preview.png
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { ICON_COLORS, ICON_PATHS } from '../src/ui/iconPaths.mjs';

await initWasm(
  await readFile(
    fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url)),
  ),
);

const names = Object.keys(ICON_PATHS);
const COLS = 6;
const CELL = 124;
const ICON = 66;
const rows = Math.ceil(names.length / COLS);

const strokeBase = 'fill:none;stroke-linecap:round;stroke-linejoin:round';
const css = [
  ...Object.entries(ICON_COLORS).map(([cls, color]) => `.${cls}{fill:${color}}`),
  `.ic-stroke{${strokeBase};stroke:${ICON_COLORS['ic-ink']};stroke-width:2.2}`,
  `.ic-ink-stroke{${strokeBase};stroke:${ICON_COLORS['ic-ink']};stroke-width:2.4}`,
].join('');

const cells = names
  .map((name, i) => {
    const x = (i % COLS) * CELL;
    const y = Math.floor(i / COLS) * CELL;
    const scale = ICON / 24;
    return `
      <g transform="translate(${x + (CELL - ICON) / 2} ${y + 20}) scale(${scale})">
        ${ICON_PATHS[name]}
      </g>
      <text x="${x + CELL / 2}" y="${y + CELL - 12}" text-anchor="middle"
            font-family="Segoe UI, sans-serif" font-size="12" fill="#6B5647">${name}</text>`;
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}">
  <style>${css}</style>
  <rect width="100%" height="100%" fill="#FFF8F0"/>
  ${cells}
</svg>`;

const outDir = fileURLToPath(new URL('../scratch/', import.meta.url));
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}icons-preview.png`, new Resvg(svg).render().asPng());
console.log(`✓ ${names.length} 个图标 → scratch/icons-preview.png`);
