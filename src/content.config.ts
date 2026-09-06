import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  DOMAIN_IDS,
  SCENE_IDS,
  SCHOOL_IDS,
  SUBJECT_IDS,
  TOOL_IDS,
} from './lib/vocab';

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
  schema: z.object({
    title: z.string().max(40, { message: 'title は40字以内' }),
    summary: z.string().max(120, { message: 'summary は120字以内' }),
    source: z.object({
      url: z.string().url(),
      publisher: z.string(),
      region: z.string(),
      published: nullableDate,
      retrieved: requiredDate,
      license: z.enum(['gov-open', 'link-only', 'permitted']),
      verified: z.enum(['fetched', 'listed']),
    }),
    tools: z.array(z.enum(TOOL_IDS)).default([]),
    school: z.array(z.enum(SCHOOL_IDS)).min(1),
    subjects: z.array(z.enum(SUBJECT_IDS)).min(1),
    domains: z.array(z.enum(DOMAIN_IDS)).default([]),
    scenes: z.array(z.enum(SCENE_IDS)).default([]),
    effort: z.number().int().min(1).max(3),
    grade: z.string().nullable().default(null),
    curriculum: z.array(z.string()).default([]),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    added: requiredDate,
    note: z.string().default(''),
  }),
});

export const collections = { tips };
