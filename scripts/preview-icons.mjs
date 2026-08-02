/**
 * 把全部图标渲染成一张对照图，用于肉眼检查手写路径有没有画歪。
 *
 * Windows 上连不了 Safari Web Inspector，浏览器也不一定随时能用，
 * 这个脚本让图标质量随时可验证。
 *
 * 运行：npm run icons:preview  → 输出 scratch/icons-preview.png
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { ICON_PATHS } from '../src/ui/iconPaths.mjs';

await initWasm(
  await readFile(
    fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url)),
  ),
);

const names = Object.keys(ICON_PATHS);
const COLS = 6;
const CELL = 108;
const ICON = 48;
const rows = Math.ceil(names.length / COLS);

const cells = names
  .map((name, i) => {
    const x = (i % COLS) * CELL;
    const y = Math.floor(i / COLS) * CELL;
    const scale = ICON / 24;
    const iconX = x + (CELL - ICON) / 2;
    return `
      <g transform="translate(${iconX} ${y + 22}) scale(${scale})">
        <g fill="none" stroke="#3B2A1E" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
          ${ICON_PATHS[name]}
        </g>
      </g>
      <text x="${x + CELL / 2}" y="${y + CELL - 12}" text-anchor="middle"
            font-family="Segoe UI, sans-serif" font-size="12" fill="#6B5647">${name}</text>`;
  })
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${COLS * CELL}" height="${rows * CELL}">
  <rect width="100%" height="100%" fill="#FFF8F0"/>
  ${cells}
</svg>`;

const outDir = fileURLToPath(new URL('../scratch/', import.meta.url));
await mkdir(outDir, { recursive: true });
const png = new Resvg(svg).render().asPng();
await writeFile(`${outDir}icons-preview.png`, png);
console.log(`✓ ${names.length} 个图标 → scratch/icons-preview.png`);
