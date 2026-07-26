"""
15minYoga — brand asset generator.

Builds the full logo system as true vector SVG (wordmark converted to outlines,
so the files are font-independent and print-safe).

Concept "The Quarter":
  a timer ring where exactly one quarter — 15 of 60 minutes — is highlighted.
  The ring = the whole hour / the whole day; the quarter = the practice you invest;
  the centre dot = the still point, the practitioner.
"""
import json
import math
import os

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import ControlBoundsPen
from fontTools.misc.transform import Transform

SRC = "fraunces-var.ttf"
OUT = os.environ.get("BRAND_OUT", "out")
EM = 100.0

# ---------------------------------------------------------------- palette
C = {
    "ink":        "#3B382F",
    "paper":      "#FBF8F3",
    "cream":      "#F0E3D3",
    "sand":       "#DDBEA9",
    "clay":       "#C58C6E",   # graphic accent (the quarter)
    "clay_deep":  "#A96C4C",   # text accent (contrast-safe on light)
    "sage":       "#B8B7A3",
    "olive":      "#6B705C",
    "olive_deep": "#565B49",
}

KERN = {
    ("1", "5"): -14, ("5", "m"): -6, ("n", "Y"): -26, ("Y", "o"): -34,
    ("o", "g"): -4, ("g", "a"): -6, ("a", "."): -18, (".", "c"): -14,
    ("5", "y"): -6,
}
TRACKING = -4  # 1/1000 em


# ---------------------------------------------------------------- type engine
class Typesetter:
    def __init__(self, axes, tracking=TRACKING):
        self.font = instancer.instantiateVariableFont(TTFont(SRC), axes, inplace=False)
        self.upem = self.font["head"].unitsPerEm
        self.gs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.scale = EM / self.upem
        self.tracking = tracking
        os2 = self.font["OS/2"]
        self.cap = getattr(os2, "sCapHeight", 700) * self.scale
        self.asc = os2.sTypoAscender * self.scale

    def _advance(self, ch):
        g = self.cmap.get(ord(ch))
        return self.gs[g].width * self.scale if g else 0.0

    def layout(self, text):
        """Return list of (char, x_offset) plus total width, in EM=100 units."""
        pos, x, prev = [], 0.0, None
        for ch in text:
            if prev is not None:
                x += (KERN.get((prev, ch), 0) + self.tracking) / 1000.0 * EM
            pos.append((ch, x))
            x += self._advance(ch)
            prev = ch
        return pos, x

    def path(self, text, x0=0.0):
        """SVG path 'd' for text, baseline at y=0, starting at x0."""
        pos, _ = self.layout(text)
        out = []
        for ch, x in pos:
            g = self.cmap.get(ord(ch))
            if not g:
                continue
            t = Transform(self.scale, 0, 0, -self.scale, x0 + x, 0)
            spen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}")
            self.gs[g].draw(TransformPen(spen, t))
            d = spen.getCommands()
            if d:
                out.append(d)
        return " ".join(out)

    def segments(self, text, splits):
        """Split text into consecutive segments, each with its own path, kerned as one word."""
        pos, total = self.layout(text)
        res, i = [], 0
        for seg in splits:
            x0 = pos[i][1]
            d = []
            for ch, x in pos[i:i + len(seg)]:
                g = self.cmap.get(ord(ch))
                if not g:
                    continue
                t = Transform(self.scale, 0, 0, -self.scale, x, 0)
                spen = SVGPathPen(self.gs, ntos=lambda v: f"{v:.2f}")
                self.gs[g].draw(TransformPen(spen, t))
                cmds = spen.getCommands()
                if cmds:
                    d.append(cmds)
            res.append({"text": seg, "d": " ".join(d), "x": x0})
            i += len(seg)
        return res, total

    def width(self, text):
        return self.layout(text)[1]


