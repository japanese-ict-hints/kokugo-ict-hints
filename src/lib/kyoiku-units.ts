// scripts/kyoiku-units.ts が作る。手で書き換えない。
// 教育出版の年間指導計画・評価計画（案）に出てくる単元名だけを残したもの。
// 確認日 2026-09-08。もとにしたPDF:
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo1_nenkeihyouka_2404.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo2_nenkeihyouka_2404.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo3_nenkeihyouka_2504.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo4_nenkeihyouka_2404.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo5_nenkeihyouka_2404.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/shou/kokugo/files/r6kokugo6_nenkeihyouka_2504.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/chuu/kokugo/files/r7kokugo1_nenkeihyouka_2504.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/chuu/kokugo/files/r7kokugo2_nenkeihyouka_2504.pdf
//   https://www.kyoiku-shuppan.co.jp/textbook/chuu/kokugo/files/r7kokugo3_nenkeihyouka_2504.pdf

export const KYOIKU_UNITS: ReadonlySet<string> = new Set([
  'おおきなかぶ',
  'ごんぎつね',
  'まちがえやすい漢字',
  'スイミー',
  'モチモチの木',
  '一つの花',
  '仮名の由来',
  '同じ読み方の漢字',
  '少年の日の思い出',
  '平家物語',
  '慣用句',
  '故郷',
  '文の組み立て',
  '方言と共通語',
  '日づけとよう日',
  '枕草子',
  '漢字の広場',
  '漢字の意味',
  '漢字の成り立ち',
  '白いぼうし',
  '複合語',
  '走れメロス',
]);
