// 「みんなの教育技術」から、物語・説明文の教材を扱う国語の指導記事を拾う。
// 本文は保存せず、事例を書くための材料（学年・教材名・端末活用の記述）だけを取り出す。
// 出力は .cache/harvest.json。要約と手順は自作する。license は link-only。
//
//   node scripts/harvest-kyoiku.ts --list-only        一覧だけ更新
//   node scripts/harvest-kyoiku.ts --max 25           物語・説明文を優先して本文取得
//
// §2.2 に従い 1 実行 1 ホスト 30 ページまで。politeFetch が 2.5 秒間隔を守る。

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { politeFetch } from './lib/http.ts';
import { links, mainText, title as htmlTitle } from './lib/html.ts';
import { inScope, squash } from './lib/scrub.ts';

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const PAGES = Number(arg('pages') ?? 6);
const MAX = Math.min(Number(arg('max') ?? 25), 30);
const OUT = '.cache/harvest.json';

/** 一覧の起点。いずれも取得済みページ内のリンクから拾った実在のタグページ */
const TAGS = [
  'https://kyoiku.sho.jp/tag/%e5%9b%bd%e8%aa%9e/',
  'https://kyoiku.sho.jp/tag/ict/',
  'https://kyoiku.sho.jp/tag/giga%e3%82%b9%e3%82%af%e3%83%bc%e3%83%ab/',
];

/** 物語・説明文の教材名。題名の鉤括弧の中と照合する */
const STORY = `おおきなかぶ くじらぐも たぬきの糸車 ずうっと、ずっと、大すきだよ おとうとねずみチロ はなのみち
ふきのとう スイミー お手紙 スーホの白い馬 わたしはおねえさん みきのたからもの お話のさくしゃになろう
きつつきの商売 まいごのかぎ ちいちゃんのかげおくり 三年とうげ モチモチの木 すいせんのラッパ わすれられないおくりもの
白いぼうし 一つの花 ごんぎつね プラタナスの木 世界一美しいぼくの村 初雪のふる日 サーカスのライオン
なまえつけてよ たずねびと 大造じいさんとガン 世界でいちばんやかましい音 見えないだけ カレーライス
帰り道 やまなし 海の命 模型のまち 川とノリオ ぼくのブック・ウーマン きつねの窓 注文の多い料理店`.split(/\s+/);

const EXPO = `くちばし じどう車くらべ どうぶつの赤ちゃん うみのかくれんぼ いろいろなふね ロボット
たんぽぽのちえ どうぶつ園のじゅうい おにごっこ さけが大きくなるまで あなのやくわり しかけカードの作り方
こまを楽しむ すがたをかえる大豆 ありの行列 言葉で遊ぼう パラリンピックが目指すもの めだか
アップとルーズで伝える ウナギのなぞを追って 世界にほこる和紙 未来につなぐ工芸品 ヤドカリとイソギンチャク 思いやりのデザイン
見立てる 言葉の意味が分かること 固有種が教えてくれること 想像力のスイッチを入れよう 天気を予想する
時計の時間と心の時間 笑うから楽しい 鳥獣戯画 メディアと人間社会 大切な人と深くつながるために
インターネットの投稿を読み比べよう 和の文化を受けつぐ 動物たちが教えてくれる海の中のくらし`.split(/\s+/);

/** 記事一覧のリンク文や定型句。端末の記述として数えない */
const BOILER =
  /端末活用のポイント等を示した|端末の活用例等を示した|端末活用例と(?:指導|使用|全時間)|端末活用例＆|みんなの教育技術|GIGAスクールICT活用術|指導アイデア｜|全時間の板書/;

type Item = {
  url: string; title: string; grade: string | null; unit: string; kind: string;
  ict: string[]; aim: string; flow: string;
};

const GRADE = [
  [/小[１1]国語|小学[１1]年/, '小1'], [/小[２2]国語|小学[２2]年/, '小2'],
  [/小[３3]国語|小学[３3]年/, '小3'], [/小[４4]国語|小学[４4]年/, '小4'],
  [/小[５5]国語|小学[５5]年/, '小5'], [/小[６6]国語|小学[６6]年/, '小6'],
  [/中[１1]国語|中学[１1]年/, '中1'], [/中[２2]国語|中学[２2]年/, '中2'],
  [/中[３3]国語|中学[３3]年/, '中3'],
] as const;
const gradeOf = (t: string) => GRADE.find(([re]) => re.test(t))?.[1] ?? null;

