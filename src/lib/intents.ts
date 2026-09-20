// 「やりたいこと」から探すための入口。
//
// 教員は「ICTを使いたい」から考え始めない。「授業で○○させたい」から考える。
// そこでツール軸ではなく学習行為から引けるようにする（2026-09-21 運営者の指示）。
//
// ここで作るのは**検索のしおり**であって、事例に新しい意味づけをするものではない。
// 当てるのは既存データだけ。場面・領域・ツールのタグか、事例の文に実際に出てくる語。
// 推測で「この事例は比較の授業だ」と決めつけない。各ページに、何で当てたかを明記する。

import type { Tip } from './tips';
import { searchText } from './tips';
import type { DomainId, SceneId, ToolId } from './vocab';

export interface Intent {
  id: string;
  label: string;
  /** 当て方の説明。ページにそのまま出す */
  basis: string;
  scenes?: readonly SceneId[];
  domains?: readonly DomainId[];
  tools?: readonly ToolId[];
  /** 事例の文に出てくる語。いずれか1つでも含めば当たり */
  words?: readonly string[];
}

export const INTENTS: readonly Intent[] = [
  {
    id: 'share',
    label: '考えを共有したい',
    basis: '授業の場面に「共有」が付いている事例',
    scenes: ['share'],
  },
  {
    id: 'discuss',
    label: '話し合いを深めたい',
    basis: '授業の場面に「話し合い」が付いている事例',
    scenes: ['discuss'],
  },
  {
    id: 'compare',
    label: '比較して考えさせたい',
    basis: '「比べる」「比較」「並べて」「見比べ」のいずれかが書かれている事例',
    words: ['比べ', '比較', '並べて', '見比べ', '対比'],
  },
  {
    id: 'evidence',
    label: '根拠を示させたい',
    basis: '「根拠」「叙述」「線を引く」のいずれかが書かれている事例',
    words: ['根拠', '叙述', '線を引'],
  },
  {
    id: 'deepen-reading',
    label: '読みを深めたい',
    basis: '領域が「読むこと」で、場面に「共有」か「話し合い」が付いている事例',
    domains: ['read'],
    scenes: ['share', 'discuss'],
  },
  {
    id: 'revise',
    label: '文章を推敲させたい',
    basis: '「推敲」「書き直す」「添削」「直させる」のいずれかが書かれている事例',
    words: ['推敲', '書き直', '添削', '直させ'],
  },
  {
    id: 'read-aloud',
    label: '音読を振り返らせたい',
    basis: '「音読」「朗読」のいずれかが書かれている事例',
    words: ['音読', '朗読'],
  },
  {
    id: 'organize',
    label: '情報を整理させたい',
    basis: '「整理」「分類」「並べ替え」「構成図」のいずれかが書かれている事例',
    words: ['整理', '分類', '並べ替え', '構成図', '相関図', '年表'],
  },
  {
    id: 'record',
    label: '学びを記録させたい',
    basis: '「記録」「ためる」「書きため」のいずれかが書かれている事例',
    words: ['記録', 'ため', '書きため', '残す', '残さ'],
  },
  {
    id: 'reflect',
    label: '振り返らせたい',
    basis: '授業の場面に「振り返り」が付いている事例',
    scenes: ['reflect'],
  },
  {
    id: 'express',
    label: '表現を工夫させたい',
    basis: '「表現」「言葉を選ぶ」「工夫して書く」のいずれかが書かれている事例',
    words: ['表現', '言葉を選', '工夫して書'],
  },
  {
    id: 'ai',
    label: '生成AIを使ってみたい',
    basis: '使うツールに「生成AI」が付いている事例',
    tools: ['ai'],
  },
];

export const intentById = (id: string) => INTENTS.find((i) => i.id === id);

const has = (list: readonly string[], want?: readonly string[]) =>
  !want || want.some((w) => list.includes(w));

export function matchesIntent(tip: Tip, intent: Intent): boolean {
  if (!has(tip.data.scenes, intent.scenes)) return false;
  if (!has(tip.data.domains, intent.domains)) return false;
  if (!has(tip.data.tools, intent.tools)) return false;
  if (intent.words) {
    const text = searchText(tip);
    if (!intent.words.some((w) => text.includes(w))) return false;
  }
  return true;
}

export const tipsForIntent = (intent: Intent, tips: Tip[]) =>
  tips.filter((t) => matchesIntent(t, intent));
