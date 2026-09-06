#!/usr/bin/env python3
"""確認用の簡易レンダラ（開発時のみ）。

このリポジトリの本体は Astro（src/pages/*.astro）。これはその代わりではない。
Node.js が無い端末で、CSS と本文の見え方だけを確かめるために .preview/ へ
静的HTMLを書き出す。出力は gitignore されており、公開物ではない。

  python3 scripts/preview.py && open .preview/index.html
"""
from __future__ import annotations

import html
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / ".preview"

DOMAINS = {
    "speak-listen": ("話すこと・聞くこと", "話す・聞く", "var(--d-speak)"),
    "write": ("書くこと", "書く", "var(--d-write)"),
    "read": ("読むこと", "読む", "var(--d-read)"),
    "language": ("言葉の特徴や使い方", "言葉の特徴", "var(--d-language)"),
    "handwriting": ("書写", "書写", "var(--d-handwriting)"),
    "reading-life": ("読書", "読書", "var(--d-reading)"),
}
SCENES = {
    "intro": ("導入", "単元や本時のはじめ"),
    "individual": ("個別", "一人で取り組む時間"),
    "share": ("共有", "互いの考えを見せ合う"),
    "discuss": ("話し合い", "考えを突き合わせる"),
    "reflect": ("振り返り", "学びを言葉にする"),
    "assess": ("評価", "見取り・記録"),
    "home": ("家庭", "持ち帰り・宿題"),
    "admin": ("校務", "授業の外の仕事"),
}
SCHOOLS = {"elementary": "小学校", "junior": "中学校"}
TOOLS = {
    "miraiseed": "ミライシード", "canva": "Canva", "padlet": "Padlet", "teams": "Teams",
    "word": "Word", "excel": "Excel", "powerpoint": "PowerPoint", "forms": "Forms",
    "onenote": "OneNote", "ai": "生成AI", "other": "その他",
}
SUBJECTS = {"japanese": "国語"}
EFFORTS = {1: ("★☆☆", "5分以内"), 2: ("★★☆", "事前準備30分"), 3: ("★★★", "単元設計が必要")}
LICENSES = {
    "gov-open": "出典明示で複製・翻案が可",
    "link-only": "リンクと自作要約のみ",
    "permitted": "個別許諾の範囲内",
}
DISCLAIMER = (
    "このサイトは有志が個人で運営しています。佐倉市教育委員会の公式サイトではなく、"
    "掲載内容は市の公式見解ではありません。各ツールの利用可否や生成AIの取扱いは、"
    "必ず所属校で最新の規程を確認してください。"
)


def parse_scalar(v: str):
    v = v.strip()
    if v in ("null", "~", ""):
        return None
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [x.strip().strip('"') for x in inner.split(",")] if inner else []
    if v.startswith('"') and v.endswith('"'):
        return v[1:-1]
    if re.fullmatch(r"\d+", v):
        return int(v)
    return v


def parse_front_matter(text: str):
    """このリポジトリの front matter が使う範囲だけの YAML パーサ。"""
    _, fm, body = text.split("---", 2)
    data: dict = {}
    stack = [(0, data)]
    for line in fm.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        key, _, raw = line.strip().partition(":")
        while stack and indent < stack[-1][0]:
            stack.pop()
        target = stack[-1][1]
        if raw.strip() == "":
            child: dict = {}
            target[key] = child
            stack.append((indent + 2, child))
        else:
            target[key] = parse_scalar(raw)
    return data, body.strip()


def esc(s) -> str:
    return html.escape(str(s), quote=True)


def domain_color(ids) -> str:
    for i in ids or []:
        if i in DOMAINS:
            return DOMAINS[i][2]
    return "var(--rule)"


def short_date(s: str) -> str:
    y, m, d = str(s).split("-")
    return f"{y}.{m}.{d}"


def long_date(s) -> str:
    if not s:
        return ""
    y, m, d = str(s).split("-")
    return f"{y}年{int(m)}月{int(d)}日"


def load_tips():
    tips = []
    for path in sorted((ROOT / "src/content/tips").glob("*.md")):
        data, body = parse_front_matter(path.read_text(encoding="utf-8"))
        data["slug"] = path.stem
        data["body"] = body
        tips.append(data)
    return sorted(tips, key=lambda t: (t["added"], t["title"]), reverse=True)


