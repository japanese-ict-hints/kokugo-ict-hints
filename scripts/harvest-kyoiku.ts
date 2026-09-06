// 「みんなの教育技術」から、端末活用の記述を持つ国語の指導アイデア記事を拾う。
// 本文は保存せず、事例を書くための材料（学年・教材名・端末活用の節）だけを取り出す。
// 出力は .cache/harvest.json。要約は人（またはClaude）が自作する。link-only。
//
//   node scripts/harvest-kyoiku.ts [--pages 6] [--max 25]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { politeFetch } from './lib/http.ts';
import { links, mainText, title as htmlTitle } from './lib/html.ts';
import { inScope, squash } from './lib/scrub.ts';

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const PAGES = Number(arg('pages') ?? 6);
const MAX = Number(arg('max') ?? 25);
const TAG = 'https://kyoiku.sho.jp/tag/%e5%9b%bd%e8%aa%9e/';
const OUT = '.cache/harvest.json';

/** 端末活用の節の見出し。導入文にも似た語が出るので、節名そのものを狙う。
 *  この節を持たない記事は、ICTの記述が実質ないので事例にしない。 */
const ICT_HEAD = /端末(?:活用|の活用)の位置付け/;

type Item = {
  url: string;
  title: string;
  grade: string | null;
  unit: string;
  ict: string;
  aim: string;
  flow: string;
};

const GRADE = [
  [/小[１1]国語|小学[１1]年/, '小1'], [/小[２2]国語|小学[２2]年/, '小2'],
  [/小[３3]国語|小学[３3]年/, '小3'], [/小[４4]国語|小学[４4]年/, '小4'],
  [/小[５5]国語|小学[５5]年/, '小5'], [/小[６6]国語|小学[６6]年/, '小6'],
  [/中[１1]国語|中学[１1]年/, '中1'], [/中[２2]国語|中学[２2]年/, '中2'],
  [/中[３3]国語|中学[３3]年/, '中3'],
] as const;

const gradeOf = (t: string) => GRADE.find(([re]) => re.test(t))?.[1] ?? null;

/** 題名から教材名を取り出す。「小４国語科「ごんぎつね」全時間の…」の鉤括弧の中 */
const unitOf = (t: string) => {
  const m = /[「『]([^」』]{2,30})[」』]/.exec(t);
  return m ? m[1]! : '';
};

/** 見出しから一定量を切り出す */
function section(text: string, head: RegExp, len = 900): string {
  const i = text.search(head);
  if (i < 0) return '';
  return text.slice(i, i + len).replace(/\s+/g, ' ').trim();
}

const seen: Record<string, string> = {};
try {
  Object.assign(seen, JSON.parse(await readFile('.cache/harvest-seen.json', 'utf8')));
} catch { /* 初回 */ }

// 一覧から記事URLを集める。前回集めた分があれば足す
const found = new Map<string, string>();
try {
  for (const [u, t] of Object.entries(
    JSON.parse(await readFile('.cache/harvest-urls.json', 'utf8')) as Record<string, string>,
  ))
    found.set(u, t);
} catch { /* 初回 */ }

const FROM = Number(arg('from') ?? 1);
for (let i = FROM; i < FROM + PAGES; i++) {
  const res = await politeFetch(i === 1 ? TAG : `${TAG}page/${i}/`);
  if (!res.ok) break;
  for (const l of links(res.body, res.url)) {
    if (!/kyoiku\.sho\.jp\/\d+\//.test(l.href)) continue;
    const t = l.text.replace(/\s+/g, ' ').trim();
    // 端末活用の節を持つのは「指導アイデア」の系列
    if (!/国語/.test(t) || !/指導アイデア/.test(t)) continue;
    if (!found.has(l.href)) found.set(l.href, t);
  }
}
await mkdir('.cache', { recursive: true });
await writeFile('.cache/harvest-urls.json', JSON.stringify(Object.fromEntries(found), null, 2), 'utf8');
console.error(`一覧の累計 ${found.size} 件`);
if (process.argv.includes('--list-only')) process.exit(0);

let items: Item[] = [];
try {
  items = JSON.parse(await readFile(OUT, 'utf8')) as Item[];
} catch { /* 初回 */ }
let n = 0;
for (const [url, listTitle] of found) {
  if (n >= MAX) break;
  if (seen[url]) continue;
  const res = await politeFetch(url);
  if (!res.ok) {
    console.error('  取得できない', url, res.reason);
    continue;
  }
  n++;
  const t = mainText(res.body);
  const title = htmlTitle(res.body);
  if (!inScope(t, title).ok) {
    seen[url] = '範囲外';
    continue;
  }
  const ict = section(squash(t), ICT_HEAD, 1000);
  if (!ict) {
    seen[url] = '端末活用の節がない';
    continue;
  }
  items.push({
    url,
    title: title.replace(/｜.*$/, '').trim(),
    grade: gradeOf(listTitle + ' ' + title),
    unit: unitOf(listTitle) || unitOf(title),
    ict,
    aim: section(squash(t), /単元で身に付けたい資質・能力/, 350),
    flow: section(squash(t), /単元の展開/, 700),
  });
  seen[url] = '取得';
}

await mkdir('.cache', { recursive: true });
await writeFile(OUT, JSON.stringify(items, null, 2), 'utf8');
await writeFile('.cache/harvest-seen.json', JSON.stringify(seen, null, 2), 'utf8');
console.error(`取得 ${n} 件 / 事例の材料 ${items.length} 件 → ${OUT}`);
