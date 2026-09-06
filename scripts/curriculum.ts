// 学習指導要領コードの表を取り込む（フェーズ5）。
// 出典: 文部科学省「学習指導要領コードのコード表（全体版）」平成29年告示版
//   小学校【82V11】/ 中学校【83V11】  https://www.mext.go.jp/a_menu/other/data_00002.htm
// mext.go.jp は gov-open。出典を示したうえで利用する。
//
//   node scripts/curriculum.ts     src/lib/curriculum.ts を作り直す

import { writeFile } from 'node:fs/promises';
import { politeFetch } from './lib/http.ts';
import { parseCsv } from './lib/csv.ts';

const TABLES = [
  { school: '小学校', url: 'https://www.mext.go.jp/content/20230901-mxt_syoto01-000013115_53.csv' },
  { school: '中学校', url: 'https://www.mext.go.jp/content/20230901-mxt_syoto01-000013115_37.csv' },
];

// このサイトが扱うのは領域の単位まで。指導事項まで割り当てる材料は事例側にない。
const WANT = /^(〔知識及び技能〕|Ａ\s*話すこと・聞くこと|Ｂ\s*書くこと|Ｃ\s*読むこと)$/;

const codes: Record<string, { label: string; school: string; segment: string }> = {};
const segmentLabel: Record<string, string> = {};

for (const t of TABLES) {
  const res = await politeFetch(t.url);
  if (!res.ok) {
    console.error(`取得できない: ${t.url} / ${res.reason}`);
    process.exit(1);
  }
  const rows = parseCsv(res.body).filter((c) => c[0] === '国語');
  for (const c of rows) {
    const text = (c[2] ?? '').replace(/\s+/g, ' ').trim();
    const code = (c[3] ?? '').trim();
    if (!code) continue;
    // 学年区分の見出し（末尾が 0 だけのもの）
    if (/^\d{5}[A-Z0-9]0{10}$/.test(code) && /学年/.test(text)) {
      segmentLabel[code.slice(0, 6)] = text.replace(/[〔〕]/g, '');
    }
    if (!WANT.test(text)) continue;
    codes[code] = {
      label: text.replace(/^[ＡＢＣ]\s*/, '').replace(/[〔〕]/g, ''),
      school: t.school,
      segment: code.slice(0, 6),
    };
  }
  console.error(`${t.school}: ${rows.length} 行から ${Object.keys(codes).length} 件`);
}

const entries = Object.entries(codes)
  .map(([code, v]) => ({ code, ...v, segmentLabel: segmentLabel[v.segment] ?? '' }))
  .sort((a, b) => a.code.localeCompare(b.code));

const body = `// 自動生成。scripts/curriculum.ts で作り直す。手で編集しない。
// 出典：「学習指導要領コードのコード表（全体版）」（文部科学省）
// （https://www.mext.go.jp/a_menu/other/data_00002.htm）（${new Date().toISOString().slice(0, 10)}に利用）
// 小学校【82V11】・中学校【83V11】（平成29年告示）から、国語の領域の単位だけを抜き出したもの。

export type CurriculumEntry = { code: string; label: string; school: string; segmentLabel: string };

export const CURRICULUM: Record<string, CurriculumEntry> = {
${entries.map((e) => `  '${e.code}': { code: '${e.code}', label: '${e.label}', school: '${e.school}', segmentLabel: '${e.segmentLabel}' },`).join('\n')}
};

export const CURRICULUM_CODES = Object.keys(CURRICULUM);
`;

await writeFile('src/lib/curriculum.ts', body, 'utf8');
console.error(`書き出し: src/lib/curriculum.ts（${entries.length} 件）`);
