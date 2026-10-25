// Zero-dependency static checks: syntax of every module plus privacy guards that keep
// the prototype memory-only (no network calls, no persistent browser storage).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** @param {string} dir @returns {string[]} */
const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(m?js)$/.test(e.name) ? [join(dir, e.name)] : [],
  );

const all = ['src', 'tests', 'scripts'].flatMap(files);
for (const file of all) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });

const forbidden = [
  /\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/,
  /localStorage/, /sessionStorage/, /indexedDB/, /caches\./, /document\.cookie/,
  /navigator\.serviceWorker/, /\beval\s*\(/, /new Function\s*\(/, /innerHTML/,
];
const problems = [];
for (const file of files('src')) {
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    for (const re of forbidden) if (re.test(line)) problems.push(`${file}:${i + 1}: forbidden ${re}`);
  });
}
const html = readFileSync('index.html', 'utf8');
if (!/connect-src 'none'/.test(html)) problems.push("index.html: CSP must keep connect-src 'none'");
if (/<script(?![^>]*type="module")/.test(html)) problems.push('index.html: only module scripts allowed');
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Lint passed: ${all.length} modules parsed; no network/storage APIs in src/.`);
