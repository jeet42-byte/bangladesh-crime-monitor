import copy, re
from pptx import Presentation
from pptx.util import Pt, Emu
P = Presentation('in.pptx')
SPK = {'ahnaf': ('AHNAF AKIF', '24', 'Ahnaf Akif'), 'marzia': ('MARZIA RAHMAN', '29', 'Marzia Rahman'), 'tanvir': ('TANVIR AHMED SIDDIQUE', '28', 'Tanvir Ahmed Siddique'),
       'mamun': ('ABDULLAH AL MAMUN', '02', 'Abdullah Al Mamun'), 'sweety': ('JESMIN NAHER SWEETY', '08', 'Jesmin Naher Sweety'), 'masum': ('MD. MASUM BILLAH', '18', 'Md. Masum Billah')}
WHO = ['ahnaf'] * 4 + ['marzia'] * 4 + ['ahnaf'] * 2 + ['marzia'] + ['tanvir'] * 3 + ['mamun'] * 2 + ['sweety'] * 2 + ['masum'] * 5
assert len(WHO) == len(P.slides) == 23
EDITS = {
 1: [("Good morning. I am Ahnaf Akif, Roll 24. My presentation is called \"Locked or Leaked?\": assessing the security features of five online platforms. But let me begin with a true story.",
      "Good morning. We are a group of six. I am Ahnaf Akif, Roll 24, and with me are Marzia Rahman, Tanvir Ahmed Siddique, Abdullah Al Mamun, Jesmin Naher Sweety and Md. Masum Billah. Our presentation is called \"Locked or Leaked?\": assessing the security features of five online platforms. But let me begin with a true story.")],
 3: [("That is the question of my presentation", "That is the question of our presentation")],
 5: [("It is 11:47 PM.", "Thank you, Ahnaf. It is 11:47 PM.")],
 8: [("Over the next few minutes, we follow Fox, the hacker who sent that message, through five doors into her life: WhatsApp, Gmail, Facebook, Instagram and bKash. At each door I ask one question: was the lock strong, or did it leak?",
      "So how strong was this first door, and why did it leak?")],
 9: [("Here is how Sparrow’s night unfolded.", "Before we zoom in, here is the whole night, minute by minute.")],
 10: [("So I became an investigator. I retraced", "So we became investigators. We retraced"), ("For each platform, I opened the security settings on my own phone", "For each platform, we opened the security settings on our own phones"),
      ("Then I tested each door", "Then we tested each door"), ("Let us start where the attack started: WhatsApp, at 11:49.", "Let us start where the attack started: WhatsApp, at 11:47. Marzia, over to you.")],
 11: [("With WhatsApp gone, Fox moved to the master key.", "With WhatsApp gone, Fox moved to the master key. Tanvir will take it from here.")],
 12: [("At 12:20, an email", "Thank you, Marzia. At 12:20, an email")],
 14: [("the best login protection I tested", "the best login protection we tested"), ("And with the master key, the next door opened easily.", "And with the master key, the next door opened easily. Mamun, over to you.")],
 15: [("At 12:35, Fox uses", "Thank you, Tanvir. At 12:35, Fox uses")],
 16: [("takes effect.", "takes effect. Sweety will show you what fell next.")],
 17: [("At 1:10, Fox opens", "Thank you, Mamun. At 1:10, Fox opens")],
 18: [("and blurred explicit images.", "and blurred explicit images. Masum will finish with bKash, the door to her money.")],
 19: [("And back at 11:58", "Thank you, Sweety. And back at 11:58")],
 21: [("I chose WhatsApp.", "We chose WhatsApp.")],
 23: [("Thank you; I am happy to take your questions.", "Thank you. We are happy to take your questions.")],
}
for i, s in enumerate(P.slides, 1):
    k = WHO[i - 1]; up, roll, nm = SPK[k]
    tf = s.notes_slide.notes_text_frame; t = tf.text
    for a, b in EDITS.get(i, []):
        assert a in t, (i, a); t = t.replace(a, b)
    body = re.sub(r'^SPEAKER:[^\n]*\n\n', '', t)
    sec = max(10, round(len(body.split()) / 2.4 / 5) * 5)
    tf.text = f'SPEAKER: {up} (Roll {roll})  ·  about {sec} seconds\n\n{body.strip()}'
    # footer label shows the speaker of the slide
    for sh in s.shapes:
        if sh.has_text_frame and 'AHNAF AKIF, ROLL 24' in sh.text_frame.text:
            for p in sh.text_frame.paragraphs:
                for r in p.runs: r.text = r.text.replace('AHNAF AKIF, ROLL 24', f'{up}, ROLL {roll}')
# cover: the whole group
nm = [sh for sh in P.slides[0].shapes if sh.shape_id == 8][0]
nm.height = Emu(int(96 / 144 * 914400))
p0 = nm.text_frame.paragraphs[0]; r0 = p0.runs[0]; r1 = p0.runs[1] if len(p0.runs) > 1 else None
lines = [[('Ahnaf Akif', '24'), ('Marzia Rahman', '29'), ('Tanvir Ahmed Siddique', '28')], [('Abdullah Al Mamun', '02'), ('Jesmin Naher Sweety', '08'), ('Md. Masum Billah', '18')]]
tmpl_b = copy.deepcopy(r0._r); tmpl_n = copy.deepcopy(r1._r if r1 is not None else r0._r)
for r in list(p0.runs): r._r.getparent().remove(r._r)
txb = nm.text_frame._txBody
paras = [p0._p, copy.deepcopy(p0._p)]; txb.append(paras[1])
for para, row in zip(paras, lines):
    for j, (n, rl) in enumerate(row):
        for tm, tx in ((tmpl_b, n), (tmpl_n, ' ' + rl + ('   ·   ' if j < 2 else ''))):
            e = copy.deepcopy(tm); e.find('{http://schemas.openxmlformats.org/drawingml/2006/main}t').text = tx
            rPr = e.find('{http://schemas.openxmlformats.org/drawingml/2006/main}rPr')
            if rPr is not None: rPr.set('sz', '1200')
            endp = para.find('{http://schemas.openxmlformats.org/drawingml/2006/main}endParaRPr')
            (endp.addprevious(e) if endp is not None else para.append(e))
# reorder: timeline (9) and method (10) move up into Ahnaf's introduction, after slide 4
NEW = [1, 2, 3, 4, 9, 10, 5, 6, 7, 8] + list(range(11, 24))
lst = P.slides._sldIdLst; ids = list(lst)
for e in ids: lst.remove(e)
for o in NEW: lst.append(ids[o - 1])
for i, sl in enumerate(P.slides, 1):
    for sh in sl.shapes:
        if sh.name == 'pg' and sh.has_text_frame:
            r = sh.text_frame.paragraphs[0].runs; r[0].text = f'{i:02d}'
            for x in r[1:]: x.text = ''
P.save('group.pptx')
for i, s in enumerate(P.slides, 1): print(i, s.notes_slide.notes_text_frame.text.split('\n')[0])
