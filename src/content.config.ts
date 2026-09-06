import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  DOMAIN_IDS,
  SCENE_IDS,
  SCHOOL_IDS,
  SUBJECT_IDS,
  TOOL_IDS,
} from './lib/vocab';
import { CURRICULUM_CODES } from './lib/curriculum';

// YAML は素の日付を Date で返すが、引用符つきで書かれても壊れないようにしておく。
const toDate = (v: unknown) => (v instanceof Date ? v : new Date(String(v)));
const requiredDate = z
  .union([z.date(), z.string()])
  .transform(toDate)
  .refine((d) => !Number.isNaN(d.getTime()), { message: '日付として読めません' });
const nullableDate = z
  .union([z.date(), z.string(), z.null()])
  .default(null)
  .transform((v) => (v === null ? null : toDate(v)))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: '日付として読めません' });

const tips = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tips' }),
  schema: z
    .object({
    // source = 出典のある事例。original = このサイトが考えたもの（CLAUDE.md §4.3）
    origin: z.enum(['source', 'original']).default('source'),
    title: z.string().max(40, { message: 'title は40字以内' }),
    summary: z.string().max(120, { message: 'summary は120字以内' }),
    source: z.object({
      // original の事例は出典URLを持たない
      url: z.union([z.string().url(), z.literal('')]),
      publisher: z.string(),
      region: z.string(),
      published: nullableDate,
      retrieved: requiredDate,
      license: z.enum(['gov-open', 'link-only', 'permitted', 'original']),
      verified: z.enum(['fetched', 'listed', 'original']),
    }),
    tools: z.array(z.enum(TOOL_IDS)).default([]),
    school: z.array(z.enum(SCHOOL_IDS)).min(1),
    subjects: z.array(z.enum(SUBJECT_IDS)).min(1),
    domains: z.array(z.enum(DOMAIN_IDS)).default([]),
    scenes: z.array(z.enum(SCENE_IDS)).default([]),
    effort: z.number().int().min(1).max(3),
    grade: z.string().nullable().default(null),
    // 出典が単元名・教材名を示している場合だけ書く。推測しない（CLAUDE.md §4.1）
    unit: z.string().max(40).default(''),
    // 自作の手順。出典の表現をなぞらず、事実としての流れだけを書く（CLAUDE.md §7.4）
    howto: z.array(z.string().max(60, { message: 'howto の各行は60字以内' })).max(6).default([]),
    curriculum: z
      .array(z.string())
      .default([])
      .refine((codes) => codes.every((c) => CURRICULUM_CODES.includes(c)), {
        message: '学習指導要領コードが表にない。scripts/curriculum.ts で作った一覧から選ぶ',
      }),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    added: requiredDate,
    note: z.string().default(''),
    })
    .superRefine((d, ctx) => {
      // 自作の事例に出典があるように見せない。逆に、出典のある事例のURLは必須
      if (d.origin === 'original') {
        if (d.source.url !== '') {
          ctx.addIssue({ code: 'custom', message: 'origin: original の事例に出典URLは書けない' });
        }
        if (d.source.publisher !== 'このサイト') {
          ctx.addIssue({ code: 'custom', message: 'origin: original の publisher は「このサイト」にする' });
        }
        if (d.source.license !== 'original') {
          ctx.addIssue({ code: 'custom', message: 'origin: original の license は original にする' });
        }
      } else {
        if (d.source.url === '') {
          ctx.addIssue({ code: 'custom', message: '出典のある事例には url が要る' });
        }
        if (d.source.license === 'original') {
          ctx.addIssue({ code: 'custom', message: 'license: original は自作の事例だけ' });
        }
      }
    }),
});

export const collections = { tips };
