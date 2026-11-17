"""Inject auto-playing PowerPoint animations and slide transitions into a pptxgenjs deck.
usage: python3 inject.py in.pptx spec.json out.pptx
spec.json: [{"trans": "fade"|"push"|"black", "anims": [{"n": shapeName, "e": effect, "d": delayMs, "t": durMs, ...}]}, ...]"""
import json, re, sys, zipfile

SRC, SPECF, OUT = sys.argv[1:4]
SPEC = json.load(open(SPECF))
TRANS = {'fade': '<p:transition spd="med"><p:fade/></p:transition>', 'push': '<p:transition spd="med"><p:push dir="u"/></p:transition>',
         'black': '<p:transition spd="slow"><p:fade thruBlk="1"/></p:transition>', 'wipe': '<p:transition spd="med"><p:wipe dir="r"/></p:transition>'}


class T:
    def __init__(self, ids):
        self.ids, self.n, self.grp, self.bld = ids, 3, {}, []

    def nid(self):
        self.n += 1
        return self.n

    tgt = staticmethod(lambda sp: f'<p:tgtEl><p:spTgt spid="{sp}"/></p:tgtEl>')

    def setv(self, sp):
        return (f'<p:set><p:cBhvr><p:cTn id="{self.nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>{self.tgt(sp)}'
                f'<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>')

    def eff(self, sp, flt, t, way='in'):
        return f'<p:animEffect transition="{way}" filter="{flt}"><p:cBhvr><p:cTn id="{self.nid()}" dur="{t}"/>{self.tgt(sp)}</p:cBhvr></p:animEffect>'

    def anim(self, sp, attr, a, b, t):
        return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{self.nid()}" dur="{t}" fill="hold"/>{self.tgt(sp)}'
                f'<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="{a}"/></p:val></p:tav>'
                f'<p:tav tm="100000"><p:val><p:strVal val="{b}"/></p:val></p:tav></p:tavLst></p:anim>')

    def motion(self, sp, path, t):
        return (f'<p:animMotion origin="layout" path="{path}" pathEditMode="relative" ptsTypes="AA"><p:cBhvr><p:cTn id="{self.nid()}" dur="{t}" fill="hold"/>{self.tgt(sp)}'
                f'<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>')

    def effect(self, a, first):
        sp = self.ids[a['n']]
        e, d, t = a['e'], int(a['d']), int(a['t'])
        extra = ''
        if e == 'fade': pid, cls, sub, kids = 10, 'entr', 0, self.setv(sp) + self.eff(sp, 'fade', t)
        elif e in ('rise', 'drop', 'slide', 'slideR'):
            dx, dy = {'rise': ('#ppt_x', '#ppt_y+.05'), 'drop': ('#ppt_x', '#ppt_y-.05'), 'slide': ('#ppt_x-.04', '#ppt_y'), 'slideR': ('#ppt_x+.04', '#ppt_y')}[e]
            pid, cls, sub = 42, 'entr', 0
            kids = self.setv(sp) + self.eff(sp, 'fade', t) + self.anim(sp, 'ppt_x', dx, '#ppt_x', t) + self.anim(sp, 'ppt_y', dy, '#ppt_y', t)
        elif e in ('wipe', 'wipeR', 'wipeU', 'wipeD'):
            pid, cls = 22, 'entr'
            sub, flt = {'wipe': (8, 'wipe(left)'), 'wipeR': (2, 'wipe(right)'), 'wipeU': (4, 'wipe(up)'), 'wipeD': (1, 'wipe(down)')}[e]
            kids = self.setv(sp) + self.eff(sp, flt, t)
        elif e == 'wheel': pid, cls, sub, kids = 21, 'entr', 1, self.setv(sp) + self.eff(sp, 'wheel(1)', t)
        elif e == 'grow':
            f = a.get('from', 0.4)
            pid, cls, sub = 53, 'entr', 16
            kids = self.setv(sp) + self.anim(sp, 'ppt_w', f'#ppt_w*{f}', '#ppt_w', t) + self.anim(sp, 'ppt_h', f'#ppt_h*{f}', '#ppt_h', t) + self.eff(sp, 'fade', t)
        elif e == 'fadeOut':
            pid, cls, sub = 10, 'exit', 0
            kids = self.eff(sp, 'fade', t, 'out') + self.setv(sp).replace('visible', 'hidden').replace('<p:cond delay="0"/>', f'<p:cond delay="{t - 1}"/>')
        elif e == 'pulse':
            s = int(a.get('scale', 104) * 1000)
            pid, cls, sub = 6, 'emph', 0
            kids = f'<p:animScale><p:cBhvr><p:cTn id="{self.nid()}" dur="{t}" fill="hold"/>{self.tgt(sp)}</p:cBhvr><p:by x="{s}" y="{s}"/></p:animScale>'
            extra = ' autoRev="1" repeatCount="indefinite"'
        elif e == 'breathe':
            pid, cls, sub = 0, 'path', 0
            kids = self.motion(sp, f'M 0 0 L {a.get("dx", 0)} {a.get("dy", -0.006)} E', t)
            extra = ' autoRev="1" repeatCount="indefinite"'
        elif e == 'spin':
            pid, cls, sub = 8, 'emph', 0
            kids = (f'<p:animRot by="21600000"><p:cBhvr><p:cTn id="{self.nid()}" dur="{t}" fill="hold"/>{self.tgt(sp)}'
                    f'<p:attrNameLst><p:attrName>r</p:attrName></p:attrNameLst></p:cBhvr></p:animRot>')
            extra = ' repeatCount="indefinite"'
        elif e == 'type':
            pid, cls, sub, kids = 1, 'entr', 0, self.setv(sp)
            extra_iter = f'<p:iterate type="lt"><p:tmAbs val="{t}"/></p:iterate>'
        else:
            raise ValueError(e)
        if a.get('ease', True) and e not in ('pulse', 'spin', 'type'):
            kids = re.sub(r'<p:cTn id="(\d+)" dur="(\d+)"', lambda m: m.group(0) + (' accel="50000" decel="50000"' if int(m.group(2)) > 1 else ''), kids)
        if e == 'breathe':
            kids = kids.replace(' accel="50000" decel="50000"', ' accel="50000" decel="50000"')
        g = self.grp.get(sp, -1) + 1
        self.grp[sp] = g
        self.bld.append((sp, g))
        it = extra_iter if e == 'type' else ''
        return (f'<p:par><p:cTn id="{self.nid()}" presetID="{pid}" presetClass="{cls}" presetSubtype="{sub}" fill="hold" grpId="{g}" nodeType="{"afterEffect" if first else "withEffect"}"{extra}>'
                f'<p:stCondLst><p:cond delay="{d}"/></p:stCondLst>{it}<p:childTnLst>{kids}</p:childTnLst></p:cTn></p:par>')

    def timing(self, anims):
        if not anims:
            return ''
        body = ''.join(self.effect(a, i == 0) for i, a in enumerate(sorted(anims, key=lambda a: a['d'])))
        outer = (f'<p:par><p:cTn id="3" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
                 f'<p:par><p:cTn id="{self.nid()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>')
        bld = ''.join(f'<p:bldP spid="{sp}" grpId="{g}" animBg="1"/>' for sp, g in self.bld if True)
        return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
                '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>' + outer +
                '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
                '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
                f'<p:bldLst>{bld}</p:bldLst></p:timing>')


