// 要約は Claude が書く（CLAUDE.md §5.3）。運営者は要約を書かない。
// 出力はJSONで受け取り、Zodで検証してから書き出す。落ちたものはログに残す。

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

const DOMAINS = ['speak-listen', 'write', 'read', 'language', 'handwriting', 'reading-life'] as const;
const SCENES = ['intro', 'individual', 'share', 'discuss', 'reflect', 'assess', 'home', 'admin'] as const;
const TOOLS = [
  'okulink-plus','drillpark','miraiseed','canva','kahoot','padlet','teams','word','excel',
  'powerpoint','forms','onenote','ai','other',
] as const;
const SCHOOLS = ['elementary', 'junior'] as const;

export const SummarySchema = z.object({
  reject: z.boolean(),
  reject_reason: z.string(),
  title: z.string(),
  summary: z.string(),
  howto: z.array(z.string()),
  domains: z.array(z.enum(DOMAINS)),
  scenes: z.array(z.enum(SCENES)),
  tools: z.array(z.enum(TOOLS)),
  school: z.array(z.enum(SCHOOLS)),
  effort: z.number().int().min(1).max(3),
  grade: z.string(),
  note: z.string(),
});
export type Summary = z.infer<typeof SummarySchema>;

/** 書き出す前の検査。字数はスキーマ（src/content.config.ts）と同じ制限にそろえる */
export function validate(s: Summary): string[] {
  const bad: string[] = [];
  if (s.reject) return bad;
  if (!s.title || s.title.length > 40) bad.push(`title が40字以内でない（${s.title.length}字）`);
  if (!s.summary || s.summary.length > 120) bad.push(`summary が120字以内でない（${s.summary.length}字）`);
  if (s.howto.length > 6) bad.push('howto が6行を超えている');
  for (const h of s.howto) if (h.length > 60) bad.push(`howto の行が60字を超えている: ${h.slice(0, 20)}…`);
  if (s.school.length === 0) bad.push('school が空');
  return bad;
}

const PROMPT = `以下は、学校のICT活用事例を紹介するWebページまたは配布資料の本文です。
学校名と教職員の氏名は、あらかじめ〔小学校〕〔氏名〕のように伏せてあります。

小中学校の国語の授業でこれを使いたい教員に向けて、以下を出力してください。

- title: 40字以内。何をするのかが分かる動詞で終える見出し。原文の見出しをそのまま使わない
- summary: 120字以内。何をする実践か、どんな場面で効くか、準備の重さが分かるように書く
- howto: 授業での手順。1行60字以内で3〜6行。本文に書かれている流れだけを使う
- domains / scenes / tools / school: 指定の語彙から選ぶ
- effort: 1=5分以内 2=事前準備30分 3=単元設計が必要
- grade: 明記があれば「小5」「中1」等。無ければ空文字
- note: 原文が教科・学年・ツールを特定していない場合、その旨

制約：
- 原文の語順や言い回しを再利用しない。要約であって抜粋ではない。howto も同じ
- howto に本文が書いていない手順を足さない。書かれていなければ行を減らす
- 本文に書かれていないことを補わない。学年やツール名が不明なら grade は空文字にする
- effort は本文からの推定でよいが、推定である旨を note に書く
- 伏せ字（〔小学校〕〔氏名〕）を復元しようとしない。出力にも学校名・氏名を書かない
- 国語の授業に転用できない内容なら reject: true と reject_reason を返す
- 小中学校の事例でない場合も reject: true を返す`;

export async function summarize(text: string, model: string): Promise<Summary> {
  const client = new Anthropic();
  const res = await client.messages.parse({
    model,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: zodOutputFormat(SummarySchema) },
    messages: [{ role: 'user', content: `${PROMPT}\n\n---\n\n${text}` }],
  });
  if (res.stop_reason === 'refusal') {
    throw new Error(`モデルが応答を拒否した: ${res.stop_details?.category ?? '理由不明'}`);
  }
  if (!res.parsed_output) throw new Error('JSONとして受け取れなかった');
  return res.parsed_output;
}

export const hasCredentials = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
