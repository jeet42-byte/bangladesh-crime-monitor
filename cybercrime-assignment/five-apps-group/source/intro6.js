  // ======== OPTION C · "CASE BOARD": the introduction as a detective's evidence board
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  {
    let seed = 21; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let spk = ''; for (let i = 0; i < 2600; i++) spk += `<circle cx="${(rnd() * 1920) | 0}" cy="${(rnd() * 1080) | 0}" r="${(rnd() * 1.6 + 0.4).toFixed(1)}" fill="#${rnd() > 0.5 ? 'D7B98C' : '5A4027'}" opacity="${(rnd() * 0.35).toFixed(2)}"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="v" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#9C7650"/><stop offset=".7" stop-color="#7A5A3A"/><stop offset="1" stop-color="#3E2C1C"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#v)"/>${spk}<rect x="18" y="18" width="1884" height="1044" fill="none" stroke="#3B2A18" stroke-width="36"/></svg>`)).png().toFile(A_DIR + 'cork.png');
  }
  const CORK = A_DIR + 'cork.png';
  const CB = { paper: 'FBF8F1', ink: '1E1B16', red: 'B91C1C', yellow: 'FDE68A', grey: '57534E', tape: 'E7DCC4' };
  const TW = 'Courier New';
  // a pinned paper card (optionally rotated), with a red push-pin
  const card = (n, x, y, w, h, rot, d, o = {}) => {
    cur.addShape(pres.shapes.RECTANGLE, { objectName: n, x: S(x), y: S(y), w: S(w), h: S(h), rotate: rot, fill: { color: o.fill || CB.paper }, line: { type: 'none' },
      shadow: { type: 'outer', color: '000000', blur: 14, offset: 6, angle: 60, opacity: 0.45 } });
    oval(n + 'pin', x + w / 2 - 14, y - 10, 28, 28, o.pin || CB.red);
    an(n, 'drop', d, 600); an(n + 'pin', 'grow', d + 450, 300, { from: 2.2 });
  };
  const ctext = (n, t, x, y, w, h, rot, o = {}) => cur.addText(t, Object.assign({ objectName: n, x: S(x), y: S(y), w: S(w), h: S(h), rotate: rot, fontFace: TW, fontSize: P(24), color: CB.ink, margin: 0, valign: 'top', isTextBox: true }, o));
  const strng = (n, x1, y1, x2, y2, d) => { line(n, x1, y1, x2, y2, CB.red, { lw: 2.5 }); an(n, 'wipe', d, 700); };
  const header = (case_, title, d = 0) => {
    stext('hd', case_, 128, 50, 600, 54, CB.ink, { pad: 14, extra: { color: CB.yellow, fontFace: TW, bold: true, fontSize: P(24), charSpacing: 2 } });
    ctext('ht', title, 760, 44, 1032, 70, 0, { fontFace: FB, fontSize: P(50), color: CB.paper });
    an('hd', 'wipe', d, 700); an('ht', 'fade', d + 300, 800);
  };

  // =============================================================== C1. CASE FILE 001: THE CHAIRMAN (Ahnaf)
  slide(SN('ahnaf', 60, `[Calm, like a detective opening a file.] Good morning. Let me open case file number one. Imagine you are a journalist in Dhaka. It is three-sixteen in the afternoon, and a WhatsApp message arrives from one of the most powerful officials in the country: the chairman of the National Board of Revenue.

[Point to the photo.] It says, in Bangla: "I need thirty-five thousand taka on my bKash right now. Can you send it? I will return it tomorrow."

[Pause. Look at the audience.] What would you do? He is the head of the tax authority. You would probably send it.

[Follow the red string to the stamp.] But on the twenty-fourth of September 2025, the NBR announced that the chairman's WhatsApp account had been hacked. The message came from a scammer.

That is the case that opens our investigation: Five Apps, One Pocket. Because if the head of the tax authority can be hacked, so can any one of us.`), CORK, 'black');
  header('CASE FILE 001 · SEPT 2025', 'FIVE APPS, ONE POCKET: an investigation', 200);
  // evidence photo: the real screenshot, taped and pinned
  card('ph', 150, 170, 1010, 640, -1.5, 1200);
  cur.addImage({ path: '/home/user/gdeck/assets/nbr_msg.png', x: S(180), y: S(196), w: S(950), h: S(534), rotate: -1.5, objectName: 'shot', altText: 'WhatsApp message in Bangla asking for 35,000 taka on bKash' });
  ctext('pcap', 'EXHIBIT A · the real message, 3:16 PM', 186, 744, 940, 40, -1.5, { fontSize: P(24), bold: true, color: CB.grey });
  an('shot', 'fade', 1600, 900); an('pcap', 'fade', 2200, 500);
  // sticky note: translation
  card('sn', 1250, 160, 540, 380, 2.5, 5200, { fill: CB.yellow, pin: '1D4ED8' });
  ctext('snt', [{ text: 'TRANSLATION\n', options: { bold: true, fontSize: P(20), color: CB.grey } }, { text: '“I need Tk 35,000 on my bKash right now. Can you send it? I’ll return it tomorrow.”', options: { fontSize: P(29), color: CB.ink, fontFace: 'Segoe Print' } }],
    1286, 196, 470, 320, 2.5);
  an('snt', 'fade', 5700, 900);
  // index card: the sender
  card('ic', 1230, 590, 560, 250, -2, 10500);
  ctext('ict', [{ text: 'THE SENDER?\n', options: { bold: true, fontSize: P(20), color: CB.grey } }, { text: 'Chairman, National Board of Revenue', options: { fontFace: FB, fontSize: P(32), color: CB.ink } }], 1264, 624, 500, 190, -2);
  an('ict', 'fade', 11000, 700);
  strng('s1', 1160, 470, 1250, 380, 4800); strng('s2', 1160, 620, 1240, 700, 10200);
  // the stamp
  stext('stamp', 'HACKED · IT WAS NOT HIM', 380, 862, 1160, 110, CB.paper, { r: 0.05, align: 'center', line: CB.red, lw: 6, trans: 5, extra: { color: CB.red, fontFace: FB, fontSize: P(54), charSpacing: 3, rotate: -3 } });
  an('stamp', 'grow', 16500, 450, { from: 1.8 });
  ctext('src', 'Source: NBR statement, bdnews24, 24 Sept 2025', 1180, 1000, 620, 30, 0, { fontSize: P(17), color: 'F5E6CC', align: 'right' }); an('src', 'fade', 17000, 500);

  // =============================================================== C2. THE PATTERN AND THE SCALE (Ahnaf)
  slide(SN('ahnaf', 70, `And this was not one unlucky official. The board fills up fast. [Left card.] Around the world, people lost an estimated four hundred and forty-two billion US dollars to scams in just twelve months. More than half of all adults faced a scam, and almost one in four lost money.

[Middle card.] In the United States, the FBI recorded twenty point nine billion dollars in reported losses in 2025, and the biggest category was investment fraud: eight point six billion.

[Right card.] And here at home, Bangladesh Bank data show eighty-one thousand four hundred and twenty-three fraud incidents in mobile financial services, cheques and cards in 2025, with ninety-two point six crore taka lost.

[Newspaper clippings.] And more cases: the CID arrested a student who hacked more than fifty Facebook accounts through Messenger links and blackmailed at least fifteen victims. The actor Prarthana Fardin Dighi lost money from her bKash account after a caller asked for her OTP "to fix a blocked account". Different apps. The same method.`), CORK);
  header('CASE FILE 002 · THE PATTERN', 'Not one unlucky official. An industry.', 0);
  [['WORLDWIDE · 12 MONTHS', '$442 billion', 'lost to scams (estimated). 57 of 100 adults faced a scam; 23 lost money.', 'Global Anti-Scam Alliance, 2025', -2, 'DC2626'],
   ['UNITED STATES · 2025', '$20.9 billion', 'reported lost; investment fraud alone: $8.6 billion.', 'FBI IC3, 2025', 1.5, '1E1B16'],
   ['BANGLADESH · 2025', '81,423', 'fraud incidents in MFS, cheque and card payments: Tk 92.6 crore lost.', 'Bangladesh Bank, via Daily Observer', -1, 'B91C1C']].forEach(([h, v, b, s, rot, col], i) => {
    const x = 128 + i * 572, d = 800 + 1700 * i;
    card('e' + i, x, 170, 520, 410, rot, d);
    ctext('et' + i, [{ text: h + '\n', options: { bold: true, fontSize: P(20), color: CB.grey } }, { text: v + '\n', options: { fontFace: FB, fontSize: P(66), color: col } }, { text: b, options: { fontSize: P(23), color: CB.ink } }],
      x + 32, 204, 456, 320, rot);
    ctext('es' + i, s, x + 32, 528, 456, 30, rot, { fontSize: P(16), color: CB.grey, italic: true });
    an('et' + i, 'fade', d + 500, 700); an('es' + i, 'fade', d + 800, 400);
  });
  strng('t1', 648, 360, 700, 360, 2600); strng('t2', 1220, 360, 1272, 360, 4300);
  [['fb', 'CID arrests student who hacked 50+ Facebook accounts', 'Messenger links stole logins; at least 15 victims blackmailed (Oct 2024).', 2], ['bk', 'Actor Dighi’s bKash emptied after an OTP call', 'A caller asked for her OTP “to fix a blocked account”; police recovered Tk 1.62 lakh.', -2]].forEach(([k, h, b, rot], i) => {
    const x = 128 + i * 860, d = 6800 + 1500 * i;
    card('n' + i, x, 640, 800, 330, rot, d, { fill: 'EFE9DC' });
    ctext('nk' + i, 'CLIPPING', x + 30, 668, 300, 30, rot, { fontSize: P(18), bold: true, color: CB.grey });
    appIcon('ni' + i, k, x + 30, 712, 90);
    ctext('nt' + i, [{ text: h + '\n', options: { fontFace: 'Georgia', bold: true, fontSize: P(36), color: CB.ink } }, { text: b, options: { fontFace: 'Georgia', fontSize: P(26), color: CB.grey } }], x + 140, 704, 620, 240, rot);
    an('nk' + i, 'fade', d + 400, 400); all(['ni' + i, 'ni' + i + 'i'], 'grow', d + 400, 500, { from: 0.3 }); an('nt' + i, 'fade', d + 500, 700);
  });
  stext('same', 'DIFFERENT APPS · SAME METHOD', 690, 590, 540, 56, CB.ink, { align: 'center', extra: { color: CB.yellow, fontFace: TW, bold: true, fontSize: P(24), charSpacing: 2 } });
  an('same', 'grow', 9800, 600, { from: 0.6 });

  // =============================================================== C3. THE ACCOMPLICES AND THE CRIME SCENES (Ahnaf)
  slide(SN('ahnaf', 70, `So how does the trick work? Look again at the chairman's message. There are three accomplices hidden inside it. [Card one.] Trust: it came from a name we respect. [Card two.] Urgency: "right now". [Card three.] Hope: "I'll return it tomorrow." No virus, and no hacking skill was needed on our side. Just three buttons pressed in our minds.

[Bottom row.] So are the apps to blame, or are we? To find out, we opened five crime scenes: WhatsApp, Gmail, Discord, Facebook and bKash. We tested each one on seven criteria from our course rubric, from login protection to privacy, each scored zero, one or two, out of fourteen.

Each of us investigated one app. Marzia will begin with WhatsApp, the app where our story began.`), CORK);
  header('CASE FILE 003 · THE METHOD', 'Three accomplices hidden in one message', 0);
  stext('msg', [{ text: '“', options: { color: CB.grey } }, { text: 'NBR Chairman', options: { highlight: 'FDE68A', color: CB.ink } }, { text: ': I need Tk 35,000 on my bKash ', options: { color: CB.ink } }, { text: 'right now', options: { highlight: 'FECACA', color: CB.ink } }, { text: '. Can you send it? ', options: { color: CB.ink } }, { text: 'I’ll return it tomorrow.', options: { highlight: 'BBF7D0', color: CB.ink } }, { text: '”', options: { color: CB.grey } }],
    128, 140, 1664, 80, CB.paper, { pad: 18, extra: { fontSize: P(30), fontFace: 'Georgia', italic: true } });
  an('msg', 'drop', 700, 700);
  [['handshake', 'TRUST', 'A name we respect: a chairman, a friend, a famous brand.', 'FDE68A', -2], ['clock', 'URGENCY', '“Right now”, “blocked today”: panic switches off thinking.', 'FECACA', 1.5], ['coins', 'HOPE', '“I’ll return it tomorrow”, easy income, a prize.', 'BBF7D0', -1]].forEach(([ic, h, b, col, rot], i) => {
    const x = 128 + i * 572, d = 2000 + 1500 * i;
    card('a' + i, x, 262, 520, 300, rot, d);
    rect('ab' + i, x + 30, 292, 120, 150, col); img('ai' + i, I[ic + 'D'], x + 60, 337, 60, 60);
    ctext('at' + i, [{ text: 'ACCOMPLICE\n', options: { bold: true, fontSize: P(17), color: CB.grey } }, { text: h + '\n', options: { fontFace: FB, fontSize: P(44), color: CB.ink } }, { text: b, options: { fontSize: P(21), color: CB.ink } }], x + 170, 290, 320, 250, rot);
    an('ab' + i, 'fade', d + 400, 400); an('ai' + i, 'grow', d + 450, 400, { from: 0.3 }); an('at' + i, 'fade', d + 500, 600);
  });
  stext('cs', 'THE CRIME SCENES  ·  5 apps · 7 locks · scored 0–2 · out of 14', 128, 600, 1664, 52, CB.ink, { pad: 14, extra: { color: CB.yellow, fontFace: TW, bold: true, fontSize: P(22), charSpacing: 1 } });
  an('cs', 'wipe', 6800, 800);
  [['wa', 'Marzia Rahman', '29'], ['gm', 'Tanvir Ahmed Siddique', '28'], ['dc', 'Jesmin Naher Sweety', '08'], ['fb', 'Abdullah Al Mamun', '02'], ['bk', 'Md. Masum Billah', '18']].forEach(([k, who, r], i) => {
    const x = 128 + i * 336, d = 7300 + 400 * i, rot = [1.5, -1, 2, -1.5, 1][i];
    card('s' + i, x, 690, 312, 320, rot, d);
    appIcon('si' + i, k, x + 106, 716, 100);
    ctext('sn' + i, [{ text: APPS[k].n + '\n', options: { fontFace: FB, fontSize: P(30), color: CB.ink } }, { text: 'Investigator:\n', options: { fontSize: P(17), color: CB.grey } }, { text: who + '\n', options: { fontSize: P(20), color: CB.ink, bold: true } }, { text: 'Roll ' + r, options: { fontSize: P(18), color: CB.grey } }], x + 16, 822, 280, 180, rot, { align: 'center' });
    all(['si' + i, 'si' + i + 'i'], 'grow', d + 400, 400, { from: 0.3 }); an('sn' + i, 'fade', d + 500, 500);
  });
  ctext('by', 'Lead investigator (introduction): Ahnaf Akif, Roll 24', 1100, 1016, 700, 30, 0, { fontSize: P(17), color: 'F5E6CC', align: 'right' }); an('by', 'fade', 9900, 500);

