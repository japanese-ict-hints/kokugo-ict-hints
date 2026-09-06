# 国語 初期コンテンツ 10件（フェーズ1用）

Claude Code へ：各ブロックを `src/content/tips/{slug}.md` として書き出すこと。
`---` で囲まれた部分が front matter、その下が本文。仕様は `CLAUDE.md` §4 のスキーマに従う。

**確認状況について**
- `verified: fetched` … 出典ページ本文を実際に取得して内容を確認済み（2026-09-05）
- `verified: listed` … 検索結果の見出し・抜粋のみで確認。**本文未確認**。公開前に1件ずつ開いて確認すること
- `effort` の値は本文からの推定であり、出典に明記されているものではない
- `domains` はサイト側の対応づけ（推定）。`verified: listed` の件は本文確認時に見直すこと
- `grade` は出典（検索結果の抜粋を含む）に学年の明記があるものだけ記入。それ以外は null

**今回わかった穴**：中学校国語の、単元レベルの事例が極端に少ない。
公的サイトの事例は「小学校5学年以上」等の括りで中学校を含むものが多く、中学校国語に固有の
事例はミライシードの事例BOOKに数件ある程度だった。中学校国語は別途、県総合教育センターや
教科研究会の資料を探す必要がある（`CLAUDE.md` §3.1・§11 参照）。

---

```markdown
<!-- file: src/content/tips/studx-hanashi-kaki-kotoba.md -->
---
title: "オンラインの書き込みの乱れを、話し言葉と書き言葉の学習につなげる"
summary: "一言日記をオンラインで続けるうちに、ネットスラングまじりの書き込みが増えた。それを叱るのではなく国語の教材にして、読み手を意識した書き方をクラスで話し合った実践。情報モラル指導を兼ねられる。"
source:
  url: "https://www.mext.go.jp/studxstyle/skillup/3.html"
  publisher: "StuDX Style（文部科学省）"
  region: "国"
  published: null
  retrieved: 2026-09-05
  license: gov-open
  verified: fetched
tools: [teams, miraiseed]
school: [elementary, junior]
subjects: [japanese]
domains: [language, write]
scenes: [share, reflect]
effort: 1
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "出典は対象を小学校5学年以上とし、ツール名は特定せず「コメント機能」と記載。佐倉市ではTeamsのチャネル投稿やオクリンクプラスのコメントで同じことができる（この対応づけはサイト側の補足）。"
---

書く相手と場が変われば、ふさわしい言葉も変わる。この事例は、その気づきを子供の失敗から
引き出しているところが使いやすい。先に禁止事項を並べるのではなく、実際に崩れた書き込みを
見せてから「誰が読んでも分かる書き方」を考えさせる順序になっている。
```

```markdown
<!-- file: src/content/tips/studx-speech-voice-input.md -->
---
title: "音声入力でスピーチを文字起こしし、自分の話し方を自分で点検する"
summary: "文書作成ソフトの音声認識で自分のスピーチを文字にする練習法。読み返すだけの練習と違い、聞き取られなかった箇所がその場で見えるので、発音や言い直しの癖に自分で気づける。原稿づくりの前段でも使える。"
source:
  url: "https://www.mext.go.jp/studxstyle/skillup/7.html"
  publisher: "StuDX Style（文部科学省）"
  region: "国"
  published: null
  retrieved: 2026-09-05
  license: gov-open
  verified: fetched
tools: [word]
school: [elementary, junior]
subjects: [japanese]
domains: [speak-listen]
scenes: [individual]
effort: 1
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "出典は対象を小学校5学年以上とする。教室で一斉に行うと声が重なるため、出典では外付けマイクを使った例も紹介されている。"
---

話すことの指導は、練習の中身が教師から見えにくい。文字起こしを介すと、子供が自分で
点検できる材料になる。話す速さや間まで測れるわけではないので、評価ではなく練習の道具として
位置づけるのが無難。
```

```markdown
<!-- file: src/content/tips/studx-whiteboard-idea-sharing.md -->
---
title: "全員の考えをホワイトボードに並べ、手が止まった子が友達を参照できるようにする"
summary: "一人一枚のワークシートをデジタルホワイトボードで配り、互いの画面を見られる状態にしておく方法。考えが進まない子が友達の書き込みをヒントにでき、教師は誰がどこで止まっているかを一覧で把握できる。"
source:
  url: "https://www.mext.go.jp/studxstyle/students/8.html"
  publisher: "StuDX Style（文部科学省）"
  region: "国"
  published: null
  retrieved: 2026-09-05
  license: gov-open
  verified: fetched
tools: [miraiseed, teams]
school: [elementary, junior]
subjects: [japanese]
domains: [read]
scenes: [share, discuss]
effort: 2
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "出典は教科を特定していない汎用事例。国語では、叙述の根拠に線を引いて示す場面や、人物の心情を書き込む場面に転用できる（この読み替えはサイト側の補足）。"
---

他者参照を「見せ合う時間」として最後に取るのではなく、書いている最中からずっと開いておく
のがこの事例の要点。ただし常時公開は、書くのが遅い子には写す誘惑にもなる。
最初の数分は非公開、途中から公開に切り替える運用も検討する価値がある。
```

