"""Generate every chart for the three reports from data/study.json.

Run:  python3 tools/charts.py
All figures are derived from the coded interview data, so after you replace the
illustrative answers/codes with your real ones, re-running this redraws them.
"""
import json
import os
import textwrap
from collections import Counter, defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "charts")
os.makedirs(OUT, exist_ok=True)

with open(os.path.join(ROOT, "data", "study.json"), encoding="utf-8") as f:
    S = json.load(f)

# Reference palette (validated categorical order, light mode)
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]
TEXT = "#0b0b0b"
TEXT2 = "#52514e"
GRID = "#e4e3df"
SURFACE = "#ffffff"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 9.5,
    "text.color": TEXT,
    "axes.labelcolor": TEXT2,
    "axes.edgecolor": GRID,
    "xtick.color": TEXT2,
    "ytick.color": TEXT,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
})

themes = S["themes"]
theme_by_id = {t["id"]: t for t in themes}
code_by_id = {c["id"]: c for c in S["codes"]}
resp = S["respondents"]

# ---- derived counts -------------------------------------------------------
seg_per_theme = Counter()                # coded segments per theme
resp_per_theme = defaultdict(set)        # respondents mentioning theme
resp_per_code = defaultdict(set)         # respondents mentioning code
matrix = defaultdict(Counter)            # respondent -> theme -> segments
for r in resp:
    for q, a in r["answers"].items():
        for cid in a["codes"]:
            t = code_by_id[cid]["theme"]
            seg_per_theme[t] += 1
            resp_per_theme[t].add(r["id"])
            resp_per_code[cid].add(r["id"])
            matrix[r["id"]][t] += 1


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=200, bbox_inches="tight", facecolor=SURFACE)
    plt.close(fig)
    print("wrote", os.path.relpath(path, ROOT))


# ---- Figure: respondent profile (years in practice, by gender) -------------
ACC = SERIES[0]


def _dark(hexc, f=0.45):
    h = hexc.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % (int(r * f), int(g * f), int(b * f))


def profile_chart(key):
    fig, ax = plt.subplots(figsize=(6.6, 2.9))
    ids = [r["id"] for r in resp]
    yrs = [r["years"] for r in resp]
    cols = [ACC if r["gender"] == "Male" else SERIES[1] for r in resp]
    bars = ax.bar(ids, yrs, color=cols, width=0.62, edgecolor=SURFACE, linewidth=1)
    for b, y in zip(bars, yrs):
        ax.text(b.get_x() + b.get_width() / 2, y + 0.25, str(y), ha="center",
                va="bottom", fontsize=8.5, color=TEXT2)
    ax.set_ylabel("Years in practice")
    ax.set_ylim(0, max(yrs) + 2)
    ax.yaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.tick_params(axis="x", length=0)
    from matplotlib.patches import Patch
    n_m = sum(r["gender"] == "Male" for r in resp)
    n_f = len(resp) - n_m
    ax.legend(handles=[Patch(color=ACC, label=f"Male (n={n_m})"),
                       Patch(color=SERIES[1], label=f"Female (n={n_f})")],
              frameon=False, loc="upper left", ncol=2, fontsize=8.5)
    mean = sum(yrs) / len(yrs)
    ax.set_title(f"Respondents' years in practice (mean {mean:.1f}, range {min(yrs)}-{max(yrs)})",
                 loc="left", fontsize=10, color=TEXT)
    save(fig, f"fig_profile_{key}.png")


# ---- Figure: coded segments per theme ------------------------------------
def theme_chart(key):
    order = sorted(themes, key=lambda t: seg_per_theme[t["id"]])
    fig, ax = plt.subplots(figsize=(6.6, 3.1))
    labels = [f'{t["id"]}  {t["short"]}' for t in order]
    vals = [seg_per_theme[t["id"]] for t in order]
    bars = ax.barh(labels, vals, color=ACC, height=0.6)
    for b, t in zip(bars, order):
        n = len(resp_per_theme[t["id"]])
        ax.text(b.get_width() + 0.4, b.get_y() + b.get_height() / 2,
                f'{int(b.get_width())} segments · {n}/{len(resp)} respondents',
                va="center", fontsize=8.3, color=TEXT2)
    ax.set_xlim(0, max(vals) * 1.55)
    ax.set_xlabel("Number of coded interview segments")
    ax.xaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", length=0)
    ax.set_title("How often each theme appeared across the ten interviews",
                 loc="left", fontsize=10)
    save(fig, f"fig_theme_segments_{key}.png")


# ---- Figure: respondent x theme matrix ------------------------------------
def matrix_chart(key):
    cmap = LinearSegmentedColormap.from_list("seq", ["#f7f7f5", ACC, _dark(ACC)])
    ids = [r["id"] for r in resp]
    data = [[matrix[i][t["id"]] for t in themes] for i in ids]
    vmax = max(max(row) for row in data)
    fig, ax = plt.subplots(figsize=(6.6, 3.9))
    im = ax.imshow(data, cmap=cmap, vmin=0, vmax=vmax, aspect="auto")
    ax.set_xticks(range(len(themes)))
    ax.set_xticklabels([t["id"] + "\n" + "\n".join(textwrap.wrap(t["short"], 11, break_long_words=False)) for t in themes], fontsize=7.4)
    ax.set_yticks(range(len(ids)))
    ax.set_yticklabels(ids)
    ax.tick_params(length=0)
    for s in ax.spines.values():
        s.set_visible(False)
    ax.set_xticks([x - 0.5 for x in range(1, len(themes))], minor=True)
    ax.set_yticks([y - 0.5 for y in range(1, len(ids))], minor=True)
    ax.grid(which="minor", color=SURFACE, linewidth=2)
    ax.tick_params(which="minor", length=0)
    for i, row in enumerate(data):
        for j, v in enumerate(row):
            ax.text(j, i, str(v) if v else "–", ha="center", va="center", fontsize=8.5,
                    color=SURFACE if v >= vmax * 0.55 else TEXT)
    cb = fig.colorbar(im, ax=ax, fraction=0.03, pad=0.02)
    cb.outline.set_visible(False)
    cb.set_label("Coded segments", color=TEXT2, fontsize=8)
    ax.set_title("Framework matrix: coded segments per respondent and theme",
                 loc="left", fontsize=10)
    save(fig, f"fig_matrix_{key}.png")


