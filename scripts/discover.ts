// 収集源を見つける（CLAUDE.md §3.2）。
// リンク集をたどって都道府県の教育センター等のホストを拾い、ライセンスを判定し、
// 事例の入口になりそうなページを探して scripts/discovered.yml に書き出す。
//
//   node scripts/discover.ts            10ホストまで
//   node scripts/discover.ts --limit 3  ホスト数を絞る
//
// sources.yml へは自動で追記しない。運営者が discovered.yml を見て移す。

import { readFile, writeFile } from 'node:fs/promises';
import { politeFetch, stats, pausedHosts } from './lib/http.ts';
import { links, feeds, title } from './lib/html.ts';
import { checkLicense, type Verdict } from './license-check.ts';

import { PREFECTURES, prefectureOf } from './lib/prefectures.ts';

/** 教育センター・教育研究所らしいリンクか */
const CENTER_HINT = /教育センター|総合教育センター|教育研究所|教育研修|教育総合センター|研修センター|教育庁|教育委員会/;

/** 事例・指導資料の入口らしいリンクか（§3.2 の3） */
const ENTRY_HINT = /実践事例|活用事例|事例集|事例|指導資料|指導案|研究紀要|紀要|研究報告|ICT活用|ＩＣＴ活用|授業改善|授業づくり|教育情報|研究成果/;

/** 起点の中で、さらに1階層たどる価値のあるリンク */
const INDEX_HINT = /リンク集|リンク|一覧|加盟機関|教育委員会|教育センター/;

/** 教育行政のホストらしいか。連合会のリンク集はアンカー文字がURLそのものなので、これが要る */
const EDU_HOST = /(^|\.)ed\.jp$|(^|\.)pref\.[a-z]+\.lg\.jp$|kyoiku|kyouiku|edu|center|c\.ed\.jp/;

/** リンク集そのものや、明らかに対象外のホスト */
const SKIP_HOSTS = new Set([
  'www.mext.go.jp','mext.go.jp','schit.net','www.kyoi-ren.gr.jp','kyoi-ren.gr.jp',
  'www.nise.go.jp','nise.go.jp','www.nier.go.jp','nier.go.jp','www.facebook.com','twitter.com',
  'x.com','www.youtube.com','youtu.be','www.google.com','line.me','www.instagram.com',
  'minkyouren.jp','www.shochokyo.jp','shochokyo.jp',
]);

type Candidate = { host: string; url: string; text: string; prefecture: string | null };

/** 起点ページと、その中のリンク集ページ1階層から候補を集める */
async function collectCandidates(starts: string[]): Promise<Candidate[]> {
  const byHost = new Map<string, Candidate>();
  const visited = new Set<string>();

  const harvest = (html: string, base: string) => {
    let n = 0;
    for (const l of links(html, base)) {
      let u: URL;
      try {
        u = new URL(l.href);
      } catch {
        continue;
      }
      if (u.protocol !== 'https:' && u.protocol !== 'http:') continue;
      const host = u.host;
      if (SKIP_HOSTS.has(host)) continue;
      const byText = CENTER_HINT.test(l.text);
      const byHostPattern = EDU_HOST.test(host);
      if (!byText && !byHostPattern) continue;
      const pref = prefectureOf(l.text, l.href);
      if (!byText && !pref) continue; // ホスト名だけが根拠なら、県が分からないものは採らない
      const existing = byHost.get(host);
      const better =
        !existing ||
        (!/教育委員会/.test(l.text) && /教育委員会/.test(existing.text)) ||
        (!existing.prefecture && pref !== null);
      if (better) byHost.set(host, { host, url: u.origin + u.pathname, text: l.text, prefecture: pref });
      n++;
    }
    return n;
  };

  for (const start of starts) {
    const res = await politeFetch(start);
    if (!res.ok) {
      console.error('  起点を取得できない:', start, '/', res.reason);
      continue;
    }
    visited.add(res.url);
    const n = harvest(res.body, res.url);
    console.error(`  ${start} → 候補 ${n} 件`);

    // 起点が入口だけの場合があるので、リンク集らしいページを1階層だけたどる
    const sub = links(res.body, res.url)
      .filter((l) => {
        try {
          return new URL(l.href).host === new URL(res.url).host;
        } catch {
          return false;
        }
      })
      .filter((l) => INDEX_HINT.test(l.text))
      .map((l) => l.href.split('#')[0]!)
      .filter((u) => !visited.has(u))
      .slice(0, 3);

    for (const u of sub) {
      visited.add(u);
      const r2 = await politeFetch(u);
      if (!r2.ok) continue;
      const n2 = harvest(r2.body, r2.url);
      console.error(`    ${u} → 候補 ${n2} 件`);
    }
  }
  return [...byHost.values()];
}

