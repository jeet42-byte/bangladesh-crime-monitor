import re, sys
from pptx import Presentation
from pptx.oxml.ns import qn
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
pr = Presentation(sys.argv[1]); n = 0
for s in pr.slides:
    root = s._element; vids = []
    for pic in root.iter(P + 'pic'):
        nv = pic.find(P + 'nvPicPr/' + P + 'nvPr')
        vf = nv.find(qn('a:videoFile')) if nv is not None else None
        if vf is None: continue
        vids.append(pic.find(P + 'nvPicPr/' + P + 'cNvPr').get('id'))
        rids = [vf.get(qn('r:link'))]
        nv.remove(vf)
        for ext in list(nv.iter(P + 'ext')):
            for m in ext.iter('{http://schemas.microsoft.com/office/powerpoint/2010/main}media'): rids.append(m.get(qn('r:embed')))
        el = nv.find(P + 'extLst')
        if el is not None: nv.remove(el)
        for r in rids:
            if r: s.part.drop_rel(r)
        n += 1
    t = root.find(P + 'timing')
    if t is not None and vids:
        for v in list(t.iter(P + 'video')): v.getparent().remove(v)
        for par in list(t.iter(P + 'par')):
            c = par.find(P + 'cTn')
            if c is not None and c.get('presetClass') == 'mediacall': par.getparent().remove(par)
pr.save(sys.argv[2]); print('videos replaced by still frames:', n)
