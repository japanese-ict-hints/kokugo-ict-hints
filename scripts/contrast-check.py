def lum(hexs):
    h = hexs.lstrip('#')
    c = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    c = [x/12.92 if x <= 0.04045 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def ratio(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

PAPER  = '#FFFAFC'
SUNK   = '#FBEEF3'
INK    = '#241A1E'
MUTE   = '#6B5860'
ACCENT = '#B3245C'
HOVER  = '#8C1746'
RULE   = '#F0DDE5'

pairs = [
    ('本文 ink / paper',        INK,    PAPER),
    ('補助 mute / paper',       MUTE,   PAPER),
    ('補助 mute / sunk',        MUTE,   SUNK),
    ('リンク accent / paper',   ACCENT, PAPER),
    ('リンク accent / sunk',    ACCENT, SUNK),
    ('hover / paper',           HOVER,  PAPER),
    ('ボタン文字 paper/accent', PAPER,  ACCENT),
]
for name, a, b in pairs:
    r = ratio(a, b)
    print(f"{'OK ' if r >= 4.5 else 'NG '} {r:5.2f}:1  {name}")

print()
DOMAINS = {'speak':'#B23A48','write':'#3A5A98','read':'#3F7A5E',
           'language':'#7A4FA3','handwriting':'#8A6420','reading':'#6B6470'}
for k, v in DOMAINS.items():
    r = ratio(v, PAPER)
    print(f"{'OK ' if r >= 4.5 else 'NG '} {r:5.2f}:1  領域色 {k} {v}")