async function inspectHost(c: Candidate): Promise<{
  candidate: Candidate;
  verdict: Verdict;
  entries: { url: string; text: string }[];
  feeds: string[];
  title: string;
} | null> {
  const res = await politeFetch(c.url);
  if (!res.ok) {
    console.error('  取得できない:', c.url, '/', res.reason);
    return null;
  }
  const all = links(res.body, res.url);
  const entries = all
    .filter((l) => {
      try {
        return new URL(l.href).host === c.host;
      } catch {
        return false;
      }
    })
    .filter((l) => ENTRY_HINT.test(l.text))
    .slice(0, 6)
    .map((l) => ({ url: l.href, text: l.text }));

  const verdict = await checkLicense(res.url);
  return { candidate: c, verdict, entries, feeds: feeds(res.body, res.url), title: title(res.body) };
}

const yamlString = (s: string) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';

async function existingHosts(): Promise<Set<string>> {
  try {
    const y = await readFile('scripts/sources.yml', 'utf8');
    return new Set([...y.matchAll(/^\s*host:\s*(\S+)/gm)].map((m) => m[1]!));
  } catch {
    return new Set();
  }
}

const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : 10;

const STARTS = [
  'https://schit.net/zenkyou/',
  'http://www.kyoi-ren.gr.jp/link/',
  'https://www.mext.go.jp/b_menu/link/1294885.htm',
  'https://www.nise.go.jp/nc/about_nise/link/center',
];

console.error('起点からリンクを集めています');
const known = await existingHosts();
const all = await collectCandidates(STARTS);
const fresh = all.filter((c) => !known.has(c.host));
console.error(`候補ホスト ${all.length} 件（既知を除くと ${fresh.length} 件）`);

// 都道府県が特定できるものを先に。§3.2「初回は都道府県から始め、政令市は後回し」
fresh.sort((a, b) => Number(b.prefecture !== null) - Number(a.prefecture !== null));
const targets = fresh.slice(0, LIMIT);
console.error(`今回は ${targets.length} ホストを調べます`);

const results = [];
for (const c of targets) {
  console.error(`- ${c.prefecture ?? '（県不明）'} ${c.host}`);
  const r = await inspectHost(c);
  if (r) results.push(r);
}

const lines: string[] = [
  '# discover.ts の出力。運営者が確認して sources.yml へ移す。',
  '# 実在を確認したURLだけが入っている（推測したURLは書かない。§2.3）。',
  `# 実行日: ${new Date().toISOString().slice(0, 10)}`,
  '',
  'discovered:',
];
for (const r of results) {
  const pref = r.candidate.prefecture ?? '不明';
  const id = r.candidate.host.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  lines.push(`  - id: ${id}`);
  lines.push(`    name: ${yamlString(r.title || r.candidate.text)}`);
  lines.push(`    prefecture: ${pref}`);
  lines.push(`    host: ${r.candidate.host}`);
  lines.push(`    top: ${r.candidate.url}`);
  lines.push(`    license: ${r.verdict.license}`);
  lines.push(`    license_basis: ${yamlString(r.verdict.basis)}`);
  lines.push(`    license_checked: ${r.verdict.checked}`);
  lines.push(`    license_evidence: ${yamlString(r.verdict.evidence.slice(0, 200))}`);
  if (r.feeds.length > 0) {
    lines.push('    feeds:');
    for (const f of r.feeds) lines.push(`      - ${f}`);
  }
  if (r.entries.length > 0) {
    lines.push('    entry_candidates:');
    for (const e of r.entries) {
      lines.push(`      - url: ${e.url}`);
      lines.push(`        text: ${yamlString(e.text)}`);
    }
  } else {
    lines.push('    # 事例・指導資料の入口を、トップページからは見つけられなかった');
  }
  lines.push('');
}

const missing = PREFECTURES.filter((p) => !results.some((r) => r.candidate.prefecture === p));
lines.push('# 今回たどり着けなかった都道府県（後で手作業で探す）');
for (const p of missing) lines.push(`#   ${p}`);

const s = stats();
lines.push('');
lines.push('# 取得の記録');
for (const h of s.hosts) lines.push(`#   ${h.host}: ${h.fetched} ページ`);
for (const p of s.paused) lines.push(`#   停止 ${p.host}: ${p.reason}`);

await writeFile('scripts/discovered.yml', lines.join('\n') + '\n', 'utf8');
console.error('\n書き出し: scripts/discovered.yml');
console.error(`調べたホスト ${results.length} / 停止 ${pausedHosts.size}`);
