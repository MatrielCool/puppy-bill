/**
 * 从 scripts/icon.mjs 生成 public/ 下的全套图标。
 *
 * 用纯 WASM 的 @resvg/resvg-wasm 而非 sharp：无原生二进制、无 npm 安装脚本，
 * 在 Windows 和 CI 里行为一致。
 *
 * 运行：npm run icons
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { puppySvg } from './icon.mjs';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const out = (name) => `${publicDir}${name}`;

// public/ 里的图标全部被 .gitignore 排除，而 git 不跟踪空目录，
// 所以全新 clone（比如 CI）里这个目录根本不存在。
await mkdir(publicDir, { recursive: true });

await initWasm(
  await readFile(
    fileURLToPath(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url)),
  ),
);

/** @type {{name: string, size: number, scale: number}[]} */
const targets = [
  // iOS 主屏图标。必须 180×180 且完全不透明。
  { name: 'apple-touch-icon.png', size: 180, scale: 1 },
  { name: 'pwa-192x192.png', size: 192, scale: 1 },
  { name: 'pwa-512x512.png', size: 512, scale: 1 },
  // maskable：内容收进内 80%，避免被 Android 的圆形/水滴遮罩切到脸
  { name: 'maskable-icon-512x512.png', size: 512, scale: 0.72 },
];

for (const { name, size, scale } of targets) {
  const png = new Resvg(puppySvg(scale), {
    fitTo: { mode: 'width', value: size },
  })
    .render()
    .asPng();
  await writeFile(out(name), png);
  console.log(`✓ ${name}  ${size}×${size}`);
}

await writeFile(out('favicon.svg'), puppySvg(1));
console.log('✓ favicon.svg');
