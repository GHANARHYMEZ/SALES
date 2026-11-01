// Builds www/ from src/. www/ is the one folder that every version of the app
// (installable web app, Android .apk, Windows .exe) is made from, so the
// interface is identical everywhere.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'www');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=Figtree:wght@400;500;700&display=swap';
const KEEP_SUBSETS = new Set(['latin', 'latin-ext']); // latin-ext includes the cedi sign

// Pull the @font-face blocks we want out of Google's stylesheet.
export function parseFontCss(css) {
  const blocks = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g;
  let m;
  while ((m = re.exec(css))) if (KEEP_SUBSETS.has(m[1])) blocks.push(m[2]);
  return blocks;
}

async function bundleFonts() {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const res = await fetch(FONT_CSS_URL, { headers: { 'User-Agent': ua } });
  if (!res.ok) throw new Error('font css ' + res.status);
  const blocks = parseFontCss(await res.text());
  if (!blocks.length) throw new Error('no font blocks found');
  const dir = join(out, 'fonts');
  mkdirSync(dir, { recursive: true });
  let css = '';
  let n = 0;
  for (const b of blocks) {
    const url = /url\((https:[^)]+)\)/.exec(b)?.[1];
    if (!url) throw new Error('font block without url');
    const r = await fetch(url);
    if (!r.ok) throw new Error('font file ' + r.status);
    const name = `f${++n}-` + url.split('/').pop().replace(/[^\w.-]/g, '');
    writeFileSync(join(dir, name), Buffer.from(await r.arrayBuffer()));
    css += b.replace(url, './' + name) + '\n';
  }
  writeFileSync(join(dir, 'fonts.css'), css);
  const idx = join(out, 'index.html');
  const html = readFileSync(idx, 'utf8');
  const next = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
  if (next === html) throw new Error('font link not found in index.html');
  writeFileSync(idx, next);
  return n;
}

function walk(dir) {
  return readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export async function main() {
  rmSync(out, { recursive: true, force: true });
  cpSync(src, out, { recursive: true });

  if (!process.argv.includes('--no-fonts')) {
    try {
      const n = await bundleFonts();
      console.log(`Fonts bundled for offline use (${n} files).`);
    } catch (e) {
      console.warn('Could not bundle fonts (' + e.message + '). The app will use the online font link and fall back to system fonts when offline.');
    }
  }

  // Service worker: version stamp + list of every file to keep offline.
  const files = walk(out).map(f => relative(out, f).split(sep).join('/')).filter(f => f !== 'sw.js');
  const list = ['./', ...files];
  const version = pkg.version + '-' + Date.now().toString(36);
  const swPath = join(out, 'sw.js');
  writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(list)));
  console.log(`www/ ready: ${files.length} files, version ${version}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