# ---------------------------------------------------------------- the mark
def mark_paths(cx, cy, r, sw, gap_deg=7.0):
    """
    Timer ring split into: the highlighted quarter (12→3 o'clock) and the rest.
    Returns (quarter_d, rest_d) — both open arcs with a small gap at each junction.
    """
    def pt(deg):
        a = math.radians(deg - 90.0)  # 0deg = 12 o'clock
        return (cx + r * math.cos(a), cy + r * math.sin(a))

    g = gap_deg / 2.0
    q0, q1 = pt(0 + g), pt(90 - g)
    r0, r1 = pt(90 + g), pt(360 - g)
    quarter = f"M {q0[0]:.2f} {q0[1]:.2f} A {r} {r} 0 0 1 {q1[0]:.2f} {q1[1]:.2f}"
    rest = f"M {r0[0]:.2f} {r0[1]:.2f} A {r} {r} 0 1 1 {r1[0]:.2f} {r1[1]:.2f}"
    return quarter, rest


def svg_mark(size=64, quarter=C["clay"], rest=C["sage"], dot=C["olive"],
             sw=None, r_ratio=0.344, dot_ratio=0.075, gap_deg=7.0):
    r = size * r_ratio
    sw = sw or size * 0.095          # heavier: holds up next to the serif wordmark
    cx = cy = size / 2.0
    q, rst = mark_paths(cx, cy, r, sw, gap_deg)
    return (
        f'<g fill="none" stroke-linecap="round">'
        f'<path d="{rst}" stroke="{rest}" stroke-width="{sw:.2f}"/>'
        f'<path d="{q}" stroke="{quarter}" stroke-width="{sw:.2f}"/>'
        f'</g>'
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{size * dot_ratio:.2f}" fill="{dot}"/>'
    )


# ---------------------------------------------------------------- file writer
HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" '
        'width="{w:.0f}" height="{h:.0f}" role="img" aria-label="15minYoga">'
        '<title>15minYoga</title>')


def write(name, w, h, body, bg=None):
    os.makedirs(OUT, exist_ok=True)
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ""
    svg = HEAD.format(w=w, h=h) + rect + body + "</svg>"
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)
    return name


# ---------------------------------------------------------------- lockups
def wordmark_body(ts, cap_px, baseline_y, x0, color_num, color_rest):
    """15minYoga with '15' accented. Returns (body, width_px)."""
    segs, total = ts.segments("15minYoga", ["15", "minYoga"])
    s = cap_px / ts.cap
    body = f'<g transform="translate({x0:.2f} {baseline_y:.2f}) scale({s:.4f})">'
    body += f'<path d="{segs[0]["d"]}" fill="{color_num}"/>'
    body += f'<path d="{segs[1]["d"]}" fill="{color_rest}"/>'
    body += "</g>"
    return body, total * s


