// 自動生成。scripts/curriculum.ts で作り直す。手で編集しない。
// 出典：「学習指導要領コードのコード表（全体版）」（文部科学省）
// （https://www.mext.go.jp/a_menu/other/data_00002.htm）（2026-09-06に利用）
// 小学校【82V11】・中学校【83V11】（平成29年告示）から、国語の領域の単位だけを抜き出したもの。

export type CurriculumEntry = { code: string; label: string; school: string; segmentLabel: string };

export const CURRICULUM: Record<string, CurriculumEntry> = {
  '82102A3100000000': { code: '82102A3100000000', label: '知識及び技能', school: '小学校', segmentLabel: '第１学年及び第２学年' },
  '82102A3210000000': { code: '82102A3210000000', label: '話すこと・聞くこと', school: '小学校', segmentLabel: '第１学年及び第２学年' },
  '82102A3220000000': { code: '82102A3220000000', label: '書くこと', school: '小学校', segmentLabel: '第１学年及び第２学年' },
  '82102A3230000000': { code: '82102A3230000000', label: '読むこと', school: '小学校', segmentLabel: '第１学年及び第２学年' },
  '82102C3100000000': { code: '82102C3100000000', label: '知識及び技能', school: '小学校', segmentLabel: '第３学年及び第４学年' },
  '82102C3210000000': { code: '82102C3210000000', label: '話すこと・聞くこと', school: '小学校', segmentLabel: '第３学年及び第４学年' },
  '82102C3220000000': { code: '82102C3220000000', label: '書くこと', school: '小学校', segmentLabel: '第３学年及び第４学年' },
  '82102C3230000000': { code: '82102C3230000000', label: '読むこと', school: '小学校', segmentLabel: '第３学年及び第４学年' },
  '82102D3100000000': { code: '82102D3100000000', label: '知識及び技能', school: '小学校', segmentLabel: '第５学年及び第６学年' },
  '82102D3210000000': { code: '82102D3210000000', label: '話すこと・聞くこと', school: '小学校', segmentLabel: '第５学年及び第６学年' },
  '82102D3220000000': { code: '82102D3220000000', label: '書くこと', school: '小学校', segmentLabel: '第５学年及び第６学年' },
  '82102D3230000000': { code: '82102D3230000000', label: '読むこと', school: '小学校', segmentLabel: '第５学年及び第６学年' },
  '8310213100000000': { code: '8310213100000000', label: '知識及び技能', school: '中学校', segmentLabel: '第１学年' },
  '8310213210000000': { code: '8310213210000000', label: '話すこと・聞くこと', school: '中学校', segmentLabel: '第１学年' },
  '8310213220000000': { code: '8310213220000000', label: '書くこと', school: '中学校', segmentLabel: '第１学年' },
  '8310213230000000': { code: '8310213230000000', label: '読むこと', school: '中学校', segmentLabel: '第１学年' },
  '8310223100000000': { code: '8310223100000000', label: '知識及び技能', school: '中学校', segmentLabel: '第２学年' },
  '8310223210000000': { code: '8310223210000000', label: '話すこと・聞くこと', school: '中学校', segmentLabel: '第２学年' },
  '8310223220000000': { code: '8310223220000000', label: '書くこと', school: '中学校', segmentLabel: '第２学年' },
  '8310223230000000': { code: '8310223230000000', label: '読むこと', school: '中学校', segmentLabel: '第２学年' },
  '8310233100000000': { code: '8310233100000000', label: '知識及び技能', school: '中学校', segmentLabel: '第３学年' },
  '8310233210000000': { code: '8310233210000000', label: '話すこと・聞くこと', school: '中学校', segmentLabel: '第３学年' },
  '8310233220000000': { code: '8310233220000000', label: '書くこと', school: '中学校', segmentLabel: '第３学年' },
  '8310233230000000': { code: '8310233230000000', label: '読むこと', school: '中学校', segmentLabel: '第３学年' },
};

export const CURRICULUM_CODES = Object.keys(CURRICULUM);
