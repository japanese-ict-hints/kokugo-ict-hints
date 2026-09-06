# 「役に立った」の受け口

静的サイトなので、押した数を数えるには外に受け口が要る。これは Cloudflare Workers で
動く最小の実装。無料の範囲で足りる。

保存するのは**事例ごとの数だけ**。閲覧者を識別する情報は保存しない。

## 置き方

1. Cloudflare のアカウントを作る（無料）
2. `npm install -g wrangler` して `wrangler login`
3. KV を作る

   ```bash
   wrangler kv namespace create HELPFUL
   ```

   表示された `id` を `wrangler.toml` に書く。

4. 公開する

   ```bash
   cd scripts/helpful-worker
   wrangler deploy
   ```

   `https://kokugo-helpful.<アカウント名>.workers.dev` のようなURLが出る。

5. サイト側に書く。`src/lib/site.ts` の `HELPFUL.countUrl` にそのURLを入れて、
   ビルドして公開する。

## 確かめ方

```bash
curl "https://<URL>/?slug=studx-speech-voice-input"
curl -X POST "https://<URL>/" -H 'content-type: application/json' \
  -d '{"slug":"studx-speech-voice-input"}'
```

## 分かったうえで使うこと

- **連打は完全には防げない。** 同じ端末からの2回目はブラウザ側で止めているが、
  保存領域を消せばまた押せる。校内で使う規模では実害は小さいと考えている。
  気になるなら Cloudflare 側でレート制限をかける
- **受け口には閲覧者のIPアドレスが届く。** Cloudflare の運用として記録される。
  保存はしないが、経路として第三者が1つ増えることは `/privacy` に書くこと
- `ALLOWED_ORIGIN` はサイトのオリジンに合わせる。変えると他所から呼べてしまう
