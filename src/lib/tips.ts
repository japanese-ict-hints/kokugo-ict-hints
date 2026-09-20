import { getCollection, type CollectionEntry } from 'astro:content';
import { DOMAINS, EFFORTS, SCENES, SCHOOLS, TOOLS } from './vocab';

export type Tip = CollectionEntry<'tips'>;

// archived は出さない。draft は「未確認」表示つきで出す（フェーズ1は運営者の確認前だから）。
export const loadTips = async (): Promise<Tip[]> => {
  const all = await getCollection('tips', ({ data }) => data.status !== 'archived');
  return all.sort((a, b) => {
    const d = b.data.added.getTime() - a.data.added.getTime();
    return d !== 0 ? d : a.data.title.localeCompare(b.data.title, 'ja');
  });
};

export const lastUpdated = (tips: Tip[]): Date | null =>
  tips.reduce<Date | null>(
    (max, t) => (max === null || t.data.added > max ? t.data.added : max),
    null,
  );

// 近さの順は、同じ単元 → 同じ学習場面 → 同じ領域（2026-09-21 運営者の指示）。
// 同じ教材を扱う事例が並ぶことを最優先する。出典が同じものは少しだけ下げる。
export const relatedTips = (tip: Tip, all: Tip[], limit = 4): Tip[] => {
  const overlap = (a: readonly string[], b: readonly string[]) =>
    a.filter((x) => b.includes(x)).length;
  return all
    .filter((t) => t.id !== tip.id)
    .map((t) => ({
      t,
      score:
        (tip.data.unit && t.data.unit === tip.data.unit ? 40 : 0) +
        (tip.data.grade && t.data.grade === tip.data.grade ? 6 : 0) +
        overlap(t.data.scenes, tip.data.scenes) * 4 +
        overlap(t.data.domains, tip.data.domains) * 3 +
        overlap(t.data.school, tip.data.school) +
        overlap(t.data.tools, tip.data.tools) -
        (t.data.source.publisher === tip.data.source.publisher ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.t.data.added.getTime() - a.t.data.added.getTime())
    .slice(0, limit)
    .map((x) => x.t);
};

// 検索用のテキスト。単元名・教材名・活用方法・学習活動・ツール・説明文・タグを
// 横断できるようにする（2026-09-21 運営者の指示）。ここに入れ忘れると引けない。
export const searchText = (tip: Tip): string =>
  [
    tip.data.title,
    tip.data.unit,
    tip.data.summary,
    tip.data.ict_use,
    tip.data.ict_effect,
    ...tip.data.howto,
    tip.data.note,
    tip.data.source.publisher,
    tip.data.source.region,
    tip.data.source.published ? `${tip.data.source.published.getFullYear()}年` : '',
    tip.data.grade ?? '',
    EFFORTS[tip.data.effort]?.label ?? '',
    ...tip.data.domains.map((id) => `${DOMAINS[id].label} ${DOMAINS[id].short}`),
    ...tip.data.scenes.map((id) => SCENES[id].label),
    ...tip.data.tools.map((id) => TOOLS[id]),
    ...tip.data.school.map((id) => SCHOOLS[id]),
  ].join(' ');

/** 探しやすさのための正規化。全角英数を半角に、カタカナをひらがなに、小文字にそろえる。
 *  校務PCで全角入力する人と、「ごんぎつね」を「ゴンギツネ」と打つ人の両方を拾う。 */
export const normalizeQuery = (s: string): string =>
  String(s)
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
