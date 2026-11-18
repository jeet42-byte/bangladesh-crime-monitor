  // ======== OPTION I · "PEARL HOLOGRAPHIC": light iridescent foil, new layouts, same real stories
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const H = { ink: '0F172A', soft: '475569', vio: '7C3AED', pink: 'DB2777', teal: '0E7490', line: 'C4B5FD' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    const stops = `<stop offset="0" stop-color="#67E8F9"/><stop offset=".25" stop-color="#A78BFA"/><stop offset=".5" stop-color="#F9A8D4"/><stop offset=".75" stop-color="#FDE68A"/><stop offset="1" stop-color="#86EFAC"/>`;
    const blob = (id, c, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#${c}" stop-opacity="${op}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blob('a', 'A5F3FC', '.05', '.1', '.55', '.75')}${blob('b', 'F5D0FE', '.95', '.1', '.55', '.75')}${blob('c', 'C7D2FE', '.6', '1.05', '.6', '.8')}${blob('d', 'FDE68A', '.98', '.95', '.35', '.45')}${blob('e', 'BBF7D0', '.02', '.98', '.35', '.45')}<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset=".30" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".55"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".35"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="1920" height="1080" fill="#F5F5FB"/><rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#c)"/><rect width="1920" height="1080" fill="url(#d)"/><rect width="1920" height="1080" fill="url(#e)"/><rect width="1920" height="1080" fill="url(#s)"/></svg>`)).png().toFile(A_DIR + 'pearl_bg.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="56"><defs><linearGradient id="g">${stops}</linearGradient><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><rect width="1000" height="56" rx="28" fill="url(#g)"/><rect width="1000" height="56" rx="28" fill="url(#w)"/></svg>`)).png().toFile(A_DIR + 'foil_h.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="10" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs><rect width="10" height="600" rx="5" fill="url(#g)"/></svg>`)).png().toFile(A_DIR + 'foil_v.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><circle cx="300" cy="300" r="262" fill="#fff" fill-opacity=".55"/><circle cx="300" cy="300" r="262" fill="none" stroke="url(#g)" stroke-width="34"/><circle cx="300" cy="300" r="226" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3"/></svg>`)).png().toFile(A_DIR + 'foil_ring.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs><circle cx="60" cy="60" r="56" fill="url(#g)"/><circle cx="60" cy="60" r="56" fill="none" stroke="#fff" stroke-width="6"/></svg>`)).png().toFile(A_DIR + 'foil_dot.png');
  }
  const PB = A_DIR + 'pearl_bg.png';
  const glass = (n, x, y, w, h, o = {}) => rect(n, x, y, w, h, 'FFFFFF', { r: o.r == null ? 0.1 : o.r, trans: o.trans == null ? 35 : o.trans, line: 'FFFFFF', lw: 1.5, shadow: 24, so: 8, sop: 0.12 });
  const pill = (n, t, x, y, w, d) => {
    imgp(n + 'f', A_DIR + 'foil_h.png', x, y, w, 52, '');
    text(n, t, x, y, w, 52, { fontSize: P(21), fontFace: MONO, bold: true, color: H.ink, align: 'center', valign: 'middle', charSpacing: 2 });
    an(n + 'f', 'wipe', d, 700); an(n, 'fade', d + 300, 500);
  };
  const bar = (n, x, y, w, d) => { imgp(n, A_DIR + 'foil_h.png', x, y, w, 8, ''); an(n, 'wipe', d, 900); };

  // =============================================================== I1. A MESSAGE FROM THE TOP (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let me start with a true story.

[Timeline, point one.] September 2025, three-sixteen in the afternoon. A journalist in Dhaka gets a WhatsApp message.

[Point two.] It comes from the chairman of the National Board of Revenue, the head of the country's tax office. [Phone.] It says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow." A small amount, and a friendly promise.

[Point three. Pause. Stamp.] But it was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), PB, 'fade');
  // phone, drawn (no screenshot)
  rect('ph', 200, 120, 520, 880, 'FFFFFF', { r: 0.12, line: H.line, lw: 2, shadow: 40, so: 14, sop: 0.18 });
  rect('scr', 226, 170, 468, 790, 'ECE5DD', { r: 0.06 });
  rect('nt', 400, 140, 120, 16, H.ink, { r: 0.5 });
  rect('cb', 226, 170, 468, 120, '075E54', { r: 0.06 }); rect('cb2', 226, 230, 468, 60, '075E54');
  oval('av', 250, 196, 70, 70, 'D1D5DB'); img('avi', I.user2G, 270, 214, 30, 34, '');
  text('cn', [{ text: 'NBR Chairman', options: { fontFace: FH, fontSize: P(28), color: 'FFFFFF', breakLine: true } }, { text: 'online', options: { fontSize: P(19), color: 'C7F2E3' } }], 340, 196, 330, 72, { valign: 'middle' });
  all(['ph', 'scr', 'nt', 'cb', 'cb2', 'av', 'avi', 'cn'], 'rise', 400, 900);
  stext('bub', [{ text: 'I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.', options: { color: '111B21', fontSize: P(28), breakLine: true } }, { text: '3:16 PM', options: { color: '667781', fontSize: P(18) } }],
    256, 330, 400, 230, 'FFFFFF', { r: 0.08, pad: 22, valign: 'top', shadow: 4, extra: {} });
  text('tr', 'Translated from Bangla', 256, 572, 400, 30, { fontSize: P(18), italic: true, color: '667781' });
  an('bub', 'grow', 7600, 600, { from: 0.4 }); an('tr', 'fade', 8200, 500);
  stext('stamp', 'HACKED', 250, 680, 420, 130, null, { r: 0.08, align: 'center', line: H.pink, lw: 6, extra: { color: H.pink, fontFace: FB, fontSize: P(84), charSpacing: 6, rotate: -10 } });
  an('stamp', 'grow', 16500, 450, { from: 2 });
  // right column: the story as a timeline
  pill('k', 'A TRUE STORY · DHAKA, SEPTEMBER 2025', 860, 120, 640, 200);
  text('t', 'A message from the top.', 860, 196, 940, 110, { fontSize: P(72), fontFace: FB, color: H.ink });
  an('t', 'rise', 500, 900);
  imgp('tl', A_DIR + 'foil_v.png', 881, 372, 8, 560, ''); an('tl', 'wipeD', 1800, 1500);
  [['3:16 PM · September 2025', 'A journalist in Dhaka gets a WhatsApp message.', H.vio], ['The sender: the NBR Chairman', 'The head of the country’s tax office asks for Tk 35,000 on bKash.', H.teal], ['It was not him.', 'His WhatsApp had been hacked. The NBR warned the public.', H.pink]].forEach(([h, b, col], i) => {
    const y = 360 + i * 205, d = [2600, 6200, 16200][i];
    imgp('nd' + i, A_DIR + 'foil_dot.png', 857, y, 56, 56, ''); text('ndt' + i, String(i + 1), 857, y, 56, 56, { fontSize: P(26), fontFace: FB, color: H.ink, align: 'center', valign: 'middle' });
    glass('ng' + i, 950, y - 18, 842, 160);
    text('nx' + i, [{ text: h, options: { fontFace: FB, fontSize: P(38), color: col, breakLine: true } }, { text: b, options: { fontFace: FH, fontSize: P(26), color: H.soft } }], 986, y - 18, 790, 160, { valign: 'middle' });
    all(['nd' + i, 'ndt' + i], 'grow', d, 400, { from: 0.2 }); an('ng' + i, 'slide', d + 100, 600); an('nx' + i, 'fade', d + 300, 600);
  });
  text('src', 'Source: NBR statement, 24 September 2025 (bdnews24)', 1092, 990, 700, 30, { fontSize: P(18), color: H.soft, align: 'right' }); an('src', 'fade', 17500, 500);

  // =============================================================== I2. DIFFERENT APPS, SAME TRICK (Ahnaf)
  slide(SN('ahnaf', 65, `And this keeps happening. [Ring.] In 2025 alone, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards. Ninety-two point six crore taka, lost.

[Cards, top to bottom.] Behind that number are stories like these.

The chairman's WhatsApp: a trusted name, used to ask people for money.

On Facebook, in 2024, a student sent links on Messenger. He took over more than fifty accounts, and the CID says he blackmailed at least fifteen people.

And on bKash, the actor Dighi got one phone call about a "blocked account". The caller asked for her OTP, and her account was emptied. Police later recovered one lakh sixty-two thousand taka.`), PB, 'fade');
  pill('k2', 'IT KEEPS HAPPENING', 128, 70, 380, 200);
  text('t2', 'Different apps. The same trick.', 128, 136, 1664, 110, { fontSize: P(72), fontFace: FB, color: H.ink });
  an('t2', 'rise', 500, 900);
  imgp('ring', A_DIR + 'foil_ring.png', 140, 300, 560, 560, ''); an('ring', 'grow', 1500, 1100, { from: 0.6 }); an('ring', 'spin', 2600, 30000);
  text('rv', '81,423', 140, 450, 560, 120, { fontSize: P(100), fontFace: FB, color: H.ink, align: 'center', valign: 'middle' });
  text('rd', [{ text: 'fraud cases in Bangladesh, 2025', options: { color: H.soft, fontSize: P(26), breakLine: true } }, { text: 'Tk 92.6 crore lost', options: { color: H.pink, fontFace: FB, fontSize: P(34) } }], 200, 572, 440, 110, { align: 'center' });
  text('rs', 'Bangladesh Bank, via Daily Observer · mobile banking, cheques and cards', 140, 890, 560, 60, { fontSize: P(18), color: H.soft, align: 'center' });
  an('rv', 'grow', 2200, 800, { from: 0.5 }); an('rd', 'fade', 2900, 700); an('rs', 'fade', 3400, 500);
  [['wa', 'NBR · Sept 2025', 'The chairman’s WhatsApp is hijacked and used to ask people for money', 'A trusted name'],
   ['fb', 'CID · Oct 2024', 'A student takes over 50+ Facebook accounts and blackmails at least 15 people', 'A link on Messenger'],
   ['bk', 'DB · actor Dighi', 'Her bKash is emptied after one call; police recover Tk 1.62 lakh', 'A request for the OTP']].forEach(([k, src, h, how], i) => {
    const y = 290 + i * 222, d = [8000, 11500, 18500][i];
    line('cx' + i, 700, 580, 840, y + 98, 'A78BFA', { lw: 2, dash: 'dash' }); an('cx' + i, 'fade', d - 200, 500);
    glass('cg' + i, 840, y, 952, 196);
    appIcon('ci' + i, k, 876, y + 48, 100);
    text('cs' + i, src, 1480, y + 20, 290, 30, { fontSize: P(19), fontFace: MONO, bold: true, color: H.vio, align: 'right' });
    text('ch' + i, [{ text: h, options: { fontFace: FH, fontSize: P(30), color: H.ink, breakLine: true } }, { text: 'How: ' + how, options: { fontFace: FB, fontSize: P(25), color: H.pink } }], 1006, y + 50, 760, 130, { valign: 'top' });
    an('cg' + i, 'slideR', d, 700); all(['ci' + i, 'ci' + i + 'i'], 'grow', d + 300, 500, { from: 0.3 }); an('cs' + i, 'fade', d + 400, 400); an('ch' + i, 'fade', d + 500, 700);
  });

  // =============================================================== I3. NOBODY BROKE THE LOCK (Ahnaf)
  slide(SN('ahnaf', 60, `So what do these stories have in common? [Headline.] Nobody broke the lock. Someone was tricked into opening it.

[Question.] That gives us our two questions for today. How strong are the locks on the apps in our pocket? And why do they still fail?

[Right column.] We will look at five apps, in this order: WhatsApp with Marzia, Gmail with Tanvir, Discord with Sweety, Facebook with Mamun, and bKash with Masum, who will also show the final scores.

[Pill.] Every app is tested on seven locks, each scored zero, one or two: fourteen points in total. Marzia, over to you.`), PB, 'fade');
  pill('k3', 'THE PATTERN', 128, 120, 300, 200);
  text('h1', 'Nobody broke\nthe lock.', 128, 196, 900, 250, { fontSize: P(100), fontFace: FB, color: H.ink });
  text('h2', 'Someone was tricked into opening it.', 128, 452, 900, 70, { fontSize: P(40), fontFace: FH, color: H.pink });
  bar('hb', 128, 540, 420, 2600);
  an('h1', 'rise', 500, 900); an('h2', 'fade', 2200, 800);
  glass('qg', 128, 600, 900, 230, { r: 0.12 });
  text('qt', [{ text: 'OUR QUESTION\n', options: { fontFace: MONO, bold: true, fontSize: P(21), color: H.vio } }, { text: 'How strong are the locks on the apps in our pocket, and why do they still fail?', options: { fontFace: FH, fontSize: P(36), color: H.ink } }], 168, 600, 830, 230, { valign: 'middle' });
  an('qg', 'rise', 6000, 700); an('qt', 'fade', 6300, 700);
  pill('rule', '7 LOCKS · 0, 1 OR 2 POINTS · OUT OF 14', 128, 880, 640, 16500);
  text('ord', 'IN THIS ORDER', 1120, 120, 672, 52, { fontSize: P(21), fontFace: MONO, bold: true, color: H.vio, valign: 'middle', charSpacing: 2 }); an('ord', 'fade', 10500, 500);
  FIVE.forEach((k, i) => {
    const y = 190 + i * 162, d = 11000 + 700 * i;
    glass('og' + i, 1120, y, 672, 142);
    text('on' + i, String(i + 1), 1140, y, 70, 142, { fontSize: P(54), fontFace: FB, color: H.line, align: 'center', valign: 'middle' });
    appIcon('oi' + i, k, 1220, y + 23, 96);
    text('ot' + i, [{ text: APPS[k].n, options: { fontFace: FB, fontSize: P(34), color: H.ink, breakLine: true } }, { text: ROLE[k] + '  ·  Roll ' + ROLL[k], options: { fontFace: FH, fontSize: P(23), color: H.soft } }], 1340, y, 440, 142, { valign: 'middle' });
    an('og' + i, 'slideR', d, 600); an('on' + i, 'fade', d + 200, 400); all(['oi' + i, 'oi' + i + 'i'], 'grow', d + 250, 500, { from: 0.3 }); an('ot' + i, 'fade', d + 350, 500);
  });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 1010, 600, 34, { fontSize: P(20), color: H.soft, align: 'right' }); an('by', 'fade', 15000, 500);

