# 国語のICT活用ヒント

小中学校の国語で使えるICT活用事例を集めて並べる静的サイト。
仕様は [CLAUDE.md](./CLAUDE.md) が正。ここには動かし方だけを書く。

## いまどこまで出来ているか

フェーズ1（CLAUDE.md §10）まで。

- Astro の雛形、Content Collections + Zod のスキーマ
- トップ、事例詳細、場面別・領域別・ツール別・校種別の一覧、収集源、更新履歴、about、privacy、404
- 校種×場面の組み合わせ一覧 `/school/{school}/scenes/{scene}/`
  （校種ページの場面チップの件数と行き先を一致させるために足した。CLAUDE.md §4.3 には無いURL）
- `content-japanese-seed.md` の国語10件を `src/content/tips/` に投入
- GitHub Pages へのデプロイ用ワークフロー

フェーズ2（Pagefind検索）も入った。フェーズ3の前半（`license-check.ts` と `discover.ts`）も動く。都道府県10ホストで試し、
`sources.yml` に5件を追加したところで §10 の指示どおり止めている。

フェーズ4の収集パイプライン（`collect.ts`・`linkcheck.ts`・週次ワークフロー）も動く。
ただし要約を生成する部分は API キーが無いため未実行（下記）。

フェーズ1〜4がひととおり動く状態。
**検索について。** ビルド時に Pagefind が索引を作る（`npm run build` の後半）。日本語には癖が2つあり、
そのままでは使えなかった。

- 取りこぼす：「中学校」で13件中1件しか返さない
- 拾いすぎる：「存在しない語」で全件返す（細かく分割して当たってしまう）

そこで **並び順だけ Pagefind に任せ、採否は本文に語が含まれるかで決めている**。
Pagefind が持つ本文は詳細ページ全体なので、一覧の行より広く当たる。それでも漏れた分は、
一覧の行の文字合わせで後ろに足す。全角と半角も同じ扱いにしている（校務PCで全角入力する人向け）。

索引は最初の入力があってから読み込むので、トップの初回転送量には乗らない
（HTML 29KB + CSS 8KB。§8 の200KBに対して余裕がある）。

いま一覧は全件を書き出しているので、検索は既にあるDOMを並べ替えている。件数が増えて
全件を書き出さなくなったら、結果から行を組み立てる作りに変える必要がある。

## 動かす

Node.js 20 以上が要る（Astro 5.18 / Node 24.20 でビルド確認済み。59ページ、警告なし）。

```bash
npm install
npm run dev      # http://localhost:4321/
npm run build    # dist/ に出力
npm run preview  # ビルド結果を確認
```

**この Mac には Node が入っていない。** 確認は一時ディレクトリに展開した Node で行ったので、
続けて作業するなら nodejs.org の LTS を入れるか、nvm / Volta などを使うこと。

Node が無い状態で見た目だけ確かめたいときの逃げ道として、確認用の簡易レンダラを置いてある。
トップと事例詳細だけを `.preview/` に書き出すもので、Astro の代わりではない。
一覧ページや絞り込みは再現しないので、本番の確認には使わないこと。

```bash
python3 scripts/preview.py && open .preview/index.html
```

## 公開する

1. 公開先は https://japanese-ict-hints.github.io/kokugo-ict-hints/ （プロジェクトページ）。
   `astro.config.mjs` の `site` と `base` は設定済み。リンクはすべて `src/lib/site.ts` の
   `url()` を通しているので、リポジトリ名を変えるときは `base` だけ直せば全ページ追従する
2. GitHub の Settings → Pages で Source を GitHub Actions にする
3. `main` に push すると `.github/workflows/deploy.yml` がビルドして公開する

## 収集源を探す（フェーズ3）

```bash
npm run discover                     # 10ホストまで調べて scripts/discovered.yml に書き出す
npm run discover -- --limit 3        # ホスト数を絞る
npm run license-check https://例.jp/ # 1ホストだけ判定する
```

`discover.ts` は `sources.yml` を書き換えない。`discovered.yml` を人が見て、
**入口URLを実際に開いて200を確認してから** `sources.yml` に移す（§2.3）。