```markdown
<!-- file: src/content/tips/miraiseed-persuasive-writing.md -->
---
title: "添削コメントつきの作文を全員分公開し、友達の直し方を見ながら推敲する"
summary: "小学6年の説得力のある文章を書く単元での実践。前時に提出させた作文へ教師が添削コメントを入れ、全員分を公開設定にする。子供は自分の指摘と友達の指摘を見比べながら構成や表現を直していく。"
source:
  url: "https://bso.benesse.ne.jp/miraiseed/fansite/usecase/1189192_1503.html"
  publisher: "ミライシード ファンサイト（ベネッセ）"
  region: "民間"
  published: null
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [miraiseed]
school: [elementary]
subjects: [japanese]
domains: [write]
scenes: [individual, share]
effort: 2
grade: "小6"
curriculum: []
status: draft
added: 2026-09-05
note: "検索結果の抜粋で確認。本文は未読のため、公開前に要確認。"
---

推敲は、自分の文章だけを見ていても手がかりが少ない。他人への添削コメントは、自分の文章の
どこを疑えばよいかの見本になる。教師の負担は前時の添削に集中するので、単元のどこで一度だけ
まとめて添削するかを先に決めておきたい。
```

```markdown
<!-- file: src/content/tips/miraiseed-drill-and-collaboration.md -->
---
title: "授業の前後にドリル、授業中に協働学習を置いて単元を組み立てる"
summary: "小学5年国語で、デジタルドリルと協働学習アプリを組み合わせた単元設計。個別の習熟と、話し合いで考えを深める活動を分けて配置し、子供が自分で進度を決めながら単元を進められるようにしている。"
source:
  url: "https://bso.benesse.ne.jp/miraiseed/fansite/usecase/1189182_1503.html"
  publisher: "ミライシード ファンサイト（ベネッセ）"
  region: "民間"
  published: null
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [miraiseed]
school: [elementary]
subjects: [japanese]
domains: []
scenes: [individual, discuss]
effort: 3
grade: "小5"
curriculum: []
status: draft
added: 2026-09-05
note: "検索結果の抜粋で確認。本文は未読のため、公開前に要確認。単元全体の設計を伴うため、1時間だけ真似るのは難しい。領域は抜粋からは特定できないため domains は未設定。"
---

1時間の工夫ではなく単元の組み替えなので、準備は重い。校内研究のテーマとして扱うか、
学年で足並みをそろえて試すのに向く。
```

```markdown
<!-- file: src/content/tips/miraiseed-imagining-story-world.md -->
---
title: "一人ひとりの読み取りを並べて共有し、作品世界の像を具体にする"
summary: "物語文の読みで、各自が思い描いた場面や人物像をカードにして共有する実践。ばらばらの読み取りを並べることで、自分の中の像がはっきりし、作者の意図を考えたり友達と伝え合ったりする足場になる。"
source:
  url: "https://bso.benesse.ne.jp/miraiseed/fansite/usecase/1190052_1503.html"
  publisher: "ミライシード ファンサイト（ベネッセ）"
  region: "民間"
  published: null
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [miraiseed]
school: [elementary]
subjects: [japanese]
domains: [read]
scenes: [share, discuss]
effort: 2
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "検索結果の抜粋で確認。学年は明記されていない。公開前に要確認。"
---

読みの共有は、正解を一つに収束させるためではなく、像を具体にするために行う。
この事例はその向きがはっきりしている。
```

```markdown
<!-- file: src/content/tips/miraiseed-usecase-book-2026spring.md -->
---
title: "活用事例BOOK（2026年度春版）で小3から小6の国語事例をまとめて読む"
summary: "ベネッセが公開している事例集のPDF。オクリンクプラスが国語で最も使われているという利用傾向をもとに、小学3年から6年の国語事例を中心に構成されている。中学校は各教科1事例。1学期の単元が題材。"
source:
  url: "https://bso.benesse.ne.jp/miraiseed/fansite/info/1191483_1506.html"
  publisher: "ミライシード ファンサイト（ベネッセ）"
  region: "民間"
  published: null
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [miraiseed]
school: [elementary, junior]
subjects: [japanese]
domains: []
scenes: [intro, individual, share, reflect]
effort: 1
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "個別の事例ではなく事例集。中学校国語の事例はここに含まれる可能性が高い。PDFの再配布はせず、必ずリンクで案内する。複数領域にまたがるため domains は未設定。"
---

まとめて読める資料なので、初めてオクリンクプラスを使う教員に最初に渡すものとして使える。
掲載されているカードが教材ライブラリーにも入っているため、読んでそのまま試せるのが利点。
```

