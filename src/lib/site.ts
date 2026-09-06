export const SITE = {
  title: '国語のICT活用ヒント',
  tagline: '有志運営・非公式',
  description:
    '小中学校の国語の授業で使えるICT活用事例を、公的機関と事業者の公開情報から集めて並べています。',
  // CLAUDE.md §2.4。全ページのフッターと /about に出す。
  disclaimer:
    'このサイトは有志が個人で運営しています。佐倉市教育委員会の公式サイトではなく、掲載内容は市の公式見解ではありません。各ツールの利用可否や生成AIの取扱いは、必ず所属校で最新の規程を確認してください。',
} as const;

/**
 * 「役に立った」ボタン（CLAUDE.md フェーズ5、§11）。
 *
 * このサイトは GitHub Pages の静的サイトなので、押した数を自分で数えることはできない。
 * `countUrl` を空のままにすると、押した記録は**その端末の中だけ**に残る。
 * 運営者は数を見られないが、読み手には「押した」状態が残り、外部へは何も送らない。
 *
 * 集計したくなったら、事例の識別子だけを受け取る受け口のURLをここに書く。
 * 送るのは事例の識別子だけで、閲覧者を識別する情報は送らない。
 */
export const HELPFUL = {
  countUrl: 'https://kokugo-helpful.japanese-ict-hints.workers.dev',
  label: 'この事例は役に立ちましたか',
  button: '役に立った',
  thanks: 'ありがとうございました',
} as const;

// base（GitHub Pages のサブディレクトリ）を吸収する。リンクは必ずこれを通す。
export const url = (path: string) => {
  const base = import.meta.env.BASE_URL || '/';
  const left = base.endsWith('/') ? base.slice(0, -1) : base;
  const right = path.startsWith('/') ? path : `/${path}`;
  return `${left}${right}`;
};

export const formatDate = (d: Date | null) =>
  d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : '';

export const formatISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export const formatShort = (d: Date | null) =>
  d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` : '';
