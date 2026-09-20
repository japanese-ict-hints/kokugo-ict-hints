// 事例の source.published（出典の公開日）を埋める。
//
//   node scripts/fill-published.ts          何が取れるかだけ出す
//   node scripts/fill-published.ts --write  frontmatter を書き換える
//
// 取得日（retrieved）だけでは、その実践が古いのか新しいのか分からない
// （2026-09-21 運営者の指摘）。出典ページに書かれている日付を読み取って入れる。
//
// **推測しない。** ページに日付が書かれていなければ null のままにする。
// 日付の取り出し方はホストごとに決め打ちする。関連記事や広告の日付を拾わないため、
// 記事自身の日付を指している要素だけを見る。

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { politeFetch } from './lib/http.ts';

const DIR = 'src/content/tips';
const WRITE = process.argv.includes('--write');

type Rule = (html: string) => string | null;

const iso = (y: string, m: string, d: string) =>
  `${y}-${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;

/** 記事自身の日付を指している要素だけを見る */
const RULES: Record<string, Rule> = {
  // <time class="p-single__date" datetime="2022-07-15">
  'kyoiku.sho.jp': (h) =>
    /<time[^>]*class="[^"]*p-single__date[^"]*"[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(h)?.[1] ?? null,

  // <meta property="article:published_time" content="2026-09-04T10:00:00+0900">
  'www.mitsumura-tosho.co.jp': (h) =>
    /property="article:published_time"[^>]*content="(\d{4}-\d{2}-\d{2})/.exec(h)?.[1] ??
    /content="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*property="article:published_time"/.exec(h)?.[1] ??
    null,

  // <p class="fs15 tar fNotoM">2026年03月27日</p>
  'tb.sanseido-publ.co.jp': (h) => {
    const m = /class="fs15 tar fNotoM"[^>]*>\s*(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(h);
    return m ? iso(m[1]!, m[2]!, m[3]!) : null;
  },
};

/** ホスト別の決め打ちが無いときに試す、出典が自分で名乗っている日付だけ */
const generic: Rule = (h) =>
  /property="article:published_time"[^>]*content="(\d{4}-\d{2}-\d{2})/.exec(h)?.[1] ??
  /"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/.exec(h)?.[1] ??
  null;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.md')).sort();
let filled = 0;
let already = 0;
let unknown = 0;
const missing: string[] = [];

for (const name of files) {
  const path = `${DIR}/${name}`;
  const src = await readFile(path, 'utf8');
  const url = /^  url: "(.*)"$/m.exec(src)?.[1] ?? '';
  const cur = /^  published: (.*)$/m.exec(src)?.[1] ?? 'null';
  if (!url) continue;
  if (cur.trim() !== 'null') {
    already++;
    continue;
  }
  // PDFは本文から日付を読み取れないことが多い。推測はしないので触らない
  if (/\.pdf(\?|#|$)/i.test(url)) {
    unknown++;
    missing.push(`${name}\tPDF\t${url}`);
    continue;
  }

  const res = await politeFetch(url);
  if (!res.ok) {
    unknown++;
    missing.push(`${name}\t取得できない(${res.reason})\t${url}`);
    continue;
  }
  const host = new URL(url).host;
  const date = (RULES[host] ?? generic)(res.body);
  if (!date) {
    unknown++;
    missing.push(`${name}\t日付の記載なし\t${url}`);
    continue;
  }
  filled++;
  console.log(`${date}  ${name}`);
  if (WRITE) {
    await writeFile(path, src.replace(/^  published: null$/m, `  published: ${date}`), 'utf8');
  }
}

console.error(`\n埋めた ${filled} / もともと有り ${already} / 不明 ${unknown}`);
if (missing.length) {
  console.error('\n-- 不明なもの --');
  missing.forEach((m) => console.error('  ' + m));
}
