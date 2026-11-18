  // ======== OPTION P · "SPARROW AND FOX, HOLOGRAPHIC": the same story on clean holographic slides
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const gi = require('react-icons/gi');
  const M8 = { moon: '67E8F9', sp: '22D3EE', fox: 'F472B6', red: 'FB7185', ink: 'E2E8F0', soft: 'A5B4FC', card: '0B1026', edge: '3B4A8C' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  const SPW = await icon(gi.GiSparrow, M8.sp), FOXI = await icon(gi.GiFoxHead, M8.fox);
  {
    let lines = ''; for (let x = 0; x <= 1920; x += 60) lines += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#67E8F9" stroke-opacity=".035"/>`;
    for (let y = 0; y <= 1080; y += 60) lines += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#67E8F9" stroke-opacity=".035"/>`;
    let scan = ''; for (let y = 0; y < 1080; y += 4) scan += `<rect y="${y}" width="1920" height="1" fill="#fff" opacity=".015"/>`;
    const blob = (id, c, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#${c}" stop-opacity="${op}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blob('a', '22D3EE', '.1', '.12', '.55', '.26')}${blob('b', 'C084FC', '.92', '.18', '.55', '.24')}${blob('c', '6366F1', '.5', '1.05', '.6', '.32')}</defs><rect width="1920" height="1080" fill="#050816"/><rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#c)"/>${lines}${scan}</svg>`)).png().toFile(A_DIR + 'holo2_bg.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1664" height="8"><defs><linearGradient id="g"><stop offset="0" stop-color="#22D3EE"/><stop offset=".5" stop-color="#A78BFA"/><stop offset="1" stop-color="#F472B6"/></linearGradient></defs><rect width="1664" height="8" rx="4" fill="url(#g)"/></svg>`)).png().toFile(A_DIR + 'holo2_bar.png');
  }
  const NIGHT = A_DIR + 'holo2_bg.png';
  const hbar = (n, y, d) => { imgp(n, A_DIR + 'holo2_bar.png', 128, y, 460, 6, ''); an(n, 'wipe', d, 900); };
  const kick = (n, t, x, y, w, col = M8.moon) => text(n, t, x, y, w, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: col, charSpacing: 3 });
  const ncard = (n, x, y, w, h, col) => rect(n, x, y, w, h, M8.card, { r: 0.08, trans: 12, line: col || '5B6CC4', lw: 1.75, glow: col || '6366F1', go: 0.45 });

  // =============================================================== O1. MEET SPARROW AND FOX (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Tonight's story has two characters. [Left.] Sparrow, a twenty-one-year-old student in Dhaka, with the same five apps on her phone as most of us. [Right.] And Fox, a hacker she has never met. Both are code names, but every step of their night happens to real students in Bangladesh.

[Chat.] It is eleven forty-seven at night. Sparrow gets a WhatsApp message from an unknown number: "Hi, it's your classmate. I sent a code to your number by mistake. Can you send it to me?"

It looks harmless, so she sends the code. [Red line.] Two minutes later, her phone says her number is no longer registered on this phone. Her WhatsApp now belongs to Fox.`), NIGHT, 'black');
  kick('k', 'A STORY BASED ON REAL SCAMS  ·  DHAKA, 11:47 PM', 128, 70, 1300);
  text('t', 'Five apps. One night.', 128, 106, 1300, 110, { fontSize: P(76), fontFace: FB, color: 'FFFFFF' });
  an('k', 'wipe', 300, 800); an('t', 'rise', 600, 900); hbar('hb1', 224, 1300);
  [['sp', SPW, 'SPARROW', '21-year-old student in Dhaka', 'Has WhatsApp, Gmail, Discord, Facebook and bKash on her phone.', M8.sp, 128, 1800], ['fx', FOXI, 'FOX', 'A hacker she has never met', 'Needs only one thing from her tonight: a 6-digit code.', M8.fox, 1360, 4200]].forEach(([p, ic, nm, who, b, col, x, d]) => {
    ncard(p + 'c', x, 270, 432, 620, col);
    oval(p + 'o', x + 116, 310, 200, 200, '050816', { line: col, lw: 3, glow: col, go: 0.5 }); img(p + 'i', ic, x + 151, 345, 130, 130, nm);
    text(p + 'n', [{ text: nm, options: { fontFace: FB, fontSize: P(48), color: col, breakLine: true } }, { text: who, options: { fontFace: FH, fontSize: P(27), color: 'FFFFFF', breakLine: true } }, { text: b, options: { fontSize: P(23), color: M8.soft } }], x + 36, 540, 360, 330, { align: 'center' });
    an(p + 'c', 'rise', d, 700); all([p + 'o', p + 'i'], 'grow', d + 300, 600, { from: 0.3 }); an(p + 'n', 'fade', d + 600, 700);
  });
  rect('ch', 620, 270, 680, 620, 'ECE5DD', { r: 0.06 }); rect('chh', 620, 270, 680, 96, '075E54', { r: 0.06 }); rect('chh2', 620, 320, 680, 46, '075E54');
  oval('cav', 644, 286, 64, 64, 'CBD5E1'); text('cavq', '?', 644, 286, 64, 64, { fontSize: P(36), fontFace: FB, color: '475569', align: 'center', valign: 'middle' });
  text('chn', [{ text: '+880 1712-•••512', options: { fontFace: FH, fontSize: P(26), color: 'FFFFFF', breakLine: true } }, { text: 'unknown number', options: { fontSize: P(18), color: 'C7F2E3' } }], 726, 282, 540, 72, { valign: 'middle' });
  all(['ch', 'chh', 'chh2', 'cav', 'cavq', 'chn'], 'fade', 7000, 700);
  stext('m1', [{ text: 'Hi, it’s your classmate. I sent a code to your number by mistake. Can you send it to me?', options: { color: '111B21', breakLine: true } }, { text: '11:47 PM', options: { color: '667781', fontSize: P(17) } }], 650, 396, 460, 190, 'FFFFFF', { r: 0.08, pad: 18, valign: 'top', extra: { fontSize: P(25) } });
  an('m1', 'grow', 8000, 500, { from: 0.4 });
  stext('m2', [{ text: '482 913', options: { color: '111B21', fontFace: FH, breakLine: true } }, { text: '11:48 PM  ✓✓', options: { color: '667781', fontSize: P(17) } }], 1060, 610, 210, 90, 'D9FDD3', { r: 0.14, pad: 16, valign: 'top', extra: { fontSize: P(28) } });
  an('m2', 'grow', 14500, 400, { from: 0.4 });
  stext('m3', '11:49 PM · Your number is no longer registered on this phone.', 650, 740, 620, 110, '3B0D12', { r: 0.1, pad: 18, align: 'center', line: M8.red, lw: 1.5, extra: { fontSize: P(24), color: 'FECACA', fontFace: FH } });
  an('m3', 'rise', 18000, 700); an('m3', 'pulse', 19000, 900, { scale: 102 });
  text('fn', 'Sparrow and Fox are code names. Every step of their night happens to real students in Bangladesh.', 128, 918, 1664, 36, { fontSize: P(21), italic: true, color: M8.soft, align: 'center' });
  an('fn', 'fade', 6000, 600);

  // =============================================================== O2. THE NIGHT, MINUTE BY MINUTE (Ahnaf)
  slide(SN('ahnaf', 70, `And that was only the first door. Here is how Sparrow's night unfolded, through the same five apps we will test today. [Follow the timeline left to right.]

Eleven forty-nine: she shares the code, and Fox takes her WhatsApp.

Eleven fifty-eight: using her WhatsApp, Fox messages her aunt as Sparrow: "Urgent, please send five thousand taka on bKash." Her aunt sends it.

Twelve twenty: a fake "copyright violation" page steals her password, and she uses the same password for Gmail. Fox now has her master key.

Twelve thirty-five: from her Gmail, Fox resets her Facebook password and changes her recovery details. She is locked out.

Twelve fifty: Fox signs in to her Discord and posts fake "free Nitro" links in her class server.

[Bottom row.] And this is not just a story. In the Cyber Crime Awareness Foundation's 2024 study, hacking was the most common cybercrime. Fifty-nine percent of victims were women, almost seventy-nine percent were aged eighteen to thirty, and only twelve percent went to the police.`), NIGHT, 'fade');
  kick('k2', 'THE NIGHT, MINUTE BY MINUTE', 128, 70, 1000);
  text('t2', 'One code. Five doors. One hour.', 128, 106, 1600, 100, { fontSize: P(66), fontFace: FB, color: 'FFFFFF' });
  an('k2', 'wipe', 200, 700); an('t2', 'rise', 500, 800); hbar('hb2', 214, 1100);
  line('tl', 150, 560, 1770, 560, M8.moon, { lw: 3 }); an('tl', 'wipe', 1500, 2500);
  [['wa', '11:49 PM', 'WhatsApp', 'She shares the code. Fox takes her account.', 'ACCOUNT TAKEN'],
   ['bk', '11:58 PM', 'bKash', 'Fox messages her aunt as Sparrow: “Urgent, send Tk 5,000.”', 'MONEY SENT'],
   ['gm', '12:20 AM', 'Gmail', 'A fake “copyright” page steals the password she also uses for Gmail.', 'MASTER KEY STOLEN'],
   ['fb', '12:35 AM', 'Facebook', 'Fox resets her password from Gmail and changes the recovery details.', 'LOCKED OUT'],
   ['dc', '12:50 AM', 'Discord', 'Fox signs in and posts fake “free Nitro” links in her class server.', 'SCAM LINKS SENT']].forEach(([k, t, app, b, st], i) => {
    const cx = 250 + i * 355, up = i % 2 === 0, w = 470, x = Math.max(128, Math.min(cx - w / 2, 1792 - w)), y = up ? 236 : 604, h = 290, d = [3500, 8500, 13500, 19000, 24000][i];
    oval('nd' + i, cx - 20, 540, 40, 40, M8.moon, { line: '050816', lw: 3, glow: M8.moon, go: 0.8 });
    line('nl' + i, cx, up ? y + h : 580, cx, up ? 540 : y, M8.moon, { lw: 1.5, dash: 'dash' });
    ncard('c' + i, x, y, w, h, M8.edge);
    appIcon('ci' + i, k, x + 26, y + 26, 72);
    text('ct' + i, [{ text: t, options: { fontFace: FB, fontSize: P(32), color: M8.moon, breakLine: true } }, { text: app, options: { fontFace: FH, fontSize: P(24), color: 'FFFFFF' } }], x + 114, y + 22, 330, 84, { valign: 'middle' });
    text('cb' + i, b, x + 26, y + 116, w - 52, 100, { fontSize: P(24), color: M8.ink });
    stext('cs' + i, st, x + 26, y + h - 64, w - 52, 44, '2A0A1E', { r: 0.3, align: 'center', line: M8.red, lw: 1.2, extra: { fontFace: MONO, bold: true, fontSize: P(19), color: 'FECACA', charSpacing: 2 } });
    an('nd' + i, 'grow', d, 400, { from: 0.2 }); an('nl' + i, up ? 'wipeU' : 'wipeD', d + 200, 400); an('c' + i, up ? 'drop' : 'rise', d + 300, 600);
    all(['ci' + i, 'ci' + i + 'i'], 'grow', d + 500, 400, { from: 0.3 }); an('ct' + i, 'fade', d + 600, 500); an('cb' + i, 'fade', d + 800, 600); an('cs' + i, 'grow', d + 1500, 400, { from: 1.4 });
  });
  rect('sb', 128, 916, 1664, 96, M8.card, { r: 0.3, trans: 10, line: 'C084FC', lw: 1.5, glow: 'C084FC', go: 0.4 });
  text('sbt', [{ text: 'NOT JUST A STORY  ', options: { fontFace: MONO, bold: true, color: M8.moon, fontSize: P(20) } }, { text: 'Hacking was the most common cybercrime: ', options: { color: 'FFFFFF' } }, { text: '59%', options: { fontFace: FB, color: M8.sp } }, { text: ' of victims women, ', options: { color: 'FFFFFF' } }, { text: '78.8%', options: { fontFace: FB, color: M8.sp } }, { text: ' aged 18–30, only ', options: { color: 'FFFFFF' } }, { text: '12%', options: { fontFace: FB, color: M8.red } }, { text: ' went to the police.', options: { color: 'FFFFFF' } }],
    160, 916, 1600, 60, { fontSize: P(25), valign: 'middle' });
  text('sbs', 'Cyber Crime Awareness Foundation, 2024 study', 160, 968, 1600, 34, { fontSize: P(17), color: M8.soft });
  an('sb', 'fade', 29500, 600); an('sbt', 'fade', 29800, 800); an('sbs', 'fade', 30300, 500);

  // =============================================================== O3. FIVE DOORS, FIVE INVESTIGATORS (Ahnaf)
  slide(SN('ahnaf', 60, `So what went wrong that night? [Headline.] Nobody broke the lock. Sparrow opened every door herself, one message at a time.

[Question.] That gives us our two questions. How strong are the locks on these five apps? And why did they still fail?

[Doors.] Each of us will open one door. Marzia Rahman takes WhatsApp, where the night began. Tanvir Ahmed Siddique takes Gmail, the master key. Jesmin Naher Sweety takes Discord. Abdullah Al Mamun takes Facebook. And Md. Masum Billah takes bKash, and will show the final scores.

[Bottom.] Every app is tested on seven locks, each scored zero, one or two: fourteen points in total. Marzia, open the first door.`), NIGHT, 'fade');
  kick('k3', 'WHAT WENT WRONG', 128, 70, 1000);
  text('h1', 'Nobody broke the lock.', 128, 106, 1500, 120, { fontSize: P(92), fontFace: FB, color: 'FFFFFF' });
  text('h2', 'Sparrow opened every door herself, one message at a time.', 128, 232, 1500, 60, { fontSize: P(36), fontFace: FH, color: M8.fox });
  an('k3', 'wipe', 200, 700); an('h1', 'rise', 500, 900); an('h2', 'fade', 2500, 800); hbar('hb3', 300, 2900);
  stext('q', [{ text: 'OUR QUESTION   ', options: { fontFace: MONO, bold: true, fontSize: P(21), color: M8.moon } }, { text: 'How strong are the locks on these five apps, and why did they still fail?', options: { fontFace: FH, fontSize: P(32), color: 'FFFFFF' } }],
    128, 322, 1664, 100, M8.card, { r: 0.3, pad: 30, line: M8.sp, lw: 1.5, glow: M8.sp, go: 0.4 });
  an('q', 'rise', 5500, 700);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 341, y = 470, d = 9500 + 900 * i, col = k === 'gm' ? 'EA4335' : APPS[k].c;
    rect('dr' + i, x, y, 300, 430, M8.card, { r: 0.12, trans: 10, line: col, lw: 2.5, glow: col, go: 0.55 });
    text('dn' + i, 'DOOR ' + (i + 1), x, y + 22, 300, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: M8.moon, align: 'center', charSpacing: 3 });
    appIcon('di' + i, k, x + 95, y + 70, 110);
    oval('dk' + i, x + 252, y + 236, 22, 22, M8.moon);
    text('dt' + i, [{ text: APPS[k].n, options: { fontFace: FB, fontSize: P(34), color: 'FFFFFF', breakLine: true } }, { text: ROLE[k], options: { fontFace: FH, fontSize: P(21), color: M8.ink, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(19), color: M8.soft } }], x + 20, y + 200, 230, 210, { align: 'center', valign: 'middle' });
    an('dr' + i, 'rise', d, 600); an('dn' + i, 'fade', d + 200, 400); all(['di' + i, 'di' + i + 'i'], 'grow', d + 300, 500, { from: 0.3 }); an('dk' + i, 'grow', d + 500, 300, { from: 0.2 }); an('dt' + i, 'fade', d + 500, 500);
  });
  text('m', [{ text: '7 locks', options: { fontFace: FH, color: 'FFFFFF' } }, { text: '  ·  0, 1 or 2 points each  ·  ', options: { color: M8.soft } }, { text: 'scored out of 14', options: { fontFace: FH, color: 'FFFFFF' } }], 128, 930, 1100, 50, { fontSize: P(28) });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 930, 600, 50, { fontSize: P(22), color: M8.soft, align: 'right' });
  an('m', 'fade', 14500, 700); an('by', 'fade', 15000, 500);

