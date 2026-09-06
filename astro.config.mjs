// @ts-check
import { defineConfig } from 'astro/config';

// 公開先は https://<GitHubユーザー名>.github.io/kokugo-ict-hints/ のプロジェクトページ。
// site は canonical と sitemap にしか使わないが、<GitHubユーザー名> を実際の値に直すこと。
// リンクは src/lib/site.ts の url() を通しているので、base を変えれば全ページ追従する。
export default defineConfig({
  site: 'https://GITHUB_USER.github.io',
  base: '/kokugo-ict-hints',
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  markdown: {
    // 外部サイトの画像は一切配信しない（CLAUDE.md §2.1）。
    // 本文中に画像記法が混入したらビルド時に気づけるよう、拡張は入れない。
    smartypants: false,
  },
});