const unitOf = (t: string) => /[「『]([^」』]{2,30})[」』]/.exec(t)?.[1] ?? '';

/** 教材名が物語か説明文か。どちらでもなければ空文字 */
function kindOf(unit: string): string {
  const hit = (list: string[]) =>
    list.some((s) => s === unit || (s.length >= 4 && unit.includes(s)) || (unit.length >= 4 && s.includes(unit)));
  if (hit(STORY)) return '物語';
  if (hit(EXPO)) return '説明文';
  return '';
}

/** 関連記事の一覧が本文に続くので、そこで切る */
const bodyOnly = (t: string) => t.split(/この記事をシェアしよう|【関連記事】|関連記事一覧/)[0]!;

/** 端末の使い方を述べている文だけを集める */
function ictLines(text: string): string[] {
  const out: string[] = [];
  for (const s of bodyOnly(text).split(/[。\n]/)) {
    const line = s.trim();
    if (line.length < 15 || line.length > 160) continue;
    if (!/(端末|タブレット|ICT|GIGA|ロイロ|オクリンク|共有|デジタル)/.test(line)) continue;
    if (!/(端末|タブレット|ICT|GIGA)/.test(line)) continue;
    if (BOILER.test(line)) continue;
    out.push(line);
    if (out.length >= 8) break;
  }
  return out;
}

function section(text: string, head: RegExp, len = 900): string {
  const i = text.search(head);
  return i < 0 ? '' : text.slice(i, i + len).replace(/\s+/g, ' ').trim();
}

const seen: Record<string, string> = {};
try { Object.assign(seen, JSON.parse(await readFile('.cache/harvest-seen.json', 'utf8'))); } catch { /* 初回 */ }

const found = new Map<string, string>();
try {
  for (const [u, t] of Object.entries(JSON.parse(await readFile('.cache/harvest-urls.json', 'utf8')) as Record<string, string>))
    found.set(u, t);
} catch { /* 初回 */ }

if (process.argv.includes('--list-only')) {
  const FROM = Number(arg('from') ?? 1);
  for (const tag of TAGS) {
    for (let i = FROM; i < FROM + PAGES; i++) {
      const res = await politeFetch(i === 1 ? tag : `${tag}page/${i}/`);
      if (!res.ok) break;
      for (const l of links(res.body, res.url)) {
        if (!/kyoiku\.sho\.jp\/\d+\//.test(l.href)) continue;
        const t = l.text.replace(/\s+/g, ' ').trim();
        if (!/国語/.test(t)) continue;
        if (!found.has(l.href)) found.set(l.href, t);
      }
    }
  }
  await mkdir('.cache', { recursive: true });
  await writeFile('.cache/harvest-urls.json', JSON.stringify(Object.fromEntries(found), null, 2), 'utf8');
  console.error(`一覧の累計 ${found.size} 件`);
  process.exit(0);
}

// 物語・説明文の教材を扱うものを先に処理する
const queue = [...found.entries()]
  .map(([u, t]) => ({ u, t, kind: kindOf(unitOf(t)) }))
  .filter((x) => x.kind && !seen[x.u]);

let items: Item[] = [];
try { items = JSON.parse(await readFile(OUT, 'utf8')) as Item[]; } catch { /* 初回 */ }

let n = 0;
for (const { u: url, t: listTitle, kind } of queue) {
  if (n >= MAX) break;
  const res = await politeFetch(url);
  if (!res.ok) { console.error('  取得できない', url, res.reason); continue; }
  n++;
  const t = mainText(res.body);
  const title = htmlTitle(res.body);
  if (!inScope(t, title).ok) { seen[url] = '範囲外'; continue; }
  const ict = ictLines(squash(t));
  if (ict.length < 2) { seen[url] = `端末の記述が${ict.length}文`; continue; }
  items.push({
    url, title: title.replace(/｜.*$/, '').trim(),
    grade: gradeOf(listTitle + ' ' + title), unit: unitOf(listTitle) || unitOf(title), kind,
    ict, aim: section(squash(t), /単元で身に付けたい資質・能力/, 350),
    flow: section(squash(t), /単元の展開/, 800),
  });
  seen[url] = '取得';
}

await mkdir('.cache', { recursive: true });
await writeFile(OUT, JSON.stringify(items, null, 2), 'utf8');
await writeFile('.cache/harvest-seen.json', JSON.stringify(seen, null, 2), 'utf8');
console.error(`取得 ${n} 件 / 事例の材料は累計 ${items.length} 件 / 残り ${queue.length - n} 件`);
