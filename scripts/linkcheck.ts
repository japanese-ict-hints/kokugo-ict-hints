// リンク切れ検査（CLAUDE.md §5.4）。
// 公的機関のPDFはURLが変わりやすいので、これは省略しない。
//
//   node scripts/linkcheck.ts            結果を表示する
//   node scripts/linkcheck.ts --md out.md  Issue 本文用の Markdown を書き出す

import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UA } from './lib/http.ts';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { slug: string; url: string; status: number | string; ok: boolean };

const dir = 'src/content/tips';
const rows: Row[] = [];
const lastHit = new Map<string, number>();

for (const f of (await readdir(dir)).filter((f) => f.endsWith('.md'))) {
  const s = await readFile(path.join(dir, f), 'utf8');
  if (/^status: archived$/m.test(s)) continue;
  const url = /^\s*url: "(.+)"$/m.exec(s)?.[1];
  if (!url) continue;
  const slug = f.replace(/\.md$/, '');

  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + 2500 - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());

  try {
    let res = await fetch(url, {
      method: 'HEAD',
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    // HEAD を受け付けないサーバーがあるので、405/501 のときだけ GET で確かめる
    if (res.status === 405 || res.status === 501) {
      await sleep(2500);
      res = await fetch(url, {
        method: 'GET',
        headers: { 'user-agent': UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(30_000),
      });
    }
    rows.push({ slug, url, status: res.status, ok: res.status !== 404 && res.status !== 410 });
  } catch (e) {
    rows.push({ slug, url, status: (e as Error).name, ok: false });
  }
}

const broken = rows.filter((r) => !r.ok);
for (const r of rows) console.log(`${r.ok ? 'OK ' : 'NG '} ${String(r.status).padEnd(5)} ${r.slug}`);
console.log(`\n${rows.length} 件中 ${broken.length} 件が到達できない`);

const md = arg('md');
if (md) {
  const body =
    broken.length === 0
      ? ''
      : [
          '出典のリンクが切れています。差し替えるか、事例を archived にしてください。',
          '',
          '| 事例 | 状態 | URL |',
          '| --- | --- | --- |',
          ...broken.map((r) => `| \`${r.slug}\` | ${r.status} | ${r.url} |`),
          '',
          `検査日: ${new Date().toISOString().slice(0, 10)} / 全 ${rows.length} 件`,
        ].join('\n');
  await writeFile(md, body, 'utf8');
}

process.exitCode = broken.length > 0 ? 1 : 0;