# ---- Figure: focal codes for a paper --------------------------------------
def codes_chart(key, focus):
    rows = []
    for ti, t in enumerate(focus):
        cs = [c for c in S["codes"] if c["theme"] == t]
        cs.sort(key=lambda c: -len(resp_per_code[c["id"]]))
        for c in cs:
            rows.append((c, ti))  # first focal theme drawn at the top
    fig, ax = plt.subplots(figsize=(6.6, 0.3 * len(rows) + 1.0))
    y = list(range(len(rows)))[::-1]
    vals = [len(resp_per_code[c["id"]]) for c, _ in rows]
    cols = [SERIES[ti] for _, ti in rows]
    ax.barh(y, vals, color=cols, height=0.62, edgecolor=SURFACE, linewidth=1)
    ax.set_yticks(y)
    ax.set_yticklabels([c["label"] for c, _ in rows], fontsize=8)
    for yy, v in zip(y, vals):
        ax.text(v + 0.12, yy, str(v), va="center", fontsize=8, color=TEXT2)
    ax.set_xlim(0, len(resp) + 0.6)
    ax.set_xticks(range(0, len(resp) + 1, 2))
    ax.set_xlabel(f"Respondents who mentioned the code (of {len(resp)})")
    ax.xaxis.grid(True, color=GRID, linewidth=0.6)
    ax.set_axisbelow(True)
    ax.tick_params(axis="y", length=0)
    from matplotlib.patches import Patch
    ax.legend(handles=[Patch(color=SERIES[i], label=f'{t}: {theme_by_id[t]["short"]}')
                       for i, t in enumerate(focus)],
              frameon=False, loc="lower center", bbox_to_anchor=(0.35, 1.0), ncol=2, fontsize=8)
    save(fig, f"fig_codes_{key}.png")


# ---- Figure: Strauss & Corbin coding paradigm model -----------------------
def paradigm_chart(key, p):
    fig, ax = plt.subplots(figsize=(7.2, 5.4))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")

    def box(x, y, w, h, title, items, fill, edge, bold_center=False, wrap=30):
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.4,rounding_size=1.6",
                                    facecolor=fill, edgecolor=edge, linewidth=1.2))
        ax.text(x + w / 2, y + h - 3.2, title, ha="center", va="top", fontsize=8.6,
                fontweight="bold", color=TEXT)
        if bold_center:
            ax.text(x + w / 2, y + h / 2 - 3, items, ha="center", va="center", fontsize=8.4,
                    color=TEXT, wrap=True)
        else:
            body = "\n".join("• " + "\n   ".join(textwrap.wrap(i, wrap)) for i in items)
            ax.text(x + 2.2, y + h - 9, body, ha="left", va="top", fontsize=7.3,
                    color=TEXT, linespacing=1.45)

    light = "#eef4fc"
    edge = "#2a78d6"
    box(1, 56, 30, 38, "Causal conditions", p["causal"], light, edge, wrap=27)
    box(35, 60, 30, 30, "PHENOMENON", "\n".join(textwrap.wrap(p["phenomenon"], 24)),
        "#2a78d6", "#123f78", bold_center=True)
    # recolor centre text to white
    for t in ax.texts[-2:]:
        t.set_color(SURFACE)
    box(69, 56, 30, 38, "Context", p["context"], light, edge, wrap=27)
    box(33, 32, 34, 23, "Intervening conditions", p["intervening"], "#fdf1ea", "#eb6834", wrap=33)
    box(1, 3, 46, 26, "Action / interaction strategies", p["strategies"], "#eaf7f1", "#1baf7a", wrap=44)
    box(53, 3, 46, 26, "Consequences", p["consequences"], "#fdf6e5", "#c98500", wrap=44)

    def arrow(a, b):
        ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=12,
                                     color=TEXT2, linewidth=1.1))
    arrow((31.5, 75), (34.5, 75))
    arrow((68.5, 75), (65.5, 75))
    arrow((50, 59.5), (50, 55.5))
    arrow((42, 31.5), (32, 29.5))
    arrow((47.5, 16), (52.5, 16))
    ax.set_title("Coding paradigm model (Strauss & Corbin): axial coding of interview data",
                 fontsize=10, loc="left")
    save(fig, f"fig_paradigm_{key}.png")


if __name__ == "__main__":
    for key, p in S["papers"].items():
        ACC = p.get("chart", SERIES[0])
        profile_chart(key)
        theme_chart(key)
        matrix_chart(key)
        codes_chart(key, p["focus"])
        paradigm_chart(key, p["paradigm"])
    # export counts for the document builder
    stats = {
        "seg_per_theme": dict(seg_per_theme),
        "resp_per_theme": {k: sorted(v, key=lambda x: int(x[1:])) for k, v in resp_per_theme.items()},
        "resp_per_code": {k: sorted(v, key=lambda x: int(x[1:])) for k, v in resp_per_code.items()},
        "total_segments": sum(seg_per_theme.values()),
    }
    with open(os.path.join(ROOT, "data", "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=1)
    print("wrote data/stats.json")
