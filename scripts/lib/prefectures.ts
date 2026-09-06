// 都道府県。ホスト名にローマ字で入っていることが多いので、その対応も持つ。

export const PREFECTURES = [
  '北海道','青森','岩手','宮城','秋田','山形','福島','茨城','栃木','群馬','埼玉','千葉','東京',
  '神奈川','新潟','富山','石川','福井','山梨','長野','岐阜','静岡','愛知','三重','滋賀','京都',
  '大阪','兵庫','奈良','和歌山','鳥取','島根','岡山','広島','山口','徳島','香川','愛媛','高知',
  '福岡','佐賀','長崎','熊本','大分','宮崎','鹿児島','沖縄',
] as const;

const ROMAJI: Record<string, string> = {
  hokkaido: '北海道', aomori: '青森', iwate: '岩手', miyagi: '宮城', akita: '秋田',
  yamagata: '山形', fukushima: '福島', ibaraki: '茨城', tochigi: '栃木', gunma: '群馬',
  gunnma: '群馬', saitama: '埼玉', chiba: '千葉', tokyo: '東京', kanagawa: '神奈川',
  niigata: '新潟', toyama: '富山', ishikawa: '石川', fukui: '福井', yamanashi: '山梨',
  nagano: '長野', gifu: '岐阜', shizuoka: '静岡', aichi: '愛知', mie: '三重',
  shiga: '滋賀', kyoto: '京都', osaka: '大阪', hyogo: '兵庫', nara: '奈良',
  wakayama: '和歌山', tottori: '鳥取', shimane: '島根', okayama: '岡山', hiroshima: '広島',
  yamaguchi: '山口', tokushima: '徳島', kagawa: '香川', ehime: '愛媛', kochi: '高知',
  fukuoka: '福岡', saga: '佐賀', nagasaki: '長崎', kumamoto: '熊本', oita: '大分',
  miyazaki: '宮崎', kagoshima: '鹿児島', okinawa: '沖縄',
};

/** リンクの文字とURLの両方から都道府県を当てる */
export function prefectureOf(text: string, url: string): string | null {
  const kanji = PREFECTURES.find((p) => text.includes(p));
  if (kanji) return kanji;
  let host = '';
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    host = url.toLowerCase();
  }
  // 長い名前から先に当てる（例: yamaguchi より先に yamagata を誤検出しないように）
  const keys = Object.keys(ROMAJI).sort((a, b) => b.length - a.length);
  const hit = keys.find((k) => host.includes(k));
  return hit ? ROMAJI[hit]! : null;
}
