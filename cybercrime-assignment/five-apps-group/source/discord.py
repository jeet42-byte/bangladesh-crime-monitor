import copy
from pptx import Presentation
from pptx.util import Emu
from pptx.oxml.ns import qn
from PIL import Image
D = 'dc/'
P = Presentation('group2.pptx')
E = lambda v: Emu(int(v / 144 * 914400))
def sh(sl, name): return [x for x in P.slides[sl - 1].shapes if x.name == name][0]
def put(shape, *paras):
    """replace text; one string per paragraph, keeping each paragraph's first-run formatting"""
    tf = shape.text_frame; ps = tf.paragraphs
    for i, t in enumerate(paras):
        p = ps[min(i, len(ps) - 1)]
        if i >= len(ps): p = copy.deepcopy(ps[-1]._p); tf._txBody.append(p); from pptx.text.text import _Paragraph; p = _Paragraph(p, tf)
        rs = p.runs; rs[0].text = t
        for r in rs[1:]: r._r.getparent().remove(r._r)
def runs(shape, pi, *texts):
    rs = shape.text_frame.paragraphs[pi].runs
    for r, t in zip(rs, texts): r.text = t
def img(sl, name, path, box=None):
    s = P.slides[sl - 1]; x = sh(sl, name)
    _, rId = s.part.get_or_add_image_part(path)
    x._element.blipFill.find(qn('a:blip')).set(qn('r:embed'), rId)
    if box:
        w, h = Image.open(path).size; H = x.height; W = int(H * w / h)
        x.width = Emu(W); x.left = Emu(int(box.left + (box.width - W) / 2))
def note(sl, a, b):
    tf = P.slides[sl - 1].notes_slide.notes_text_frame; t = tf.text; assert a in t, (sl, a); tf.text = t.replace(a, b)
DW = D + 'discord_w.png'
# Instagram glyph -> Discord glyph on cover, timeline, investigation and comparison
for sl, n in ((1, 'api3'), (5, 'ii4'), (6, 'di3'), (21, 'ri3')): img(sl, n, DW)
# timeline (slide 5)
put(sh(5, 'cn4'), 'Discord'); put(sh(5, 'cd4'), 'Reset from her Gmail; fake “free Nitro” QR codes sent to her class')
note(5, "1:10: Instagram falls next, and her private messages are used to blackmail her.", "1:10: Fox resets her Discord from her Gmail too, and posts fake “free Nitro” QR codes to her class server, as her.")
# investigation doors (slide 6)
put(sh(6, 'dn3'), 'Discord')
# Gmail door notes (slide 14)
note(14, "for Facebook, Instagram, even bKash", "for Facebook, Discord, even bKash")
# scene 7 (slide 17)
put(sh(17, 'uiav'), '#'); put(sh(17, 'uiname'), '#class-of-2026'); put(sh(17, 'uisub'), 'Discord · class server')
put(sh(17, 'ui0'), 'Sparrow: FREE Nitro for everyone! Scan the QR to claim.')
put(sh(17, 'ui1'), 'Rafi: I scanned it… now I’m logged out??')
put(sh(17, 'ui2'), 'It’s not Sparrow. That QR logs a stranger into your account.')
cap = sh(17, 'caption'); r = cap.text_frame.paragraphs[0].runs
r[-1].text = 'Fox posts fake “free Nitro” QR codes in her class server, as her.'
for x in r[1:-1]: x.text = '   ' if x.text.strip() == '' else x.text
tf = P.slides[16].notes_slide.notes_text_frame; head = tf.text.split('\n\n')[0]
tf.text = head + "\n\n▶ SCENE 7 · 1:10 AM · SPARROW\nThank you, Mamun. At 1:10, Fox opens her Discord with a reset link from her Gmail. Then, as Sparrow, he posts fake “free Nitro” QR codes in her class server. Her friends start scanning."
# door 4 (slide 18)
runs(sh(18, 'tag'), 0, '1:10 AM  ·  DOOR 4 OF 5  ·  DISCORD') if len(sh(18, 'tag').text_frame.paragraphs[0].runs) == 1 else None
t = sh(18, 'tag');
for x in t.text_frame.paragraphs[0].runs: x.text = x.text.replace('INSTAGRAM', 'DISCORD')
put(sh(18, 'heading'), 'Discord: a good alarm, sent to the wrong inbox')
put(sh(18, 'story'), 'Fox resets her Discord from Gmail. Discord’s new-login warning goes to the same Gmail, so he approves it himself.')
for i, (f, c) in enumerate([('shot0', 'The reset link and the login warning go to the hacked Gmail'), ('shot1', 'Fox posts fake “free Nitro” QR codes as her'), ('shot2', 'Friends who scan hand over their own accounts')]):
    img(18, f'ashot{i}', D + f + '.png', box=sh(18, f'abox{i}')); put(sh(18, f'acap{i}'), c)
