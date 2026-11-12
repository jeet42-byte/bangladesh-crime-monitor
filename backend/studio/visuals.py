"""Frame drawing: every scene layout, captions and the thumbnail.

Scenes are drawn with Pillow at full resolution. A scene animates in over its
first second or so (``anim_end``); after that the renderer reuses a cached
frame and only redraws the cheap overlays (pulsing pins, captions, progress),
which keeps a ten-minute render inside a few minutes of CPU.

Bangla needs complex text layout (conjuncts, vowel signs); Pillow only does
that with libraqm, so :func:`require_raqm` refuses to render without it
rather than produce a video with broken text.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Dict, List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont, features

from studio import bangla

ASSETS = Path(__file__).resolve().parent / "assets"
FONT_FILES = {
    "regular": ASSETS / "fonts" / "HindSiliguri-Regular.ttf",
    "semibold": ASSETS / "fonts" / "HindSiliguri-SemiBold.ttf",
    "bold": ASSETS / "fonts" / "HindSiliguri-Bold.ttf",
}

BG_TOP = (7, 11, 22)
BG_BOTTOM = (16, 24, 48)
PANEL = (20, 29, 53)
TEXT = (248, 250, 252)
MUTED = (148, 163, 184)
FAINT = (51, 65, 85)
ACCENT = (239, 68, 68)
AMBER = (245, 158, 11)
GOOD = (34, 197, 94)
BAR = (71, 85, 140)

RGBA = Tuple[int, int, int, int]


def require_raqm() -> None:
    if not features.check("raqm"):
        raise RuntimeError(
            "Pillow was built without libraqm, so Bangla text would render broken. "
            "Install it (Ubuntu: sudo apt-get install libraqm0) and reinstall Pillow."
        )


@lru_cache(maxsize=64)
def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_FILES[weight]), max(8, int(size)),
                              layout_engine=ImageFont.Layout.RAQM)


def hex_rgb(value: str) -> Tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def rgba(color: Sequence[int] | str, alpha: float = 1.0) -> RGBA:
    rgb = hex_rgb(color) if isinstance(color, str) else tuple(color[:3])
    return (rgb[0], rgb[1], rgb[2], int(max(0.0, min(1.0, alpha)) * 255))


def ease(p: float) -> float:
    p = max(0.0, min(1.0, p))
    return 1 - (1 - p) ** 3


def ease_back(p: float) -> float:
    p = max(0.0, min(1.0, p))
    c1, c3 = 1.70158, 2.70158
    return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2


def prog(t: float, start: float, dur: float = 0.6) -> float:
    return ease((t - start) / dur) if dur > 0 else float(t >= start)


def wrap(text: str, fnt: ImageFont.FreeTypeFont, max_w: float, max_lines: int = 0) -> List[str]:
    words = text.split()
    lines: List[str] = []
    line = ""
    for word in words:
        trial = f"{line} {word}".strip()
        if not line or fnt.getlength(trial) <= max_w:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    if max_lines and len(lines) > max_lines:
        lines = lines[:max_lines]
        last = lines[-1]
        while last and fnt.getlength(last + "…") > max_w:
            last = last[:-1]
        lines[-1] = last.rstrip() + "…"
    return lines


def balanced(text: str, fnt: ImageFont.FreeTypeFont, max_w: float, max_lines: int = 0) -> List[str]:
    """Wrap into as few lines as ``wrap`` would, but of even length (no lone last word)."""
    lines = wrap(text, fnt, max_w)
    if len(lines) < 2 or (max_lines and len(lines) > max_lines):
        return wrap(text, fnt, max_w, max_lines)
    lo, hi = max_w * 0.4, max_w
    for _ in range(12):
        mid = (lo + hi) / 2
        if len(wrap(text, fnt, mid)) == len(lines):
            hi = mid
        else:
            lo = mid
    return wrap(text, fnt, hi)


def fit_font(text: str, weight: str, size: int, max_w: float, max_lines: int,
             min_size: int = 24) -> Tuple[ImageFont.FreeTypeFont, List[str]]:
    """Largest font (down to ``min_size``) that fits ``text`` in the lines given,
    with the lines balanced."""
    while True:
        fnt = font(weight, size)
        lines = wrap(text, fnt, max_w)
        if len(lines) <= max_lines or size <= min_size:
            return fnt, balanced(text, fnt, max_w, max_lines)
        size = int(size * 0.92)


# ===========================================================================
# Layout context
# ===========================================================================
@dataclass
class Ctx:
    W: int
    H: int
    show: str
    channel: str
    sample: bool = False
    duration: float = 5.0          # current scene's duration, set per scene
    cache: Dict[str, Any] = field(default_factory=dict)

    @property
    def vertical(self) -> bool:
        return self.H > self.W

    @property
    def u(self) -> float:
        return min(self.W, self.H) / 100.0

    @property
    def margin(self) -> int:
        return int(6 * self.u)

    @property
    def box(self) -> Tuple[int, int, int, int]:
        """The area scenes draw into, clear of the header and captions."""
        top = int(15 * self.u)
        bottom = int(self.H * (0.63 if self.vertical else 0.79))
        return (self.margin, top, self.W - self.margin, bottom)

    @property
    def caption_center(self) -> int:
        return int(self.H * (0.715 if self.vertical else 0.885))


def background(ctx: Ctx) -> Image.Image:
    """Gradient, faint dot grid, brand header. Cached per context."""
    key = "bg"
    if key in ctx.cache:
        return ctx.cache[key]
    W, H, u = ctx.W, ctx.H, ctx.u
    grad = Image.new("RGB", (1, 256))
    for y in range(256):
        f = y / 255
        grad.putpixel((0, y), tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * f) for i in range(3)))
    img = grad.resize((W, H), Image.BILINEAR)
    d = ImageDraw.Draw(img, "RGBA")
    step = int(5 * u)
    for x in range(step // 2, W, step):
        for y in range(step // 2, H, step):
            d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(255, 255, 255, 14))
    # A soft red glow, top right.
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    r = int(45 * u)
    gd.ellipse((W - r, -r, W + r, r), fill=60)
    glow = glow.filter(ImageFilter.GaussianBlur(int(18 * u)))
    img.paste(Image.new("RGB", (W, H), ACCENT), (0, 0), glow)

    d = ImageDraw.Draw(img, "RGBA")
    m = ctx.margin
    y = int(5.2 * u)
    d.rounded_rectangle((m, y, m + int(1.6 * u), y + int(4.4 * u)), radius=int(0.4 * u), fill=ACCENT)
    d.text((m + int(2.6 * u), y - int(0.6 * u)), ctx.channel, font=font("bold", int(4 * u)), fill=TEXT)
    show_font = font("semibold", int(3 * u))
    d.text((W - m, y + int(0.2 * u)), ctx.show, font=show_font, fill=MUTED, anchor="ra")
    if ctx.sample:
        label = "নমুনা ডেটা — বাস্তব ঘটনা নয়"
        f = font("bold", int(3 * u))
        tw = f.getlength(label)
        cx, cy = W // 2, int(11 * u)
        d.rounded_rectangle((cx - tw / 2 - 2 * u, cy - 0.4 * u, cx + tw / 2 + 2 * u, cy + 4.2 * u),
                            radius=int(u), fill=rgba(AMBER, 0.9))
        d.text((cx, cy), label, font=f, fill=(20, 20, 20), anchor="ma")
    ctx.cache[key] = img
    return img


# ===========================================================================
# Small drawing helpers
# ===========================================================================
def chip(d: ImageDraw.ImageDraw, x: float, y: float, text: str, color, size: float, a: float = 1.0,
         text_color=TEXT) -> float:
    f = font("bold", int(size))
    pad_x, pad_y = size * 0.7, size * 0.28
    w = f.getlength(text) + 2 * pad_x
    h = size * 1.55 + 2 * pad_y
    d.rounded_rectangle((x, y, x + w, y + h), radius=int(h / 2), fill=rgba(color, a))
    d.text((x + pad_x, y + pad_y + size * 0.08), text, font=f, fill=rgba(text_color, a))
    return w


def pin(d: ImageDraw.ImageDraw, x: float, y: float, r: float, color, a: float = 1.0) -> None:
    """A map pin whose tip is at (x, y)."""
    cy = y - r * 1.9
    d.polygon([(x - r * 0.78, cy + r * 0.55), (x + r * 0.78, cy + r * 0.55), (x, y)], fill=rgba(color, a))
    d.ellipse((x - r, cy - r, x + r, cy + r), fill=rgba(color, a))
    d.ellipse((x - r * 0.4, cy - r * 0.4, x + r * 0.4, cy + r * 0.4), fill=rgba(BG_TOP, a))


def triangle(d: ImageDraw.ImageDraw, x: float, y: float, s: float, up: bool, color, a: float = 1.0) -> None:
    if up:
        pts = [(x, y), (x + s, y), (x + s / 2, y - s * 0.9)]
    else:
        pts = [(x, y - s * 0.9), (x + s, y - s * 0.9), (x + s / 2, y)]
    d.polygon(pts, fill=rgba(color, a))


def text_lines(d, x, y, lines, fnt, color, a=1.0, line_h=None, anchor="la") -> float:
    line_h = line_h or fnt.size * 1.42
    for i, line in enumerate(lines):
        d.text((x, y + i * line_h), line, font=fnt, fill=rgba(color, a), anchor=anchor)
    return len(lines) * line_h


def panel(d, box, a=1.0, radius=None, color=PANEL, outline=None):
    radius = radius or int(min(box[2] - box[0], box[3] - box[1]) * 0.06)
    d.rounded_rectangle(box, radius=radius, fill=rgba(color, 0.78 * a),
                        outline=rgba(outline, 0.9 * a) if outline else None, width=2)


# ===========================================================================
# Map
# ===========================================================================
@lru_cache(maxsize=1)
def bd_rings() -> List[List[Tuple[float, float]]]:
    data = json.loads((ASSETS / "bd_outline.json").read_text())
    return [[(float(x), float(y)) for x, y in ring] for ring in data["rings"]]


BD_BBOX = (88.0, 20.55, 92.75, 26.65)   # lon0, lat0, lon1, lat1


class Projection:
    def __init__(self, rect: Tuple[int, int, int, int], bbox=BD_BBOX) -> None:
        lon0, lat0, lon1, lat1 = bbox
        self.k = math.cos(math.radians((lat0 + lat1) / 2))
        gw, gh = (lon1 - lon0) * self.k, (lat1 - lat0)
        rw, rh = rect[2] - rect[0], rect[3] - rect[1]
        self.s = min(rw / gw, rh / gh)
        self.ox = rect[0] + (rw - gw * self.s) / 2
        self.oy = rect[1] + (rh - gh * self.s) / 2
        self.lon0, self.lat1 = lon0, lat1

    def __call__(self, lon: float, lat: float) -> Tuple[float, float]:
        return (self.ox + (lon - self.lon0) * self.k * self.s, self.oy + (self.lat1 - lat) * self.s)


def map_bbox(points: Sequence[Tuple[float, float]]) -> Tuple[float, float, float, float]:
    """Whole country, or zoom to the points when they sit in one city."""
    if not points:
        return BD_BBOX
    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    span = max(max(lons) - min(lons), max(lats) - min(lats))
    if span > 1.2:
        return BD_BBOX
    cx, cy = (max(lons) + min(lons)) / 2, (max(lats) + min(lats)) / 2
    half = max(span * 0.75, 0.12)
    return (cx - half, cy - half, cx + half, cy + half)


def map_layer(size: Tuple[int, int], bbox, line_w: int) -> Tuple[Image.Image, Projection]:
    """Country outline on a transparent layer the size of the map rect."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    proj = Projection((0, 0, size[0], size[1]), bbox)
    d = ImageDraw.Draw(layer, "RGBA")
    for ring in bd_rings():
        pts = [proj(x, y) for x, y in ring]
        d.polygon(pts, fill=(30, 41, 72, 235), outline=(99, 115, 160, 255), width=line_w)
    return layer, proj


