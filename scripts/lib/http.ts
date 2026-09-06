// 取得のマナーを1か所に集める（CLAUDE.md §2.2）。
// 収集系スクリプトは必ずこれを通す。直接 fetch を呼ばない。

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const UA =
  'SakuraKokugoBot/1.0 (+https://japanese-ict-hints.github.io/kokugo-ict-hints/about/)';

/** 同一ホストへの最小間隔。§2.2 は「1リクエスト / 2秒以上」 */
const MIN_INTERVAL_MS = 2500;
/** 1回の実行で1ホストから取得するページ数の上限 */
const MAX_PAGES_PER_HOST = 30;

const CACHE_DIR = path.resolve('.cache/fetch');

const lastHit = new Map<string, number>();
const hostCount = new Map<string, number>();
const robotsCache = new Map<string, RobotsRules | null>();

/** そのホストへの取得を止めた理由。1度立ったら実行中は解除しない */
export const pausedHosts = new Map<string, string>();

export type FetchResult =
  | { ok: true; status: number; url: string; body: string; fromCache: boolean }
  | { ok: false; reason: string; status?: number; url: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const cachePath = (url: string) => {
  const { host } = new URL(url);
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return path.join(CACHE_DIR, host, `${hash}.txt`);
};

async function readCache(url: string): Promise<string | null> {
  try {
    return await readFile(cachePath(url), 'utf8');
  } catch {
    return null;
  }
}

async function writeCache(url: string, body: string) {
  const p = cachePath(url);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, body, 'utf8');
}

async function throttle(host: string) {
  const last = lastHit.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

// ---- robots.txt ----

type Rule = { allow: boolean; pattern: string };
export type RobotsRules = { rules: Rule[] };

/** User-agent: * の群だけを見る。自分の名前を名指しした群があればそちらを優先する */
export function parseRobots(text: string): RobotsRules {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim());
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;

  for (const line of lines) {
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === 'disallow' || field === 'allow') {
      if (!current) continue;
      lastWasAgent = false;
      if (field === 'disallow' && value === '') continue; // 空の Disallow は全許可
      current.rules.push({ allow: field === 'allow', pattern: value });
    } else {
      lastWasAgent = false;
    }
  }

  const mine = groups.find((g) => g.agents.some((a) => UA.toLowerCase().startsWith(a) && a !== '*'));
  const star = groups.find((g) => g.agents.includes('*'));
  return { rules: (mine ?? star)?.rules ?? [] };
}

const patternToRegExp = (pattern: string) => {
  let src = '';
  for (const ch of pattern) {
    if (ch === '*') src += '.*';
    else if (ch === '$') src += '$';
    else src += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + src);
};

/** 最長一致が勝つ。同じ長さなら Allow が勝つ（RFC 9309） */
export function isAllowed(robots: RobotsRules | null, pathname: string): boolean {
  if (!robots) return true; // robots.txt が無い＝制限なし
  let best: { allow: boolean; len: number } | null = null;
  for (const rule of robots.rules) {
    if (!patternToRegExp(rule.pattern).test(pathname)) continue;
    const len = rule.pattern.length;
    if (!best || len > best.len || (len === best.len && rule.allow)) {
      best = { allow: rule.allow, len };
    }
  }
  return best ? best.allow : true;
}

async function getRobots(origin: string): Promise<RobotsRules | null | 'error'> {
  const host = new URL(origin).host;
  if (robotsCache.has(host)) return robotsCache.get(host)!;
  await throttle(host);
  try {
    const res = await fetch(new URL('/robots.txt', origin), {
      headers: { 'user-agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404 || res.status === 410) {
      // 存在しない＝制限なし（RFC 9309）。取得失敗とは区別する
      robotsCache.set(host, null);
      return null;
    }
    if (!res.ok) return 'error';
    const parsed = parseRobots(await res.text());
    robotsCache.set(host, parsed);
    return parsed;
  } catch {
    return 'error';
  }
}

/** robots.txt を尊重し、間隔をあけ、上限を守って取得する */
export async function politeFetch(url: string): Promise<FetchResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: 'URLとして読めない', url };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    return { ok: false, reason: `対象外のスキーム ${u.protocol}`, url };
  }
  const host = u.host;

  if (pausedHosts.has(host)) {
    return { ok: false, reason: `このホストは停止中: ${pausedHosts.get(host)}`, url };
  }

  const cached = await readCache(url);
  if (cached !== null) {
    return { ok: true, status: 200, url, body: cached, fromCache: true };
  }

  const robots = await getRobots(u.origin);
  if (robots === 'error') {
    pausedHosts.set(host, 'robots.txt を取得できなかった');
    return { ok: false, reason: 'robots.txt を取得できなかったため停止', url };
  }
  if (!isAllowed(robots, u.pathname + u.search)) {
    return { ok: false, reason: 'robots.txt が許可していない', url };
  }

  const count = hostCount.get(host) ?? 0;
  if (count >= MAX_PAGES_PER_HOST) {
    return { ok: false, reason: `1ホストの取得上限 ${MAX_PAGES_PER_HOST} に達した`, url };
  }

  await throttle(host);
  hostCount.set(host, count + 1);

  try {
    const res = await fetch(u, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/plain,*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      pausedHosts.set(host, `HTTP ${res.status}`);
      return { ok: false, reason: `HTTP ${res.status} のため停止`, status: res.status, url };
    }
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, status: res.status, url };

    // RSS/RDF を octet-stream で返すサーバーがあるので、拡張子でも判断する
    const type = res.headers.get('content-type') ?? '';
    const looksFeed = /\.(rdf|xml|rss|atom)$/i.test(new URL(res.url).pathname);
    if (!/text\/html|text\/plain|xml|json/i.test(type) && !looksFeed) {
      return { ok: false, reason: `扱わない種類 ${type}`, url };
    }
    const body = await decode(res);
    await writeCache(url, body);
    return { ok: true, status: res.status, url: res.url, body, fromCache: false };
  } catch (e) {
    return { ok: false, reason: `取得に失敗: ${(e as Error).message}`, url };
  }
}

/** 公的機関のページは Shift_JIS / EUC-JP がまだ残っている */
async function decode(res: Response): Promise<string> {
  const buf = Buffer.from(await res.arrayBuffer());
  const head = buf.subarray(0, 2048).toString('latin1');
  const type = res.headers.get('content-type') ?? '';
  const charset =
    /charset=["']?([\w-]+)/i.exec(type)?.[1] ??
    /charset=["']?([\w-]+)/i.exec(head)?.[1] ??
    'utf-8';
  try {
    return new TextDecoder(charset.toLowerCase()).decode(buf);
  } catch {
    return buf.toString('utf8');
  }
}

export const stats = () => ({
  hosts: [...hostCount.entries()].map(([host, n]) => ({ host, fetched: n })),
  paused: [...pausedHosts.entries()].map(([host, reason]) => ({ host, reason })),
});
