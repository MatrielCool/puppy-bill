import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const base = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(base, 'icons.svg'), 'utf8');
const symbols = [...source.matchAll(/<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)];
await mkdir(join(base, 'icons'), { recursive: true });
for (const [, id, viewBox, body] of symbols) {
  await writeFile(join(base, 'icons', `${id}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="48" height="48" color="#414139"><title>${id}</title>${body}</svg>\n`);
}
console.log(`Exported ${symbols.length} original SVG icons.`);
