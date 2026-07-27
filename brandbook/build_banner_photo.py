"""
15minYoga — YouTube banner, photo edition.

Produces a transparent 2560×1440 overlay (veil + stacked lockup) that is
composited over the sunset photograph. The lockup sits in the LEFT half of the
1546×423 safe area so it never collides with the figure, and the veil is
strongest exactly under the type so the wordmark stays legible against the sky.
"""
import os

from build_brand import Typesetter, svg_mark, C

OUT = os.environ.get("BANNER_OUT", "out")
W, H = 2560, 1440
SAFE_W, SAFE_H = 1546, 423
SAFE_X = (W - SAFE_W) / 2          # 507
SAFE_Y = (H - SAFE_H) / 2          # 508.5


def build(name, safe_guides=False):
    ts = Typesetter({"opsz": 72, "wght": 600, "WONK": 0, "SOFT": 0})

    # horizontal lockup — the same construction as the logo, set large
    MARK = 152.0
    GAP_MARK = 42.0      # mark → wordmark
    CAP = 96.0
    DOM_CAP = 32.0
    GAP_DOM = 54.0       # wordmark baseline → domain baseline

    segs, total_units = ts.segments("15minYoga", ["15", "minYoga"])
    s = CAP / ts.cap
    wm_w = total_units * s
    ds = DOM_CAP / ts.cap

    x0 = SAFE_X + 62                 # left column of the safe area
    cy = H / 2 - 10                  # lift slightly: the domain line hangs below

    mark_x = x0
    mark_y = cy - MARK / 2
    wm_x = x0 + MARK + GAP_MARK
    wm_baseline = cy + CAP / 2
    dom_x = wm_x
    dom_baseline = wm_baseline + GAP_DOM

    b = []
    b.append(
        '<defs>'
        # horizontal veil: dense on the left under the type, clear on the right over the sun
        '<linearGradient id="veil" x1="0" y1="0" x2="1" y2="0">'
        '<stop offset="0" stop-color="#2B2D22" stop-opacity="0.58"/>'
        '<stop offset="0.40" stop-color="#2B2D22" stop-opacity="0.40"/>'
        '<stop offset="0.68" stop-color="#2B2D22" stop-opacity="0.12"/>'
        '<stop offset="1" stop-color="#2B2D22" stop-opacity="0.06"/>'
        '</linearGradient>'
        # gentle vertical seat so top and bottom edges settle
        '<linearGradient id="seat" x1="0" y1="0" x2="0" y2="1">'
        '<stop offset="0" stop-color="#2B2D22" stop-opacity="0.30"/>'
        '<stop offset="0.5" stop-color="#2B2D22" stop-opacity="0.04"/>'
        '<stop offset="1" stop-color="#2B2D22" stop-opacity="0.34"/>'
        '</linearGradient>'
        '</defs>'
    )
    b.append(f'<rect width="{W}" height="{H}" fill="url(#veil)"/>')
    b.append(f'<rect width="{W}" height="{H}" fill="url(#seat)"/>')

    # lockup — light colours for photography
    b.append(f'<g transform="translate({mark_x:.1f} {mark_y:.1f})">'
             + svg_mark(MARK, C["cream"], "#C9CDB6", "#FFFFFF", sw=MARK * 0.095) + "</g>")
    b.append(f'<g transform="translate({wm_x:.1f} {wm_baseline:.1f}) scale({s:.4f})">'
             f'<path d="{segs[0]["d"]}" fill="{C["sand"]}"/>'
             f'<path d="{segs[1]["d"]}" fill="#FFFFFF"/></g>')
    b.append(f'<g transform="translate({dom_x:.1f} {dom_baseline:.1f}) scale({ds:.4f})">'
             f'<path d="{ts.path("15minyoga.com")}" fill="{C["cream"]}" opacity="0.92"/></g>')

    if safe_guides:
        b.append(f'<rect x="{SAFE_X}" y="{SAFE_Y}" width="{SAFE_W}" height="{SAFE_H}" '
                 f'fill="none" stroke="#FFD9A0" stroke-width="3" stroke-dasharray="14 10"/>')
        b.append(f'<text x="{SAFE_X + 12}" y="{SAFE_Y - 16}" font-family="monospace" '
                 f'font-size="26" fill="#FFD9A0">safe area 1546 × 423</text>')

    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
           + "".join(b) + "</svg>")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)
    return name


if __name__ == "__main__":
    print("  ", build("banner-photo-overlay.svg"))
    print("  ", build("banner-photo-overlay-guides.svg", safe_guides=True))
    print(f"✓ оверлей {W}×{H}, локап в левой половине безопасной зоны")
