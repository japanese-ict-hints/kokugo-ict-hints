import type { DomainId } from './vocab';
import { CURRICULUM } from './curriculum';

// 学年区分。小学校は2学年ずつ、中学校は学年ごと。
const SEGMENT: Record<string, string> = {
  小1: '82102A', 小2: '82102A',
  小3: '82102C', 小4: '82102C',
  小5: '82102D', 小6: '82102D',
  中1: '831021', 中2: '831022', 中3: '831023',
};

// 領域の単位まで。指導事項まで割り当てる材料は事例側にない。
const SUFFIX: Record<DomainId, string> = {
  'speak-listen': '3210000000',
  write: '3220000000',
  read: '3230000000',
  // 言葉の特徴・書写・読書は〔知識及び技能〕に置かれている
  language: '3100000000',
  handwriting: '3100000000',
  'reading-life': '3100000000',
};

/** 学年が分かっている事例にだけコードを当てる。分からなければ何も返さない */
export function codesFor(grade: string | null, domains: readonly DomainId[]): string[] {
  if (!grade) return [];
  const seg = SEGMENT[grade];
  if (!seg) return [];
  const out = new Set<string>();
  for (const d of domains) {
    const code = seg + SUFFIX[d];
    if (CURRICULUM[code]) out.add(code);
  }
  return [...out];
}
