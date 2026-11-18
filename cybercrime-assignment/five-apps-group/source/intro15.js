  // ======== OPTION K · "TERMINAL": the introduction as a security analyst's console
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const T = { g: '4ADE80', gd: '166534', a: 'FBBF24', r: 'F87171', w: 'E5E7EB', d: '6B7280', win: '0B110D', bar: '15201A' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let scan = ''; for (let y = 0; y < 1080; y += 3) scan += `<rect y="${y}" width="1920" height="1" fill="#000" opacity=".22"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#0E1A12"/><stop offset="1" stop-color="#020403"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#v)"/>${scan}</svg>`)).png().toFile(A_DIR + 'term_bg.png');
  }
  const TB = A_DIR + 'term_bg.png';
  const win = (n, title, x, y, w, h, d) => {
    rect(n, x, y, w, h, T.win, { r: 0.02, line: '1F3A28', lw: 1.5, glow: T.g, go: 0.18 });
    rect(n + 'b', x, y, w, 52, T.bar, { r: 0.02 });
    ['F87171', 'FBBF24', '4ADE80'].forEach((c, i) => oval(n + 'd' + i, x + 22 + i * 30, y + 16, 20, 20, c));
    text(n + 't', title, x, y, w, 52, { fontSize: P(20), fontFace: MONO, color: T.d, align: 'center', valign: 'middle' });
    all([n, n + 'b', n + 'd0', n + 'd1', n + 'd2', n + 't'], 'fade', d, 600);
  };
  // one console line; typed letter by letter
  const ln = (n, runs, x, y, d, o = {}) => {
    text(n, runs, x, y, o.w || 1600, o.h || 46, { fontSize: P(o.fs || 28), fontFace: MONO, color: T.w, valign: 'middle' });
    an(n, o.e || 'type', d, o.t || 25);
  };
  const tg = (t, c = T.g, b = false) => ({ text: t, options: { color: c, bold: b } });

  // =============================================================== K1. CASE 001 (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let us open a case file, the way a security analyst would.

[First lines.] Case one: Dhaka, September 2025, three-sixteen in the afternoon. A journalist gets a WhatsApp message.

[From.] The sender is the chairman of the National Board of Revenue, the head of the country's tax office.

