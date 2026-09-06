import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { politeFetch } from '../lib/http.ts';
import { mainText, title } from '../lib/html.ts';
import { squash } from '../lib/scrub.ts';
const OUT = '.cache/mitsumura.json';
let out = [];
try { out = JSON.parse(await readFile(OUT, 'utf8')); } catch {}
const done = new Set(out.map((x) => x.url));
for (const n of process.argv.slice(2)) {
  const u = `https://www.mitsumura-tosho.co.jp/webmaga/jugyou/shokoku-jugyodukuri-idea/${n}`;
  if (done.has(u)) continue;
  const r = await politeFetch(u);
  if (!r.ok) { console.error('×', n, r.reason); continue; }
  const t = squash(mainText(r.body)).split(/この記事をシェア|【関連記事】|関連記事一覧|この記事のタグ/)[0];
  out.push({ url: u, title: title(r.body).replace(/｜.*$/, '').trim(), text: t });
  console.error('○', n, t.length + '字');
}
await mkdir('.cache', { recursive: true });
await writeFile(OUT, JSON.stringify(out, null, 1), 'utf8');
