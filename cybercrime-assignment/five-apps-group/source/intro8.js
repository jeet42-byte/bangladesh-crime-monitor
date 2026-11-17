  // ======== OPTION E · "BLUEPRINT": the introduction as a technical drawing of our pocket
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  {
    let g = ''; for (let x = 0; x <= 1920; x += 40) g += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#BFDBFE" stroke-opacity="${x % 200 ? 0.05 : 0.12}" stroke-width="${x % 200 ? 1 : 1.5}"/>`;
    for (let y = 0; y <= 1080; y += 40) g += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#BFDBFE" stroke-opacity="${y % 200 ? 0.05 : 0.12}" stroke-width="${y % 200 ? 1 : 1.5}"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="b" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#174A85"/><stop offset="1" stop-color="#0A2647"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#b)"/>${g}<rect x="30" y="30" width="1860" height="1020" fill="none" stroke="#DBEAFE" stroke-opacity=".5" stroke-width="2"/></svg>`)).png().toFile(A_DIR + 'bp_bg.png');
  }
  const BP = A_DIR + 'bp_bg.png';
  const B = { line: 'DBEAFE', soft: '93C5FD', amber: 'FFB703', panel: '0E3260' };
  const tag = (n, t, x, y, w, col = B.amber, o = {}) => text(n, t, x, y, w, 32, Object.assign({ fontSize: P(21), fontFace: MONO, bold: true, color: col, charSpacing: 2 }, o));

  // =============================================================== E1. WHAT IS IN YOUR POCKET (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. I am Ahnaf Akif, and I will introduce our presentation: "Five Apps, One Pocket".

[Phone.] Let us start with a simple drawing: the phone in your pocket. Most of us carry the same five apps, and each one holds something different.

[Callouts, top to bottom.] WhatsApp holds our conversations: chats, voice notes, photos, family groups. Gmail holds the master key: if someone controls your email, they can reset the passwords of almost everything else. Discord holds our communities: classes, friends and servers. Facebook holds our identity: our name, our photos, our friends. And bKash holds our money, and moves it in seconds.

[Title block.] So this one small device is our post office, our ID card and our wallet, all in one. Today we ask: how well is each part locked?`), BP, 'fade');
  tag('k', 'DRAWING 01  ·  MCCJ 525 CYBERCRIMES AND SECURITY', 128, 64, 1200);
  text('t', 'Five Apps, One Pocket', 128, 96, 1300, 110, { fontSize: P(80), fontFace: FB, color: 'FFFFFF' });
  text('st', 'A technical drawing of what we carry every day.', 128, 204, 1300, 44, { fontSize: P(28), fontFace: MONO, color: B.soft });
  an('k', 'wipe', 200, 700); an('t', 'wipe', 500, 1000); an('st', 'fade', 1400, 700);
  rect('ph', 790, 280, 340, 740, null, { r: 0.14, line: B.line, lw: 3 }); rect('phs', 816, 330, 288, 640, null, { r: 0.04, line: B.soft, lw: 1 });
  rect('phn', 910, 296, 100, 18, null, { r: 0.5, line: B.line, lw: 1.5 });
  all(['ph', 'phs', 'phn'], 'wipeD', 1800, 1200);
  [['wa', 'A', 'Your conversations', 'chats, voice notes, photos, family groups', 'L'], ['gm', 'B', 'Your master key', 'it can reset almost every other password', 'R'],
   ['dc', 'C', 'Your communities', 'classes, friends, servers and files', 'L'], ['fb', 'D', 'Your identity', 'your name, photos, friends and pages', 'R'], ['bk', 'E', 'Your money', 'send, pay and cash out in seconds', 'L']].forEach(([k, l, h, b, side], i) => {
    const y = 350 + i * 122, d = 4200 + 2600 * i, cy = y + 50;
    appIcon('ai' + i, k, 910, y, 100);
    const L = side === 'L';
    line('cl' + i, L ? 700 : 1010, cy, L ? 910 : 1220, cy, B.line, { lw: 1.5 }); oval('cd' + i, L ? 692 : 1212, cy - 8, 16, 16, B.amber);
    tag('ct' + i, l + '  ·  ' + APPS[k].n.toUpperCase(), L ? 128 : 1240, cy - 54, 552, B.amber, { align: L ? 'right' : 'left' });
    text('cx' + i, [{ text: h, options: { fontFace: FH, fontSize: P(32), color: 'FFFFFF', breakLine: true } }, { text: b, options: { fontSize: P(23), color: B.soft } }], L ? 128 : 1240, cy - 20, 552, 84, { align: L ? 'right' : 'left' });
    all(['ai' + i, 'ai' + i + 'i'], 'grow', d, 500, { from: 0.3 }); an('cl' + i, L ? 'wipeR' : 'wipe', d + 300, 500); an('cd' + i, 'grow', d + 700, 300, { from: 0.2 });
    an('ct' + i, 'fade', d + 700, 400); an('cx' + i, 'fade', d + 800, 600);
  });
  stext('tb', [{ text: 'TITLE BLOCK\n', options: { fontFace: MONO, bold: true, fontSize: P(18), color: B.amber } }, { text: 'Post office + ID card + wallet = one device.\n', options: { fontFace: FH, fontSize: P(25), color: 'FFFFFF' } }, { text: 'Drawn by: Ahnaf · Marzia · Tanvir\nSweety · Mamun · Masum', options: { fontSize: P(18), color: B.soft } }],
    1240, 880, 552, 140, B.panel, { pad: 18, line: B.line, lw: 1.5, valign: 'top' });
  an('tb', 'wipeU', 18000, 800);

  // =============================================================== E2. TWO WAYS IN (Ahnaf)
  slide(SN('ahnaf', 70, `[Two doors.] Now, how does someone get into these apps? There are really only two ways in.

