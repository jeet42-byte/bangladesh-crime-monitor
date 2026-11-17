import sys, copy
from docx import Document
from pptx import Presentation
base, deck, out, t1, t2, t3, sub = sys.argv[1:8]
d = Document(base); P = d.paragraphs
i1 = next(i for i,p in enumerate(P) if p.text.startswith('SLIDE 1 ·'))
i4 = next(i for i,p in enumerate(P) if p.text.startswith('SLIDE 4 ·'))
hd, sp, body = P[i1], P[i1+1], P[i1+2]
anchor = P[i4]._p
tmpl = [copy.deepcopy(x._p) for x in (hd, sp, body)]
for p in P[i1:i4]: p._p.getparent().remove(p._p)
def add(kind, text):
    e = copy.deepcopy(tmpl[kind]); anchor.addprevious(e)
    from docx.text.paragraph import Paragraph
    para = Paragraph(e, d._body); rs = para.runs
    rs[0].text = text
    for r in rs[1:]: r._r.getparent().remove(r._r)
pr = Presentation(deck)
for n, t in enumerate((t1, t2, t3)):
    txt = pr.slides[n].notes_slide.notes_text_frame.text
    head, rest = txt.split('\n', 1)
    add(0, f'SLIDE {n+1} · {t}')
    add(1, 'Speaker: ' + head.replace('SPEAKER: ', ''))
    for para in [x.strip() for x in rest.split('\n') if x.strip()]: add(2, para)
P = d.paragraphs
P[0].runs[0].text = P[0].runs[0].text  # keep title
for r in P[0].runs:
    if 'Speaker script' in r.text: r.text = r.text.replace('Speaker script', 'Speaker script · ' + sub)
d.save(out)