取得は `scripts/lib/http.ts` を必ず通す。robots.txt の尊重、同一ホストへ2.5秒以上の間隔、
1ホスト30ページの上限、403/429/5xx での自動停止、`.cache/fetch/` への保存はここに入っている。

初回（2026-09-06）の結果：候補103ホストから10件を調査し、9件を判定。**gov-open は0件**で、
すべて `link-only`。秋田は robots.txt を取得できず停止。東京の事例ポータルは401でログインが要る
ため除外。

## 収集する（フェーズ4）

```bash
npm run collect                       # 今週の群を処理する
npm run collect -- --group B          # 群を指定
npm run collect -- --source yamagata-c-ict --limit 3 --no-llm
npm run linkcheck                     # 出典のリンク切れ検査
```

処理の順は CLAUDE.md §5.1 のとおり。ポイントは3つ。

- **PDFはページごとに候補にする。** 教育センターの事例集は1ページ1事例の様式が多い。
  出典URLには `#page=12` を付ける
- **個人情報は取得直後に落とす**（`scripts/lib/scrub.ts`）。学校名と教職員名を伏せ字にし、
  書き出す直前にもう一度検査して、残っていたら止める
- **範囲判定は見出しと本文の頭だけで行う。** ページ全体を見ると、ナビや一覧に載っている
  他教科・他校種の語を拾って誤判定する（栃木で生活科の回を国語と誤判定した）

要約は Claude が書く（§5.3）。`ANTHROPIC_API_KEY` があれば `collect.ts` から呼ぶ。
無ければ `--no-llm` と同じ扱いで、`.cache/candidates/` に候補を書き出すだけになる。

**未検証**：要約を生成する経路は、この端末に API キーが無いため一度も実行していない。
週次ワークフローを動かす前に、`ANTHROPIC_API_KEY` を設定して1回手で流すこと。

## 事例を足す・直す

1件 = `src/content/tips/{slug}.md`。front matter の形は CLAUDE.md §4.1、
使ってよいタグは §4.2。スキーマは `src/content.config.ts` で、外れた値はビルドで落ちる。

日本語の本文は**段落ごとに1行で書く**。ソースを途中で改行すると、HTMLでは行の切れ目に
空白が入って見えることがある。

### 公開前の確認（省略しない）

- 出典の本文確認は 2026-09-06 に完了した。掲載中の8件はすべて `verified: fetched`。
  範囲外・出典消滅の2件は `archived`（`miraiseed-drill-and-collaboration` は本文が理科の事例、
  `canva-empathy-map-poem` は出典サイトがサービス終了）
- `status` は `draft` のまま。運営者が要約と著作権上の安全性を確認してから `published` に変える
  （CLAUDE.md §5.1 の品質ゲート）。詳細ページには `draft` のあいだ「下書き」と出る
- `license` が `gov-open` の事例だけ、詳細ページ末尾に出典表記が出る。
  `link-only` の事例は本文を引用しない

## ディレクトリ

```
src/
  content/tips/      事例1件 = 1ファイル
  content.config.ts  スキーマ（Zod）
  lib/               語彙・ラベル・URLヘルパ・一覧の並べ替え
  layouts/ components/ pages/
  styles/            tokens.css（CLAUDE.md §7.2 の値）と base.css
scripts/
  sources.yml        収集源の台帳。license と license_basis と license_checked が必須
  preview.py         Node なしで見た目を確かめるための確認用レンダラ
.github/workflows/
  deploy.yml         GitHub Pages への公開
```

## 確認したこと（2026-09-06 時点）

- `npm run build` が警告なしで通る。59ページ
- 内部リンク40本すべて 200。リンク切れなし
- トップの初回転送量は HTML 17KB + CSS 6.3KB。JSファイルは生成されない（検索はインライン）
- 外部サイトの画像を1枚も配信していない（`document.images.length` が 0）
- 375px 幅で横スクロールが出ない。見出しレベルの飛びなし。`outline` を消している箇所なし
- トップ→中学校→話し合い の3タップで候補一覧に着く

Lighthouse は未計測。

## 決めていないこと

CLAUDE.md §11 のほか、`astro.config.mjs` の `site` / `base`（リポジトリ名が決まってから）と、
about ページの連絡先。
