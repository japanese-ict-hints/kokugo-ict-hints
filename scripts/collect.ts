// 収集パイプライン（CLAUDE.md §5.1）。
//
//   node scripts/collect.ts                今週の群を処理する
//   node scripts/collect.ts --group B      群を指定する
//   node scripts/collect.ts --source yamagata-c-ict --limit 3
//   node scripts/collect.ts --no-llm       要約を呼ばず、候補だけ .cache/candidates/ に出す
//
// 書き出しは status: draft。公開の可否は運営者が決める（§5.1 の品質ゲート）。
// ブランチとPRの作成は .github/workflows/weekly.yml が行う。

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { politeFetch, politeFetchBinary, stats } from './lib/http.ts';
import { links, mainText, stripTags, title as htmlTitle } from './lib/html.ts';
import { pdfPages } from './lib/pdf.ts';
import {
  assertClean, findPersonalInfo, inScope, normalizeUrl, scrubPersonalInfo, titleSimilarity, tierOf,
} from './lib/scrub.ts';
import { hasCredentials, summarize, validate, type Summary } from './lib/summarize.ts';

type Source = {
  id: string; name: string; host: string; entry: string; feed?: string;
  license: 'gov-open' | 'link-only' | 'permitted';
  license_basis: string; license_checked: string;
  group: string; status: string; type?: string; note?: string;
};

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const LIMIT = Number(arg('limit') ?? 4);
const MODEL = process.env.COLLECT_MODEL ?? 'claude-opus-5';
const USE_LLM = !flag('no-llm') && hasCredentials();

const SEEN_PATH = '.cache/seen.json';
const CAND_DIR = '.cache/candidates';

type Seen = Record<string, { at: string; result: string }>;

const loadSeen = async (): Promise<Seen> => {
  try {
    return JSON.parse(await readFile(SEEN_PATH, 'utf8')) as Seen;
  } catch {
    return {};
  }
};

/** 週次ローテーション（§5.2）。S1と更新の速いものが入る A は毎週、B/C/D は順番に */
function weeklyGroups(): string[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 86_400_000));
  return ['A', ['B', 'C', 'D'][week % 3]!];
}

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/** 既存の事例。重複判定に使う（§5.1 の8） */
async function existingTips() {
  const dir = 'src/content/tips';
  const out: { slug: string; url: string; title: string; host: string }[] = [];
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.md')) continue;
    const s = await readFile(path.join(dir, f), 'utf8');
    const url = /^\s*url: "(.+)"$/m.exec(s)?.[1] ?? '';
    const title = /^title: "(.+)"$/m.exec(s)?.[1] ?? '';
    let host = '';
    try {
      host = new URL(url).host;
    } catch { /* 空 */ }
    out.push({ slug: f.replace(/\.md$/, ''), url: normalizeUrl(url), title, host });
  }
  return out;
}

/** 収集源から候補URLを集める。RSS があればそれを、なければ entry から1階層（§5.1 の4） */
async function candidateUrls(src: Source): Promise<string[]> {
  if (src.feed) {
    const res = await politeFetch(src.feed);
    if (res.ok) {
      const urls = [...res.body.matchAll(/<link[^>]*>([^<]+)<\/link>|<link[^>]*href="([^"]+)"/g)]
        .map((m) => (m[1] ?? m[2] ?? '').trim())
        .filter((u) => /^https?:/.test(u));
      const uniq = [...new Set(urls)].filter((u) => {
        try {
          return new URL(u).host === src.host;
        } catch {
          return false;
        }
      });
      if (uniq.length > 0) return uniq;
      console.error(`  RSS から記事URLを取れなかった: ${src.feed}`);
    }
  }
  const res = await politeFetch(src.entry);
  if (!res.ok) {
    console.error(`  入口を取得できない: ${src.entry} / ${res.reason}`);
    return [];
  }
  // 事例らしいものを先に見る。全体ナビのリンクを先に食べてしまわないようにする
  const STRONG_HINT = /事例|実践|指導案|授業/;   // 事例そのもの
  const WEAK_HINT = /活用|指導|資料|報告|紀要|研究/; // 周辺の資料
  const scored = links(res.body, res.url)
    .filter((l) => {
      try {
        return new URL(l.href).host === src.host;
      } catch {
        return false;
      }
    })
    .map((l) => ({
      url: l.href.split('#')[0]!,
      score:
        (/\.pdf($|\?)/i.test(l.href) || /\.pdf\s*$/i.test(l.text) ? 4 : 0) +
        (STRONG_HINT.test(l.text) ? 4 : 0) +
        (WEAK_HINT.test(l.text) ? 1 : 0) +
        (l.text.length > 12 ? 1 : 0),
    }))
    .filter((x) => x.url !== res.url && x.score > 0)
    .sort((a, b) => b.score - a.score);
  return [...new Set(scored.map((x) => x.url))];
}

