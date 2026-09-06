// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages に出す前に site / base を実際の値へ書き換える。
//   ユーザーページ  https://<user>.github.io/          → site: そのURL, base: '/'
//   プロジェクトページ https://<user>.github.io/<repo>/ → site: 'https://<user>.github.io', base: '/<repo>'
// リンクは src/lib/url.ts の url() を通しているので、base を変えるだけで全ページ追従する。
export default defineConfig({
  site: 'https://example.github.io',
  base: '/',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  markdown: {
    // 外部サイトの画像は一切配信しない（CLAUDE.md §2.1）。
    // 本文中に画像記法が混入したらビルド時に気づけるよう、拡張は入れない。
    smartypants: false,
  },
});
