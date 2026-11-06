// Build: src/index.html + src/js/*.js (in file-name order) → dist/index.html, plus vendor libraries and assets.
// Run with `npm run build`. GitHub Actions runs the same script on every push to main and deploys dist/ to GitHub Pages.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import vm from 'node:vm';

const root = dirname(new URL(import.meta.url).pathname), dist = join(root, 'dist');
const sha = (process.env.GITHUB_SHA || (() => { try { return execSync('git rev-parse HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'local'; } })()).slice(0, 7);
const build = `${sha} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`;

rmSync(dist, { recursive: true, force: true }); mkdirSync(join(dist, 'vendor'), { recursive: true });

// 1. app code: one IIFE so nothing leaks to window
const jsDir = join(root, 'src/js');
const parts = readdirSync(jsDir).filter(f => f.endsWith('.js')).sort();
const body = parts.map(f => `/* ===== ${f} ===== */\n${readFileSync(join(jsDir, f), 'utf8')}`).join('\n');
const app = `(() => {\n'use strict';\nwindow.PARK_BUILD = ${JSON.stringify(build)};\nif (!(() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; } })()) { document.getElementById('loading').textContent = '이 브라우저에서는 3D(WebGL)를 쓸 수 없어요. 크롬이나 사파리 최신 버전으로 열어 주세요.'; return; }\n${body}\n})();`;
try { new vm.Script(app, { filename: 'app.js' }); } catch (e) { console.error('Syntax error in app code:\n', e.stack); process.exit(1); }

// 2. vendor libraries from npm (no CDN at runtime)
const vendor = [
  ['node_modules/three/build/three.min.js', 'three.min.js'],
  ['node_modules/three/examples/js/loaders/GLTFLoader.js', 'GLTFLoader.js'],
  ['node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'supabase.js'],
];
const tags = vendor.map(([src, name]) => { const buf = readFileSync(join(root, src)); writeFileSync(join(dist, 'vendor', name), buf); const h = createHash('sha1').update(buf).digest('hex').slice(0, 8); return `<script src="vendor/${name}?v=${h}"></script>`; }).join('\n');

// 3. page
let html = readFileSync(join(root, 'src/index.html'), 'utf8');
html = html.replace('@@BUILD@@', build).replace('<!-- @@VENDOR@@ -->', tags).replace('<!-- @@APP@@ -->', () => `<script>\n${app}\n</script>`);
writeFileSync(join(dist, 'index.html'), html);

// 4. static assets (models etc.)
const copyDir = (from, to) => { if (!existsSync(from)) return; mkdirSync(to, { recursive: true }); for (const f of readdirSync(from)){ const a = join(from, f), b = join(to, f); if (statSync(a).isDirectory()) copyDir(a, b); else copyFileSync(a, b); } };
copyDir(join(root, 'assets'), dist);
writeFileSync(join(dist, '.nojekyll'), '');
writeFileSync(join(dist, '404.html'), html);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`built ${build}: ${parts.length} source files → dist/index.html (${kb(Buffer.byteLength(html))})`);
