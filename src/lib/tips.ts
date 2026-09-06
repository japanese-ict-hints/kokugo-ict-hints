import { getCollection, type CollectionEntry } from 'astro:content';
import { DOMAINS, SCENES, SCHOOLS, TOOLS } from './vocab';

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

// 同じ領域・場面を共有する数で近さを測る。出典が同じものは少しだけ下げる。
export const relatedTips = (tip: Tip, all: Tip[], limit = 3): Tip[] => {
  const overlap = (a: readonly string[], b: readonly string[]) =>
    a.filter((x) => b.includes(x)).length;
  return all
    .filter((t) => t.id !== tip.id)
    .map((t) => ({
      t,
      score:
        overlap(t.data.domains, tip.data.domains) * 3 +
        overlap(t.data.scenes, tip.data.scenes) * 2 +
        overlap(t.data.school, tip.data.school) +
        overlap(t.data.tools, tip.data.tools) -
        (t.data.source.publisher === tip.data.source.publisher ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.t.data.added.getTime() - a.t.data.added.getTime())
    .slice(0, limit)
    .map((x) => x.t);
};

// 検索用のテキスト。フェーズ2で Pagefind に置き換える前の、10件を絞るだけの索引。
// 「話し合い」のように、本文には出ないがタグには入っている語で探されるので、
// タグの日本語ラベルも索引に入れる。
export const searchText = (tip: Tip): string =>
  [
    tip.data.title,
    tip.data.summary,
    tip.data.source.publisher,
    tip.data.grade ?? '',
    tip.data.note,
    ...tip.data.domains.map((id) => `${DOMAINS[id].label} ${DOMAINS[id].short}`),
    ...tip.data.scenes.map((id) => SCENES[id].label),
    ...tip.data.tools.map((id) => TOOLS[id]),
    ...tip.data.school.map((id) => SCHOOLS[id]),
  ].join(' ');