```markdown
<!-- file: src/content/tips/canva-empathy-map-poem.md -->
---
title: "共感マップでモノになりきり、視点を決めてから詩を書く"
summary: "小学3年国語で、Canvaに簡易な共感マップを作り、人間以外のモノの立場に立って詩を書いた実践。書き出す前に「何を見て、何を感じているか」を枠に埋めるため、書くことが決まらない子の手が動きやすい。"
source:
  url: "https://edtechzine.jp/article/detail/8632"
  publisher: "EdTechZine（翔泳社）"
  region: "民間"
  published: 2023-06-07
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [canva]
school: [elementary]
subjects: [japanese]
domains: [write]
scenes: [intro, individual]
effort: 2
grade: "小3"
curriculum: []
status: draft
added: 2026-09-05
note: "検索結果の抜粋で確認。記事は2023年公開のため、Canvaの操作手順は現行画面と異なる可能性がある。"
---

物語の人物の心情を読み取る場面でも同じ枠が使える、と筆者は述べている。
枠を配るだけなので準備は軽いが、共感マップという枠組み自体を子供に説明する時間は要る。
```

```markdown
<!-- file: src/content/tips/canva-teaching-materials-lab.md -->
---
title: "ベン図・年表・比較表のテンプレートを探して、思考ツールをすぐ配る"
summary: "Canvaが公開している学習教材のテンプレート集。ベン図、年表、考えを比べる枠、ペア学習用のシートなどが揃っており、検索して選び、そのまま編集して配れる。枠を自作する時間を省ける。"
source:
  url: "https://www.canva.com/ja_jp/learn-grid/"
  publisher: "Canva"
  region: "民間"
  published: null
  retrieved: 2026-09-05
  license: link-only
  verified: listed
tools: [canva]
school: [elementary, junior]
subjects: [japanese]
domains: [read]
scenes: [intro, individual, share]
effort: 1
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "教科横断のテンプレート集。国語では、二つの説明文の比較にベン図、物語の出来事の整理に年表が使える（この対応づけはサイト側の補足）。"
---

道具そのものではなく、枠を配る手間を減らす話。国語は思考ツールと相性がよい一方、
枠を毎回作るのが面倒で敬遠されやすいので、既製の枠から始めるのは現実的。
```

```markdown
<!-- file: src/content/tips/mext-kokugo-ict-reference.md -->
---
title: "文部科学省の資料で、国語科がICTを使う場面の枠組みをそろえる"
summary: "教科ごとにICT活用の考え方をまとめた文部科学省の参考資料のうち、国語科の分冊。個々の便利な使い方ではなく、国語科の目標に照らしてどの場面でICTが効くのかという枠組みが示されている。"
source:
  url: "https://www.mext.go.jp/content/20200911-mxt_jogai01-000009772_01.pdf"
  publisher: "文部科学省"
  region: "国"
  published: 2020-09-11
  retrieved: 2026-09-05
  license: gov-open
  verified: listed
tools: [other]
school: [elementary, junior]
subjects: [japanese]
domains: [speak-listen, write, read, language, handwriting, reading-life]
scenes: [intro]
effort: 1
grade: null
curriculum: []
status: draft
added: 2026-09-05
note: "文部科学省自身が、この資料は令和2年9月時点のもので最新版はStuDX Styleを見るよう案内している（https://www.mext.go.jp/a_menu/shotou/zyouhou/mext_00915.html で確認、2026-09-05）。校内研修の枠組みとしては今も使えるが、ツールの記述は古い。"
---

個別の事例に入る前に、国語科としての位置づけを一度そろえたいときに読む資料。
校内研修の導入で使うことを想定している。個々の操作を知りたい教員には向かない。
```

---

## 出典の表示について

`license: gov-open` の事例で本文を引用・翻案する場合は、詳細ページに次の表記を出すこと。

> 出典：「StuDX Style」（文部科学省）（該当URL）（2026年9月5日に利用）を加工して作成

`license: link-only` の事例では、本文の引用をせず、出典名・URL・取得日のみを表示する。

## 次にやること

1. `verified: listed` の6件を開いて内容を確認し、要約を直す
2. 中学校国語の事例を別ルートで探す（千葉県総合教育センター、各教科書会社の指導資料、
   ミライシード活用事例BOOKの中学校パート）
3. 佐倉市で実際に使えるかの確認（Canva教育版の導入状況、生成AIの取扱い）を各事例に反映
