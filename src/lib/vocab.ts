// CLAUDE.md §4.2 の固定語彙と、その日本語ラベル。
// 語彙を増やすときは CLAUDE.md も同時に直す。ここが唯一の定義。

export const DOMAIN_IDS = [
  'speak-listen',
  'write',
  'read',
  'language',
  'handwriting',
  'reading-life',
] as const;
export type DomainId = (typeof DOMAIN_IDS)[number];

export const SCENE_IDS = [
  'intro',
  'individual',
  'share',
  'discuss',
  'reflect',
  'assess',
  'home',
  'admin',
] as const;
export type SceneId = (typeof SCENE_IDS)[number];

export const TOOL_IDS = [
  'okulink-plus',
  'drillpark',
  'miraiseed',
  'canva',
  'kahoot',
  'padlet',
  'teams',
  'word',
  'excel',
  'powerpoint',
  'forms',
  'onenote',
  'ai',
  'other',
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const SCHOOL_IDS = ['elementary', 'junior'] as const;
export type SchoolId = (typeof SCHOOL_IDS)[number];

// 事例が1件以上ある教科だけを UI に出す（CLAUDE.md §4.2）。語彙だけ先に定義しておく。
export const SUBJECT_IDS = [
  'japanese',
  'social',
  'math',
  'science',
  'life',
  'music',
  'art',
  'craft',
  'home',
  'pe',
  'english',
  'moral',
  'period',
  'special',
  'tech',
  'general',
] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

// 領域色は装飾ではなく識別子。色だけで意味を伝えないため、必ず label を併記する。
export const DOMAINS: Record<DomainId, { label: string; short: string; color: string }> = {
  'speak-listen': { label: '話すこと・聞くこと', short: '話す・聞く', color: 'var(--d-speak)' },
  write: { label: '書くこと', short: '書く', color: 'var(--d-write)' },
  read: { label: '読むこと', short: '読む', color: 'var(--d-read)' },
  language: { label: '言葉の特徴や使い方', short: '言葉の特徴', color: 'var(--d-language)' },
  handwriting: { label: '書写', short: '書写', color: 'var(--d-handwriting)' },
  'reading-life': { label: '読書', short: '読書', color: 'var(--d-reading)' },
};

export const SCENES: Record<SceneId, { label: string; hint: string }> = {
  intro: { label: '導入', hint: '単元や本時のはじめ' },
  individual: { label: '個別', hint: '一人で取り組む時間' },
  share: { label: '共有', hint: '互いの考えを見せ合う' },
  discuss: { label: '話し合い', hint: '考えを突き合わせる' },
  reflect: { label: '振り返り', hint: '学びを言葉にする' },
  assess: { label: '評価', hint: '見取り・記録' },
  home: { label: '家庭', hint: '持ち帰り・宿題' },
  admin: { label: '校務', hint: '授業の外の仕事' },
};

export const TOOLS: Record<ToolId, string> = {
  'okulink-plus': 'オクリンクプラス',
  drillpark: 'ドリルパーク',
  // 製品を特定できないとき、または製品をまたぐ資料のときだけ使う
  miraiseed: 'ミライシード',
  canva: 'Canva',
  kahoot: 'Kahoot!',
  padlet: 'Padlet',
  teams: 'Teams',
  word: 'Word',
  excel: 'Excel',
  powerpoint: 'PowerPoint',
  forms: 'Forms',
  onenote: 'OneNote',
  ai: '生成AI',
  other: 'その他',
};

export const SCHOOLS: Record<SchoolId, string> = {
  elementary: '小学校',
  junior: '中学校',
};

export const SUBJECTS: Record<SubjectId, string> = {
  japanese: '国語',
  social: '社会',
  math: '算数・数学',
  science: '理科',
  life: '生活',
  music: '音楽',
  art: '図画工作・美術',
  craft: '技術・家庭（技術）',
  home: '家庭',
  pe: '体育・保健体育',
  english: '外国語',
  moral: '道徳',
  period: '総合的な学習の時間',
  special: '特別活動',
  tech: '情報',
  general: '教科共通',
};

// ★は使わない（2026-09-08 運営者の指示）。言葉でそのまま出す。
export const EFFORTS: Record<number, { label: string }> = {
  1: { label: '5分以内' },
  2: { label: '事前準備30分' },
  3: { label: '単元設計が必要' },
};

export const LICENSES: Record<string, string> = {
  'gov-open': '出典明示で複製・翻案が可',
  'link-only': 'リンクと自作要約のみ',
  permitted: '個別許諾の範囲内',
  original: 'このサイトが考えたもの',
};

export const effortText = (n: number) => {
  const e = EFFORTS[n] ?? EFFORTS[1]!;
  return `準備 ${e.label}`;
};

// 領域が未設定の事例もある。その場合は色を持たせず、ラベルも出さない。
export const domainColor = (ids: readonly string[]) => {
  const first = ids.find((id): id is DomainId => id in DOMAINS);
  return first ? DOMAINS[first].color : 'var(--rule)';
};