def row(tip) -> str:
    d = tip
    labels = [DOMAINS[x][1] for x in d.get("domains") or []]
    doms = "、".join(labels[:3]) + "ほか" if len(labels) > 3 else "、".join(labels)
    stars = EFFORTS[d["effort"]][0]
    sep = '<span class="sep" aria-hidden="true">/</span>'
    parts = []
    if doms:
        parts.append(f"<span>{esc(doms)}</span>")
    parts += [
        f"<span>準備 {stars}</span>",
        f'<span>{esc(d["source"]["publisher"])}</span>',
        f'<span>{short_date(d["added"])}</span>',
    ]
    flag = '<span class="flag">本文未確認</span>' if d["source"]["verified"] == "listed" else ""
    index = esc(" ".join([d["title"], d["summary"], d["source"]["publisher"], d.get("note") or ""]))
    return (
        f'<li style="border-left-color: {domain_color(d.get("domains"))}" data-index="{index}">'
        f'<a class="tip-title" href="tips-{d["slug"]}.html">{esc(d["title"])}</a>'
        f'<p class="tip-meta">{sep.join(parts)}{flag}</p></li>'
    )


CSS = ""


def page(title: str, body: str, home: bool = False) -> str:
    header = "" if home else (
        '<header class="site-header"><div class="wrap">'
        '<a class="site-name" href="index.html">国語のICT活用ヒント</a>'
        '<span class="tagline">有志運営・非公式</span></div></header>'
    )
    return f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title><style>{CSS}</style></head>
<body><a class="skip-link" href="#main">本文へ移動</a>{header}
<main id="main"><div class="wrap">{body}</div></main>
<footer class="site-footer"><div class="wrap">
<nav aria-label="サイト内"><ul>
<li><a href="index.html">トップ</a></li><li><a href="#">収集源</a></li>
<li><a href="#">更新履歴</a></li><li><a href="#">このサイトについて</a></li>
<li><a href="#">プライバシー</a></li></ul></nav>
<p class="disclaimer">{DISCLAIMER}</p></div></footer></body></html>"""


def chips(items) -> str:
    lis = "".join(
        f'<li><a class="chip{" chip-lead" if lead else ""}" href="#">{esc(label)}'
        f'<span class="count">{count}</span></a></li>'
        for label, count, lead in items
    )
    return f'<nav aria-label="絞り込み"><ul class="chips">{lis}</ul></nav>'


def build():
    tips = load_tips()
    OUT.mkdir(exist_ok=True)
    global CSS
    css = (ROOT / "src/styles/base.css").read_text(encoding="utf-8")
    tokens = (ROOT / "src/styles/tokens.css").read_text(encoding="utf-8")
    CSS = css.replace("@import './tokens.css';", tokens)

    def count(key, val):
        return sum(1 for t in tips if val in (t.get(key) or []))

    school_items = [(SCHOOLS[k], count("school", k), True) for k in ("elementary", "junior")]
    scene_items = [(SCENES[k][0], count("scenes", k), False) for k in SCENES if count("scenes", k)]
    domain_items = [(DOMAINS[k][1], count("domains", k), False) for k in DOMAINS if count("domains", k)]

    body = f"""<h1 class="home-title">国語のICT活用ヒント</h1>
