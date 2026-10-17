import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const hacs = JSON.parse(await readFile(new URL('hacs.json', root), 'utf8'));
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : process.argv[2];
assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
if (tag) assert.equal(tag, `v${manifest.version}`, 'Tag must match the version in package.json.');
assert.equal(hacs.filename, 'ha-simply-cards.js');
assert.equal(hacs.render_readme, true);
assert.ok((await stat(new URL(`dist/${hacs.filename}`, root))).size > 0, 'Build the release first.');
console.log(`Release metadata OK: v${manifest.version}`);