[Message.] It says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Verify.] Now we check the sender. [Red lines.] It was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), TB, 'black');
  win('w', 'case_001 — whatsapp — analyst@mccj525', 128, 90, 1664, 900, 200);
  const X = 172;
  ln('a1', [tg('$ ', T.g, true), tg('open case_001 --city Dhaka --date 2025-09', T.w)], X, 176, 1000);
  ln('a2', [tg('[15:16] ', T.d), tg('incoming WhatsApp message', T.g)], X, 246, 3500);
  ln('a3', [tg('  from:    ', T.d), tg('"NBR Chairman"', T.a), tg('   # head of the country’s tax office', T.d)], X, 300, 6500);
  ln('a4', [tg('  message: ', T.d), tg('"I need Tk 35,000 on my bKash right now.', T.w)], X, 354, 9500);
  ln('a5', [tg('           ', T.d), tg(' I’ll return it tomorrow."', T.w)], X, 400, 11500);
  ln('a6', [tg('$ ', T.g, true), tg('verify --sender', T.w)], X, 486, 15000);
  ln('a7', [tg('  checking identity', T.d), tg(' .......... ', T.d), tg('FAILED', T.r, true)], X, 540, 16500);
  rect('al', 172, 626, 1576, 220, '2A0E0E', { r: 0.04, line: T.r, lw: 2, glow: T.r, go: 0.35 });
  text('alt', [{ text: 'ALERT  ', options: { fontFace: MONO, bold: true, fontSize: P(30), color: T.r } }, { text: 'It was not him.\n', options: { fontFace: FB, fontSize: P(72), color: 'FFFFFF' } }, { text: 'Status: ACCOUNT HIJACKED  ·  NBR public warning, 24 Sept 2025', options: { fontFace: MONO, fontSize: P(26), color: 'FCA5A5' } }],
    212, 626, 1500, 220, { valign: 'middle' });
  an('al', 'grow', 19500, 500, { from: 0.9 }); an('alt', 'fade', 19700, 700); an('al', 'pulse', 20800, 900, { scale: 101 });
  ln('a8', [tg('$ ', T.g, true), tg('_', T.g, true)], X, 890, 21500, { e: 'fade', t: 300 }); an('a8', 'pulse', 22000, 600, { scale: 104 });
  text('src', 'source: bdnews24 · message translated from Bangla', 1092, 940, 656, 34, { fontSize: P(18), fontFace: MONO, color: T.d, align: 'right' }); an('src', 'fade', 21000, 500);

  // =============================================================== K2. INCIDENT LOG (Ahnaf)
  slide(SN('ahnaf', 65, `Now let us open the incident log. [Table.] Three real cases, three apps.

[Row one.] WhatsApp: the chairman's account, hijacked and used to ask people for money.

[Row two.] Facebook, 2024: a student sent links on Messenger, took over more than fifty accounts, and, according to the CID, blackmailed at least fifteen people.

[Row three.] bKash: the actor Dighi got one call about a "blocked account". The caller asked for her OTP, and her account was emptied. Police later recovered one lakh sixty-two thousand taka.

[Count.] And the national count: in 2025, Bangladesh Bank recorded eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards. Ninety-two point six crore taka lost.`), TB, 'fade');
  win('w2', 'incident_log.csv — 3 rows', 128, 90, 1664, 900, 200);
  ln('b1', [tg('$ ', T.g, true), tg('cat incident_log.csv', T.w)], X, 176, 900);
  const COLS = [[172, 120, 'ID'], [300, 290, 'APP'], [600, 420, 'THE BAIT'], [1030, 470, 'WHAT HAPPENED'], [1510, 240, 'SOURCE']];
  COLS.forEach(([x, w, h], j) => { text('bh' + j, h, x, 244, w, 40, { fontSize: P(22), fontFace: MONO, bold: true, color: T.a }); an('bh' + j, 'fade', 2200, 400); });
  line('bhl', 172, 292, 1748, 292, '1F3A28', { lw: 1.5 }); an('bhl', 'wipe', 2300, 600);
  [['001', 'wa', 'a trusted name', 'hijacked account asks for money', 'NBR, 2025'], ['002', 'fb', 'a link on Messenger', '50+ accounts taken, 15+ blackmailed', 'CID, 2024'], ['003', 'bk', 'a call for the OTP', 'bKash emptied; Tk 1.62 lakh recovered', 'DB, TBS']].forEach(([id, k, b, w, s], i) => {
    const y = 312 + i * 118, d = [4000, 8500, 14500][i];
    rect('br' + i, 160, y, 1600, 100, i % 2 ? T.win : '0F1912', { r: 0.03 });
    text('b0' + i, id, 172, y, 120, 100, { fontSize: P(26), fontFace: MONO, color: T.d, valign: 'middle' });
    appIcon('bi' + i, k, 300, y + 22, 56);
    text('b1' + i, APPS[k].n, 372, y, 220, 100, { fontSize: P(28), fontFace: MONO, bold: true, color: T.g, valign: 'middle' });
    text('b2' + i, b, 600, y, 420, 100, { fontSize: P(26), fontFace: MONO, color: T.w, valign: 'middle' });
    text('b3' + i, w, 1030, y, 470, 100, { fontSize: P(26), fontFace: MONO, color: T.w, valign: 'middle' });
    text('b4' + i, s, 1510, y, 240, 100, { fontSize: P(22), fontFace: MONO, color: T.d, valign: 'middle' });
    an('br' + i, 'fade', d, 300); an('b0' + i, 'fade', d, 300); all(['bi' + i, 'bi' + i + 'i'], 'fade', d + 100, 300);
    ['b1', 'b2', 'b3', 'b4'].forEach((p, j) => an(p + i, 'type', d + 150 + 250 * j, 18));
  });
  ln('b5', [tg('$ ', T.g, true), tg('count fraud_cases --country BD --year 2025', T.w)], X, 690, 20000);
  text('bn', [{ text: '81,423', options: { fontFace: FB, fontSize: P(110), color: T.g } }, { text: '   cases  ·  Tk 92.6 crore lost', options: { fontFace: MONO, fontSize: P(34), color: T.w } }], X, 750, 1560, 150, { valign: 'middle' });
  text('bns', 'source: Bangladesh Bank, via Daily Observer (mobile banking, cheques and cards)', X, 900, 1560, 40, { fontSize: P(20), fontFace: MONO, color: T.d });
  an('bn', 'grow', 22000, 700, { from: 0.7 }); an('bns', 'fade', 22600, 500);

  // =============================================================== K3. RUN THE AUDIT (Ahnaf)
  slide(SN('ahnaf', 60, `So what does the log tell us? [Finding.] Nobody broke the lock. In every case, a person was tricked into opening it.

[Question.] That is why we are running this audit. Our question: how strong are the locks on the apps in our pocket, and why do they still fail?

[Audit queue.] Five apps are in the queue, each with an analyst. WhatsApp, Marzia Rahman. Gmail, Tanvir Ahmed Siddique. Discord, Jesmin Naher Sweety. Facebook, Abdullah Al Mamun. And bKash, Md. Masum Billah, with the final scores.

[Rules.] Seven locks per app, each scored zero, one or two: fourteen points in total. Marzia, start the audit.`), TB, 'fade');
  win('w3', 'audit.sh — 5 apps queued', 128, 90, 1664, 900, 200);
  ln('c1', [tg('> finding: ', T.a, true), tg('no lock was broken. the owner was tricked into opening it.', T.w)], X, 176, 1000, { fs: 30 });
  ln('c2', [tg('> question: ', T.a, true), tg('how strong are the locks, and why do they still fail?', T.w)], X, 236, 6000, { fs: 30 });
  ln('c3', [tg('$ ', T.g, true), tg('run audit --apps 5 --locks 7 --score 0-2 --max 14', T.w)], X, 320, 9500);
  FIVE.forEach((k, i) => {
    const y = 396 + i * 104, d = 11500 + 1100 * i;
    rect('cr' + i, 160, y, 1600, 88, '0F1912', { r: 0.05, line: '1F3A28', lw: 1 });
    text('cn' + i, '[' + (i + 1) + '/5]', 184, y, 120, 88, { fontSize: P(26), fontFace: MONO, color: T.d, valign: 'middle' });
    appIcon('ci' + i, k, 310, y + 16, 56);
    text('ca' + i, APPS[k].n.toLowerCase(), 386, y, 300, 88, { fontSize: P(30), fontFace: MONO, bold: true, color: T.g, valign: 'middle' });
    text('cp' + i, [tg('analyst: ', T.d), tg(ROLE[k], T.w), tg('  (' + ROLL[k] + ')', T.d)], 700, y, 760, 88, { fontSize: P(26), fontFace: MONO, valign: 'middle' });
    stext('cs' + i, i ? 'QUEUED' : 'NEXT', 1560, y + 20, 170, 48, i ? null : T.gd, { r: 0.2, align: 'center', line: i ? T.d : T.g, lw: 1.5, extra: { fontFace: MONO, bold: true, fontSize: P(22), color: i ? T.d : 'FFFFFF' } });
    an('cr' + i, 'fade', d, 300); an('cn' + i, 'fade', d, 300); all(['ci' + i, 'ci' + i + 'i'], 'fade', d + 100, 300); an('ca' + i, 'type', d + 150, 25); an('cp' + i, 'type', d + 400, 15); an('cs' + i, 'grow', d + 800, 300, { from: 0.4 });
  });
  an('cs0', 'pulse', 18000, 700, { scale: 108 });
  ln('c4', [tg('$ ', T.g, true), tg('_', T.g, true)], X, 924, 17500, { e: 'fade', t: 300 });
  text('by', 'introduction: ahnaf akif (24)', 1092, 924, 656, 46, { fontSize: P(20), fontFace: MONO, color: T.d, align: 'right', valign: 'middle' }); an('by', 'fade', 17800, 500);

