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

まだ無いもの：Pagefind の検索（フェーズ2）、`discover.ts` / `license-check.ts`（フェーズ3）、
`collect.ts` と週次ワークフローと `linkcheck.ts`（フェーズ4）。
トップの入力欄は、10件を絞るだけの暫定フィルタ（`src/pages/index.astro` 末尾のインラインスクリプト）。
フェーズ2で Pagefind に置き換える。

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

1. 公開先は `https://<user>.github.io/kokugo-ict-hints/`（プロジェクトページ）。
   `astro.config.mjs` の `site` にある `GITHUB_USER` を実際のユーザー名に直す。
   `base` は `/kokugo-ict-hints` に設定済み。リンクはすべて `src/lib/site.ts` の `url()` を
   通しているので、リポジトリ名を変えるときは `base` だけ直せば全ページ追従する
2. GitHub の Settings → Pages で Source を GitHub Actions にする
3. `main` に push すると `.github/workflows/deploy.yml` がビルドして公開する

## 事例を足す・直す

1件 = `src/content/tips/{slug}.md`。front matter の形は CLAUDE.md §4.1、
使ってよいタグは §4.2。スキーマは `src/content.config.ts` で、外れた値はビルドで落ちる。

日本語の本文は**段落ごとに1行で書く**。ソースを途中で改行すると、HTMLでは行の切れ目に
空白が入って見えることがある。

### 公開前の確認（省略しない）

- `status` は `draft` のまま投入してある。運営者が要約と著作権上の安全性を確認してから
  `published` に変える
- seed 10件のうち6件は `verified: listed`（本文未確認）。出典を開いて中身を確かめ、
  要約を書き直してから `fetched` にする。サイト上ではこの6件に「本文未確認」と表示している
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
