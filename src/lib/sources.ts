// 情報源の区分。既存のメタデータから機械的に決めるだけで、新しい判断は足さない。
// 色だけで区別せず、必ず文字で意味が分かるようにする（CLAUDE.md §8）。

import type { Tip } from './tips';

export type SourceKindId = 'national' | 'local' | 'commercial' | 'original';

export const SOURCE_KINDS: Record<SourceKindId, { label: string; help: string }> = {
  national: { label: '国の資料', help: '文部科学省など国の機関が公開しているもの' },
  local: { label: '自治体の資料', help: '都道府県・市町村の教育センター等が公開しているもの' },
  commercial: { label: '民間の資料', help: '教科書会社・教育メディア・ツール提供元が公開しているもの' },
  original: { label: 'サイト独自案', help: 'このサイトが考えたもの。実践の記録ではない' },
};

/** region と origin だけで決める。判断できないものを無理に分類しない */
export function sourceKind(tip: Tip): SourceKindId | null {
  if (tip.data.origin === 'original') return 'original';
  const r = tip.data.source.region;
  if (r === '国') return 'national';
  if (r === '民間') return 'commercial';
  if (r) return 'local'; // 都道府県名・市名が入っている
  return null;
}

/** 本文を確認できていない事例に出す注意。現在は0件だが仕組みは残す */
export const isUnverified = (tip: Tip) => tip.data.source.verified === 'listed';