[Door one.] Door one: break the lock. Guess or steal the password, hijack a logged-in session, or install malware. That takes skill, time and luck, and the apps spend a lot of money making this door harder.

[Door two.] Door two: trick the owner. Ask for the OTP or the PIN. Send a fake login page. Promise a prize, a job or a refund. That takes one message, and the owner opens the door from the inside.

[Numbers.] And door two is wide open. Around the world, fifty-seven out of every hundred adults faced a scam in the last twelve months, and an estimated four hundred and forty-two billion dollars was lost. Here in Bangladesh, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud incidents in mobile financial services, cheques and cards in 2025, with ninety-two point six crore taka lost.

So in this presentation we look at both doors for every app.`), BP, 'fade');
  tag('k2', 'DRAWING 02  ·  POINTS OF ENTRY', 128, 64, 1200);
  text('t2', 'There are only two ways in.', 128, 96, 1600, 110, { fontSize: P(72), fontFace: FB, color: 'FFFFFF' });
  an('k2', 'wipe', 200, 600); an('t2', 'wipe', 500, 900);
  [['unlock', 'DOOR 1', 'Break the lock', ['Guess or steal the password', 'Hijack a logged-in session', 'Install malware'], 'Needs skill, time and luck.', B.line],
   ['user2', 'DOOR 2', 'Trick the owner', ['Ask for the OTP or PIN', 'Send a fake login page', 'Promise a prize, a job or a refund'], 'Needs one message.', B.amber]].forEach(([ic, dn, h, items, foot, col], i) => {
    const x = 128 + i * 852, d = 2000 + 6000 * i;
    rect('dp' + i, x, 240, 812, 480, B.panel, { line: col, lw: i ? 3 : 1.5 });
    oval('do' + i, x + 36, 272, 110, 110, null, { line: col, lw: 2.5 }); img('di' + i, I[ic], x + 66, 302, 50, 50);
    text('dh' + i, [{ text: dn + '\n', options: { fontFace: MONO, bold: true, fontSize: P(22), color: col } }, { text: h, options: { fontFace: FB, fontSize: P(48), color: 'FFFFFF' } }], x + 170, 270, 620, 120);
    items.forEach((it, j) => {
      text('dl' + i + j, [{ text: '—  ', options: { color: col } }, { text: it, options: { color: 'FFFFFF' } }], x + 40, 420 + j * 66, 740, 56, { fontSize: P(30) });
      an('dl' + i + j, 'fade', d + 1200 + 900 * j, 500);
    });
    text('df' + i, foot, x + 40, 640, 740, 50, { fontSize: P(28), fontFace: FH, italic: true, color: col });
    an('dp' + i, 'wipeD', d, 800); an('do' + i, 'grow', d + 400, 500, { from: 0.2 }); an('di' + i, 'grow', d + 450, 500, { from: 0.2 }); an('dh' + i, 'fade', d + 600, 600); an('df' + i, 'fade', d + 4200, 600);
  });
  an('dp1', 'pulse', 13000, 1200, { scale: 102 });
  [['57 / 100', 'adults faced a scam in 12 months', 'Global Anti-Scam Alliance, 2025'], ['$442B', 'lost to scams worldwide (estimate)', 'Global Anti-Scam Alliance, 2025'], ['81,423', 'fraud incidents in Bangladesh, 2025: Tk 92.6 crore lost', 'Bangladesh Bank, via Daily Observer']].forEach(([v, b, s], i) => {
    const x = 128 + i * 568, d = 15000 + 1800 * i;
    rect('sb' + i, x, 760, 528, 230, null, { line: B.soft, lw: 1, shape: pres.shapes.RECTANGLE });
    text('sv' + i, v, x + 28, 776, 480, 90, { fontSize: P(68), fontFace: FB, color: B.amber });
    text('sd' + i, b, x + 28, 870, 480, 70, { fontSize: P(24), color: 'FFFFFF' });
    text('ss' + i, s, x + 28, 946, 480, 30, { fontSize: P(17), fontFace: MONO, color: B.soft });
    an('sb' + i, 'wipe', d, 600); an('sv' + i, 'grow', d + 300, 600, { from: 0.5 }); an('sd' + i, 'fade', d + 500, 500); an('ss' + i, 'fade', d + 700, 400);
  });

  // =============================================================== E3. THE SEVEN LOCKS (Ahnaf)
  slide(SN('ahnaf', 60, `[Specification.] To compare the five apps fairly, we used one specification: seven locks from our course rubric.