def build_all():
    ts = Typesetter({"opsz": 72, "wght": 600, "WONK": 0, "SOFT": 0})
    made = []

    # ---------- 1. horizontal lockup ----------
    def horizontal(name, cnum, crest, quarter, ring, dot, bg=None, pad=0):
        m = 64.0
        gap = 20.0
        cap = 34.0
        wm, wm_w = wordmark_body(ts, cap, 32 + cap / 2.0, m + gap, cnum, crest)
        w, h = m + gap + wm_w + pad * 2, m
        body = f'<g transform="translate({pad} 0)">' + svg_mark(m, quarter, ring, dot) + wm + "</g>"
        return write(name, w + (pad * 2 if pad else 0), h, body, bg)

    made.append(horizontal("logo-horizontal.svg", C["clay_deep"], C["ink"], C["clay"], C["sage"], C["olive"]))
    made.append(horizontal("logo-horizontal-mono-dark.svg", C["ink"], C["ink"], C["ink"], C["ink"], C["ink"]))
    made.append(horizontal("logo-horizontal-mono-light.svg", C["paper"], C["paper"], C["paper"], C["paper"], C["paper"]))
    made.append(horizontal("logo-horizontal-on-dark.svg", C["sand"], C["paper"], C["cream"], "#A7AC93", C["paper"]))

    # ---------- 2. stacked lockup ----------
    def stacked(name, cnum, crest, quarter, ring, dot, bg=None):
        m = 84.0
        cap = 34.0
        segs, total = ts.segments("15minYoga", ["15", "minYoga"])
        s = cap / ts.cap
        wm_w = total * s
        w = max(m, wm_w)
        gap = 22.0
        h = m + gap + cap + 6
        body = f'<g transform="translate({(w - m) / 2:.2f} 0)">' + svg_mark(m, quarter, ring, dot) + "</g>"
        body += (f'<g transform="translate({(w - wm_w) / 2:.2f} {m + gap + cap:.2f}) scale({s:.4f})">'
                 f'<path d="{segs[0]["d"]}" fill="{cnum}"/><path d="{segs[1]["d"]}" fill="{crest}"/></g>')
        return write(name, w, h, body, bg)

    made.append(stacked("logo-stacked.svg", C["clay_deep"], C["ink"], C["clay"], C["sage"], C["olive"]))
    made.append(stacked("logo-stacked-mono-dark.svg", C["ink"], C["ink"], C["ink"], C["ink"], C["ink"]))
    made.append(stacked("logo-stacked-mono-light.svg", C["paper"], C["paper"], C["paper"], C["paper"], C["paper"]))

    # ---------- 3. wordmark only ----------
    def wordmark_only(name, cnum, crest, bg=None):
        cap = 48.0
        segs, total = ts.segments("15minYoga", ["15", "minYoga"])
        s = cap / ts.cap
        w, h = total * s, cap * 1.42
        base = cap * 1.06
        body = (f'<g transform="translate(0 {base:.2f}) scale({s:.4f})">'
                f'<path d="{segs[0]["d"]}" fill="{cnum}"/><path d="{segs[1]["d"]}" fill="{crest}"/></g>')
        return write(name, w, h, body, bg)

    made.append(wordmark_only("logo-wordmark.svg", C["clay_deep"], C["ink"]))
    made.append(wordmark_only("logo-wordmark-mono-dark.svg", C["ink"], C["ink"]))
    made.append(wordmark_only("logo-wordmark-mono-light.svg", C["paper"], C["paper"]))

    # ---------- 4. mark / icon ----------
    made.append(write("mark.svg", 64, 64, svg_mark(64)))
    made.append(write("mark-mono-dark.svg", 64, 64, svg_mark(64, C["ink"], C["ink"], C["ink"])))
    made.append(write("mark-mono-light.svg", 64, 64, svg_mark(64, C["paper"], C["paper"], C["paper"])))
    made.append(write("mark-on-dark.svg", 64, 64, svg_mark(64, C["clay"], C["sage"], C["cream"])))

    # ---------- 5. favicon (built for 16px: fat stroke, big dot, wider gaps) ----------
    # deliberately different geometry from the master mark — legibility beats consistency here
    fav_geo = dict(r_ratio=0.355, dot_ratio=0.105, gap_deg=11.0)
    made.append(write("favicon.svg", 32, 32,
                      svg_mark(32, C["clay_deep"], C["olive"], C["olive"], sw=5.0, **fav_geo)))

    # badge version (olive tile + light mark) — reads better on busy/dark tab bars
    badge = (f'<rect width="32" height="32" rx="7.5" fill="{C["olive"]}"/>'
             + svg_mark(32, C["sand"], "#A7AC93", C["paper"], sw=5.0, **fav_geo))
    made.append(write("favicon-badge.svg", 32, 32, badge))

    # ---------- 6. app icon / social avatar ----------
    # glyph fills ~62% of the canvas — the platform standard for optical balance
    icon_mark = 400
    off = (512 - icon_mark) / 2
    app = (f'<rect width="512" height="512" rx="114" fill="{C["olive"]}"/>'
           f'<g transform="translate({off} {off})">'
           + svg_mark(icon_mark, C["cream"], "#A7AC93", C["paper"], sw=38, dot_ratio=0.085) + "</g>")
    made.append(write("app-icon.svg", 512, 512, app))

    app_light = (f'<rect width="512" height="512" rx="114" fill="{C["paper"]}"/>'
                 f'<g transform="translate({off} {off})">'
                 + svg_mark(icon_mark, C["clay"], C["sage"], C["olive"], sw=38, dot_ratio=0.085) + "</g>")
    made.append(write("app-icon-light.svg", 512, 512, app_light))

    # ---------- 7. lockup with domain (print / ads) ----------
    def with_domain(name, cnum, crest, quarter, ring, dot, dom_color, bg=None):
        m, gap, cap = 64.0, 20.0, 34.0
        wm, wm_w = wordmark_body(ts, cap, 30 + cap / 2.0, m + gap, cnum, crest)
        dcap = 13.0
        ds = dcap / ts.cap
        dw = ts.width("15minyoga.com") * ds
        dom = (f'<g transform="translate({m + gap:.2f} {30 + cap / 2.0 + 20:.2f}) scale({ds:.4f})">'
               f'<path d="{ts.path("15minyoga.com")}" fill="{dom_color}"/></g>')
        w = m + gap + max(wm_w, dw)
        return write(name, w, 72, svg_mark(m, quarter, ring, dot) + wm + dom, bg)

    made.append(with_domain("logo-with-domain.svg", C["clay_deep"], C["ink"], C["clay"], C["sage"], C["olive"], C["olive"]))
    made.append(with_domain("logo-with-domain-on-dark.svg", C["sand"], C["paper"], C["clay"], C["sage"], C["cream"], C["sage"]))

    # ---------- 8. OG / social cover 1200x630 ----------
    cap = 96.0
    segs, total = ts.segments("15minYoga", ["15", "minYoga"])
    s = cap / ts.cap
    wm_w = total * s
    tag_cap = 26.0
    tg = tag_cap / ts.cap
    tag_w = ts.width("Yoga for decision makers") * tg
    og = (f'<rect width="1200" height="630" fill="{C["paper"]}"/>'
          f'<circle cx="1080" cy="90" r="260" fill="{C["cream"]}" opacity="0.55"/>'
          f'<g transform="translate({(1200 - 150) / 2:.0f} 150)">' + svg_mark(150, C["clay"], C["sage"], C["olive"], sw=11) + "</g>"
          f'<g transform="translate({(1200 - wm_w) / 2:.2f} {150 + 150 + 78 + cap:.2f}) scale({s:.4f})">'
          f'<path d="{segs[0]["d"]}" fill="{C["clay_deep"]}"/><path d="{segs[1]["d"]}" fill="{C["ink"]}"/></g>'
          f'<g transform="translate({(1200 - tag_w) / 2:.2f} {150 + 150 + 78 + cap + 56:.2f}) scale({tg:.4f})">'
          f'<path d="{ts.path("Yoga for decision makers")}" fill="{C["olive"]}"/></g>')
    made.append(write("og-cover.svg", 1200, 630, og))

    # ---------- 9. spec sheet for the brandbook (construction / clear space) ----------
    m = 64.0
    q, rst = mark_paths(32, 32, 22, 5)
    spec = (f'<rect width="420" height="220" fill="{C["paper"]}"/>'
            f'<g transform="translate(40 40)">'
            f'<rect x="-20" y="-20" width="{64 + 40}" height="{64 + 40}" fill="none" stroke="{C["sand"]}" '
            f'stroke-dasharray="4 4" stroke-width="1"/>'
            + svg_mark(64) +
            f'<circle cx="32" cy="32" r="22" fill="none" stroke="{C["sand"]}" stroke-width="0.6" stroke-dasharray="2 3"/>'
            f'<line x1="32" y1="32" x2="32" y2="10" stroke="{C["sand"]}" stroke-width="0.6"/>'
            f'<line x1="32" y1="32" x2="54" y2="32" stroke="{C["sand"]}" stroke-width="0.6"/>'
            f'</g>')
    tcap = 12.0
    tsx = tcap / ts.cap
    spec += (f'<g transform="translate(190 62) scale({tsx:.4f})"><path d="{ts.path("clear space = 0.3x")}" fill="{C["olive"]}"/></g>'
             f'<g transform="translate(190 88) scale({tsx:.4f})"><path d="{ts.path("quarter = 90 degrees")}" fill="{C["olive"]}"/></g>'
             f'<g transform="translate(190 114) scale({tsx:.4f})"><path d="{ts.path("stroke = 0.095x")}" fill="{C["olive"]}"/></g>'
             f'<g transform="translate(190 140) scale({tsx:.4f})"><path d="{ts.path("radius = 0.344x")}" fill="{C["olive"]}"/></g>')
    made.append(write("construction.svg", 420, 220, spec))

    # metrics for downstream use
    with open(os.path.join(OUT, "_metrics.json"), "w") as f:
        json.dump({"cap": ts.cap, "wordmark_units": total, "em": EM, "palette": C}, f, indent=2)

    return made


if __name__ == "__main__":
    files = build_all()
    print(f"✓ создано файлов: {len(files)}")
    for f in files:
        print("  ", f)