type Candidate = { url: string; label: string; text: string; title: string };

/** 1つのURLから候補を作る。PDFはページごとに分ける（山形の事例集は1ページ1事例だった） */
async function fetchCandidates(url: string): Promise<{ items: Candidate[]; skip?: string }> {
  // 拡張子が無いPDFがある（例: /file/1650）ので、まずHTMLとして取りに行き、
  // 種類が違うと言われたらバイナリとして取り直す
  let asPdf = /\.pdf($|\?)/i.test(url);
  if (!asPdf) {
    const probe = await politeFetch(url);
    if (probe.ok) {
      return {
        items: [
          { url: probe.url, label: 'HTML', text: mainText(probe.body), title: htmlTitle(probe.body) },
        ],
      };
    }
    if (!/application\/pdf|octet-stream/i.test(probe.reason)) {
      return { items: [], skip: probe.reason };
    }
    asPdf = true;
  }
  if (asPdf) {
    const res = await politeFetchBinary(url);
    if (!res.ok) return { items: [], skip: res.reason };
    let pages;
    try {
      pages = await pdfPages(res.bytes);
    } catch (e) {
      return { items: [], skip: `PDFを読めない: ${(e as Error).message}` };
    }
    if (pages.length <= 3) {
      const text = pages.map((p) => p.text).join('\n');
      return { items: [{ url: res.url, label: 'PDF', text, title: '' }] };
    }
    // 長いPDFは事例の集まりであることが多い。国語に触れるページだけを候補にする
    return {
      items: pages
        .filter((p) => inScope(p.text).ok)
        .map((p) => ({ url: `${res.url}#page=${p.page}`, label: `PDF p${p.page}`, text: p.text, title: '' })),
    };
  }
  return { items: [], skip: '扱えない種類' };
}

const yamlStr = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function slugFor(src: Source, url: string, used: Set<string>): string {
  const page = /#page=(\d+)/.exec(url)?.[1];
  const tail = new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'item';
  const base = `${src.id}-${tail.replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]+/gi, '-')}${page ? `-p${page}` : ''}`
    .toLowerCase()
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  let slug = base;
  let n = 2;
  while (used.has(slug)) slug = `${base}-${n++}`;
  used.add(slug);
  return slug;
}

function tipFile(src: Source, url: string, s: Summary, today: string): string {
  const arr = (a: readonly string[]) => `[${a.join(', ')}]`;
  const fm = [
    '---',
    `title: ${yamlStr(s.title)}`,
    `summary: ${yamlStr(s.summary)}`,
    'source:',
    `  url: ${yamlStr(url)}`,
    `  publisher: ${yamlStr(src.name)}`,
    `  region: ${yamlStr(src.host.endsWith('go.jp') ? '国' : '民間')}`,
    '  published: null',
    `  retrieved: ${today}`,
    `  license: ${src.license}`,
    '  verified: fetched',
    `tools: ${arr(s.tools)}`,
    `school: ${arr(s.school)}`,
    'subjects: [japanese]',
    `domains: ${arr(s.domains)}`,
    `scenes: ${arr(s.scenes)}`,
    `effort: ${s.effort}`,
    `grade: ${s.grade ? yamlStr(s.grade) : 'null'}`,
    ...(s.howto.length > 0 ? ['howto:', ...s.howto.map((h) => `  - ${yamlStr(h)}`)] : []),
    'curriculum: []',
    'status: draft',
    `added: ${today}`,
    `note: ${yamlStr(s.note)}`,
    '---',
    '',
    s.summary,
    '',
  ];
  return fm.join('\n');
}

// ---- 本体 ----

const today = new Date().toISOString().slice(0, 10);
const doc = YAML.parse(await readFile('scripts/sources.yml', 'utf8')) as { sources: Source[] };
const groups = arg('group') ? [arg('group')!] : weeklyGroups();
const only = arg('source');

let targets = doc.sources.filter((s) => s.status === 'active');
targets = only ? targets.filter((s) => s.id === only) : targets.filter((s) => groups.includes(s.group));

