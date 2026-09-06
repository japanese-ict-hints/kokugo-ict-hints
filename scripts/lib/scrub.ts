// 個人が特定できる情報を落とす（CLAUDE.md §2.1）。
// 事例集には学校名と授業者名がふつうに載っている。要約に入れる前にここで落とす。
//
// PDFから取り出した文字は「授 業 者」「陵南中 学校」のように空白が混ざるので、
// 判定は空白を取り除いた文字列に対して行う。ここで作った文字列は要約の材料にだけ使い、
// そのまま公開しない。

const JP = '\\u3040-\\u30ff\\u4e00-\\u9fff\\u30fc';

/** 空白を全部落とす。検査と伏せ字はこの上で行う */
export const squash = (text: string) => text.replace(/[\s\u3000]+/g, '');

export type Finding = { kind: string; matched: string };

const SCHOOL_TYPE = '小学校|中学校|義務教育学校|中等教育学校|特別支援学校|高等学校';
// 事例集の様式でよく使われる見出し語。氏名の後ろはこれで切る
const NEXT_LABEL = '学年|教科|単元|所属|職名|勤務|校種|授業|学級|氏名|年度';

const PATTERNS: { kind: string; re: RegExp }[] = [
  {
    // 「寒河江市立陵南中学校」のように 立 を含む形を先に取る
    kind: '学校名',
    re: new RegExp(`[${JP}]{1,8}[都道府県市区町村]立[${JP}]{1,8}?(?:${SCHOOL_TYPE})`, 'g'),
  },
  {
    // 立 が無い形。手前は短く取り、巻き込みを抑える
    kind: '学校名',
    re: new RegExp(`[${JP}]{1,6}?(?:${SCHOOL_TYPE})`, 'g'),
  },
  {
    kind: '授業者名',
    re: new RegExp(`(?:授業者|指導者|実践者|報告者|執筆者|発表者)[：:]?[${JP}]{2,6}?(?=${NEXT_LABEL}|$)`, 'g'),
  },
  {
    kind: '教職員名',
    re: new RegExp(`[\\u4e00-\\u9fff]{2,5}(?=(?:教諭|先生|校長|教頭|指導主事))`, 'g'),
  },
];

/** 個人が特定できそうな箇所を探す。空白を落としてから見る */
export function findPersonalInfo(text: string): Finding[] {
  const s = squash(text);
  const out: Finding[] = [];
  for (const p of PATTERNS) {
    for (const m of s.matchAll(p.re)) {
      out.push({ kind: p.kind, matched: m[0] });
    }
  }
  return out;
}

/** 伏せ字にした文字列を返す。要約の材料にだけ使う */
export function scrubPersonalInfo(text: string): string {
  let s = squash(text);
  for (const p of PATTERNS) {
    s = s.replace(p.re, (m) => {
      if (p.kind === '学校名') {
        const type = /小学校|中学校|義務教育学校|中等教育学校|特別支援学校|高等学校/.exec(m);
        return `〔${type ? type[0] : '学校'}〕`;
      }
      if (p.kind === '授業者名') {
        const label = /授業者|指導者|実践者|報告者|執筆者|発表者/.exec(m);
        return `${label ? label[0] : '授業者'}〔氏名〕`;
      }
      return '〔氏名〕';
    });
  }
  return s;
}

/** 書き出す直前の関門。事例の各項目に個人情報が残っていたら止める */
export function assertClean(fields: Record<string, unknown>): void {
  const text = JSON.stringify(fields);
  const found = findPersonalInfo(text);
  if (found.length > 0) {
    const list = found.map((f) => `${f.kind}「${f.matched}」`).join(' / ');
    throw new Error(`個人が特定できる情報が残っている: ${list}`);
  }
}

/** 国語かつ小中学校の事例か（§5.1 の7） */
export function inScope(text: string, title = ''): { ok: boolean; reason: string } {
  const s = squash(text);
  // 教科と校種の判定は、見出しと本文の頭だけで行う。
  // ページ全体を見ると、一覧やナビに載っている他教科・他校種の語を拾ってしまう。
  const head = squash(title) + '\n' + s.slice(0, 1200);

  if (!/(?<!外)国語/.test(head)) return { ok: false, reason: '見出しと本文の頭に国語が出てこない' };

  const highMark = /高等学校|高校|高等部|（高）|\(高\)/.test(head);
  const lowMark = /小学校|中学校|義務教育学校|小[1-6一二三四五六]年|中[1-3一二三]年|第[1-6一二三四五六]学年/.test(head);
  if (highMark && !lowMark) return { ok: false, reason: '高等学校の事例' };
  if (!lowMark) return { ok: false, reason: '小中学校の事例か判断できない' };

  // 研修の案内・報告は授業の事例ではない
  if (/研修報告|研修講座|講座案内|受講者の声|申込/.test(head) && !/授業|単元|児童|生徒が/.test(head)) {
    return { ok: false, reason: '研修の案内や報告で、授業の事例ではない' };
  }
  return { ok: true, reason: '' };
}

/** 重複判定のためのURL正規化（§5.1 の8） */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // PDF内のページ指定は別の事例を指すので残す
    u.hash = /^#page=\d+$/.test(u.hash) ? u.hash : '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$|^_ga$/.test(k)) u.searchParams.delete(k);
    }
    u.pathname = u.pathname.replace(/\/index\.(html?|php)$/i, '/');
    u.protocol = 'https:';
    u.host = u.host.toLowerCase().replace(/^www\./, '');
    return u.href.replace(/\/(?=$|#)/, '');
  } catch {
    return url;
  }
}

/** タイトルの近さ。2文字の並びの重なりで測る */
export function titleSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = squash(s);
    const g = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2));
    return g;
  };
  const ga = grams(a);
  const gb = grams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared++;
  return (2 * shared) / (ga.size + gb.size);
}

/** 収集源の層。重複したら上位を残す（§5.1 の8） */
export function tierOf(host: string): 1 | 2 | 3 {
  if (/\.go\.jp$|^nier\.go\.jp$|\.nise\.go\.jp$/.test(host)) return 1;
  if (/\.ed\.jp$|\.lg\.jp$|\.or\.jp$/.test(host)) return 2;
  return 3;
}
