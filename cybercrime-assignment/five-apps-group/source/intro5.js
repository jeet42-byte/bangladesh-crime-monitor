  // ======== OPTION B · "LOCK SCREEN": the introduction as a smartphone screen (notifications, widgets, home screen)
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const LS = { glass: 'FFFFFF', ink: '0B0D12' };
  {
    const blobs = [['7C3AED', 300, 200, 700], ['2563EB', 1650, 250, 760], ['DB2777', 1500, 1000, 640], ['0EA5E9', 250, 1000, 600]]
      .map(([c, x, y, r], i) => `<radialGradient id="b${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#${c}" stop-opacity=".85"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`).join('');
    const ell = [['7C3AED', 300, 200, 700], ['2563EB', 1650, 250, 760], ['DB2777', 1500, 1000, 640], ['0EA5E9', 250, 1000, 600]].map(([c, x, y, r], i) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="url(#b${i})"/>`).join('');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blobs}</defs><rect width="1920" height="1080" fill="#14112B"/>${ell}<rect width="1920" height="1080" fill="#0B0A1A" opacity=".35"/></svg>`)).png().toFile(A_DIR + 'ls_wall.png');
  }
  const WALL = A_DIR + 'ls_wall.png';
  const glass = (n, x, y, w, h, o = {}) => rect(n, x, y, w, h, o.fill || 'FFFFFF', { r: o.r == null ? 0.12 : o.r, trans: o.trans == null ? 84 : o.trans, line: 'FFFFFF', lw: 0.75, shadow: o.shadow });
  const notif = (pre, x, y, w, k, head, body, t, d, o = {}) => {
    glass(pre, x, y, w, o.h || 120, { trans: o.trans });
    appIcon(pre + 'ic', k, x + 22, y + 24, 64);
    text(pre + 't', [{ text: head, options: { fontFace: FH, color: 'FFFFFF', breakLine: true } }, { text: body, options: { color: 'E5E7EB', fontSize: P(21) } }], x + 104, y + 18, w - 220, (o.h || 120) - 30, { fontSize: P(24) });
    text(pre + 'tm', t, x + w - 120, y + 18, 100, 30, { fontSize: P(19), color: 'D1D5DB', align: 'right' });
    all([pre, pre + 'ic', pre + 'ici', pre + 't', pre + 'tm'], 'drop', d, 600);
  };

  // =============================================================== B1. THE LOCK SCREEN (Ahnaf)
  slide(SN('ahnaf', 60, `[Calm, curious voice.] Good morning. Imagine you are a journalist in Dhaka. It is three-sixteen in the afternoon, and your phone lights up. [Notification.] A WhatsApp message, from one of the most powerful officials in the country: the chairman of the National Board of Revenue.

[The message opens.] It says, in Bangla: "I need thirty-five thousand taka on my bKash right now. Can you send it? I will return it tomorrow."

[Pause. Look at the audience.] What would you do? He is the head of the tax authority. You would probably send it.

[Red alert.] But on the twenty-fourth of September 2025, the NBR announced that the chairman's WhatsApp account had been hacked. The message came from a scammer.

That is where our presentation begins: Five Apps, One Pocket. Because if the head of the tax authority can be hacked, so can any one of us.`), WALL, 'black');
  text('brand', 'FIVE APPS, ONE POCKET  ·  MCCJ 525', 128, 80, 900, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 3 });
  img('lock', I.lock, 128, 190, 40, 40);
  text('clock', '3:16', 120, 236, 820, 260, { fontSize: P(240), fontFace: 'Segoe UI Light', color: 'FFFFFF' });
  text('date', 'September 2025  ·  Dhaka', 134, 500, 800, 50, { fontSize: P(36), color: 'E5E7EB' });
  an('brand', 'fade', 200, 700); an('lock', 'fade', 400, 600); an('clock', 'grow', 600, 1200, { from: 0.9 }); an('date', 'fade', 1300, 700);
  text('q', [{ text: 'If the head of the tax authority can be hacked,', options: { color: 'FFFFFF', breakLine: true } }, { text: 'so can any one of us.', options: { color: 'F9A8D4' } }], 134, 640, 960, 140, { fontSize: P(38), fontFace: FH });
  an('q', 'rise', 15000, 1000);
  text('pres', 'Ahnaf Akif  ·  Marzia Rahman  ·  Tanvir Ahmed Siddique  ·  Jesmin Naher Sweety  ·  Abdullah Al Mamun  ·  Md. Masum Billah', 134, 930, 860, 70, { fontSize: P(20), color: 'C4B5FD' });
  an('pres', 'fade', 16000, 800);
  // notifications column
  notif('n1', 1000, 150, 792, 'wa', 'NBR Chairman', '1 new message', '3:16 PM', 2400);
  glass('mx', 1000, 290, 792, 520, { trans: 80 });
  imgp('shot', '/home/user/gdeck/assets/nbr_msg.png', 1024, 312, 744, 418, 'WhatsApp message in Bangla asking for 35,000 taka on bKash');
  text('tr', '“I need Tk 35,000 on my bKash right now. Can you send it? I’ll return it tomorrow.”', 1030, 738, 740, 70, { fontSize: P(24), italic: true, color: 'FFFFFF', fontFace: FH });
  an('mx', 'grow', 4200, 800, { from: 0.85 }); an('shot', 'fade', 4500, 1000); an('tr', 'fade', 7500, 1000);
  stext('al', [{ text: 'SECURITY ALERT  ·  24 SEPT 2025\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'FFE4E6', charSpacing: 2 } }, { text: 'The NBR announces that its chairman’s WhatsApp account has been hacked. It was not him.', options: { fontFace: FH, fontSize: P(27), color: 'FFFFFF' } }],
    1000, 832, 792, 168, 'E11D48', { r: 0.12, pad: 24, shadow: 20 });
  an('al', 'drop', 11500, 700); an('al', 'pulse', 12500, 1600, { scale: 102 });
  text('alsrc', 'bdnews24, 24 September 2025', 1000, 1006, 792, 28, { fontSize: P(17), italic: true, color: 'C4B5FD', align: 'right' }); an('alsrc', 'fade', 12400, 500);

  // =============================================================== B2. WIDGETS: THE SCAM ECONOMY (Ahnaf)
  slide(SN('ahnaf', 70, `And this was not one unlucky official. It is an industry. [First widget.] Around the world, people lost an estimated four hundred and forty-two billion US dollars to scams in just twelve months. More than half of all adults faced a scam, and almost one in four lost money.

[Second widget.] In the United States, the FBI recorded twenty point nine billion dollars in reported losses in 2025, and the biggest category was investment fraud: eight point six billion.

[Third widget.] And here at home, Bangladesh Bank data show eighty-one thousand four hundred and twenty-three fraud incidents in mobile financial services, cheques and cards in 2025, with ninety-two point six crore taka lost.

[News widget.] The cases keep coming. The CID arrested a student who hacked more than fifty Facebook accounts through Messenger links and blackmailed at least fifteen victims. And the actor Prarthana Fardin Dighi lost money from her bKash account after a caller asked for her OTP "to fix a blocked account".`), WALL);
  text('brand', 'FIVE APPS, ONE POCKET  ·  TODAY’S WIDGETS', 128, 60, 1200, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 3 });
  text('h', 'Not one unlucky official. An industry.', 128, 100, 1664, 100, { fontSize: P(62), fontFace: FB, color: 'FFFFFF' });
  an('brand', 'fade', 200, 600); an('h', 'rise', 400, 900);
  // widget 1: world with two donuts
  glass('w1', 128, 240, 600, 470); an('w1', 'grow', 900, 700, { from: 0.85 });
  img('w1i', I.globe, 166, 270, 34, 34); text('w1h', 'WORLDWIDE  ·  12 MONTHS', 214, 272, 480, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 2 });
  text('w1v', '$442B', 166, 316, 540, 110, { fontSize: P(96), fontFace: FB, color: 'FFFFFF' });
  text('w1l', 'lost to scams, estimated', 166, 426, 540, 36, { fontSize: P(24), color: 'E5E7EB' });
  an('w1i', 'fade', 1100, 400); an('w1h', 'fade', 1100, 400); an('w1v', 'grow', 1300, 800, { from: 0.4 }); an('w1l', 'fade', 1700, 500);
  await donut('d1', 57, 100, 'FBBF24', 176, 480, 190, 2200, { label: '57%', sub: 'faced a scam', fs: 0.22, track: '3B3561', sc: 'E5E7EB' });
  await donut('d2', 23, 100, 'FB7185', 436, 480, 190, 2600, { label: '23%', sub: 'lost money', fs: 0.22, track: '3B3561', sc: 'E5E7EB' });
  // widget 2: USA bars
  glass('w2', 760, 240, 520, 470); an('w2', 'grow', 3300, 700, { from: 0.85 });
  img('w2i', I.chart, 798, 270, 34, 34); text('w2h', 'UNITED STATES  ·  2025', 846, 272, 420, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 2 });
  text('w2v', '$20.9B', 798, 316, 460, 110, { fontSize: P(96), fontFace: FB, color: 'FFFFFF' });
  text('w2l', 'reported lost (FBI)', 798, 426, 460, 36, { fontSize: P(24), color: 'E5E7EB' });
  an('w2i', 'fade', 3500, 400); an('w2h', 'fade', 3500, 400); an('w2v', 'grow', 3700, 800, { from: 0.4 }); an('w2l', 'fade', 4100, 500);
  [['All losses', 20.9, 'FFFFFF'], ['Investment fraud', 8.6, 'FB7185']].forEach(([l, v, col], i) => {
    const x = 830 + i * 210, h = 170 * v / 20.9, y = 680 - h;
    rect('wb' + i, x, y, 140, h, col, { r: 0.1 }); text('wv' + i, '$' + v + 'B', x - 20, y - 40, 180, 36, { fontSize: P(26), fontFace: FH, color: col, align: 'center' });
    text('wl' + i, l, x - 30, 684, 200, 26, { fontSize: P(18), color: 'E5E7EB', align: 'center' });
    an('wb' + i, 'wipeU', 4400 + 400 * i, 800); an('wv' + i, 'fade', 5000 + 400 * i, 400); an('wl' + i, 'fade', 4400 + 400 * i, 400);
  });
  // widget 3: Bangladesh
  glass('w3', 1312, 240, 480, 470, { fill: 'E2136E', trans: 25 }); an('w3', 'grow', 5600, 700, { from: 0.85 });
  img('w3i', I.money, 1350, 270, 34, 34); text('w3h', 'BANGLADESH  ·  2025', 1398, 272, 380, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: 'FFE4F1', charSpacing: 2 });
  text('w3v', '81,423', 1350, 316, 430, 110, { fontSize: P(92), fontFace: FB, color: 'FFFFFF' });
  text('w3l', 'fraud incidents in MFS, cheque and card payments', 1350, 426, 420, 70, { fontSize: P(23), color: 'FFE4F1' });
  stext('w3t', [{ text: 'Tk 92.6 crore', options: { fontFace: FB, fontSize: P(50), color: 'E2136E', breakLine: true } }, { text: 'lost in one year · Bangladesh Bank', options: { fontSize: P(19), color: '6B7280' } }], 1350, 540, 404, 140, 'FFFFFF', { r: 0.12, align: 'center' });
  an('w3i', 'fade', 5800, 400); an('w3h', 'fade', 5800, 400); an('w3v', 'grow', 6000, 800, { from: 0.4 }); an('w3l', 'fade', 6400, 500); an('w3t', 'grow', 6900, 700, { from: 0.6 });
  // news widget
  glass('w4', 128, 740, 1664, 270); an('w4', 'grow', 8200, 700, { from: 0.9 });
  img('w4i', I.bullhorn, 166, 768, 34, 34); text('w4h', 'ALSO IN THE NEWS', 214, 770, 600, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 2 }); an('w4i', 'fade', 8400, 400); an('w4h', 'fade', 8400, 400);
  [['fb', 'CID arrests student who hacked 50+ Facebook accounts', 'Messenger links stole logins; at least 15 victims blackmailed (Oct 2024)'], ['bk', 'Actor Dighi’s bKash emptied by an OTP call', 'A caller asked for her OTP “to fix a blocked account”; police recovered Tk 1.62 lakh']].forEach(([k, h, b], i) => {
    const x = 166 + i * 820, d = 8800 + 1400 * i;
    appIcon('nw' + i, k, x, 830, 84);
    text('nt' + i, [{ text: h, options: { fontFace: FH, fontSize: P(28), color: 'FFFFFF', breakLine: true } }, { text: b, options: { fontSize: P(22), color: 'E5E7EB' } }], x + 108, 822, 680, 170);
    all(['nw' + i, 'nw' + i + 'i'], 'grow', d, 500, { from: 0.3 }); an('nt' + i, 'fade', d + 200, 600);
  });

  // =============================================================== B3. THE HOME SCREEN: WHY IT WORKS (Ahnaf)
  slide(SN('ahnaf', 70, `So why does it work? Look again at the chairman's message. [Card one.] Trust: it came from a name we respect. [Card two.] Urgency: "right now". [Card three.] A promise: "I'll return it tomorrow." No virus, and no hacking skill was needed on our side. Just three buttons pressed in our minds: trust, urgency and hope.

[Home screen.] So are the apps to blame, or are we? To find out, our group investigated the five apps on this home screen: WhatsApp, Gmail, Discord, Facebook and bKash. We tested each one on seven criteria from our course rubric, from login protection to privacy, each scored zero, one or two, out of fourteen.

Each of us investigated one app. Marzia will begin with WhatsApp, the app where our story began.`), WALL);
  text('brand', 'FIVE APPS, ONE POCKET  ·  WHY IT WORKS', 128, 60, 1200, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: 'E9D5FF', charSpacing: 3 });
  text('h', 'Three buttons, pressed in our minds', 128, 100, 1000, 90, { fontSize: P(50), fontFace: FB, color: 'FFFFFF' });
  an('brand', 'fade', 200, 600); an('h', 'rise', 400, 900);
  stext('msg', [{ text: 'NBR Chairman', options: { bold: true, color: 'FBBF24', breakLine: true } }, { text: 'I need Tk 35,000 on my bKash ', options: { color: '111B21' } }, { text: 'right now', options: { bold: true, color: 'E11D48' } }, { text: '. Can you send it? ', options: { color: '111B21' } }, { text: 'I’ll return it tomorrow.', options: { bold: true, color: '059669' } }],
    128, 230, 900, 130, 'FFFFFF', { r: 0.14, pad: 24, shadow: 16, extra: { fontSize: P(29) } });
  an('msg', 'rise', 1200, 800);
  [['handshake', 'Trust', 'A name we respect: a chairman, a friend, a famous brand', 'FBBF24'], ['clock', 'Urgency', '“Right now”, “blocked today”: panic switches off careful thinking', 'E11D48'], ['coins', 'Hope', '“I’ll return it tomorrow”, easy income, a prize', '10B981']].forEach(([ic, h, b, col], i) => {
    const y = 396 + i * 196, d = 2400 + 1600 * i;
    glass('tc' + i, 128, y, 900, 176); rect('tcb' + i, 128, y + 20, 10, 136, col, { r: 0.5 });
    oval('to' + i, 168, y + 44, 88, 88, col); img('toi' + i, I[ic], 192, y + 68, 40, 40);
    text('tt' + i, [{ text: h, options: { fontFace: FB, fontSize: P(40), color: 'FFFFFF', breakLine: true } }, { text: b, options: { fontSize: P(24), color: 'E5E7EB' } }], 290, y + 28, 710, 130);
    an('tc' + i, 'slide', d, 700); an('tcb' + i, 'wipeD', d + 200, 400); all(['to' + i, 'toi' + i], 'grow', d + 300, 500, { from: 0.3 }); an('tt' + i, 'fade', d + 400, 600);
  });
  // home screen
  rect('hs', 1150, 120, 640, 900, '0B0A1A', { r: 0.1, trans: 35, line: 'FFFFFF', lw: 1 }); an('hs', 'grow', 7400, 800, { from: 0.9 });
  text('hsh', 'OUR INVESTIGATION', 1150, 150, 640, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: 'E9D5FF', align: 'center', charSpacing: 2 });
  text('hss', '5 apps  ·  7 locks  ·  scored 0–2  ·  out of 14', 1150, 188, 640, 34, { fontSize: P(21), color: 'E5E7EB', align: 'center' });
  an('hsh', 'fade', 7700, 400); an('hss', 'fade', 7800, 400);
  [['wa', 'Marzia\nRahman · 29'], ['gm', 'Tanvir Ahmed\nSiddique · 28'], ['dc', 'Jesmin Naher\nSweety · 08'], ['fb', 'Abdullah Al\nMamun · 02'], ['bk', 'Md. Masum\nBillah · 18']].forEach(([k, who], i) => {
    const x = i < 3 ? 1188 + i * 196 : 1286 + (i - 3) * 196, y = i < 3 ? 270 : 560, d = 8100 + 300 * i, bg = k === 'gm' ? 'FFFFFF' : APPS[k].c;
    rect('ap' + i, x + 28, y, 140, 140, bg, { r: 0.24, shadow: 12 });
    if (k === 'bk') text('api' + i, 'b', x + 28, y + 4, 140, 132, { fontSize: P(92), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
    else img('api' + i, k === 'gm' ? I.gmM : I[k + 'W'], x + 62, y + 34, 72, 72, APPS[k].n);
    text('apl' + i, [{ text: APPS[k].n, options: { fontFace: FH, color: 'FFFFFF', breakLine: true } }, { text: who, options: { color: 'C4B5FD', fontSize: P(18) } }], x - 4, y + 150, 204, 110, { fontSize: P(23), align: 'center' });
    an('ap' + i, 'grow', d, 500, { from: 0.2 }); an('api' + i, 'grow', d + 80, 500, { from: 0.2 }); an('apl' + i, 'fade', d + 250, 400);
    an('ap' + i, 'breathe', 10000 + 160 * i, 2400 + 200 * i, { dy: -0.004 }); an('api' + i, 'breathe', 10000 + 160 * i, 2400 + 200 * i, { dy: -0.004 });
  });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1150, 900, 640, 30, { fontSize: P(19), italic: true, color: 'C4B5FD', align: 'center' }); an('by', 'fade', 9800, 500);
  rect('dock', 1190, 940, 560, 50, 'FFFFFF', { r: 0.5, trans: 80 }); an('dock', 'fade', 9800, 500);

