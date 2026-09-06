// 最小限のHTML処理。DOMは使わず、リンク抽出と本文テキスト化だけを行う。

export type Link = { href: string; text: string };

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

export const stripTags = (html: string) =>
  decodeEntities(
    html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\u3000]+/g, ' ')
    .trim();

/** ナビゲーションやフッターを落として本文だけにする。
 *  一覧ページの見出しが混ざると、教科の判定を誤る（栃木で生活科の回を国語と誤判定した） */
export const mainText = (html: string) => {
  let h = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ');
  h = h.replace(/<(nav|header|footer|aside|form|select)\b[\s\S]*?<\/\1>/gi, ' ');
  h = h.replace(/<(ul|div)\b[^>]*(?:class|id)="[^"]*(nav|menu|breadcrumb|sidebar|pankuzu|gnav|footer|header)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(h) ?? /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(h);
  const picked = stripTags(main ? main[1]! : h);
  // <main> の中身が実質空のサイトがある（見出しだけ、本文は別の要素）。
  // 極端に短いときは全体から取り直す。
  const whole = stripTags(h);
  return picked.length < 400 && whole.length > picked.length ? whole : picked;
};

export const title = (html: string) => {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? stripTags(m[1]!).slice(0, 200) : '';
};

/** ページ内のリンクを絶対URLにして返す */
export function links(html: string, baseUrl: string): Link[] {
  const out: Link[] = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*?href\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim();
    if (!raw || raw.startsWith('#') || /^(mailto|tel|javascript):/i.test(raw)) continue;
    let abs: string;
    try {
      abs = new URL(decodeEntities(raw), baseUrl).href;
    } catch {
      continue;
    }
    const text = stripTags(m[5] ?? '').slice(0, 120);
    const key = abs + ' ' + text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ href: abs, text });
  }
  return out;
}

/** RSS / Atom の自動検出リンク */
export function feeds(html: string, baseUrl: string): string[] {
  const out: string[] = [];
  const re = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    if (!/type\s*=\s*["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/i.exec(tag);
    const raw = href?.[2] ?? href?.[3] ?? href?.[4];
    if (!raw) continue;
    try {
      out.push(new URL(decodeEntities(raw), baseUrl).href);
    } catch {
      /* 無視 */
    }
  }
  return [...new Set(out)];
}
