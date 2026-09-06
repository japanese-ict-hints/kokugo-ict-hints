import { politeFetch } from '../lib/http.ts';
import { links, title } from '../lib/html.ts';
const r = await politeFetch(process.argv[2]);
if (!r.ok) { console.error('取得できない', r.reason); process.exit(1); }
const pat = process.argv[3] ? new RegExp(process.argv[3]) : null;
console.log('■', title(r.body));
const seen = new Set();
for (const l of links(r.body, r.url)) {
  const t = l.text.replace(/\s+/g, ' ').trim();
  if (seen.has(l.href)) continue; seen.add(l.href);
  if (pat && !pat.test(t + ' ' + l.href)) continue;
  console.log(' ', t.slice(0, 60), '|', l.href);
}
