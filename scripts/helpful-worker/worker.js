// 「役に立った」の数を数える受け口（Cloudflare Workers + KV）。
//
// GET  /?slug=<事例のslug>   → { "count": 12 }
// GET  /all                 → { "<slug>": 12, … }（0件のものは含めない）
// POST /  body {"slug":"…"}  → { "count": 13 }
//
// 保存するのは事例ごとの数だけ。閲覧者を識別する情報は保存しない。
// 置き方は README.md を見ること。

const ALLOWED_ORIGIN = 'https://japanese-ict-hints.github.io';

// 事例のslugの形。想定外の文字列でKVを汚されないようにする
const SLUG = /^[a-z0-9][a-z0-9-]{2,80}$/;

const cors = {
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);

    // 一覧の行に数を出すために、全件をまとめて返す。1件ずつ聞くと事例の数だけ
    // 通信が出るので、一覧ページはこちらを使う。
    if (request.method === 'GET' && url.pathname === '/all') {
      const out = {};
      let cursor;
      do {
        const page = await env.HELPFUL.list({ cursor });
        await Promise.all(
          page.keys.map(async (k) => {
            const n = Number((await env.HELPFUL.get(k.name)) ?? '0');
            if (Number.isFinite(n) && n > 0) out[k.name] = n;
          }),
        );
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return new Response(JSON.stringify(out), {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'public, max-age=60',
          ...cors,
        },
      });
    }

    if (request.method === 'GET') {
      const slug = url.searchParams.get('slug') ?? '';
      if (!SLUG.test(slug)) return json({ error: 'slug が不正' }, 400);
      const n = Number((await env.HELPFUL.get(slug)) ?? '0');
      return json({ slug, count: Number.isFinite(n) ? n : 0 });
    }

    if (request.method === 'POST') {
      let slug = '';
      try {
        slug = (await request.json()).slug ?? '';
      } catch {
        return json({ error: '本文を読めない' }, 400);
      }
      if (!SLUG.test(slug)) return json({ error: 'slug が不正' }, 400);

      // 同じ端末からの連打を軽く抑える。完全には防げない（静的サイトの限界）
      const n = Number((await env.HELPFUL.get(slug)) ?? '0');
      const next = (Number.isFinite(n) ? n : 0) + 1;
      await env.HELPFUL.put(slug, String(next));
      return json({ slug, count: next });
    }

    return json({ error: '対応していない方法' }, 405);
  },
};
