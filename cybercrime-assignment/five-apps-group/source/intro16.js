  // ======== OPTION L · "COLOUR BLOCKS": bold Bauhaus-style blocks in each app's own colour
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const B = { paper: 'F4F1EA', ink: '111111', yel: 'FACC15', red: 'E63946', blue: '1D4ED8' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  const lab = (n, t, x, y, w, col = B.ink) => text(n, t, x, y, w, 34, { fontSize: P(21), fontFace: F, bold: true, color: col, charSpacing: 4 });

  // =============================================================== L1. 3:16 (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let me start with a true story, and a time: three-sixteen.

[Green block.] September 2025, three-sixteen in the afternoon. A journalist in Dhaka gets a WhatsApp message.

[Right side.] It comes from the chairman of the National Board of Revenue, the head of the country's tax office. It says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Red block. Pause.] But it was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), B.paper, 'fade');
  rect('gb', 0, 0, 860, 1080, K.wa); an('gb', 'wipeD', 200, 900);
  oval('yc', 470, 770, 380, 380, B.yel); an('yc', 'grow', 1200, 900, { from: 0.2 });
  rect('bk', 0, 0, 120, 1080, B.ink); an('bk', 'wipeD', 400, 700);
  lab('gk', 'SEPTEMBER 2025 · DHAKA', 180, 120, 640, B.ink);
  text('gt', '3:16', 160, 160, 700, 330, { fontSize: P(300), fontFace: FB, color: 'FFFFFF' });
  text('gp', 'PM', 180, 480, 300, 80, { fontSize: P(64), fontFace: FB, color: B.ink });
  an('gk', 'fade', 900, 500); an('gt', 'rise', 1000, 900); an('gp', 'fade', 1600, 600);
  img('gw', I.waW, 180, 640, 150, 150, 'WhatsApp'); an('gw', 'grow', 2600, 600, { from: 0.3 });
  lab('rk', 'A TRUE STORY', 960, 120, 800, B.red); an('rk', 'fade', 3000, 500);
  text('r1', 'A journalist gets one WhatsApp message.', 960, 160, 840, 150, { fontSize: P(54), fontFace: FB, color: B.ink }); an('r1', 'rise', 3200, 800);
  rect('fromb', 960, 340, 12, 110, B.blue); an('fromb', 'wipeD', 6400, 400);
  text('r2', [{ text: 'FROM\n', options: { fontFace: F, bold: true, fontSize: P(21), color: B.blue, charSpacing: 4 } }, { text: 'the chairman of the National Board of Revenue', options: { fontFace: FH, fontSize: P(36), color: B.ink } }], 1000, 336, 800, 120);
  an('r2', 'fade', 6600, 700);
  stext('r3', '“I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', 960, 490, 840, 200, B.ink, { pad: 34, extra: { fontFace: FH, fontSize: P(36), color: 'FFFFFF' } });
  an('r3', 'wipe', 10000, 800);
  stext('r4', [{ text: 'It was not him.\n', options: { fontFace: FB, fontSize: P(64), color: 'FFFFFF' } }, { text: 'His WhatsApp had been hacked.', options: { fontFace: FH, fontSize: P(32), color: 'FFE4E6' } }], 960, 740, 840, 230, B.red, { pad: 34 });
  an('r4', 'wipeU', 16500, 700);
  text('src', 'NBR statement, 24 Sept 2025 (bdnews24) · translated from Bangla', 960, 990, 840, 30, { fontSize: P(17), color: '555555' }); an('src', 'fade', 17500, 500);

  // =============================================================== L2. THREE COLUMNS (Ahnaf)
  slide(SN('ahnaf', 65, `And it keeps happening, on different apps. [Columns.] Three apps, three real cases.

[Green.] WhatsApp: the chairman's account, hijacked by a trusted name and used to ask people for money.

[Blue.] Facebook: in 2024, a student sent links on Messenger. He took over more than fifty accounts, and the CID says he blackmailed at least fifteen people.

[Pink.] bKash: the actor Dighi got one call about a "blocked account". The caller asked for her OTP, and her account was emptied. Police later recovered one lakh sixty-two thousand taka.

[Black bar.] In 2025, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards: ninety-two point six crore taka lost.`), B.paper, 'fade');
  lab('k2', 'IT KEEPS HAPPENING', 128, 70, 800, B.red);
  text('t2', 'Three apps. Three cases. One trick.', 128, 104, 1664, 100, { fontSize: P(64), fontFace: FB, color: B.ink });
  an('k2', 'fade', 200, 500); an('t2', 'rise', 400, 800);
  [['wa', 'A trusted name', 'The chairman’s hijacked WhatsApp asks people for money.', 'NBR · 2025'],
   ['fb', 'A link on Messenger', '50+ Facebook accounts taken; at least 15 people blackmailed.', 'CID · 2024'],
   ['bk', 'A call for the OTP', 'Actor Dighi’s bKash is emptied; police recover Tk 1.62 lakh.', 'DB · TBS']].forEach(([k, h, b, s], i) => {
    const x = 128 + i * 560, d = [2500, 7000, 13500][i];
    rect('col' + i, x, 236, 536, 560, APPS[k].c); an('col' + i, 'wipeU', d, 700);
    if (k === 'bk') text('ci' + i, 'b', x + 36, 250, 150, 170, { fontSize: P(150), fontFace: FB, color: 'FFFFFF', valign: 'middle' });
    else img('ci' + i, I[k + 'W'], x + 40, 276, 120, 120, APPS[k].n);
    text('cn' + i, APPS[k].n.toUpperCase(), x + 200, 290, 310, 60, { fontSize: P(26), fontFace: F, bold: true, color: 'FFFFFF', charSpacing: 4, align: 'right' });
    text('cs' + i, s, x + 200, 340, 310, 40, { fontSize: P(20), color: 'FFFFFF', align: 'right' });
    text('ch' + i, [{ text: h + '\n', options: { fontFace: FB, fontSize: P(46), color: 'FFFFFF' } }, { text: b, options: { fontFace: FH, fontSize: P(28), color: 'FFFFFF' } }], x + 40, 460, 460, 320);
    an('ci' + i, 'grow', d + 400, 500, { from: 0.3 }); an('cn' + i, 'fade', d + 500, 400); an('cs' + i, 'fade', d + 600, 400); an('ch' + i, 'fade', d + 700, 700);
  });
  rect('sq', 128, 812, 40, 40, B.yel); an('sq', 'grow', 20000, 300, { from: 0.2 });
  rect('nb', 128, 830, 1664, 160, B.ink); an('nb', 'wipe', 20200, 700);
  text('nv', '81,423', 168, 830, 520, 160, { fontSize: P(104), fontFace: FB, color: B.yel, valign: 'middle' });
  text('nt', [{ text: 'fraud cases in Bangladesh in 2025', options: { fontFace: FH, color: 'FFFFFF', breakLine: true } }, { text: 'Tk 92.6 crore lost  ·  Bangladesh Bank, via Daily Observer', options: { color: 'BBBBBB', fontSize: P(24) } }], 720, 830, 1040, 160, { fontSize: P(34), valign: 'middle' });
  an('nv', 'fade', 20800, 600); an('nt', 'fade', 21100, 700);

  // =============================================================== L3. THE GRID (Ahnaf)
  slide(SN('ahnaf', 60, `So what do the three cases have in common? [Black square.] Nobody broke the lock. Someone was tricked into opening it.

[Yellow strip.] That gives us our question: how strong are the locks on the apps in our pocket, and why do they still fail?

[Colour squares.] Five apps, five presenters. WhatsApp, Marzia Rahman. Gmail, Tanvir Ahmed Siddique. Discord, Jesmin Naher Sweety. Facebook, Abdullah Al Mamun. And bKash, Md. Masum Billah, with the final scores.

Every app is tested on seven locks, each scored zero, one or two: fourteen points in total. Marzia, over to you.`), B.paper, 'fade');
  rect('bs', 0, 0, 860, 760, B.ink); an('bs', 'wipe', 200, 800);
  oval('rc', 640, 560, 200, 200, B.red); an('rc', 'grow', 1200, 700, { from: 0.2 });
  lab('k3', 'THE PATTERN', 128, 110, 600, B.yel); an('k3', 'fade', 800, 500);
  text('h1', 'Nobody broke the lock.', 128, 150, 680, 330, { fontSize: P(96), fontFace: FB, color: 'FFFFFF' });
  text('h2', 'Someone was tricked into opening it.', 128, 500, 480, 130, { fontSize: P(40), fontFace: FH, color: B.yel });
  an('h1', 'rise', 1000, 900); an('h2', 'fade', 2600, 800);
  rect('ys', 0, 760, 860, 320, B.yel); an('ys', 'wipeU', 6000, 700);
  text('q', [{ text: 'OUR QUESTION\n', options: { fontFace: F, bold: true, fontSize: P(21), color: B.ink, charSpacing: 4 } }, { text: 'How strong are the locks on the apps in our pocket, and why do they still fail?', options: { fontFace: FB, fontSize: P(36), color: B.ink } }], 128, 790, 680, 260, { valign: 'middle' });
  an('q', 'fade', 6400, 700);
  const SQ = [[920, 60], [1260, 60], [1600, 60], [920, 400], [1260, 400]];
  FIVE.forEach((k, i) => {
    const [x, y] = SQ[i], d = 10500 + 600 * i, bg = k === 'gm' ? 'FFFFFF' : APPS[k].c, fg = k === 'gm' ? B.ink : 'FFFFFF';
    rect('s' + i, x, y, 320, 320, bg, k === 'gm' ? { line: B.ink, lw: 3 } : {});
    if (k === 'bk') text('si' + i, 'b', x + 24, y + 10, 110, 120, { fontSize: P(100), fontFace: FB, color: 'FFFFFF', valign: 'middle' });
    else img('si' + i, k === 'gm' ? I.gmM : I[k + 'W'], x + 28, y + 28, 90, 90, APPS[k].n);
    text('sn' + i, [{ text: String(i + 1), options: { fontFace: FB, fontSize: P(36), color: fg } }], x + 240, y + 20, 60, 60, { align: 'right' });
    text('st' + i, [{ text: APPS[k].n + '\n', options: { fontFace: FB, fontSize: P(38), color: fg } }, { text: ROLE[k] + '\n', options: { fontFace: FH, fontSize: P(22), color: fg } }, { text: 'Roll ' + ROLL[k], options: { fontSize: P(20), color: fg } }], x + 28, y + 150, 270, 150);
    an('s' + i, 'grow', d, 500, { from: 0.5 }); an('si' + i, 'fade', d + 200, 400); an('sn' + i, 'fade', d + 250, 400); an('st' + i, 'fade', d + 300, 500);
  });
  rect('rs', 1600, 400, 320, 320, B.ink); an('rs', 'grow', 13800, 500, { from: 0.5 });
  text('rt', [{ text: '7\n', options: { fontFace: FB, fontSize: P(96), color: B.yel } }, { text: 'locks · 0, 1 or 2 points each · out of 14', options: { fontFace: FH, fontSize: P(24), color: 'FFFFFF' } }], 1628, 420, 270, 280, { valign: 'middle' });
  an('rt', 'fade', 14100, 600);
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 920, 780, 1000, 40, { fontSize: P(22), color: '555555' }); an('by', 'fade', 15000, 500);
  rect('bl', 920, 860, 1000, 220, B.blue); an('bl', 'wipe', 14600, 600);
  text('blt', 'Five apps. One pocket.', 960, 860, 920, 220, { fontSize: P(60), fontFace: FB, color: 'FFFFFF', valign: 'middle' }); an('blt', 'fade', 15000, 600);