[Each row.] Login protection: two-step sign-in, passkeys, strong passwords. Encryption: can anyone except you read your messages? Account monitoring: alerts and a list of logged-in devices. Recovery: can you get the account back if it is stolen? Scam and abuse protection: does the app warn you, or block fraud? Privacy controls: who can see you, find you and add you? And usability: can an ordinary user actually switch all of this on?

[Scale.] Each lock scores zero, one or two, so every app is marked out of fourteen.

[Test order.] We will test them in this order. Marzia Rahman starts with WhatsApp.`), BP, 'fade');
  tag('k3', 'DRAWING 03  ·  TEST SPECIFICATION', 128, 64, 1200);
  text('t3', 'Seven locks. One score out of 14.', 128, 96, 1600, 110, { fontSize: P(72), fontFace: FB, color: 'FFFFFF' });
  an('k3', 'wipe', 200, 600); an('t3', 'wipe', 500, 900);
  const DESC = ['Two-step sign-in, passkeys, strong passwords', 'Can anyone except you read the content?', 'Alerts and a list of logged-in devices', 'Can you get it back if it is stolen?', 'Does the app warn you or block fraud?', 'Who can see you, find you and add you?', 'Can an ordinary user switch it all on?'];
  CRIT.forEach((c, i) => {
    const y = 236 + i * 92, d = 1800 + 1600 * i;
    rect('cr' + i, 128, y, 1000, 82, i % 2 ? null : B.panel, { line: B.soft, lw: 0.75 });
    text('cn' + i, String(i + 1).padStart(2, '0'), 148, y, 70, 82, { fontSize: P(24), fontFace: MONO, bold: true, color: B.amber, valign: 'middle' });
    img('ci' + i, I[CI[i]], 222, y + 23, 36, 36);
    text('cc' + i, [{ text: c, options: { fontFace: FH, color: 'FFFFFF', breakLine: true } }, { text: DESC[i], options: { fontSize: P(21), color: B.soft } }], 284, y + 6, 830, 74, { fontSize: P(27), valign: 'middle' });
    an('cr' + i, 'wipe', d, 500); an('cn' + i, 'fade', d + 200, 300); an('ci' + i, 'grow', d + 200, 400, { from: 0.3 }); an('cc' + i, 'fade', d + 300, 500);
  });
  stext('sc', [{ text: 'SCALE   ', options: { fontFace: MONO, bold: true, color: B.amber } }, { text: '0 = weak    1 = partial    2 = strong    →  total out of 14', options: { color: 'FFFFFF' } }],
    128, 900, 1000, 70, null, { pad: 20, line: B.amber, lw: 2, extra: { fontSize: P(26) } });
  an('sc', 'wipe', 13500, 700);
  tag('to', 'TEST ORDER', 1220, 236, 560);
  an('to', 'fade', 15500, 500);
  FIVE.forEach((k, i) => {
    const y = 290 + i * 136, d = 16000 + 500 * i;
    rect('tr' + i, 1220, y, 572, 120, B.panel, { line: B.soft, lw: 0.75 });
    text('tn' + i, String(i + 1), 1240, y, 50, 120, { fontSize: P(40), fontFace: FB, color: B.amber, valign: 'middle' });
    appIcon('ti' + i, k, 1298, y + 22, 76);
    text('tt' + i, [{ text: APPS[k].n, options: { fontFace: FH, color: 'FFFFFF', breakLine: true } }, { text: ROLE[k] + ' · Roll ' + { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' }[k], options: { fontSize: P(21), color: B.soft } }], 1396, y + 14, 390, 92, { fontSize: P(30), valign: 'middle' });
    an('tr' + i, 'wipe', d, 500); an('tn' + i, 'fade', d + 200, 300); all(['ti' + i, 'ti' + i + 'i'], 'grow', d + 200, 400, { from: 0.3 }); an('tt' + i, 'fade', d + 300, 400);
  });