# ===========================================================================
# Scene layouts
# ===========================================================================
def _title(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    bw = x1 - x0
    hf, lines = fit_font(data.get("headline", ""), "bold", int((10 if ctx.vertical else 8) * u), bw, 4)
    line_h = hf.size * 1.35
    block = int(6 * u) + len(lines) * line_h + int(10 * u)
    y = y0 + max(0, (y1 - y0 - block) / 2)
    a = prog(t, 0.0, 0.5)
    if data.get("kicker"):
        chip(d, x0, y + (1 - a) * 3 * u, data["kicker"], data.get("color", ACCENT), 3.2 * u, a)
    y += int(8 * u)
    for i, line in enumerate(lines):
        p = prog(t, 0.15 + i * 0.12, 0.55)
        d.text((x0, y + i * line_h + (1 - p) * 4 * u), line, font=hf, fill=rgba(TEXT, p))
    y += len(lines) * line_h + int(1.5 * u)
    bar = prog(t, 0.45, 0.6)
    d.rounded_rectangle((x0, y, x0 + max(2, int(22 * u * bar)), y + int(1.1 * u)), radius=int(0.5 * u),
                        fill=data.get("color", ACCENT))
    if data.get("subline"):
        p = prog(t, 0.6, 0.5)
        sf = font("semibold", int(4.2 * u))
        text_lines(d, x0, y + int(3 * u), wrap(data["subline"], sf, bw, 2), sf, MUTED, p)


def _stat(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    bw = x1 - x0
    lf = font("semibold", int(4.6 * u))
    label_lines = wrap(data.get("label", ""), lf, bw, 2)
    nf = font("bold", int((30 if ctx.vertical else 24) * u))
    value = int(data.get("value", 0))
    p_count = ease((t - 0.25) / 1.1)
    shown = bangla.number(round(value * p_count))
    total_h = len(label_lines) * lf.size * 1.4 + nf.size * 1.15 + 14 * u
    y = y0 + max(0, (y1 - y0 - total_h) / 2)
    a = prog(t, 0, 0.5)
    y += text_lines(d, x0, y, label_lines, lf, MUTED, a)
    d.text((x0, y), shown, font=nf, fill=rgba(TEXT, a))
    num_w = nf.getlength(bangla.number(value))
    if data.get("unit"):
        uf = font("bold", int(6 * u))
        d.text((x0 + num_w + 2 * u, y + nf.size * 0.62), data["unit"], font=uf, fill=rgba(MUTED, a))
    y += nf.size * 1.2
    delta = data.get("delta_pct")
    if delta is not None:
        p = prog(t, 1.1, 0.5)
        up = delta >= 0
        color = MUTED if abs(delta) < 2 else (ACCENT if up else GOOD)
        df = font("bold", int(4.4 * u))
        txt = data.get("delta_text", "")
        w = df.getlength(txt) + 10 * u
        h = 8 * u
        d.rounded_rectangle((x0, y, x0 + w, y + h), radius=int(h / 2), fill=rgba(color, 0.18 * p),
                            outline=rgba(color, p), width=3)
        if abs(delta) < 2:
            d.rounded_rectangle((x0 + 2.6 * u, y + h / 2 - 0.5 * u, x0 + 5.6 * u, y + h / 2 + 0.5 * u),
                                radius=int(0.4 * u), fill=rgba(color, p))
        else:
            triangle(d, x0 + 2.6 * u, y + h * 0.72 if up else y + h * 0.75, 3 * u, up, color, p)
        d.text((x0 + 7.2 * u, y + 1.2 * u), txt, font=df, fill=rgba(TEXT, p))
        y += h + 3 * u
    if data.get("note"):
        p = prog(t, 1.3, 0.5)
        nf2 = font("regular", int(3.6 * u))
        text_lines(d, x0, y, wrap(data["note"], nf2, bw, 3), nf2, MUTED, p)


def _chart_title(ctx, d, t, title, y0, x0, bw) -> float:
    u = ctx.u
    tf = font("bold", int((5.6 if ctx.vertical else 5) * u))
    lines = wrap(title, tf, bw, 2)
    return text_lines(d, x0, y0, lines, tf, TEXT, prog(t, 0, 0.5)) + 3 * u


def _trend(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    y = y0 + _chart_title(ctx, d, t, data.get("title", ""), y0, x0, x1 - x0)
    points = data.get("points", [])
    if not points:
        return
    n = len(points)
    peak = max(1, max(p["count"] for p in points))
    label_h = 6 * u
    top, bottom = y + 6 * u, y1 - label_h
    gap = (x1 - x0) / n
    bw = gap * 0.66
    vf = font("bold", int((3.4 if n <= 10 else 2.8) * u))
    xf = font("semibold", int((2.9 if n <= 10 else 2.4) * u))
    every = 1 if n <= 10 else 2
    max_i = max(range(n), key=lambda i: points[i]["count"])
    for i, pt in enumerate(points):
        p = ease((t - 0.3 - i * 0.05) / 0.6)
        h = (bottom - top) * pt["count"] / peak * p
        bx = x0 + i * gap + (gap - bw) / 2
        color = ACCENT if i == max_i else BAR
        d.rounded_rectangle((bx, bottom - max(h, 2), bx + bw, bottom), radius=int(min(bw / 3, 1.2 * u)),
                            fill=rgba(color, 0.35 + 0.65 * min(1, p * 1.5)))
        if p > 0.6:
            d.text((bx + bw / 2, bottom - h - 1 * u), bangla.number(pt["count"]), font=vf,
                   fill=rgba(TEXT, (p - 0.6) / 0.4), anchor="md")
        if (n - 1 - i) % every == 0:
            d.text((bx + bw / 2, bottom + 1.2 * u), pt.get("label", ""), font=xf,
                   fill=rgba(MUTED, prog(t, 0.2, 0.5)), anchor="ma")
    d.line((x0, bottom, x1, bottom), fill=rgba(FAINT, 1), width=2)


def _bars(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    y = y0 + _chart_title(ctx, d, t, data.get("title", ""), y0, x0, x1 - x0)
    items = data.get("items", [])[:6]
    if not items:
        return
    peak = max(1, max(i["value"] for i in items))
    row = min((y1 - y) / len(items), (11 if ctx.vertical else 10) * u)
    label_w = (x1 - x0) * (0.42 if ctx.vertical else 0.34)
    lf = font("semibold", int(min(row * 0.36, 4.4 * u)))
    vf = font("bold", int(min(row * 0.38, 4.6 * u)))
    for i, item in enumerate(items):
        p = prog(t, 0.3 + i * 0.13, 0.7)
        ry = y + i * row
        cy = ry + row / 2
        d.text((x0, cy), wrap(item["label"], lf, label_w - 2 * u, 1)[0], font=lf,
               fill=rgba(TEXT, p), anchor="lm")
        bx0 = x0 + label_w
        full = (x1 - bx0 - 12 * u)
        w = max(4, full * item["value"] / peak * p)
        bh = row * 0.5
        color = item.get("color") or (ACCENT if i == 0 else BAR)
        d.rounded_rectangle((bx0, cy - bh / 2, bx0 + w, cy + bh / 2), radius=int(bh / 3), fill=rgba(color, 0.95))
        value = item.get("value_text") or bangla.number(round(item["value"] * p))
        d.text((bx0 + w + 1.6 * u, cy), value, font=vf, fill=rgba(TEXT, p), anchor="lm")


def _map_parts(ctx: Ctx, data: dict, rect: Tuple[int, int, int, int]):
    bbox = tuple(data.get("bbox") or map_bbox([(p["lon"], p["lat"]) for p in data.get("points", [])]))
    key = ("map", bbox, rect)
    if key not in ctx.cache:
        size = (rect[2] - rect[0], rect[3] - rect[1])
        layer, proj = map_layer(size, bbox, max(2, int(0.35 * ctx.u)))
        mask = Image.new("L", size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=int(2.5 * ctx.u), fill=255)
        layer.putalpha(Image.composite(layer.getchannel("A"), mask, mask))
        ctx.cache[key] = (layer, proj)
    return ctx.cache[key]


def _map(ctx: Ctx, d, t: float, data: dict, img: Image.Image) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    y = y0 + _chart_title(ctx, d, t, data.get("title", ""), y0, x0, x1 - x0)
    if ctx.vertical:
        mrect = (x0, int(y), x1, int(y + (y1 - y) * 0.62))
        lrect = (x0, int(mrect[3] + 2 * u), x1, y1)
        n_list = 3
    else:
        mrect = (x0, int(y), int(x0 + (x1 - x0) * 0.5), y1)
        lrect = (int(mrect[2] + 5 * u), int(y), x1, y1)
        n_list = 5
    layer, proj = _map_parts(ctx, data, mrect)
    a = prog(t, 0.0, 0.6)
    if a >= 1:
        img.paste(layer, mrect[:2], layer)
    else:
        faded = layer.copy()
        faded.putalpha(faded.getchannel("A").point(lambda v: int(v * a)))
        img.paste(faded, mrect[:2], faded)
    pts = data.get("points", [])
    peak = max([p["count"] for p in pts] or [1])
    for i, p in enumerate(sorted(pts, key=lambda p: p["count"])):
        px, py = proj(p["lon"], p["lat"])
        px, py = px + mrect[0], py + mrect[1]
        if not (mrect[0] <= px <= mrect[2] and mrect[1] <= py <= mrect[3]):
            continue
        s = ease_back((t - 0.4 - i * 0.03) / 0.5) if t > 0.4 + i * 0.03 else 0
        r = (1.0 + 3.2 * math.sqrt(p["count"] / peak)) * u * s
        if r <= 0:
            continue
        d.ellipse((px - r * 1.9, py - r * 1.9, px + r * 1.9, py + r * 1.9), fill=rgba(ACCENT, 0.16))
        d.ellipse((px - r, py - r, px + r, py + r), fill=rgba(ACCENT, 0.85), outline=rgba(TEXT, 0.8), width=2)
        rank = p.get("rank")
        if rank and rank <= n_list and s > 0.9:
            d.text((px, py), bangla.digits(rank), font=font("bold", int(max(r * 1.1, 2.6 * u))),
                   fill=TEXT, anchor="mm", stroke_width=2, stroke_fill=rgba(BG_TOP, 0.9))
    top = data.get("top", [])[:n_list]
    if top:
        row = min((lrect[3] - lrect[1]) / max(1, len(top)), 11 * u)
        nf = font("bold", int(min(row * 0.42, 4.6 * u)))
        cf = font("bold", int(min(row * 0.4, 4.4 * u)))
        for i, item in enumerate(top):
            p = prog(t, 0.8 + i * 0.15, 0.5)
            cy = lrect[1] + i * row + row / 2
            r = row * 0.3
            d.ellipse((lrect[0], cy - r, lrect[0] + 2 * r, cy + r), fill=rgba(ACCENT if i == 0 else BAR, p))
            d.text((lrect[0] + r, cy), bangla.digits(i + 1), font=font("bold", int(r * 1.2)),
                   fill=rgba(TEXT, p), anchor="mm")
            name_w = lrect[2] - lrect[0] - 2 * r - 18 * u
            d.text((lrect[0] + 2 * r + 2.5 * u, cy), wrap(item["label"], nf, name_w, 1)[0], font=nf,
                   fill=rgba(TEXT, p), anchor="lm")
            d.text((lrect[2], cy), item.get("value_text", ""), font=cf, fill=rgba(AMBER, p), anchor="rm")


def _incident(ctx: Ctx, d, t: float, data: dict, img: Image.Image) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    color = data.get("color", ACCENT)
    if ctx.vertical:
        trect = (x0, y0, x1, int(y0 + (y1 - y0) * 0.62))
        mrect = (int(x0 + (x1 - x0) * 0.18), int(trect[3] + 1 * u), int(x1 - (x1 - x0) * 0.18), y1)
    else:
        trect = (x0, y0, int(x0 + (x1 - x0) * 0.6), y1)
        mrect = (int(trect[2] + 4 * u), y0, x1, y1)
    a = prog(t, 0, 0.5)
    x, y = trect[0], trect[1]
    if data.get("counter"):
        w = chip(d, x, y, data["counter"], FAINT, 3 * u, a)
        x += w + 1.5 * u
    chip(d, x, y, data.get("category", ""), color, 3 * u, a)
    y += 9 * u
    hf, lines = fit_font(data.get("headline", ""), "bold", int((7.4 if ctx.vertical else 6) * u),
                         trect[2] - trect[0], 4)
    for i, line in enumerate(lines):
        p = prog(t, 0.15 + i * 0.1, 0.5)
        d.text((trect[0], y + i * hf.size * 1.36 + (1 - p) * 3 * u), line, font=hf, fill=rgba(TEXT, p))
    y += len(lines) * hf.size * 1.36 + 2.5 * u
    mf = font("semibold", int(4 * u))
    p = prog(t, 0.5, 0.5)
    pin(d, trect[0] + 1.4 * u, y + 4.2 * u, 1.3 * u, color, p)
    d.text((trect[0] + 4.4 * u, y), data.get("place", ""), font=mf, fill=rgba(TEXT, p))
    y += 6.4 * u
    if data.get("date"):
        cx0, cy0 = trect[0] + 0.2 * u, y + 1.1 * u
        d.rounded_rectangle((cx0, cy0, cx0 + 2.6 * u, cy0 + 2.6 * u), radius=int(0.4 * u),
                            outline=rgba(MUTED, p), width=3)
        d.rectangle((cx0, cy0, cx0 + 2.6 * u, cy0 + 0.8 * u), fill=rgba(MUTED, p))
        d.text((trect[0] + 4.4 * u, y), data["date"], font=mf, fill=rgba(MUTED, p))
        y += 6.4 * u
    if data.get("source"):
        sf = font("regular", int(3.2 * u))
        d.text((trect[0], y + 1 * u), f"সূত্র: {data['source']}", font=sf, fill=rgba(MUTED, prog(t, 0.7, 0.5)))
    # Mini map with the pin.
    if data.get("lat") is not None:
        layer, proj = _map_parts(ctx, {"points": [], "bbox": BD_BBOX}, mrect)
        if a >= 1:
            img.paste(layer, mrect[:2], layer)
        else:
            faded = layer.copy()
            faded.putalpha(faded.getchannel("A").point(lambda v: int(v * a)))
            img.paste(faded, mrect[:2], faded)
        px, py = proj(data["lon"], data["lat"])
        s = ease_back((t - 0.6) / 0.5) if t > 0.6 else 0
        if s > 0:
            pin(d, px + mrect[0], py + mrect[1], 2.2 * u * s, color)


def _incident_live(ctx: Ctx, d, t: float, data: dict) -> None:
    """Pulsing ring under the pin, drawn every frame."""
    if data.get("lat") is None or t < 1.0:
        return
    x0, y0, x1, y1 = ctx.box
    if ctx.vertical:
        top = int(y0 + (y1 - y0) * 0.62)
        mrect = (int(x0 + (x1 - x0) * 0.18), int(top + 1 * ctx.u), int(x1 - (x1 - x0) * 0.18), y1)
    else:
        mrect = (int(x0 + (x1 - x0) * 0.6 + 4 * ctx.u), y0, x1, y1)
    _, proj = _map_parts(ctx, {"points": [], "bbox": BD_BBOX}, mrect)
    px, py = proj(data["lon"], data["lat"])
    px, py = px + mrect[0], py + mrect[1]
    phase = (t * 0.8) % 1.0
    r = ctx.u * (1 + 5 * phase)
    d.ellipse((px - r, py - r * 0.5, px + r, py + r * 0.5), outline=rgba(data.get("color", ACCENT), 1 - phase), width=3)


def _reveal_times(ctx: Ctx, n: int, start: float = 0.4) -> List[float]:
    span = max(0.5, ctx.duration * 0.75 - start)
    return [start + span * i / max(1, n) for i in range(n)]


def _points(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    bw = x1 - x0
    y = y0
    if data.get("kicker"):
        chip(d, x0, y, data["kicker"], data.get("color", ACCENT), 3 * u, prog(t, 0, 0.4))
        y += 9 * u
    hf, hl = fit_font(data.get("heading", ""), "bold", int((7 if ctx.vertical else 6) * u), bw, 2)
    y += text_lines(d, x0, y, hl, hf, TEXT, prog(t, 0.1, 0.5), hf.size * 1.32) + 2.5 * u
    items = data.get("items", [])[:4]
    if not items:
        return
    room = y1 - y
    bf = font("semibold", int((5.0 if ctx.vertical else 4.8) * u))
    while bf.size > 22:
        wrapped = [wrap(s, bf, bw - 9 * u, 3) for s in items]
        need = sum(len(w) * bf.size * 1.38 + 3 * u for w in wrapped)
        if need <= room:
            break
        bf = font("semibold", int(bf.size * 0.92))
    wrapped = [wrap(s, bf, bw - 9 * u, 3) for s in items]
    times = _reveal_times(ctx, len(items))
    color = data.get("color", ACCENT)
    for item_lines, start in zip(wrapped, times):
        p = prog(t, start, 0.45)
        if p <= 0:
            break
        d.rounded_rectangle((x0, y + 0.9 * u, x0 + 1.2 * u, y + bf.size * 1.25), radius=int(0.5 * u),
                            fill=rgba(color, p))
        h = text_lines(d, x0 + 4 * u + (1 - p) * 3 * u, y, item_lines, bf, TEXT, p, bf.size * 1.38)
        y += h + 3 * u


def _steps(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    bw = x1 - x0
    hf, hl = fit_font(data.get("heading", ""), "bold", int((6.6 if ctx.vertical else 5.6) * u), bw, 2)
    y = y0 + text_lines(d, x0, y0, hl, hf, TEXT, prog(t, 0, 0.5), hf.size * 1.32) + 2.5 * u
    lines = data.get("helplines", [])
    strip_h = 9 * u if lines else 0
    steps = data.get("steps", [])[:4]
    bf = font("semibold", int((4.8 if ctx.vertical else 4.6) * u))
    room = y1 - y - strip_h - 2 * u
    while bf.size > 22:
        wrapped = [wrap(s, bf, bw - 11 * u, 3) for s in steps]
        if sum(len(w) * bf.size * 1.38 + 2.6 * u for w in wrapped) <= room:
            break
        bf = font("semibold", int(bf.size * 0.92))
    wrapped = [wrap(s, bf, bw - 11 * u, 3) for s in steps]
    times = _reveal_times(ctx, len(steps))
    for i, (item_lines, start) in enumerate(zip(wrapped, times)):
        p = prog(t, start, 0.45)
        if p <= 0:
            break
        r = 3 * u
        d.ellipse((x0, y, x0 + 2 * r, y + 2 * r), fill=rgba(data.get("color", ACCENT), p))
        d.text((x0 + r, y + r), bangla.digits(i + 1), font=font("bold", int(3.4 * u)), fill=rgba(TEXT, p),
               anchor="mm")
        h = text_lines(d, x0 + 2 * r + 3 * u, y + 0.2 * u, item_lines, bf, TEXT, p, bf.size * 1.38)
        y += max(h, 2 * r) + 2.6 * u
    if lines:
        p = prog(t, 0.6, 0.5)
        sy = y1 - strip_h
        panel(d, (x0, sy, x1, y1), p, radius=int(2 * u), outline=FAINT)
        n = len(lines)
        cw = bw / n
        nf = font("bold", int(4.4 * u))
        lf = font("regular", int(2.4 * u if ctx.vertical else 2.2 * u))
        for i, (num, label) in enumerate(lines):
            cx = x0 + cw * i + cw / 2
            d.text((cx, sy + 1.1 * u), num, font=nf, fill=rgba(AMBER, p), anchor="ma")
            d.text((cx, sy + 6.3 * u), wrap(label, lf, cw - 2 * u, 1)[0], font=lf, fill=rgba(MUTED, p),
                   anchor="ma")


def _outro(ctx: Ctx, d, t: float, data: dict) -> None:
    x0, y0, x1, y1 = ctx.box
    u = ctx.u
    cx = (x0 + x1) / 2
    y = y0 + (y1 - y0) * 0.12
    a = prog(t, 0, 0.5)
    hf = font("bold", int((6.6 if ctx.vertical else 5.6) * u))
    for line in wrap(data.get("headline", ""), hf, x1 - x0, 2):
        d.text((cx, y), line, font=hf, fill=rgba(TEXT, a), anchor="ma")
        y += hf.size * 1.35
    y += 4 * u
    s = ease_back((t - 0.35) / 0.5) if t > 0.35 else 0
    bf = font("bold", int(5 * u))
    label = data.get("button", "সাবস্ক্রাইব করুন")
    w = (bf.getlength(label) + 12 * u) * max(0.01, s)
    h = 11 * u * max(0.01, s)
    d.rounded_rectangle((cx - w / 2, y, cx + w / 2, y + h), radius=int(h / 2), fill=ACCENT)
    if s > 0.8:
        d.text((cx, y + h / 2), label, font=bf, fill=TEXT, anchor="mm")
    y += 11 * u + 5 * u
    p = prog(t, 0.7, 0.5)
    if data.get("site"):
        sf = font("semibold", int(3.8 * u))
        d.text((cx, y), data["site"], font=sf, fill=rgba(AMBER, p), anchor="ma")
        y += 7 * u
    if data.get("note"):
        nf = font("regular", int(2.9 * u))
        for line in wrap(data["note"], nf, x1 - x0, 4):
            d.text((cx, y), line, font=nf, fill=rgba(MUTED, p), anchor="ma")
            y += nf.size * 1.4


DRAW: Dict[str, Callable] = {
    "title": _title, "stat": _stat, "trend": _trend, "bars": _bars, "points": _points,
    "steps": _steps, "outro": _outro,
}
NEEDS_IMAGE = {"map": _map, "incident": _incident}
LIVE = {"incident": _incident_live}


def anim_end(ctx: Ctx, kind: str, data: dict) -> float:
    if kind == "trend":
        return 0.3 + len(data.get("points", [])) * 0.05 + 0.7
    if kind == "bars":
        return 0.3 + len(data.get("items", [])[:6]) * 0.13 + 0.8
    if kind == "map":
        return 0.8 + len(data.get("points", [])) * 0.03 + 0.9
    if kind in ("points", "steps"):
        n = len(data.get("items" if kind == "points" else "steps", []))
        return (_reveal_times(ctx, n)[-1] if n else 0) + 0.7
    if kind == "stat":
        return 1.9
    return 1.4


def draw_scene(ctx: Ctx, kind: str, data: dict, t: float) -> Image.Image:
    img = background(ctx).copy()
    d = ImageDraw.Draw(img, "RGBA")
    if kind in NEEDS_IMAGE:
        NEEDS_IMAGE[kind](ctx, d, t, data, img)
    else:
        DRAW[kind](ctx, d, t, data)
    return img


def draw_live(ctx: Ctx, kind: str, data: dict, img: Image.Image, t: float) -> None:
    if kind in LIVE:
        LIVE[kind](ctx, ImageDraw.Draw(img, "RGBA"), t, data)


# ===========================================================================
# Captions and progress
# ===========================================================================
def caption_image(ctx: Ctx, text: str) -> Image.Image:
    key = ("cap", text)
    if key in ctx.cache:
        return ctx.cache[key]
    u = ctx.u
    f = font("bold", int((5.4 if ctx.vertical else 4.4) * u))
    max_w = ctx.W - 2 * ctx.margin - 6 * u
    lines = wrap(text, f, max_w, 2)
    line_h = f.size * 1.38
    w = int(max(f.getlength(l) for l in lines) + 5 * u) if lines else 1
    h = int(len(lines) * line_h + 2.4 * u)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=int(1.6 * u), fill=(0, 0, 0, 175))
    for i, line in enumerate(lines):
        d.text((w / 2, 1.0 * u + i * line_h), line, font=f, fill=(255, 255, 255, 255), anchor="ma",
               stroke_width=0)
    ctx.cache[key] = img
    return img


def paste_caption(ctx: Ctx, frame: Image.Image, text: str) -> None:
    if not text:
        return
    cap = caption_image(ctx, text)
    x = (ctx.W - cap.width) // 2
    y = ctx.caption_center - cap.height // 2
    frame.paste(cap, (x, y), cap)


def draw_progress(ctx: Ctx, frame: Image.Image, fraction: float) -> None:
    d = ImageDraw.Draw(frame)
    h = max(4, int(0.6 * ctx.u))
    d.rectangle((0, ctx.H - h, int(ctx.W * fraction), ctx.H), fill=ACCENT)


# ===========================================================================
# Thumbnail
# ===========================================================================
def thumbnail(path: Path, *, headline: str, kicker: str = "", badge: str = "", color: str = "#ef4444",
              channel: str = "", sample: bool = False, size=(1280, 720)) -> None:
    W, H = size
    ctx = Ctx(W, H, show="", channel=channel, sample=False)
    img = background(ctx).copy()
    d = ImageDraw.Draw(img, "RGBA")
    u = ctx.u
    # Country silhouette on the right.
    mrect = (int(W * 0.58), int(H * 0.06), int(W * 0.98), int(H * 0.96))
    layer, _ = map_layer((mrect[2] - mrect[0], mrect[3] - mrect[1]), BD_BBOX, 3)
    layer.putalpha(layer.getchannel("A").point(lambda v: int(v * 0.55)))
    img.paste(layer, mrect[:2], layer)
    d = ImageDraw.Draw(img, "RGBA")
    x = int(6 * u)
    y = int(17 * u)
    if kicker:
        chip(d, x, y, kicker, color, 5 * u)
        y += int(13 * u)
    hf, lines = fit_font(headline, "bold", int(15 * u), W * 0.62, 3, min_size=40)
    for line in lines:
        d.text((x, y), line, font=hf, fill=(255, 255, 255), stroke_width=int(0.5 * u), stroke_fill=(0, 0, 0))
        y += hf.size * 1.28
    if badge:
        bf = font("bold", int(9 * u))
        bw = bf.getlength(badge) + 8 * u
        bx, by = W - bw - 5 * u, H - 22 * u
        d.rounded_rectangle((bx, by, bx + bw, by + 16 * u), radius=int(3 * u), fill=hex_rgb(color))
        d.text((bx + bw / 2, by + 8 * u), badge, font=bf, fill=(255, 255, 255), anchor="mm")
    d.rectangle((0, H - int(1.6 * u), W, H), fill=hex_rgb(color))
    if sample:
        f = font("bold", int(4 * u))
        d.text((W / 2, H - 9 * u), "নমুনা ডেটা", font=f, fill=AMBER, anchor="ma")
    img.save(path, quality=92)
