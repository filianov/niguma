"""
15minYoga — YouTube channel banner.

Canvas 2560×1440 (YouTube's recommended upload size; the platform's stated
minimum is 1024×576, which the exported small version also satisfies).

Everything that must survive cropping — the mark, the wordmark, the domain —
sits inside the 1546×423 "all devices" safe area in the middle. The outer
field only carries background and very faint decorative rings, so nothing
important is lost on phones or TVs.
"""
import os

from build_brand import Typesetter, svg_mark, C, mark_paths

OUT = os.environ.get("BANNER_OUT", "out")

W, H = 2560, 1440
SAFE_W, SAFE_H = 1546, 423
SAFE_X, SAFE_Y = (W - SAFE_W) / 2, (H - SAFE_H) / 2


def decorative_ring(cx, cy, r, sw, color, opacity):
    """A single faint quarter-ring echo of the mark, for the outer field."""
    q, rest = mark_paths(cx, cy, r, sw)
    return (f'<g fill="none" stroke-linecap="round" opacity="{opacity}">'
            f'<path d="{rest}" stroke="{color}" stroke-width="{sw}"/>'
            f'<path d="{q}" stroke="{color}" stroke-width="{sw}"/>'
            f'</g>')


def build(name, bg_from, bg_to, c_num, c_rest, c_dom,
          quarter, ring, dot, ring_echo_color, safe_guides=False):
    ts = Typesetter({"opsz": 72, "wght": 600, "WONK": 0, "SOFT": 0})

    MARK = 250.0
    GAP = 70.0
    CAP = 132.0
    DOM_CAP = 42.0

    segs, total_units = ts.segments("15minYoga", ["15", "minYoga"])
    s = CAP / ts.cap
    wm_w = total_units * s
    ds = DOM_CAP / ts.cap
    dom_w = ts.width("15minyoga.com") * ds

    lockup_w = MARK + GAP + max(wm_w, dom_w)
    x0 = (W - lockup_w) / 2
    # optical centre: the domain line hangs below, so lift the block slightly
    cy = H / 2 - 18

    mark_y = cy - MARK / 2
    wm_baseline = cy + CAP / 2
    dom_baseline = wm_baseline + 74

    body = []
    # background
    body.append(f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">'
                f'<stop offset="0" stop-color="{bg_from}"/>'
                f'<stop offset="1" stop-color="{bg_to}"/></linearGradient></defs>')
    body.append(f'<rect width="{W}" height="{H}" fill="url(#bg)"/>')

    # Faint brand echoes. Desktop/tablet only ever show a 2560×423 band, so these
    # sit INSIDE that vertical band but OUTSIDE the horizontal safe zone: visible
    # on wide screens, harmlessly cropped on phones.
    band_cy = H / 2
    body.append(decorative_ring(250, band_cy, 200, 22, ring_echo_color, 0.20))
    body.append(decorative_ring(2330, band_cy, 172, 19, ring_echo_color, 0.16))

    # the lockup
    body.append(f'<g transform="translate({x0:.1f} {mark_y:.1f})">'
                + svg_mark(MARK, quarter, ring, dot, sw=MARK * 0.095) + "</g>")
    body.append(f'<g transform="translate({x0 + MARK + GAP:.1f} {wm_baseline:.1f}) scale({s:.4f})">'
                f'<path d="{segs[0]["d"]}" fill="{c_num}"/>'
                f'<path d="{segs[1]["d"]}" fill="{c_rest}"/></g>')
    body.append(f'<g transform="translate({x0 + MARK + GAP:.1f} {dom_baseline:.1f}) scale({ds:.4f})">'
                f'<path d="{ts.path("15minyoga.com")}" fill="{c_dom}"/></g>')

    if safe_guides:
        body.append(f'<rect x="{SAFE_X}" y="{SAFE_Y}" width="{SAFE_W}" height="{SAFE_H}" '
                    f'fill="none" stroke="#C58C6E" stroke-width="3" stroke-dasharray="14 10"/>')
        body.append(f'<text x="{SAFE_X + 12}" y="{SAFE_Y - 16}" font-family="monospace" '
                    f'font-size="26" fill="#A96C4C">safe area 1546 × 423 — visible on all devices</text>')

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
           + "".join(body) + "</svg>")
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)
    return name


if __name__ == "__main__":
    made = [
        # primary — light, matches the reference lockup on a warm paper field
        build("banner-youtube.svg", "#FDFBF7", "#F2E7D8",
              C["clay_deep"], C["ink"], C["olive"],
              C["clay"], C["sage"], C["olive"], C["sand"]),
        # alternative — deep olive, for a darker channel look
        build("banner-youtube-dark.svg", "#5E6353", "#464B3B",
              C["sand"], "#FFFFFF", C["cream"],
              C["cream"], "#A7AC93", C["paper"], C["sage"]),
        # working file with the safe-area guide drawn on top
        build("banner-youtube-guides.svg", "#FDFBF7", "#F2E7D8",
              C["clay_deep"], C["ink"], C["olive"],
              C["clay"], C["sage"], C["olive"], C["sand"], safe_guides=True),
    ]
    for m in made:
        print("  ", m)
    print(f"✓ {len(made)} файла · холст {W}×{H} · безопасная зона {SAFE_W}×{SAFE_H}")
