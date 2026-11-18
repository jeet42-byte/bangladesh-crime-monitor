  // ======== OPTION H2 · "HOLOGRAPHIC STORYBOARD": the storyboard as glowing glass panels
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const N = { bg: 'FFF8EC', ink: 'FFFFFF', grey: 'A5B4FC', mint: 'D1FAE5', lav: 'E9D5FF', yel: 'FEF08A', coral: 'FECACA', sky: 'DBEAFE', red: 'FB7185', dark: '0B1026', cyan: '22D3EE', mag: 'E879F9' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let lines = ''; for (let x = 0; x <= 1920; x += 60) lines += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#67E8F9" stroke-opacity=".035"/>`;
    for (let y = 0; y <= 1080; y += 60) lines += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#67E8F9" stroke-opacity=".035"/>`;
    let scan = ''; for (let y = 0; y < 1080; y += 4) scan += `<rect y="${y}" width="1920" height="1" fill="#fff" opacity=".018"/>`;
    const blob = (id, c, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#${c}" stop-opacity="${op}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blob('a', '22D3EE', '.12', '.15', '.55', '.30')}${blob('b', 'E879F9', '.9', '.2', '.55', '.28')}${blob('c', '8B5CF6', '.55', '1', '.6', '.35')}${blob('d', 'FDE047', '.98', '.95', '.35', '.10')}</defs><rect width="1920" height="1080" fill="#060914"/><rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#c)"/><rect width="1920" height="1080" fill="url(#d)"/>${lines}${scan}</svg>`)).png().toFile(A_DIR + 'holo_bg.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1664" height="8"><defs><linearGradient id="g"><stop offset="0" stop-color="#22D3EE"/><stop offset=".35" stop-color="#A78BFA"/><stop offset=".7" stop-color="#F472B6"/><stop offset="1" stop-color="#FDE047"/></linearGradient></defs><rect width="1664" height="8" rx="4" fill="url(#g)"/></svg>`)).png().toFile(A_DIR + 'holo_bar.png');
  }
  const HB = A_DIR + 'holo_bg.png';
  const GLOW = { FFFFFF: '22D3EE', D1FAE5: '34D399', E9D5FF: 'C084FC', FEF08A: 'FDE047', FECACA: 'FB7185', DBEAFE: '60A5FA', 'FFFFFF_': '22D3EE' };
  // holographic glass card: tinted translucent fill + glowing neon edge
  const card = (n, x, y, w, h, fill, d, o = {}) => {
    const col = fill === N.ink ? N.mag : (GLOW[fill] || N.cyan);
    rect(n + 'sh', x - 4, y - 4, w + 8, h + 8, null, { r: o.r == null ? 0.06 : o.r, line: col, lw: 0.75, trans: 0 });
    rect(n, x, y, w, h, fill === N.ink ? '140A24' : col, { r: o.r == null ? 0.06 : o.r, trans: fill === N.ink ? 10 : 84, line: col, lw: 2, glow: col, go: 0.55 });
    if (d != null) { an(n + 'sh', o.e || 'rise', d, 600); an(n, o.e || 'rise', d, 600); an(n + 'sh', 'pulse', d + 900, 1600, { scale: 101 }); }
  };
  const chip = (n, t, x, y, w, d, o = {}) => {
    stext(n, t, x, y, w, 50, N.dark, { r: 0.5, pad: 0, align: 'center', line: N.cyan, lw: 1.5, extra: { color: o.col === N.yel ? 'FDE047' : '67E8F9', fontFace: MONO, bold: true, fontSize: P(21), charSpacing: 2, shadow: { type: 'outer', color: '22D3EE', blur: 12, offset: 0, angle: 90, opacity: 0.5 } } });
    an(n, 'grow', d, 500, { from: 0.6 });
  };
  const head = (k, t, d = 0) => {
    chip('hk', k, 128, 70, Math.max(300, k.length * 17 + 60), d);
    text('ht', t, 128, 136, 1664, 110, { fontSize: P(72), fontFace: FB, color: N.ink });
    imgp('hbar', A_DIR + 'holo_bar.png', 128, 250, 520, 6, '');
    an('ht', 'rise', d + 300, 800); an('hbar', 'wipe', d + 900, 900);
  };

  // =============================================================== H1. ONE MESSAGE, FOUR MOMENTS (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let me tell you a true story, in four quick moments.

[Panel one.] September 2025, three-sixteen in the afternoon. A journalist in Dhaka gets a WhatsApp message.

[Panel two.] It comes from the chairman of the National Board of Revenue, the head of the country's tax office.

[Panel three.] The message says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow." A small amount, and a friendly promise.

[Panel four. Pause.] But it was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), HB, 'fade');
  head('A TRUE STORY · SEPTEMBER 2025', 'One message. Four moments.');
  const PX = i => 128 + i * 424, PY = 290, PW = 388, PH = 590;
  [N.mint, N.lav, N.yel, N.coral].forEach((f, i) => {
    const d = [1500, 6000, 10500, 17500][i];
    card('p' + i, PX(i), PY, PW, PH, f, d);
    oval('pn' + i, PX(i) + 24, PY + 24, 60, 60, N.cyan, { glow: N.cyan, go: 0.6 }); text('pnt' + i, String(i + 1), PX(i) + 24, PY + 24, 60, 60, { fontSize: P(30), fontFace: FB, color: N.dark, align: 'center', valign: 'middle' });
    all(['pn' + i, 'pnt' + i], 'grow', d + 300, 400, { from: 0.2 });
  });
  // panel 1: a phone with a WhatsApp notification
  { const x = PX(0) + 114, y = PY + 70, d = 1900;
    rect('ph', x, y, 160, 270, N.dark, { r: 0.16, line: '67E8F9', lw: 2.5, glow: N.cyan, go: 0.6 }); rect('phn', x + 55, y + 14, 50, 10, N.ink, { r: 0.5 });
    appIcon('pw', 'wa', x + 40, y + 90, 80); oval('pdot', x + 106, y + 80, 30, 30, N.red, { line: N.ink, lw: 2 });
    all(['ph', 'phn'], 'grow', d, 500, { from: 0.5 }); all(['pw', 'pwi'], 'grow', d + 300, 400, { from: 0.3 }); an('pdot', 'grow', d + 700, 300, { from: 0.2 }); an('pdot', 'pulse', d + 1100, 800, { scale: 125 }); }
  // panel 2: the sender
  { const x = PX(1) + 119, y = PY + 100, d = 6400;
    oval('so', x, y, 150, 150, N.dark, { line: 'C084FC', lw: 2.5, glow: 'C084FC', go: 0.7 }); img('si', I.user2, x + 45, y + 42, 60, 66, 'Person');
    stext('sb', 'NBR', x + 92, y + 104, 92, 44, 'FDE047', { r: 0.5, align: 'center', line: 'FDE047', lw: 2, extra: { fontFace: FB, fontSize: P(22), color: N.dark } });
    an('so', 'grow', d, 500, { from: 0.3 }); an('si', 'grow', d + 100, 500, { from: 0.3 }); an('sb', 'grow', d + 500, 400, { from: 0.3 }); }
  // panel 3: the ask, as a chat bubble (translated)
  { const x = PX(2) + 34, y = PY + 108, d = 10900;
    stext('bub', '“I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', x, y, 320, 200, '1E1B4B', { r: 0.12, pad: 20, line: 'FDE047', lw: 2, trans: 10, extra: { fontFace: FH, fontSize: P(27), color: N.ink } });
    an('bub', 'grow', d, 600, { from: 0.4 }); }
  // panel 4: hacked
  { const x = PX(3) + 119, y = PY + 100, d = 17900;
    oval('ho', x, y, 150, 150, 'E11D48', { line: 'FDA4AF', lw: 2.5, glow: N.red, go: 0.8 }); img('hi', I.warn, x + 40, y + 36, 70, 70, 'Warning');
    an('ho', 'grow', d, 500, { from: 0.2 }); an('hi', 'grow', d + 100, 500, { from: 0.2 }); an('ho', 'pulse', d + 900, 900, { scale: 110 }); }
  [['3:16 PM', 'A WhatsApp message arrives.'], ['From: the NBR Chairman', 'The head of the country’s tax office.'], ['The ask', 'A small amount. A friendly promise.'], ['It was not him.', 'His WhatsApp had been hacked.']].forEach(([h, b], i) => {
    const d = [1500, 6000, 10500, 17500][i] + 900;
    line('pl' + i, PX(i) + 30, PY + 390, PX(i) + PW - 30, PY + 390, N.ink, { lw: 2 });
    text('pc' + i, [{ text: h, options: { fontFace: FB, fontSize: P(36), color: i === 3 ? N.red : N.ink, breakLine: true } }, { text: b, options: { fontFace: FH, fontSize: P(25), color: N.grey } }], PX(i) + 30, PY + 410, PW - 60, 160);
    an('pl' + i, 'wipe', d, 400); an('pc' + i, 'fade', d + 200, 600);
  });
  text('src', 'Source: NBR statement, 24 September 2025 (bdnews24). Message translated from Bangla.', 128, 930, 1664, 30, { fontSize: P(19), color: N.grey });
  an('src', 'fade', 19500, 500);

  // =============================================================== H2. SAME TRICK, DIFFERENT APPS (Ahnaf)
  slide(SN('ahnaf', 65, `And this keeps happening, on different apps. Look at each row: the bait, what happened, and what it cost.

[WhatsApp row.] The bait was a trusted name. The hacker used the chairman's account to ask people for money, and the NBR had to issue a public warning.

[Facebook row.] In 2024, a student sent links on Messenger. He took over more than fifty Facebook accounts, and the CID says he blackmailed at least fifteen people.

[bKash row.] The actor Dighi got a phone call about a "blocked account". The caller asked for her OTP, and her bKash was emptied. Police later recovered one lakh sixty-two thousand taka.

[Black bar.] And in 2025, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards: ninety-two point six crore taka lost.`), HB, 'fade');
  head('IT KEEPS HAPPENING', 'Same trick. Different apps.');
  const CX = [460, 920, 1380], CW = 412;
  ['THE BAIT', 'WHAT HAPPENED', 'WHAT IT COST'].forEach((h, j) => { text('ch' + j, h, CX[j], 262, CW, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: N.grey, charSpacing: 2 }); an('ch' + j, 'fade', 1200, 400); });
  [['wa', 'A trusted name', 'Used the chairman’s account to ask for money', 'A public warning from the NBR', 'Sept 2025 · NBR'],
   ['fb', 'A link on Messenger', 'Took over 50+ Facebook accounts', 'At least 15 people blackmailed', 'Oct 2024 · CID'],
   ['bk', 'A call about a “blocked account”', 'Got the OTP and emptied her bKash', 'Tk 1.62 lakh recovered by police', 'Actor Dighi · DB']].forEach(([k, b, w, c, s], i) => {
    const y = 310 + i * 160, d = [2500, 7500, 13500][i];
    card('ra' + i, 128, y, 296, 130, 'FFFFFF', d, { e: 'slide' });
    appIcon('ri' + i, k, 150, y + 25, 80);
    text('rn' + i, [{ text: APPS[k].n, options: { fontFace: FB, fontSize: P(30), color: N.ink, breakLine: true } }, { text: s, options: { fontSize: P(16), color: N.grey } }], 244, y + 18, 176, 100, { valign: 'middle' });
    all(['ri' + i, 'ri' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('rn' + i, 'fade', d + 400, 400);
    [[b, 'FFFFFF'], [w, N.sky], [c, N.coral]].forEach(([t, f], j) => {
      const dd = d + 900 + 900 * j;
      card('rb' + i + j, CX[j], y, CW, 130, f, dd, { e: 'fade' });
      text('rt' + i + j, t, CX[j] + 24, y, CW - 48, 130, { fontSize: P(28), fontFace: FH, color: N.ink, valign: 'middle' });
      an('rt' + i + j, 'fade', dd + 200, 500);
      if (j < 2) { line('ar' + i + j, CX[j] + CW + 8, y + 65, CX[j + 1] - 10, y + 65, '67E8F9', { lw: 3, arrow: true }); an('ar' + i + j, 'wipe', dd + 400, 300); }
    });
    line('ar' + i + 'x', 434, y + 65, CX[0] - 10, y + 65, '67E8F9', { lw: 3, arrow: true }); an('ar' + i + 'x', 'wipe', d + 600, 300);
  });
  card('nbar', 128, 820, 1664, 150, N.ink, 21000, { e: 'fade' });
  text('nv', '81,423', 168, 820, 480, 150, { fontSize: P(92), fontFace: FB, color: '67E8F9', valign: 'middle' });
  text('nt', [{ text: 'fraud cases in Bangladesh in 2025: mobile banking, cheques and cards', options: { color: 'FFFFFF', breakLine: true } }, { text: 'Tk 92.6 crore lost  ·  Bangladesh Bank, via Daily Observer', options: { color: 'D1D5DB', fontSize: P(23) } }],
    680, 820, 1080, 150, { fontSize: P(30), fontFace: FH, valign: 'middle' });
  an('nv', 'grow', 21300, 700, { from: 0.6 }); an('nt', 'fade', 21700, 700);

  // =============================================================== H3. THE WEAKEST LOCK, AND OUR ROUTE (Ahnaf)
  slide(SN('ahnaf', 60, `So what do these three stories have in common? [Headline.] In every case, the app's lock was not broken. A person was tricked into opening it.

[Question.] That gives us our two questions for today. How strong are the locks on the apps in our pocket? And why do they still fail?

[Route.] We will visit five apps, in this order. WhatsApp with Marzia, Gmail with Tanvir, Discord with Sweety, Facebook with Mamun, and bKash with Masum, who will also show the final scores.

[Bottom chip.] Every app is tested on seven locks, each scored zero, one or two: fourteen points in total. Marzia, over to you.`), HB, 'fade');
  head('THE PATTERN', 'The weakest lock is the person.');
  card('qq', 128, 280, 1664, 110, N.yel, 3500, { e: 'fade', r: 0.2 });
  text('qt', [{ text: 'Our question:  ', options: { fontFace: FB, color: 'FDE047' } }, { text: 'how strong are the locks on the apps in our pocket, and why do they still fail?', options: { fontFace: FH, color: N.ink } }], 168, 280, 1600, 110, { fontSize: P(32), valign: 'middle' });
  an('qt', 'fade', 3800, 700);
  line('road', 200, 600, 1720, 600, N.cyan, { lw: 4, dash: 'dash' }); an('road', 'wipe', 9000, 1500);
  FIVE.forEach((k, i) => {
    const cx = 260 + i * 350, d = 10000 + 900 * i;
    chip('st' + i, 'STOP ' + (i + 1), cx - 70, 440, 140, d);
    oval('sc' + i, cx - 72, 528, 144, 144, k === 'gm' ? 'FFFFFF' : APPS[k].c, { line: 'FFFFFF', lw: 2, glow: k === 'gm' ? N.cyan : APPS[k].c, go: 0.8 });
    if (k === 'bk') text('sci' + i, 'b', cx - 72, 528, 144, 144, { fontSize: P(90), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
    else img('sci' + i, k === 'gm' ? I.gmM : I[k + 'W'], cx - 38, 562, 76, 76, APPS[k].n);
    text('sn' + i, [{ text: APPS[k].n, options: { fontFace: FB, fontSize: P(32), color: N.ink, breakLine: true } }, { text: ROLE[k], options: { fontFace: FH, fontSize: P(21), color: N.ink, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(19), color: N.grey } }],
      cx - 160, 696, 320, 150, { align: 'center' });
    all(['sc' + i, 'sci' + i], 'grow', d + 200, 500, { from: 0.2 }); an('sn' + i, 'fade', d + 400, 500);
  });
  chip('rule', '7 LOCKS  ·  0, 1 OR 2 POINTS EACH  ·  SCORED OUT OF 14', 410, 900, 1100, 15500, { fill: N.ink, col: N.yel });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 990, 600, 34, { fontSize: P(20), color: N.grey, align: 'right' }); an('by', 'fade', 16000, 500);

