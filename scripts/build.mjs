import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const result = await build({
  absWorkingDir: root,
  entryPoints: ['frontend/echo-cards.js'],
  outfile: 'dist/ha-simply-cards.js',
  bundle: true,
  format: 'esm',
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  metafile: true,
  banner: { js: `console.info(${JSON.stringify(`HA Simply Cards ${manifest.version}`)});` },
});
for (const output of Object.values(result.metafile.outputs)) {
  if (output.imports.length) throw new Error('The release must contain no external module imports.');
}
console.log(`Built dist/ha-simply-cards.js (${manifest.version})`);
