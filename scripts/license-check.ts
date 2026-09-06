// 収集元ごとにライセンスを判定する（CLAUDE.md §2.1）。
// 判定できなければ必ず link-only。迷ったら link-only。
//
//   node scripts/license-check.ts https://www.mext.go.jp/

import { politeFetch } from './lib/http.ts';
import { links, stripTags } from './lib/html.ts';

export type License = 'gov-open' | 'link-only' | 'permitted';

export type Verdict = {
  host: string;
  license: License;
  basis: string;
  checked: string;
  evidence: string;
  examined: string[];
};

/** 利用規約にあたるページを指していそうなリンクか */
const TERMS_HINT =
  /利用規約|利用条件|利用について|利用にあたって|サイトの利用|著作権|リンク|このサイトについて|当サイトについて|本サイトについて|サイトポリシー|免責|terms|agreement|copyright|policy/i;

/** 出典明示を条件に複製・翻案を認める記述（§2.1 の2） */
const OPEN_MARKERS: [RegExp, string][] = [
  [/政府標準利用規約/, '政府標準利用規約'],
  [/公共データ利用規約/, '公共データ利用規約'],
  [
    /クリエイティブ・?コモンズ[・\s]*表示\s*4\.?0?|CC[\s-]?BY\s*4\.0/i,
    'CC BY 表示4.0との互換',
  ],
  [/出典を?(明記|表示|記載)[^。]{0,40}(複製|公衆送信|翻訳|翻案)/, '出典明示を条件に複製・公衆送信・翻案を許諾'],
];

/** 無断転載の禁止（§2.1 の3） */
const CLOSED_MARKERS: [RegExp, string][] = [
  [/無断(で)?(転載|複製|転用|使用|利用)[^。]{0,20}(禁じ|禁止|できません|お断り)/, '無断転載の禁止'],
  [/転載[^。]{0,10}(を)?(禁じ|禁止)/, '転載の禁止'],
  [/All Rights Reserved/i, 'All Rights Reserved の記載'],
];

const snippet = (text: string, re: RegExp) => {
  const m = re.exec(text);
  if (!m) return '';
  return text.slice(Math.max(0, m.index - 40), m.index + 120).replace(/\s+/g, ' ').trim();
};

export async function checkLicense(entryUrl: string): Promise<Verdict> {
  const host = new URL(entryUrl).host;
  const today = new Date().toISOString().slice(0, 10);
  const fallback: Verdict = {
    host,
    license: 'link-only',
    basis: '判定不能のため既定値',
    checked: today,
    evidence: '',
    examined: [],
  };

  const top = await politeFetch(entryUrl);
  if (!top.ok) return { ...fallback, evidence: '入口を取得できない: ' + top.reason };

  // 規約らしいリンクを2階層まで辿る。規約ページが本体の規約へリンクしているサイトが多い。
  // 辿るのは実際にあるリンクだけで、URLは推測しない（§2.3）。
  const MAX_PAGES = 8;
  const sameHost = (href: string) => {
    try {
      return new URL(href).host === host;
    } catch {
      return false;
    }
  };
  const termsLinks = (html: string, base: string) =>
    links(html, base)
      .filter((l) => sameHost(l.href))
      .filter((l) => TERMS_HINT.test(l.text) || TERMS_HINT.test(decodeURIComponent(l.href)))
      .map((l) => l.href.split('#')[0]!);

  const seen = new Set<string>([top.url]);
  const examined: string[] = [];
  const pages: { url: string; text: string }[] = [{ url: top.url, text: stripTags(top.body) }];

  let frontier = [...new Set(termsLinks(top.body, top.url))].slice(0, 5);
  for (let depth = 0; depth < 2 && frontier.length > 0; depth++) {
    const next: string[] = [];
    for (const url of frontier) {
      if (pages.length >= MAX_PAGES) break;
      if (seen.has(url)) continue;
      seen.add(url);
      const res = await politeFetch(url);
      if (!res.ok) continue;
      examined.push(res.url);
      pages.push({ url: res.url, text: stripTags(res.body) });
      next.push(...termsLinks(res.body, res.url));
    }
    frontier = [...new Set(next)].filter((u) => !seen.has(u)).slice(0, 4);
  }

  // §2.1 の手順どおり、まず gov-open の根拠を探す
  for (const page of pages) {
    for (const [re, label] of OPEN_MARKERS) {
      if (re.test(page.text)) {
        return {
          host,
          license: 'gov-open',
          basis: page.url,
          checked: today,
          evidence: label + ': ' + snippet(page.text, re),
          examined,
        };
      }
    }
  }

  for (const page of pages) {
    for (const [re, label] of CLOSED_MARKERS) {
      if (re.test(page.text)) {
        return {
          host,
          license: 'link-only',
          basis: page.url,
          checked: today,
          evidence: label + ': ' + snippet(page.text, re),
          examined,
        };
      }
    }
  }

  return { ...fallback, examined, evidence: '利用規約に相当する記述を見つけられなかった' };
}

if (import.meta.filename === process.argv[1]) {
  const url = process.argv[2];
  if (!url) {
    console.error('使い方: node scripts/license-check.ts <入口URL>');
    process.exit(1);
  }
  console.log(JSON.stringify(await checkLicense(url), null, 2));
}