for i, (ic, c) in enumerate([('si_shield', '2FA with an authenticator app or security key'), ('si_qr', 'Never scan a QR code to “claim” a prize'), ('si_key', 'Its own password, and backup codes saved')]):
    img(18, f'si{i}', D + ic + '.png'); put(sh(18, f'scap{i}'), c)
VAL = [4, 2, 4, 2, 4]
red = copy.deepcopy(sh(18, 'bf1')._element.spPr.find(qn('a:solidFill')))
for i, v in enumerate(VAL):
    bf = sh(18, f'bf{i}'); bf.width = E(38 * v); put(sh(18, f'bv{i}'), str(v))
    if v <= 2:
        sp = bf._element.spPr; old = sp.find(qn('a:solidFill')); old.addprevious(copy.deepcopy(red)); sp.remove(old)
# value colours: copy red text colour of bv1 to bv3
rc = copy.deepcopy(sh(18, 'bv1').text_frame.paragraphs[0].runs[0]._r.find(qn('a:rPr')))
r3 = sh(18, 'bv3').text_frame.paragraphs[0].runs[0]._r; r3.remove(r3.find(qn('a:rPr'))); r3.insert(0, rc)
fx = sh(18, 'fix'); ps = fx.text_frame.paragraphs
rs = ps[-1].runs; rs[-1].text = 'End-to-end encrypted text chats, and a clear warning before any QR-code login'
for x in rs[:-1]:
    if 'PLATFORM' not in x.text: x.text = ''
tf = P.slides[17].notes_slide.notes_text_frame; head = tf.text.split('\n\n')[0]
tf.text = head + "\n\n" + ("Door four: Discord, 1:10 AM. Score: 16 out of 25. [Left, screens 1–3: how Fox got in.] With Gmail in his hands, Fox clicked “forgot password” on Discord. Discord did the right thing: it sent a warning to verify the new login location. But the warning went to Sparrow’s Gmail, and Fox was reading her Gmail, so he approved his own login. Then, as Sparrow, he posted fake “free Nitro” QR codes in her class server. Every friend who scanned one logged Fox into their own account. "
  "[Score bars.] Look at encryption: 2 out of 5, in red. Voice and video calls are now end-to-end encrypted by default, but text messages are not. Recovery safety is also 2: once someone controls your email, getting your Discord back is slow. "
  "[Bottom row: how to lock it. Score card on the right.] To be fair, Discord has good locks: two-factor authentication with an authenticator app or a physical security key, backup codes, and a Devices list where you can log out every session. But Sparrow never switched them on. "
  "[Bottom right: platform fix.] My recommendation: end-to-end encrypted text chats, and a clear warning before any QR-code login. Masum will finish with bKash, the door to her money.")
# comparison (slide 21)
put(sh(21, 'rl3'), 'Discord')
note(21, "Facebook and Instagram score 16", "Facebook and Discord score 16")
note(21, "Facebook and Instagram followed within an hour", "Facebook and Discord followed within an hour")
P.save('group3.pptx')
# leftover check
left = [(i, x.name) for i, s in enumerate(P.slides, 1) for x in s.shapes if x.has_text_frame and 'nstagram' in x.text_frame.text]
left += [(i, 'notes') for i, s in enumerate(P.slides, 1) if 'nstagram' in s.notes_slide.notes_text_frame.text]
print('Instagram left:', left)
