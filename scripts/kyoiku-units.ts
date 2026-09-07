// 「単元から探す」に出す単元を、教育出版の教科書にあるものだけに絞るための表を作る。
// 佐倉市の採択は教育出版なので、他社の教材名だけが並んでも探せない（2026-09-08 運営者の指示）。
//
//   node scripts/kyoiku-units.ts
//
// 教育出版が公開している年間指導計画・評価計画（案）のPDFを読み、
// 事例が持つ単元名がその中に出てくるかで判定する。結果は src/lib/kyoiku-units.ts に書き出す。
// PDFは .cache にだけ置き、リポジトリにも公開物にも含めない（CLAUDE.md §2.2）。

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { politeFetchBinary } from './lib/http.ts';
import { pdfText } from './lib/pdf.ts';

const SHOU = 'https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files';
const CHUU = 'https://www.kyoiku-shuppan.co.jp/textbook/chuu/kokugo/files';

/** いずれも一覧ページから辿って実在を確認した（2026-09-08）。§2.3 */
const PLANS = [
  `${SHOU}/r6kokugo1_nenkeihyouka_2404.pdf`,
  `${SHOU}/r6kokugo2_nenkeihyouka_2404.pdf`,
  `${SHOU}/r6kokugo3_nenkeihyouka_2504.pdf`,
  `${SHOU}/r6kokugo4_nenkeihyouka_2404.pdf`,
  `${SHOU}/r6kokugo5_nenkeihyouka_2404.pdf`,
  `${SHOU}/r6kokugo6_nenkeihyouka_2504.pdf`,
  `${CHUU}/r7kokugo1_nenkeihyouka_2504.pdf`,
  `${CHUU}/r7kokugo2_nenkeihyouka_2504.pdf`,
  `${CHUU}/r7kokugo3_nenkeihyouka_2504.pdf`,
];

/** 語として短く、普通の文にも出てしまう単元名。当たっても採らない */
const FALSE_POSITIVE = new Set(['考える']);

const CACHE = '.cache/kyoshu-toc.json';
let cache: Record<string, string> = {};
try {
  cache = JSON.parse(await readFile(CACHE, 'utf8')) as Record<string, string>;
} catch { /* 初回 */ }

for (const u of PLANS) {
  if (cache[u]) continue;
  const r = await politeFetchBinary(u);
  if (!r.ok) {
    console.error('取得できない', u, r.reason);
    continue;
  }
  cache[u] = (await pdfText(r.bytes)).replace(/\s+/g, '');
  console.error('取得', u.split('/').pop());
}
await mkdir('.cache', { recursive: true });
await writeFile(CACHE, JSON.stringify(cache), 'utf8');

const toc = Object.values(cache).join('').replace(/\s+/g, '');

// 事例が持つ単元名を集める
const dir = 'src/content/tips';
const units = new Set<string>();
for (const name of await readdir(dir)) {
  if (!name.endsWith('.md')) continue;
  const s = await readFile(`${dir}/${name}`, 'utf8');
  if (/^status: archived$/m.test(s)) continue;
  const u = /^unit: "(.*)"$/m.exec(s)?.[1];
  if (u) units.add(u);
}

const hit = [...units]
  .filter((u) => !FALSE_POSITIVE.has(u) && toc.includes(u.replace(/\s+/g, '')))
  .sort();

const out = `// scripts/kyoiku-units.ts が作る。手で書き換えない。
// 教育出版の年間指導計画・評価計画（案）に出てくる単元名だけを残したもの。
// 確認日 2026-09-08。もとにしたPDF:
${PLANS.map((p) => `//   ${p}`).join('\n')}

export const KYOIKU_UNITS: ReadonlySet<string> = new Set([
${hit.map((u) => `  '${u}',`).join('\n')}
]);
`;
await writeFile('src/lib/kyoiku-units.ts', out, 'utf8');
console.error(`単元 ${units.size} 件のうち、教育出版にあるもの ${hit.length} 件を書き出した`);
