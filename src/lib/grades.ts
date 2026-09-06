// 学年で引くための語彙。教科書の単元名は載せられないため（後述）、
// 学年と領域の組み合わせで引けるようにしている。
//
// 教育出版のウェブサイト利用条件では、年間指導計画資料の「複製・改変」は許可されているが、
// 公衆送信は一般条項で禁じられており、案内されているのは授業目的公衆送信補償金制度
// （＝授業の過程での送信）である。公開サイトへの単元名一覧の掲載はその範囲外なので載せない。
// （2026-09-06 確認: https://www.kyoiku-shuppan.co.jp/aboutsite.html）

import type { SchoolId } from './vocab';

export const GRADE_IDS = [
  'e1', 'e2', 'e3', 'e4', 'e5', 'e6',
  'j1', 'j2', 'j3',
] as const;
export type GradeId = (typeof GRADE_IDS)[number];

export const GRADES: Record<GradeId, { label: string; short: string; school: SchoolId }> = {
  e1: { label: '小学1年', short: '小1', school: 'elementary' },
  e2: { label: '小学2年', short: '小2', school: 'elementary' },
  e3: { label: '小学3年', short: '小3', school: 'elementary' },
  e4: { label: '小学4年', short: '小4', school: 'elementary' },
  e5: { label: '小学5年', short: '小5', school: 'elementary' },
  e6: { label: '小学6年', short: '小6', school: 'elementary' },
  j1: { label: '中学1年', short: '中1', school: 'junior' },
  j2: { label: '中学2年', short: '中2', school: 'junior' },
  j3: { label: '中学3年', short: '中3', school: 'junior' },
};

/**
 * 事例の grade 欄が、その学年に当てはまるか。
 * 「小1・小2」のように2学年をまとめた表記も拾う。
 */
export function matchesGrade(grade: string | null, id: GradeId): boolean {
  if (!grade) return false;
  const s = GRADES[id].short;
  return grade.split(/[・、,]/).map((x) => x.trim()).includes(s);
}

/** 学年の指定がない事例。校種が合えば「学年の指定なし」として並べる */
export function isUnspecified(grade: string | null, school: readonly string[], id: GradeId): boolean {
  return !grade && school.includes(GRADES[id].school);
}