const stale = targets.filter((s) => daysSince(s.license_checked) > 180);
for (const s of stale) console.error(`× ${s.id}: license_checked が ${daysSince(s.license_checked)} 日前。§2.1 の判定をやり直すまで処理しない`);
targets = targets.filter((s) => daysSince(s.license_checked) <= 180);

console.error(`群 ${groups.join(', ')} / 対象 ${targets.length} ソース / 要約 ${USE_LLM ? MODEL : '呼ばない'}`);

const seen = await loadSeen();
const tips = await existingTips();
const usedSlugs = new Set(tips.map((t) => t.slug));
await mkdir(CAND_DIR, { recursive: true });

const report = { fetched: 0, outOfScope: 0, duplicate: 0, written: 0, candidates: 0, failed: 0 };

for (const src of targets) {
  console.error(`\n■ ${src.id}（${src.license}）`);
  const urls = (await candidateUrls(src)).filter((u) => !seen[normalizeUrl(u)]).slice(0, LIMIT);
  console.error(`  未処理の候補URL ${urls.length} 件`);

  for (const url of urls) {
    const key = normalizeUrl(url);
    const { items, skip } = await fetchCandidates(url);
    if (skip) {
      seen[key] = { at: today, result: `取得せず: ${skip}` };
      console.error(`  - ${url} → ${skip}`);
      continue;
    }
    if (items.length === 0) {
      seen[key] = { at: today, result: '国語の記述が見つからない' };
      report.outOfScope++;
      continue;
    }
    report.fetched++;

    for (const item of items) {
      const scope = inScope(item.text, item.title);
      if (!scope.ok) {
        report.outOfScope++;
        continue;
      }
      // 重複判定（§5.1 の8）。同じ実践が複数サイトに載っていることがある
      const dup = tips.find(
        (t) =>
          t.url === normalizeUrl(item.url) ||
          (item.title && titleSimilarity(t.title, item.title) > 0.6),
      );
      if (dup) {
        if (tierOf(src.host) >= tierOf(dup.host)) {
          seen[normalizeUrl(item.url)] = { at: today, result: `重複（${dup.slug} を残す）` };
          report.duplicate++;
          continue;
        }
      }

      const scrubbed = scrubPersonalInfo(item.text).slice(0, 12_000);
      const found = findPersonalInfo(scrubbed);
      if (found.length > 0) {
        console.error(`  ! 伏せ字が効いていない: ${found.map((f) => f.matched).join(' / ')}`);
        report.failed++;
        continue;
      }

      if (!USE_LLM) {
        const name = slugFor(src, item.url, usedSlugs);
        await writeFile(
          path.join(CAND_DIR, `${name}.json`),
          JSON.stringify({ source: src.id, url: item.url, label: item.label, text: scrubbed }, null, 2),
          'utf8',
        );
        report.candidates++;
        console.error(`  + 候補 ${item.label} ${item.url}`);
        continue;
      }

      try {
        const s = await summarize(scrubbed, MODEL);
        if (s.reject) {
          seen[normalizeUrl(item.url)] = { at: today, result: `対象外: ${s.reject_reason}` };
          report.outOfScope++;
          continue;
        }
        const bad = validate(s);
        if (bad.length > 0) {
          console.error(`  ! 検証に落ちた ${item.url}: ${bad.join(' / ')}`);
          report.failed++;
          continue;
        }
        assertClean(s); // 書き出す直前の関門
        const name = slugFor(src, item.url, usedSlugs);
        await writeFile(`src/content/tips/${name}.md`, tipFile(src, item.url, s, today), 'utf8');
        seen[normalizeUrl(item.url)] = { at: today, result: `書き出した: ${name}` };
        report.written++;
        console.error(`  ✓ ${name}`);
      } catch (e) {
        console.error(`  ! 要約に失敗 ${item.url}: ${(e as Error).message}`);
        report.failed++;
      }
    }
    if (!seen[key]) seen[key] = { at: today, result: '処理済み' };
  }
}

await mkdir('.cache', { recursive: true });
await writeFile(SEEN_PATH, JSON.stringify(seen, null, 2), 'utf8');

console.error('\n--- まとめ ---');
console.error(`取得 ${report.fetched} / 範囲外 ${report.outOfScope} / 重複 ${report.duplicate}`);
console.error(`書き出し ${report.written} / 候補のみ ${report.candidates} / 失敗 ${report.failed}`);
for (const h of stats().hosts) console.error(`  ${h.host}: ${h.fetched} ページ`);
for (const p of stats().paused) console.error(`  停止 ${p.host}: ${p.reason}`);