zin = zipfile.ZipFile(SRC)
order = [int(re.search(r'\d+', n).group()) for n in sorted([n for n in zin.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)], key=lambda s: int(re.search(r'\d+', s).group()))]
out = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for info in zin.infolist():
    if info.filename.endswith('/'):
        continue
    data = zin.read(info.filename)
    m = re.match(r'ppt/slides/slide(\d+)\.xml$', info.filename)
    if m:
        k = int(m.group(1)) - 1
        x = data.decode('utf8')
        ids = {}
        for sp, name in re.findall(r'<p:cNvPr id="(\d+)" name="([^"]*)"', x):
            ids.setdefault(name, sp)
        sp = SPEC[k]
        missing = sorted({a['n'] for a in sp['anims'] if a['n'] not in ids})
        if missing:
            raise SystemExit(f'slide {k + 1}: unknown shapes {missing}')
        ins = TRANS[sp.get('trans', 'fade')] + T(ids).timing(sp['anims'])
        x = x.replace('</p:clrMapOvr>', '</p:clrMapOvr>' + ins, 1) if '</p:clrMapOvr>' in x else x.replace('</p:sld>', ins + '</p:sld>')
        data = x.encode('utf8')
        print(f'slide {k + 1}: {len(sp["anims"])} effects')
    zi = zipfile.ZipInfo(info.filename, date_time=info.date_time)
    zi.compress_type = zipfile.ZIP_STORED if info.filename.endswith(('.png', '.jpg', '.mp4')) else zipfile.ZIP_DEFLATED
    out.writestr(zi, data)
out.close()
