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

  // =============================================================== Q1. THE BREACHES (Ahnaf)
  slide(SN('ahnaf', 40, `[Pause. Hold up your phone.] Good morning. Look at the phone in your pocket. Every app on it has already leaked.

[Chart, top to bottom.] WhatsApp: a flaw let researchers check three and a half billion accounts. Facebook: five hundred and thirty-three million users' phone numbers and birth dates posted online. Gmail: a hundred and eighty-three million email logins stolen by malware. bKash: eighty-one thousand fraud cases in Bangladesh's payment system in a single year. Discord: seventy thousand government ID photos exposed.

[Right panel.] Phone numbers. Passwords. ID cards. Money. [Pause.] Even the companies leak.`), SB, 'black');
  kick('k1', 'THE BREACHES  ·  FIVE APPS, ONE POCKET', 128, 70, 1200);
  head('h1', 'Every app in your pocket has already leaked.');
  glass('cp', 128, 250, 1080, 736, Z.vi);
  lab('cpl', 'SCALE OF EACH APP’S BIGGEST RECENT INCIDENT  ·  LOG SCALE', 176, 284, 1000, Z.vi);
  an('cp', 'fade', 1000, 700); an('cpl', 'fade', 1300, 400);
  const LX = 470, LW = 690, lg = v => LX + (Math.log10(v) - 4) / 6 * LW;
  ['10K', '100K', '1M', '10M', '100M', '1B', '10B'].forEach((t, i) => {
    const x = LX + i * LW / 6;
    line('g' + i, x, 336, x, 900, Z.hair, { lw: 0.75, dash: 'dash' }); text('gt' + i, t, x - 50, 906, 100, 30, { fontSize: P(17), fontFace: MONO, color: Z.dim, align: 'center' });
    an('g' + i, 'fade', 1600, 500); an('gt' + i, 'fade', 1600, 500);
  });
  [['wa', 3.5e9, '3.5 billion', 'accounts identifiable through a lookup flaw (2025, now fixed)', Z.cy],
   ['fb', 5.33e8, '533 million', 'users’ phone numbers, names and birth dates posted online', Z.vi],
   ['gm', 1.83e8, '183 million', 'email logins stolen by malware, many of them Gmail (2025)', Z.vi],
   ['bk', 81423, '81,423', 'fraud cases in Bangladesh’s mobile, card and cheque payments (2025)', Z.ro],
   ['dc', 70000, '70,000', 'government ID photos exposed through a support vendor (2025)', Z.ro]].forEach(([k, v, val, t, col], i) => {
    const y = 350 + i * 108, d = 3000 + 3400 * i, w = lg(v) - LX;
    appIcon('ai' + i, k, 176, y + 6, 64);
    text('an' + i, APPS[k].n, 252, y, 210, 34, { fontSize: P(25), fontFace: FH, color: Z.wh });
    text('av' + i, val, 252, y + 36, 210, 40, { fontSize: P(28), fontFace: LT, color: col });
    rect('ab' + i, LX, y + 12, w, 24, col, { r: 0.5, trans: 10, glow: col, go: 0.55 });
    text('at' + i, t, LX, y + 44, LW, 40, { fontSize: P(18), color: Z.sl });
    all(['ai' + i, 'ai' + i + 'i'], 'grow', d, 400, { from: 0.3 }); an('an' + i, 'fade', d + 100, 400); an('ab' + i, 'wipe', d + 300, 1000); an('av' + i, 'fade', d + 900, 500); an('at' + i, 'fade', d + 1100, 500);
  });
  text('cps', 'Sources: Univ. of Vienna/SecurityWeek · Irish DPC (€265m fine) · Have I Been Pwned · Bangladesh Bank · Discord', 176, 946, 1000, 28, { fontSize: P(15), color: Z.dim }); an('cps', 'fade', 19500, 500);
  glass('wp', 1240, 250, 552, 736, Z.ro);
  lab('wpl', 'WHAT GOT OUT', 1288, 284, 480, Z.ro); an('wp', 'fade', 19000, 700); an('wpl', 'fade', 19300, 400);
  [['phone', 'Phone numbers', 'WhatsApp · Facebook'], ['user', 'Names and birth dates', 'Facebook'], ['key', 'Email passwords', 'Gmail'], ['finger', 'Government ID photos', 'Discord'], ['money', 'Money', 'bKash']].forEach(([ic, h, s], i) => {
    const y = 336 + i * 104, d = 20000 + 700 * i;
    oval('wo' + i, 1288, y, 68, 68, '141B3A', { line: Z.ro, lw: 1.5, glow: Z.ro, go: 0.4 }); img('wi' + i, I[ic], 1308, y + 20, 28, 28, h);
    text('wt' + i, [{ text: h, options: { fontFace: FH, fontSize: P(25), color: Z.wh, breakLine: true } }, { text: s, options: { fontSize: P(18), color: Z.dim } }], 1376, y - 2, 390, 76, { valign: 'middle' });
    all(['wo' + i, 'wi' + i], 'grow', d, 400, { from: 0.3 }); an('wt' + i, 'fade', d + 200, 500);
  });
  text('wq', 'Even the companies leak.', 1288, 880, 480, 60, { fontSize: P(34), fontFace: FH, italic: true, color: Z.cy }); an('wq', 'fade', 24500, 900);

  // =============================================================== Q2. THE SCAMS (Ahnaf)
  slide(SN('ahnaf', 45, `And then the scammers use it. [Cards, left to right.] WhatsApp banned six point eight million scam accounts in just six months. Gmail blocks ninety-nine point nine percent of phishing, but the rest still lands in two and a half billion inboxes. In Bangladesh, social media account hacking is the number one cybercrime. And bKash, with eighty-two million customers, sits in a payment system that lost ninety-two crore taka to fraud last year.

[Bottom.] Worldwide: four hundred and forty-two billion dollars lost to scams in a year. And the victims? Four in five are eighteen to thirty. Only one in eight goes to the police. [Pause.] That is us.`), SB, 'fade');
  kick('k2', 'THE SCAMS  ·  WHERE THE MONEY GOES', 128, 70, 1200);
  head('h2', 'And then the scammers use it, app by app.');
  [['wa', '6.8 million', 'scam accounts banned in six months', 'Linked to scam centres · Meta, Jan–Jun 2025', Z.cy],
   ['gm', '99.9%', 'of spam and phishing blocked', 'The rest still reaches 2.5 billion users · Google', Z.vi],
   ['fb', 'No. 1', 'cybercrime in Bangladesh: social media account hacking', '21.65% of cases · CCAF 2024', Z.vi],
   ['bk', 'Tk 92.6 crore', 'lost to digital payment fraud in 2025', '82 million bKash customers at stake · Bangladesh Bank', Z.ro]].forEach(([k, v, t, s, col], i) => {
    const x = 128 + i * 424, d = 1500 + 3500 * i;
    glass('m' + i, x, 236, 392, 420, k === 'gm' ? 'EA4335' : APPS[k].c, { r: 0.06, go: 0.35 });
    appIcon('mi' + i, k, x + 28, 262, 60);
    text('mn' + i, APPS[k].n, x + 102, 262, 260, 60, { fontSize: P(25), fontFace: FH, color: Z.wh, valign: 'middle' });
    text('mv' + i, v, x + 26, 344, 350, 84, { fontSize: P(v.length > 8 ? 50 : 66), fontFace: LT, color: col, valign: 'middle' });
    text('mt' + i, t, x + 28, 436, 340, 100, { fontSize: P(25), fontFace: FH, color: Z.wh });
    line('ml' + i, x + 28, 560, x + 364, 560, Z.hair, { lw: 1 });
    text('ms' + i, s, x + 28, 572, 340, 70, { fontSize: P(18), color: Z.sl });
    an('m' + i, 'rise', d, 700); all(['mi' + i, 'mi' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('mn' + i, 'fade', d + 350, 400);
    an('mv' + i, 'grow', d + 600, 700, { from: 0.7 }); an('mt' + i, 'fade', d + 1000, 600); an('ml' + i, 'wipe', d + 1300, 400); an('ms' + i, 'fade', d + 1500, 500);
  });
  glass('wb', 128, 690, 1664, 296, Z.cy, { r: 0.08 });
  lab('wbl', 'WORLDWIDE  ·  12 MONTHS', 176, 720, 600, Z.cy);
  text('wbv', [{ text: '$442', options: { fontFace: LT, fontSize: P(130), color: Z.wh } }, { text: ' billion', options: { fontFace: LT, fontSize: P(52), color: Z.cy } }], 168, 752, 760, 170, { valign: 'middle' });
  text('wbt', 'lost to scams · ≈ $14,000 every second · Global Anti-Scam Alliance 2025', 176, 922, 760, 34, { fontSize: P(19), color: Z.sl });
  an('wb', 'fade', 16500, 700); an('wbl', 'fade', 16800, 400); an('wbv', 'grow', 17200, 900, { from: 0.85 }); an('wbt', 'fade', 17900, 500);
  line('wdv', 980, 724, 980, 952, Z.hair, { lw: 1 }); an('wdv', 'fade', 20000, 400);
  lab('vl', 'VICTIMS IN BANGLADESH  ·  CCAF 2024', 1030, 720, 740, Z.vi); an('vl', 'fade', 20200, 400);
  [['Aged 18–30', 78.78, '78.8%', Z.cy], ['Went to the police', 12, '12%', Z.ro]].forEach(([k, v, s, col], i) => {
    const y = 770 + i * 84, d = 21000 + 1800 * i;
    text('vk' + i, k, 1030, y, 420, 34, { fontSize: P(24), color: Z.wh });
    text('vv' + i, s, 1600, y, 144, 34, { fontSize: P(28), fontFace: FH, color: col, align: 'right' });
    rect('vt' + i, 1030, y + 44, 714, 12, '1E2547', { r: 0.5 }); rect('vf' + i, 1030, y + 44, 714 * v / 100, 12, col, { r: 0.5, glow: col, go: 0.6 });
    an('vk' + i, 'fade', d, 400); an('vt' + i, 'fade', d, 400); an('vf' + i, 'wipe', d + 200, 900); an('vv' + i, 'fade', d + 800, 400);
  });
  text('us', 'Eighteen to thirty. That is us.', 1030, 932, 740, 40, { fontSize: P(26), fontFace: FH, italic: true, color: Z.cy }); an('us', 'fade', 25500, 900);

  // =============================================================== Q3. THE STORIES BEHIND THE NUMBERS (Ahnaf)
  slide(SN('ahnaf', 40, `Behind every number, a real story. [Cards.] A Telegram "job" that took ninety-four lakh taka. A WhatsApp message from the NBR chairman: thirty-five thousand taka, right now. It was not him. Fifty Facebook accounts hacked through Messenger links. One OTP call that emptied an actor's bKash.

[Statement.] No lock was broken. The door was opened from the inside.

[Bottom row.] So we test five apps: WhatsApp, Gmail, Discord, Facebook and bKash. How strong are their locks, and why do they still fail? Marzia, over to you.`), SB, 'fade');
  kick('k3', 'THE STORIES BEHIND THE NUMBERS', 128, 70, 1200);
  head('h3', 'Four real cases. Four apps. One trick.');
  [['tg', 'AUG 2025', 'Tk 94 lakh', 'A “part-time job” on Telegram. Deposit after deposit, until a lifetime of savings was gone.', 'A fake job', 'Dhaka Tribune · bdnews24'],
   ['wa', 'SEPT 2025', 'Tk 35,000', 'The NBR chairman asks for money on bKash, “right now”. It was not him.', 'A hijacked account', 'NBR · bdnews24'],
   ['fb', 'OCT 2024', '50+ accounts', 'Links on Messenger. Accounts taken over, at least 15 people blackmailed.', 'A link', 'CID · Banglanews24'],
   ['bk', 'DB CASE', '1 phone call', 'Actor Dighi’s bKash emptied after a call asking for her OTP. Tk 1.62 lakh recovered.', 'An OTP request', 'DB · TBS']].forEach(([k, dt, amt, b, how, src], i) => {
    const x = 128 + i * 424, d = [1200, 4500, 8500, 12000][i], col = [Z.ro, Z.cy, Z.vi, Z.ro][i];
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
  an('st', 'fade', 15500, 900);
  text('qq', [{ text: 'OUR QUESTION  ', options: { fontFace: MONO, bold: true, fontSize: P(19), color: Z.cy } }, { text: 'How strong are the locks on the five apps in our pocket, and why do they still fail?', options: { color: Z.sl } }], 128, 752, 1664, 40, { fontSize: P(24), align: 'center' });
  an('qq', 'fade', 19000, 600);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 338, d = 20000 + 400 * i;
    glass('lt' + i, x, 810, 314, 150, k === 'gm' ? 'EA4335' : APPS[k].c, { r: 0.12, go: 0.35 });
    appIcon('li' + i, k, x + 20, 853, 64);
    text('ln' + i, [{ text: APPS[k].n, options: { fontFace: FH, fontSize: P(28), color: Z.wh, breakLine: true } }, { text: ROLE[k], options: { fontSize: P(16), color: Z.sl, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(16), color: Z.dim } }], x + 96, 818, 214, 134, { valign: 'middle' });
    an('lt' + i, 'rise', d, 500); all(['li' + i, 'li' + i + 'i'], 'grow', d + 200, 400, { from: 0.3 }); an('ln' + i, 'fade', d + 300, 400);
  });
  text('ru', '7 locks  ·  0, 1 or 2 points each  ·  scored out of 14', 128, 984, 1100, 34, { fontSize: P(20), color: Z.dim });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 984, 600, 34, { fontSize: P(20), color: Z.dim, align: 'right' });
  an('ru', 'fade', 22500, 500); an('by', 'fade', 22700, 500);