<p class="home-tagline">有志運営・非公式　小中学校の国語で使えるICT活用事例を集めています</p>
<div class="search" id="search-box"><label for="q">やりたいことを入力</label>
<input type="search" id="q" autocomplete="off" placeholder="話し合い、推敲、音声入力…">
<p class="search-status" id="search-status" role="status" aria-live="polite"></p></div>
<section class="section"><h2>校種から探す</h2>{chips(school_items)}</section>
<section class="section"><h2>場面から探す</h2>{chips(scene_items)}</section>
<section class="section"><h2>領域から探す</h2>{chips(domain_items)}</section>
<section class="section"><h2>事例一覧　{len(tips)}件</h2>
<ul class="tip-list" id="tip-list">{"".join(row(t) for t in tips)}</ul></section>
<p class="lede">最終更新 {long_date(tips[0]["added"])}　<a href="#">更新履歴</a></p>"""
    (OUT / "index.html").write_text(page("国語のICT活用ヒント", body, home=True), encoding="utf-8")

    for tip in tips:
        d = tip
        eff = EFFORTS[d["effort"]]
        rows = [("出典", f'{esc(d["source"]["publisher"])}（{esc(d["source"]["region"])}）')]
        if d["source"].get("published"):
            rows.append(("公開日", long_date(d["source"]["published"])))
        rows += [
            ("取得日", long_date(d["source"]["retrieved"])),
            ("扱い", LICENSES[d["source"]["license"]]),
        ]
        if d.get("grade"):
            rows.append(("学年", esc(d["grade"])))
        if d.get("domains"):
            rows.append(("領域", "　".join(f'<a href="#">{DOMAINS[x][0]}</a>' for x in d["domains"])))
        if d.get("scenes"):
            rows.append(("場面", "　".join(f'<a href="#">{SCENES[x][0]}</a>' for x in d["scenes"])))
        if d.get("tools"):
            rows.append(("ツール", "　".join(f'<a href="#">{TOOLS[x]}</a>' for x in d["tools"])))
        rows.append(("校種", "　".join(f'<a href="#">{SCHOOLS[x]}</a>' for x in d["school"])))
        rows.append(("掲載日", long_date(d["added"])))
        table = "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in rows)

        notice = ""
        if d["source"]["verified"] == "listed":
            notice = ('<aside class="notice"><p>この事例は、出典ページの見出しと抜粋だけを見て'
                      '書いています。本文をまだ確認していないため、細部が実際と異なる場合があります。'
                      '使う前に出典を開いて確かめてください。</p></aside>')
        note = f'<aside class="notice"><p>{esc(d.get("note") or "")}</p></aside>' if d.get("note") else ""
        attribution = ""
        if d["source"]["license"] == "gov-open":
            attribution = (f'<p class="attribution">出典：「{esc(d["source"]["publisher"])}」'
                           f'（{esc(d["source"]["url"])}）（{long_date(d["source"]["retrieved"])}に利用）'
                           "を加工して作成</p>")
        prose = "".join(f"<p>{esc(p)}</p>" for p in re.split(r"\n\s*\n", d["body"]))
        flags = '<span class="flag">本文未確認</span>' if d["source"]["verified"] == "listed" else ""
        flags += '<span class="flag">下書き</span>' if d.get("status") == "draft" else ""
        related = [t for t in tips if t["slug"] != d["slug"]][:3]
        sep = '<span class="sep" aria-hidden="true">/</span>'
        body = f"""<p class="breadcrumb"><a href="index.html">トップ</a>　事例</p>
<article><header class="tip-header" style="border-left-color: {domain_color(d.get("domains"))}">
<h1>{esc(d["title"])}</h1><p class="tip-meta">
<span>{"・".join(SCHOOLS[x] for x in d["school"])}</span>{sep}
<span>{"・".join(SUBJECTS[x] for x in d["subjects"])}</span>{sep}
<span>準備 {eff[0]} {eff[1]}</span>{flags}</p></header>
<p class="prose">{esc(d["summary"])}</p>{notice}
<p><a class="button" href="{esc(d["source"]["url"])}" rel="noopener nofollow" target="_blank">出典を開く（外部サイト）</a></p>
<p class="button-note">{esc(d["source"]["publisher"])}　{esc(d["source"]["url"])}</p>
<h2 class="h-sub">この事例の見どころ</h2><div class="prose">{prose}</div>{note}
<h2 class="h-sub">この事例の情報</h2><dl class="meta-table">{table}</dl>{attribution}</article>
<section class="section"><h2>近い事例</h2>
<ul class="tip-list">{"".join(row(t) for t in related)}</ul></section>"""
        (OUT / f"tips-{d['slug']}.html").write_text(page(d["title"], body), encoding="utf-8")

    print(f"{len(tips)} 件を {OUT} に書き出しました")


if __name__ == "__main__":
    if OUT.exists():
        shutil.rmtree(OUT)
    build()
