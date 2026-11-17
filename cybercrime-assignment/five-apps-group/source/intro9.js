  // ======== OPTION F · "BIG NUMBERS": a Swiss-style typographic introduction
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const W = { bg: 'F7F6F2', ink: '111111', red: 'E10600', grey: '6B6B6B', rule: 'D4D2CC' };
  const kick = (n, t, x, y, w, col = W.red) => text(n, t, x, y, w, 32, { fontSize: P(21), fontFace: F, bold: true, color: col, charSpacing: 3 });
  const rule = (n, x, y, w, d, col = W.ink, lw = 3) => { line(n, x, y, x + w, y, col, { lw }); an(n, 'wipe', d, 700); };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };

  // =============================================================== F1. 5 · 1 · 0 (Ahnaf)
  slide(SN('ahnaf', 55, `[Let each line land. Short pauses.] Five apps. [Pause.] One pocket. [Pause.] Zero second thoughts.

Good morning, everyone. I am Ahnaf Akif. Every day we open WhatsApp, Gmail, Discord, Facebook and bKash dozens of times, without thinking even once about how they are protected.

[Bottom line.] Our presentation, "Five Apps, One Pocket", asks one simple question: how strong are the locks on the apps we trust with our messages, our accounts and our money?

[Team.] We are six presenters. I will introduce the topic, and then Marzia, Tanvir, Sweety, Mamun and Masum will each test one app.`), W.bg, 'fade');
  kick('k', 'MCCJ 525 · CYBERCRIMES AND SECURITY', 128, 64, 1000);
  rule('r0', 128, 104, 1664, 300);
  [['5', ' apps.', W.ink], ['1', ' pocket.', W.ink], ['0', ' second thoughts.', W.red]].forEach(([n, t, col], i) => {
    text('b' + i, [{ text: n, options: { color: W.red } }, { text: t, options: { color: col } }], 120, 120 + i * 172, 1480, 180, { fontSize: P(140), fontFace: FB });
    an('b' + i, 'rise', 800 + 1500 * i, 700);
  });
  FIVE.forEach((k, i) => { appIcon('ic' + i, k, 1692, 140 + i * 104, 88); all(['ic' + i, 'ic' + i + 'i'], 'grow', 4600 + 150 * i, 400, { from: 0.3 }); });
  rule('r1', 128, 680, 1664, 6200);
  text('q', [{ text: 'Five Apps, One Pocket.  ', options: { fontFace: FB, color: W.ink } }, { text: 'How strong are the locks on the apps we trust with our messages, our accounts and our money?', options: { color: W.grey } }],
    128, 700, 1664, 110, { fontSize: P(34) });
  an('q', 'fade', 6600, 800);
  [['Ahnaf Akif', '24', 'Introduction'], ['Marzia Rahman', '29', 'WhatsApp'], ['Tanvir Ahmed Siddique', '28', 'Gmail'], ['Jesmin Naher Sweety', '08', 'Discord'], ['Abdullah Al Mamun', '02', 'Facebook'], ['Md. Masum Billah', '18', 'bKash']].forEach(([n, r, p], i) => {
    const x = 128 + i * 280, d = 9000 + 150 * i;
    line('tl' + i, x, 860, x + 256, 860, i ? W.ink : W.red, { lw: 2 });
    text('tm' + i, [{ text: r, options: { fontFace: FB, fontSize: P(40), color: i ? W.ink : W.red, breakLine: true } }, { text: n, options: { fontFace: FH, fontSize: P(21), color: W.ink, breakLine: true } }, { text: p, options: { fontSize: P(19), color: W.grey } }], x, 872, 260, 150);
    an('tl' + i, 'wipe', d, 400); an('tm' + i, 'fade', d + 150, 500);
  });

  // =============================================================== F2. THE NUMBERS (Ahnaf)
  slide(SN('ahnaf', 70, `Why does this matter? Let the numbers speak.

[Top left.] Four hundred and forty-two billion US dollars: the estimated amount people around the world lost to scams in just twelve months.

[Top right.] Fifty-seven out of every hundred adults faced a scam in that time, and twenty-three lost money.

[Bottom left.] In the United States alone, the FBI recorded twenty point nine billion dollars in reported losses in 2025.

[Bottom right, slower.] And here at home: eighty-one thousand four hundred and twenty-three fraud incidents in Bangladesh's mobile financial services, cheques and cards in 2025. Ninety-two point six crore taka lost.

[Pause.] Behind almost every one of these numbers there is a phone, an app, and a person who trusted a message.`), W.bg, 'fade');
  kick('k2', 'WHY IT MATTERS', 128, 64, 1000); rule('r2', 128, 104, 1664, 200);
  [['$442B', 'lost to scams worldwide in 12 months (estimate)', 'Global Anti-Scam Alliance, 2025', W.ink, 128, 150],
   ['57 / 100', 'adults faced a scam in the same period; 23 lost money', 'Global Anti-Scam Alliance, 2025', W.ink, 992, 150],
   ['$20.9B', 'reported lost in the United States in 2025', 'FBI Internet Crime Complaint Center, 2025', W.ink, 128, 590],
   ['81,423', 'fraud incidents in Bangladesh’s MFS, cheque and card payments in 2025: Tk 92.6 crore lost', 'Bangladesh Bank, via Daily Observer', W.red, 992, 590]].forEach(([v, b, s, col, x, y], i) => {
    const d = 1200 + [0, 6000, 11500, 17000][i];
    line('nl' + i, x, y, x + 800, y, col, { lw: i === 3 ? 4 : 2 });
    text('nv' + i, v, x - 6, y + 14, 800, 190, { fontSize: P(150), fontFace: FB, color: col });
    text('nb' + i, b, x, y + 210, 760, 100, { fontSize: P(29), color: W.ink });
    text('ns' + i, s, x, y + 318, 760, 30, { fontSize: P(18), color: W.grey });
    an('nl' + i, 'wipe', d, 600); an('nv' + i, 'rise', d + 200, 700); an('nb' + i, 'fade', d + 700, 600); an('ns' + i, 'fade', d + 1000, 400);
  });

  // =============================================================== F3. THE QUESTION (Ahnaf)
  slide(SN('ahnaf', 65, `[Read the question slowly.] So this is our question. If these apps have such strong locks, why do people still lose their accounts, and their money?

[Method, left to right.] To answer it, we took five apps. We tested each one on the same seven locks from our course rubric: login protection, encryption, account monitoring, recovery, scam and abuse protection, privacy controls and usability. Each lock scores zero, one or two, so every app gets a mark out of fourteen.

[Order.] And here is the order. Marzia Rahman, WhatsApp. Tanvir Ahmed Siddique, Gmail. Jesmin Naher Sweety, Discord. Abdullah Al Mamun, Facebook. And Md. Masum Billah, bKash, with the final scores.

Marzia, over to you.`), W.bg, 'fade');
  kick('k3', 'OUR QUESTION', 128, 64, 1000); rule('r3', 128, 104, 1664, 200);
  text('qq', [{ text: 'If the locks are so strong, why do people ', options: { color: W.ink } }, { text: 'still', options: { color: W.red } }, { text: ' lose their accounts?', options: { color: W.ink } }],
    120, 130, 1680, 250, { fontSize: P(84), fontFace: FB });
  an('qq', 'rise', 600, 900);
  [['5', 'apps', FIVE.map(k => APPS[k].n).join(', ')], ['7', 'locks', 'login, encryption, monitoring, recovery, scam and abuse, privacy, usability'], ['14', 'points', '0, 1 or 2 per lock, from our course rubric']].forEach(([n, u, b], i) => {
    const x = 128 + i * 568, d = 5000 + 2200 * i;
    line('ml' + i, x, 420, x + 528, 420, W.ink, { lw: 2 });
    text('mv' + i, [{ text: n, options: { fontFace: FB, fontSize: P(110), color: W.red } }, { text: ' ' + u, options: { fontFace: FB, fontSize: P(44), color: W.ink } }], x - 4, 430, 540, 140);
    text('mb' + i, b, x, 580, 520, 90, { fontSize: P(26), color: W.grey });
    an('ml' + i, 'wipe', d, 500); an('mv' + i, 'rise', d + 200, 600); an('mb' + i, 'fade', d + 600, 500);
  });
  kick('ok', 'ORDER OF PRESENTATION', 128, 720, 1000, W.ink); an('ok', 'fade', 12500, 400);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 336, d = 13000 + 600 * i;
    line('ol' + i, x, 768, x + 312, 768, i ? W.rule : W.red, { lw: 3 });
    appIcon('oi' + i, k, x, 792, 72);
    text('ot' + i, [{ text: (i + 1) + '  ' + APPS[k].n, options: { fontFace: FB, fontSize: P(30), color: W.ink, breakLine: true } }, { text: ROLE[k], options: { fontFace: FH, fontSize: P(21), color: W.ink, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontSize: P(19), color: W.grey } }],
      x, 878, 320, 140);
    an('ol' + i, 'wipe', d, 400); all(['oi' + i, 'oi' + i + 'i'], 'grow', d + 150, 400, { from: 0.3 }); an('ot' + i, 'fade', d + 250, 500);
  });

