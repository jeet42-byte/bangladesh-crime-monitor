  // ======== OPTION Q2 · "THE STAKES ONLINE": online scams, hacking and personal data breaches
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const Z = { cy: '5EEAD4', vi: 'A78BFA', ro: 'F472B6', wh: 'F8FAFC', sl: 'CBD5E1', dim: '8B93B8', glass: '0A1024', hair: '2B3566' };
  const LT = 'Segoe UI Light';
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let grid = ''; for (let x = 0; x <= 1920; x += 80) grid += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#A5B4FC" stroke-opacity=".028"/>`;
    for (let y = 0; y <= 1080; y += 80) grid += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#A5B4FC" stroke-opacity=".028"/>`;
    const blob = (id, c, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#${c}" stop-opacity="${op}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blob('a', '5EEAD4', '.95', '0', '.5', '.16')}${blob('b', 'A78BFA', '.75', '.1', '.55', '.18')}${blob('c', 'F472B6', '1', '.45', '.4', '.12')}${blob('d', '312E81', '.1', '1', '.7', '.45')}<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs><rect width="1920" height="1080" fill="#04060F"/><rect width="1920" height="1080" fill="url(#d)"/><rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#c)"/>${grid}<rect width="1920" height="1080" fill="url(#v)"/></svg>`)).png().toFile(A_DIR + 'stakes_bg.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1664" height="6"><defs><linearGradient id="g"><stop offset="0" stop-color="#5EEAD4"/><stop offset=".5" stop-color="#A78BFA"/><stop offset="1" stop-color="#F472B6"/></linearGradient></defs><rect width="1664" height="6" rx="3" fill="url(#g)"/></svg>`)).png().toFile(A_DIR + 'stakes_bar.png');
  }
  const SB = A_DIR + 'stakes_bg.png';
  const kick = (n, t, x, y, w, col = Z.cy, d = 200) => { text(n, t, x, y, w, 32, { fontSize: P(21), fontFace: MONO, bold: true, color: col, charSpacing: 4 }); an(n, 'wipe', d, 800); };
  const head = (n, t, d = 500) => { text(n, t, 128, 108, 1664, 90, { fontSize: P(56), fontFace: FH, color: Z.wh }); an(n, 'rise', d, 900); imgp(n + 'b', A_DIR + 'stakes_bar.png', 128, 200, 360, 5, ''); an(n + 'b', 'wipe', d + 800, 900); };
  const glass = (n, x, y, w, h, col = '6366F1', o = {}) => rect(n, x, y, w, h, Z.glass, { r: o.r == null ? 0.05 : o.r, trans: 12, line: o.line || Z.hair, lw: 1.25, glow: col, go: o.go || 0.28 });
  const lab = (n, t, x, y, w, col = Z.dim) => text(n, t, x, y, w, 30, { fontSize: P(19), fontFace: MONO, bold: true, color: col, charSpacing: 3 });

  // =============================================================== Q1. THE STAKES (Ahnaf)
  slide(SN('ahnaf', 60, `[Pause before you speak. Look at the audience.] Good morning. Before we begin, look at the clock.

[Pause.] In the three minutes of this introduction, while I am speaking, about two and a half million US dollars will be lost to scams around the world.

[Big number.] In just twelve months, people lost an estimated four hundred and forty-two billion dollars to scams: fake messages, fake websites, fake investments, fake calls. That is about fourteen thousand dollars every second.

[Rings.] More than half of all adults faced a scam. Almost one in four lost money.

[Bottom row, slowly.] Every minute: more than eight hundred thousand dollars. Every hour: fifty million. Every day: more than a billion.

[Pause.] So the real question is not whether this can happen to us. It is when.`), SB, 'black');
  kick('k1', 'THE STAKES  ·  WHAT ONLINE SCAMS COST', 128, 70, 1200);
  head('h1', 'Every second, someone loses money to an online scam.');
  glass('p1', 128, 250, 1010, 560, Z.cy);
  lab('p1l', 'LOST TO SCAMS IN 12 MONTHS  ·  ONLINE, SMS AND CALLS', 176, 286, 940, Z.cy);
  text('big', [{ text: '$442', options: { fontFace: LT, fontSize: P(210), color: Z.wh } }, { text: ' billion', options: { fontFace: LT, fontSize: P(76), color: Z.cy } }], 160, 318, 960, 260, { valign: 'middle' });
  text('sec', [{ text: '≈ $14,000 ', options: { fontFace: FH, color: Z.ro } }, { text: 'every second', options: { color: Z.wh } }], 176, 590, 900, 64, { fontSize: P(40) });
  text('now', 'In the three minutes of this introduction: about $2.5 million.', 176, 662, 900, 44, { fontSize: P(26), color: Z.sl, italic: true });
  text('s1', 'Global Anti-Scam Alliance, Global State of Scams 2025 (estimate)', 176, 752, 900, 30, { fontSize: P(17), color: Z.dim });
  an('p1', 'fade', 1400, 800); an('p1l', 'fade', 1800, 500); an('big', 'grow', 4200, 1200, { from: 0.85 }); an('sec', 'fade', 8500, 900); an('now', 'fade', 2000, 900); an('s1', 'fade', 9000, 500);
  glass('p2', 1170, 250, 622, 560, Z.vi);
  lab('p2l', 'ADULTS, LAST 12 MONTHS', 1218, 286, 560, Z.vi);
  an('p2', 'fade', 11500, 800); an('p2l', 'fade', 11800, 400);
  await donut('d1', 57, 100, Z.cy, 1226, 340, 240, 12300, { label: '57%', sub: 'faced a scam', fs: 0.2, track: '1E2547', vc: Z.wh, sc: Z.sl, subfs: 20 });
  await donut('d2', 23, 100, Z.ro, 1500, 340, 240, 13600, { label: '23%', sub: 'lost money', fs: 0.2, track: '1E2547', vc: Z.wh, sc: Z.sl, subfs: 20 });
  text('p2t', [{ text: 'More than half faced a scam. ', options: { color: Z.wh } }, { text: 'Almost one in four lost money.', options: { color: Z.ro } }], 1218, 620, 540, 120, { fontSize: P(28), fontFace: FH });
  an('p2t', 'fade', 15000, 800);
  [['1 SECOND', '$14,000'], ['1 MINUTE', '$840,000'], ['1 HOUR', '$50 million'], ['1 DAY', '$1.2 billion']].forEach(([k, v], i) => {
    const x = 128 + i * 424, d = 17500 + 1400 * i;
    glass('t' + i, x, 846, 392, 140, i === 3 ? Z.ro : '6366F1', { r: 0.12, go: i === 3 ? 0.5 : 0.25 });
    lab('tk' + i, k, x + 32, 868, 330, i === 3 ? Z.ro : Z.dim);
    text('tv' + i, v, x + 32, 900, 340, 70, { fontSize: P(46), fontFace: LT, color: Z.wh });
    an('t' + i, 'rise', d, 600); an('tk' + i, 'fade', d + 200, 400); an('tv' + i, 'fade', d + 300, 600);
  });
  an('t3', 'pulse', 23500, 1400, { scale: 102 });

  // =============================================================== Q2. THE CURVE (Ahnaf)
  slide(SN('ahnaf', 75, `And it is getting worse. [Chart, bar by bar.] Every year, the FBI counts the internet crime losses that people report. In 2020: four point two billion dollars. Then six point nine. Ten point three. Twelve point five. Sixteen point six. [Last bar.] And in 2025: twenty point nine billion. Five times more in five years, and the line is still climbing.

[Right panel.] And it gets personal. The most common online crime is not a movie-style hack. It is phishing: a fake message or a fake login page. One hundred and ninety-one thousand reports in a single year. Personal data breaches, where someone's private information is stolen: sixty-seven thousand reports, and one point three billion dollars lost.

[Bangladesh.] Here at home, in July 2023, a government website exposed the names, phone numbers and NID numbers of around five crore citizens. Five crore people, whose data anyone could read.

[Bars.] And in the Cyber Crime Awareness Foundation's 2024 study, account hacking was the number one cybercrime. Almost seventy-nine percent of victims were aged eighteen to thirty, and only twelve percent went to the police.

[Pause. Look around the room.] Eighteen to thirty. That is us.`), SB, 'fade');
  kick('k2', 'THE CURVE IS CLIMBING  ·  AND IT GETS PERSONAL', 128, 70, 1400);
  head('h2', 'Online crime losses grew five times in five years.');
  glass('c', 128, 250, 1010, 736, Z.vi);
  lab('cl', 'FBI  ·  INTERNET CRIME LOSSES  ·  US$ BILLION', 176, 284, 940, Z.vi);
  an('c', 'fade', 1300, 700); an('cl', 'fade', 1600, 400);
  const YR = [['2020', 4.2], ['2021', 6.9], ['2022', 10.3], ['2023', 12.5], ['2024', 16.6], ['2025', 20.9]], BASE = 880, SC = 21.5;
  line('ax', 176, BASE, 1090, BASE, Z.hair, { lw: 1.5 }); an('ax', 'wipe', 2000, 600);
  const tops = [];
  YR.forEach(([y, v], i) => {
    const x = 210 + i * 146, h = v * SC, d = 3000 + 1700 * i, last = i === YR.length - 1;
    rect('b' + i, x, BASE - h, 96, h, last ? Z.ro : Z.vi, { trans: last ? 0 : 35, glow: last ? Z.ro : Z.vi, go: last ? 0.7 : 0.3 });
    text('bv' + i, '$' + v, x - 20, BASE - h - 52, 136, 44, { fontSize: P(last ? 32 : 26), fontFace: last ? FH : F, color: last ? Z.ro : Z.wh, align: 'center' });
    text('by' + i, y, x - 20, BASE + 12, 136, 36, { fontSize: P(22), fontFace: MONO, color: Z.dim, align: 'center' });
    an('b' + i, 'wipeU', d, 700); an('bv' + i, 'fade', d + 500, 400); an('by' + i, 'fade', d, 400);
    tops.push([x + 48, BASE - h]);
  });
  tops.slice(1).forEach(([x, y], i) => { line('tr' + i, tops[i][0], tops[i][1] - 70, x, y - 70, Z.ro, { lw: 2.5, dash: 'dash' }); an('tr' + i, 'fade', 13500 + 200 * i, 500); });
  stext('x5', '× 5 since 2020', 196, 336, 300, 64, null, { r: 0.4, align: 'center', line: Z.ro, lw: 2, extra: { fontFace: FH, fontSize: P(30), color: Z.ro } });
  an('x5', 'grow', 14800, 500, { from: 1.6 });
  text('cs', 'FBI Internet Crime Complaint Center (IC3), annual reports 2020–2025', 176, 940, 940, 30, { fontSize: P(17), color: Z.dim }); an('cs', 'fade', 15000, 500);
  glass('bd', 1170, 250, 622, 736, Z.cy);
  lab('bdl', 'IT GETS PERSONAL  ·  FBI 2025', 1218, 284, 560, Z.cy);
  [['191,561', 'phishing reports: the No. 1 online crime', Z.wh], ['67,456', 'personal data breaches: $1.31 billion lost', Z.ro]].forEach(([v, t, col], i) => {
    const y = 322 + i * 100, d = 17000 + 2600 * i;
    text('pv' + i, v, 1214, y, 300, 86, { fontSize: P(64), fontFace: LT, color: col, valign: 'middle' });
    text('pt' + i, t, 1500, y, 260, 86, { fontSize: P(21), color: Z.sl, valign: 'middle' });
    an('pv' + i, 'grow', d, 700, { from: 0.8 }); an('pt' + i, 'fade', d + 400, 600);
  });
  an('bd', 'fade', 16500, 700); an('bdl', 'fade', 16700, 400);
  line('bdline', 1218, 534, 1744, 534, Z.hair, { lw: 1 }); an('bdline', 'wipe', 22000, 500);
  lab('bnl', 'BANGLADESH', 1218, 552, 560, Z.vi); an('bnl', 'fade', 22300, 400);
  text('nid', '≈ 5 crore', 1214, 590, 300, 86, { fontSize: P(60), fontFace: LT, color: Z.wh, valign: 'middle' });
  text('nidt', 'citizens’ names, phones and NID numbers exposed online (July 2023)', 1500, 590, 270, 96, { fontSize: P(19), color: Z.sl, valign: 'middle' });
  an('nid', 'grow', 23000, 700, { from: 0.8 }); an('nidt', 'fade', 23400, 600);
  text('hk', [{ text: 'Account hacking: ', options: { fontFace: FH, color: Z.wh } }, { text: 'the No. 1 cybercrime (21.65%)', options: { color: Z.sl } }], 1218, 694, 540, 36, { fontSize: P(21) });
  an('hk', 'fade', 26500, 600);
  [['Victims aged 18–30', 78.78, '78.8%', Z.cy], ['Reported to the police', 12, '12%', Z.ro]].forEach(([k, v, s, col], i) => {
    const y = 744 + i * 80, d = 27500 + 1800 * i;
    text('vk' + i, k, 1218, y, 360, 34, { fontSize: P(22), color: Z.wh });
    text('vv' + i, s, 1600, y, 144, 34, { fontSize: P(25), fontFace: FH, color: col, align: 'right' });
    rect('vt' + i, 1218, y + 40, 526, 12, '1E2547', { r: 0.5 }); rect('vf' + i, 1218, y + 40, 526 * v / 100, 12, col, { r: 0.5, glow: col, go: 0.6 });
    an('vk' + i, 'fade', d, 400); an('vt' + i, 'fade', d, 400); an('vf' + i, 'wipe', d + 200, 900); an('vv' + i, 'fade', d + 800, 400);
  });
  text('srcs', 'FBI IC3 2025 · TechCrunch, Daily Star · CCAF 2024', 1218, 908, 540, 30, { fontSize: P(14), color: Z.dim });
  text('us', 'Eighteen to thirty. That is us.', 1218, 940, 540, 36, { fontSize: P(24), fontFace: FH, italic: true, color: Z.cy });
  an('srcs', 'fade', 31000, 400); an('us', 'fade', 31500, 900);

  // =============================================================== Q3. THE STORIES BEHIND THE NUMBERS (Ahnaf)
  slide(SN('ahnaf', 80, `Behind every number is a real person. [Card one.] August 2025. A man in Bangladesh answers a "part-time job" offer on Telegram. Deposit after deposit, to keep the job going. By the time he stops, ninety-four lakh taka is gone.

[Card two.] September 2025. A journalist gets a WhatsApp message from the chairman of the National Board of Revenue: "I need thirty-five thousand taka on my bKash, right now." [Pause.] It was not him. His account had been hacked.

[Card three.] In 2024, the CID arrested a student who sent links on Messenger, took over more than fifty Facebook accounts, and blackmailed at least fifteen people.

[Card four.] And the actor Dighi lost money from her bKash after one phone call that asked for her OTP.

[Statement.] In every one of these stories, no lock was broken. The door was opened from the inside.

[Bottom row.] So today we test five apps in our pocket. WhatsApp with Marzia, Gmail with Tanvir, Discord with Sweety, Facebook with Mamun, and bKash with Masum. Seven locks each, scored out of fourteen. Our question: how strong are the locks, and why do they still fail? Marzia, over to you.`), SB, 'fade');
  kick('k3', 'THE STORIES BEHIND THE NUMBERS', 128, 70, 1200);
  head('h3', 'Four real cases. Four apps. One trick.');
  [['tg', 'AUG 2025', 'Tk 94 lakh', 'A “part-time job” on Telegram. Deposit after deposit, until a lifetime of savings was gone.', 'A fake job', 'Dhaka Tribune · bdnews24'],
   ['wa', 'SEPT 2025', 'Tk 35,000', 'The NBR chairman asks for money on bKash, “right now”. It was not him.', 'A hijacked account', 'NBR · bdnews24'],
   ['fb', 'OCT 2024', '50+ accounts', 'Links on Messenger. Accounts taken over, at least 15 people blackmailed.', 'A link', 'CID · Banglanews24'],
   ['bk', 'DB CASE', '1 phone call', 'Actor Dighi’s bKash emptied after a call asking for her OTP. Tk 1.62 lakh recovered.', 'An OTP request', 'DB · TBS']].forEach(([k, dt, amt, b, how, src], i) => {
    const x = 128 + i * 424, d = [1800, 8500, 15500, 20500][i], col = [Z.ro, Z.cy, Z.vi, Z.ro][i];
    glass('sc' + i, x, 236, 392, 420, col, { r: 0.06, go: 0.35 });
    appIcon('si' + i, k, x + 28, 262, 64);
    text('sd' + i, dt, x + 110, 262, 252, 64, { fontSize: P(19), fontFace: MONO, bold: true, color: col, valign: 'middle', align: 'right', charSpacing: 2 });
    text('sa' + i, amt, x + 26, 340, 350, 80, { fontSize: P(52), fontFace: LT, color: Z.wh });
    text('sb' + i, b, x + 28, 426, 340, 140, { fontSize: P(22), color: Z.sl });
    line('sl' + i, x + 28, 578, x + 364, 578, Z.hair, { lw: 1 });
    text('sh' + i, [{ text: 'HOW  ', options: { fontFace: MONO, bold: true, fontSize: P(17), color: Z.dim } }, { text: how, options: { fontFace: FH, fontSize: P(23), color: col } }], x + 28, 588, 340, 34, {});
    text('ss' + i, src, x + 28, 620, 340, 26, { fontSize: P(15), color: Z.dim });
    an('sc' + i, 'rise', d, 700); all(['si' + i, 'si' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('sd' + i, 'fade', d + 400, 400);
    an('sa' + i, 'grow', d + 700, 700, { from: 0.7 }); an('sb' + i, 'fade', d + 1100, 700); an('sl' + i, 'wipe', d + 1500, 400); an('sh' + i, 'fade', d + 1700, 500); an('ss' + i, 'fade', d + 1900, 400);
  });
  text('st', [{ text: 'No lock was broken. ', options: { color: Z.wh } }, { text: 'Every door was opened from the inside.', options: { color: Z.ro } }], 128, 680, 1664, 60, { fontSize: P(38), fontFace: FH, align: 'center' });
  an('st', 'fade', 25500, 1000);
  text('qq', [{ text: 'OUR QUESTION  ', options: { fontFace: MONO, bold: true, fontSize: P(19), color: Z.cy } }, { text: 'How strong are the locks on the five apps in our pocket, and why do they still fail?', options: { color: Z.sl } }], 128, 752, 1664, 40, { fontSize: P(24), align: 'center' });
  an('qq', 'fade', 28000, 700);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 338, d = 29000 + 500 * i;
    glass('lt' + i, x, 810, 314, 150, k === 'gm' ? 'EA4335' : APPS[k].c, { r: 0.12, go: 0.35 });
    appIcon('li' + i, k, x + 20, 853, 64);
    text('ln' + i, [{ text: APPS[k].n, options: { fontFace: FH, fontSize: P(28), color: Z.wh, breakLine: true } }, { text: ROLE[k], options: { fontSize: P(16), color: Z.sl, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(16), color: Z.dim } }], x + 96, 818, 214, 134, { valign: 'middle' });
    an('lt' + i, 'rise', d, 500); all(['li' + i, 'li' + i + 'i'], 'grow', d + 200, 400, { from: 0.3 }); an('ln' + i, 'fade', d + 300, 400);
  });
  text('ru', '7 locks  ·  0, 1 or 2 points each  ·  scored out of 14', 128, 984, 1100, 34, { fontSize: P(20), color: Z.dim });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 984, 600, 34, { fontSize: P(20), color: Z.dim, align: 'right' });
  an('ru', 'fade', 32000, 500); an('by', 'fade', 32300, 500);

