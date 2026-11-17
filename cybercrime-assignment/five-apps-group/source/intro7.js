  // ======== OPTION D · "QUIZ": the introduction as a live audience quiz
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  {
    let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let dots = ''; for (let i = 0; i < 700; i++) dots += `<circle cx="${(rnd() * 1920) | 0}" cy="${(rnd() * 1080) | 0}" r="${(rnd() * 2 + 0.6).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.12).toFixed(2)}"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="s" cx=".5" cy="-.1" r="1.1"><stop offset="0" stop-color="#4338CA"/><stop offset=".55" stop-color="#1E1B4B"/><stop offset="1" stop-color="#0F0C29"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#s)"/>${dots}<rect y="1064" width="1920" height="16" fill="#FACC15"/></svg>`)).png().toFile(A_DIR + 'quiz_bg.png');
  }
  const QBG = A_DIR + 'quiz_bg.png';
  const Q = { y: 'FACC15', teal: '2DD4BF', pink: 'F472B6', card: '2A2766', ink: '1E1B4B', good: '22C55E', bad: 'EF4444' };

  // =============================================================== D1. RAISE YOUR HAND (Ahnaf)
  slide(SN('ahnaf', 60, `[Smile. Start with energy.] Good morning, everyone. Before we say anything about apps or security, we want you to do something. A thirty-second quiz. No phones needed, just your hands.

[Question one.] Raise your hand if you use the same password on more than one app. [Wait. Look around.] Thank you.

[Question two.] Raise your hand if you have never checked which devices are logged in to your accounts. [Wait.]

[Question three.] Raise your hand if a stranger has ever sent you a link, a prize or a request for a code. [Wait.] That is almost everyone.

[Yellow banner.] Now, last one. Keep your hand up if you are completely sure that all five of these apps on your phone are safe. [Pause. Most hands go down.]

That is exactly why we chose this topic. Our presentation is called "Five Apps, One Pocket".`), QBG, 'fade');
  text('k', 'MCCJ 525  ·  CYBERCRIMES AND SECURITY', 128, 64, 1000, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: Q.y, charSpacing: 3 });
  text('t', 'Five Apps, One Pocket', 128, 100, 1300, 120, { fontSize: P(88), fontFace: FB, color: 'FFFFFF' });
  text('st', 'Before we begin: a 30-second quiz. No phones, just hands.', 128, 222, 1300, 50, { fontSize: P(32), color: Q.teal });
  an('k', 'wipe', 200, 700); an('t', 'rise', 500, 900); an('st', 'fade', 1300, 700);
  oval('hc', 128, 340, 380, 380, Q.y, { glow: Q.y, go: 0.5 }); img('hi', I.raiseD, 228, 430, 180, 180, 'Raised hand');
  text('hl', 'RAISE YOUR HAND IF…', 98, 744, 440, 44, { fontSize: P(28), fontFace: FB, color: Q.y, align: 'center' });
  an('hc', 'grow', 2000, 700, { from: 0.2 }); an('hi', 'grow', 2100, 700, { from: 0.2 }); an('hl', 'fade', 2600, 500);
  an('hi', 'breathe', 3000, 1800, { dy: -0.01 });
  [['you use the same password on more than one app.', Q.pink], ['you have never checked which devices are logged in to your accounts.', Q.teal], ['a stranger has ever sent you a link, a prize or a request for a code.', 'A78BFA']].forEach(([q, col], i) => {
    const y = 330 + i * 160, d = 5000 + 6500 * i;
    rect('qc' + i, 600, y, 1192, 136, Q.card, { r: 0.16, line: col, lw: 2 });
    oval('qn' + i, 630, y + 24, 88, 88, col); text('qnt' + i, String(i + 1), 630, y + 24, 88, 88, { fontSize: P(44), fontFace: FB, color: Q.ink, align: 'center', valign: 'middle' });
    text('qt' + i, '…' + q, 748, y + 16, 1020, 104, { fontSize: P(32), fontFace: FH, color: 'FFFFFF', valign: 'middle' });
    an('qc' + i, 'slideR', d, 600); all(['qn' + i, 'qnt' + i], 'grow', d + 300, 500, { from: 0.2 }); an('qt' + i, 'fade', d + 400, 600);
  });
  stext('last', [{ text: 'Last one:  ', options: { fontFace: FB } }, { text: 'keep your hand up if you are sure all five apps on your phone are safe.', options: {} }],
    128, 850, 1664, 120, Q.y, { r: 0.18, pad: 30, extra: { fontSize: P(34), color: Q.ink, fontFace: FH } });
  an('last', 'rise', 24500, 800); an('last', 'pulse', 26000, 1200, { scale: 102 });

  // =============================================================== D2. REAL OR SCAM? (Ahnaf)
  slide(SN('ahnaf', 75, `Let us make it harder. Round zero, the warm-up: real or scam? Here are three messages, like the ones that arrive on our phones every week. We wrote them ourselves for this quiz.

[Card one.] Number one, from bKash: "Your account will be blocked today. To keep it active, share the OTP we just sent you." Hands up if you think this is real. [Wait.] [Stamp.] Scam. bKash will never ask for your OTP or your PIN. Anyone who asks for it is not bKash.

[Card two.] Number two, from Google: "New sign-in on a Windows device. If this was you, you don't need to do anything." Real or scam? [Wait.] [Stamp.] This one is real: it is a security alert, and it is one of the locks that protects you. But even here, check it inside your account, not through a link.

[Card three.] Number three, on Discord: "You've been gifted Nitro! Scan this QR code to claim it." [Wait.] [Stamp.] Scam. That QR code can log a stranger straight into your account.

[Banner.] Two scams out of three, and neither of them needed any hacking skill. They only needed us to say yes.`), QBG, 'fade');
  text('k2', 'ROUND 0  ·  WARM-UP', 128, 64, 800, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: Q.y, charSpacing: 3 });
  text('t2', 'Real or scam?', 128, 100, 1300, 110, { fontSize: P(80), fontFace: FB, color: 'FFFFFF' });
  an('k2', 'wipe', 200, 600); an('t2', 'grow', 500, 800, { from: 0.7 });
  [['bk', 'bKash', 'Your account will be blocked today. To keep it active, share the OTP we just sent you.', 'SCAM', Q.bad, 'bKash never asks for your OTP or PIN.'],
   ['gm', 'Google', 'Security alert: new sign-in on a Windows device. If this was you, you don’t need to do anything.', 'REAL', Q.good, 'A real alert, but check it in your account, not through a link.'],
   ['dc', 'Discord', 'You’ve been gifted Discord Nitro! Scan this QR code to claim it within 24 hours.', 'SCAM', Q.bad, 'The QR code logs a stranger into your account.']].forEach(([k, app, msg, v, col, why], i) => {
    const x = 128 + i * 572, d = 1500 + 600 * i, dv = [8500, 16000, 23500][i];
    rect('mc' + i, x, 250, 520, 380, 'FFFFFF', { r: 0.08, shadow: 20, so: 8, sop: 0.4 });
    appIcon('mi' + i, k, x + 30, 280, 72);
    text('ma' + i, [{ text: app, options: { fontFace: FH, color: '111111', breakLine: true } }, { text: 'now', options: { fontSize: P(19), color: '6B7280' } }], x + 120, 284, 360, 72, { fontSize: P(27) });
    text('mt' + i, msg, x + 30, 380, 460, 220, { fontSize: P(29), color: '1F2937' });
    oval('mn' + i, x + 440, 276, 52, 52, Q.y); text('mnt' + i, String(i + 1), x + 440, 276, 52, 52, { fontSize: P(26), fontFace: FB, color: Q.ink, align: 'center', valign: 'middle' });
    an('mc' + i, 'drop', d, 600); all(['mi' + i, 'mi' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('ma' + i, 'fade', d + 350, 400); an('mt' + i, 'fade', d + 450, 600); all(['mn' + i, 'mnt' + i], 'grow', d + 500, 400, { from: 0.2 });
    stext('mv' + i, v, x + 250, 520, 250, 92, 'FFFFFF', { r: 0.1, align: 'center', line: col, lw: 6, trans: 8, extra: { color: col, fontFace: FB, fontSize: P(54), charSpacing: 4, rotate: -8 } });
    text('mw' + i, why, x, 650, 520, 90, { fontSize: P(26), color: 'FFFFFF', fontFace: FH });
    an('mv' + i, 'grow', dv, 400, { from: 2 }); an('mw' + i, 'fade', dv + 500, 600);
  });
  stext('two', [{ text: '2 out of 3 were scams.  ', options: { fontFace: FB, color: Q.ink } }, { text: 'Neither needed any hacking skill. They only needed us to say yes.', options: { color: Q.ink } }],
    128, 800, 1664, 110, Q.y, { r: 0.18, pad: 30, extra: { fontSize: P(32) } });
  an('two', 'rise', 27500, 800);
  text('fn', 'Example messages written by our group for this quiz.', 128, 960, 1000, 30, { fontSize: P(19), italic: true, color: 'A5B4FC' }); an('fn', 'fade', 2600, 500);

  // =============================================================== D3. FIVE ROUNDS, SEVEN LOCKS (Ahnaf)
  slide(SN('ahnaf', 60, `So today we turn the quiz around, and put the apps to the test. Five rounds, one for each app: WhatsApp, Gmail, Discord, Facebook and bKash.

[Locks.] Each app is tested on the same seven locks from our course rubric: login protection, encryption, account monitoring, recovery, scam and abuse protection, privacy controls and usability. Each lock scores zero, one or two points, so the best possible score is fourteen.

[Scoreboard.] For now, every score is a question mark. Each presenter will reveal one, and Masum will show the final table at the end. So keep count, and see if you can guess the winner.

Round one: Marzia Rahman, with WhatsApp.`), QBG, 'fade');
  text('k3', 'TODAY’S GAME', 128, 64, 800, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: Q.y, charSpacing: 3 });
  text('t3', 'Five rounds. Seven locks. One winner?', 128, 100, 1664, 100, { fontSize: P(66), fontFace: FB, color: 'FFFFFF' });
  an('k3', 'wipe', 200, 600); an('t3', 'rise', 500, 800);
  CS.forEach((c, i) => {
    const x = 128 + i * 240, d = 1800 + 200 * i;
    rect('lk' + i, x, 236, 224, 120, Q.card, { r: 0.2, line: '4F46E5', lw: 1.5 });
    oval('lo' + i, x + 82, 248, 60, 60, Q.teal); img('li' + i, I[CI[i] + 'D'], x + 98, 264, 28, 28);
    text('ll' + i, c, x, 312, 224, 36, { fontSize: P(22), fontFace: FH, color: 'FFFFFF', align: 'center' });
    an('lk' + i, 'grow', d, 500, { from: 0.5 }); all(['lo' + i, 'li' + i], 'grow', d + 200, 400, { from: 0.2 }); an('ll' + i, 'fade', d + 300, 400);
  });
  text('pts', '0, 1 or 2 points per lock  ·  14 points maximum', 128, 368, 1664, 40, { fontSize: P(26), color: Q.teal, align: 'center' }); an('pts', 'fade', 3600, 600);
  FIVE.forEach((k, i) => {
    const y = 430 + i * 106, d = 5200 + 500 * i;
    rect('rw' + i, 128, y, 1664, 92, i % 2 ? '242160' : Q.card, { r: 0.2 });
    text('rn' + i, 'ROUND ' + (i + 1), 160, y, 200, 92, { fontSize: P(24), fontFace: MONO, bold: true, color: Q.y, valign: 'middle' });
    appIcon('ri' + i, k, 370, y + 13, 66);
    text('ra' + i, APPS[k].n, 460, y, 380, 92, { fontSize: P(36), fontFace: FB, color: 'FFFFFF', valign: 'middle' });
    text('rp' + i, ROLE[k] + '  ·  Roll ' + { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' }[k], 860, y, 640, 92, { fontSize: P(27), color: 'C7D2FE', valign: 'middle' });
    stext('rs' + i, '? / 14', 1560, y + 14, 200, 64, null, { r: 0.3, align: 'center', line: Q.y, lw: 2.5, extra: { color: Q.y, fontFace: FB, fontSize: P(32) } });
    an('rw' + i, 'slide', d, 600); an('rn' + i, 'fade', d + 200, 400); all(['ri' + i, 'ri' + i + 'i'], 'grow', d + 250, 400, { from: 0.3 }); an('ra' + i, 'fade', d + 300, 400); an('rp' + i, 'fade', d + 400, 400);
    an('rs' + i, 'grow', d + 500, 400, { from: 0.3 }); an('rs' + i, 'pulse', 9000 + 150 * i, 700, { scale: 110 });
  });
  text('host', 'Quiz host: Ahnaf Akif, Roll 24', 1092, 970, 700, 40, { fontSize: P(22), color: 'A5B4FC', align: 'right' }); an('host', 'fade', 8000, 500);

