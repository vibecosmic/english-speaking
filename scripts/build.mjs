// Zero-dependency build: copy the static app into dist/ after a clean.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = `${root}dist`;
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(`${root}index.html`, `${dist}/index.html`);
cpSync(`${root}src`, `${dist}/src`, { recursive: true });
console.log('Built static app into dist/ (no bundling, no network access).');
