// 1ホストを2階層まで掘って、事例の入口になりそうなページとPDFを一覧にする（CLAUDE.md §3.2 の3）。
// discover.ts はトップページの1階層しか見ないため、深い場所にある事例集を取り逃がす
// （山形の当たりは2階層下だった）。
//
//   node scripts/prospect.ts https://www.example.ed.jp/ [--depth 2] [--max 14]

import { politeFetch } from './lib/http.ts';
import { links, mainText, title } from './lib/html.ts';

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const start = process.argv[2];
if (!start) {
  console.error('使い方: node scripts/prospect.ts <トップURL>');
  process.exit(1);
}
const DEPTH = Number(arg('depth') ?? 2);
const MAX = Number(arg('max') ?? 14);

// 事例そのもの / その周辺 / 掘る価値のある中間ページ
const GOLD = /実践事例|活用事例|事例集|授業実践|指導案|実践報告/;
const OK = /事例|実践|指導資料|研究紀要|紀要|ICT|ＩＣＴ|授業/;
// 掘る先の優先順位。研修・講座の案内は授業の事例ではないので入らない
const WALK_RANK: [RegExp, number][] = [
  [/実践事例|活用事例|事例集|授業実践/, 5],
  [/事例|実践/, 4],
  [/情報教育|ICT|ＩＣＴ|GIGA|一人1台|１人１台/, 3],
  [/調査研究|研究紀要|紀要|刊行物|研究成果|報告書/, 2],
  [/指導資料|指導案|教育資料|授業/, 1],
];
const AVOID = /研修|講座|申込|受講|募集|採用|アクセス|お知らせ一覧|所報|貸出|相談/;
const walkRank = (text: string) => {
  if (AVOID.test(text)) return 0;
  for (const [re, n] of WALK_RANK) if (re.test(text)) return n;
  return 0;
};

const host = new URL(start).host;
const seen = new Set<string>();
const found: { text: string; url: string; kind: string; from: string }[] = [];
let fetched = 0;

let frontier = [start];
for (let depth = 0; depth <= DEPTH && frontier.length > 0 && fetched < MAX; depth++) {
  const next: string[] = [];
  for (const url of frontier) {
    if (fetched >= MAX) break;
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await politeFetch(url);
    if (!res.ok) {
      console.error(`  取得できない ${url} / ${res.reason}`);
      continue;
    }
    fetched++;
    const hasKokugo = /(?<!外)国語/.test(mainText(res.body));
    console.error(`  [${depth}] ${title(res.body).slice(0, 40)} ${hasKokugo ? '★国語あり' : ''}`);

    for (const l of links(res.body, res.url)) {
      let u: URL;
      try {
        u = new URL(l.href);
      } catch {
        continue;
      }
      if (u.host !== host) continue;
      const clean = u.href.split('#')[0]!;
      const isPdf = /\.pdf($|\?)/i.test(clean) || /\.pdf\s*$/i.test(l.text);
      if (isPdf && OK.test(l.text)) {
        found.push({ text: l.text, url: clean, kind: GOLD.test(l.text) ? 'PDF★' : 'PDF', from: res.url });
      } else if (GOLD.test(l.text)) {
        found.push({ text: l.text, url: clean, kind: 'ページ★', from: res.url });
      }
      if (!isPdf && walkRank(l.text) > 0 && !seen.has(clean)) {
        next.push({ url: clean, rank: walkRank(l.text) });
      }
    }
  }
  const best = new Map<string, number>();
  for (const n of next) best.set(n.url, Math.max(best.get(n.url) ?? 0, n.rank));
  frontier = [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([u]) => u)
    .filter((u) => !seen.has(u))
    .slice(0, 6);
}

console.error(`\n取得 ${fetched} ページ / 見つかった入口 ${found.length} 件`);
const seenUrl = new Set<string>();
for (const f of found.sort((a, b) => (b.kind.includes('★') ? 1 : 0) - (a.kind.includes('★') ? 1 : 0))) {
  if (seenUrl.has(f.url)) continue;
  seenUrl.add(f.url);
  console.log(`${f.kind.padEnd(7)} ${JSON.stringify(f.text.slice(0, 52))}\n        ${f.url}`);
}
