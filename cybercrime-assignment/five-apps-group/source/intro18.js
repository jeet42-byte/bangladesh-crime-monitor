  // ======== OPTION N · "ARCADE": the introduction as a retro video game
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const A8 = { y: 'FDE047', p: 'F472B6', c: '22D3EE', g: '4ADE80', r: 'F87171', w: 'FFFFFF', box: '120A2A' };
  const PX = 'Impact';
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let st = ''; for (let i = 0; i < 160; i++) { const s = rnd() > 0.85 ? 6 : 3; st += `<rect x="${(rnd() * 1920) | 0}" y="${(rnd() * 760) | 0}" width="${s}" height="${s}" fill="#fff" opacity="${(rnd() * 0.6 + 0.2).toFixed(2)}"/>`; }
    let grid = ''; for (let i = -20; i <= 20; i++) grid += `<line x1="${960 + i * 40}" y1="760" x2="${960 + i * 220}" y2="1080" stroke="#F472B6" stroke-opacity=".45" stroke-width="2"/>`;
    for (let k = 0; k < 7; k++) { const y = 760 + Math.pow(k / 6, 1.8) * 320; grid += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#F472B6" stroke-opacity=".45" stroke-width="2"/>`; }
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B0620"/><stop offset=".7" stop-color="#2A0E4A"/><stop offset="1" stop-color="#3B0F4F"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#s)"/>${st}<rect y="760" width="1920" height="320" fill="#1A0630"/>${grid}</svg>`)).png().toFile(A_DIR + 'arcade_bg.png');
  }
  const AB = A_DIR + 'arcade_bg.png';
  const box = (n, x, y, w, h, col, d, o = {}) => {
    rect(n + 'o', x - 8, y - 8, w + 16, h + 16, col);
    rect(n, x, y, w, h, o.fill || A8.box, { line: A8.w, lw: 3 });
    if (d != null) { an(n + 'o', o.e || 'grow', d, 400, { from: 0.8 }); an(n, o.e || 'grow', d, 400, { from: 0.8 }); }
  };
  const hud = (n, items, d) => {
    items.forEach(([k, v], i) => { text(n + i, [{ text: k + ' ', options: { color: A8.p } }, { text: v, options: { color: A8.w } }], 128 + i * 560, 44, 540, 44, { fontSize: P(26), fontFace: MONO, bold: true }); an(n + i, 'fade', d + 150 * i, 300); });
  };
  const big = (n, t, y, col, d, fs = 96) => { text(n, t, 0, y, 1920, fs * 1.3, { fontSize: P(fs), fontFace: PX, color: col, align: 'center', charSpacing: 4 }); an(n, 'grow', d, 500, { from: 1.6 }); };

  // =============================================================== N1. LEVEL 1 (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let us play a game. [Title.] Level one: WhatsApp.

[HUD.] The player is a journalist in Dhaka. The time is three-sixteen in the afternoon, September 2025.

[Dialogue box.] A message arrives from the chairman of the National Board of Revenue, the head of the country's tax office. He says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Choices.] So, what do you choose? Send the money, or check first? [Wait for answers.]

[Red banner.] Here is the twist. It was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), AB, 'black');
  hud('hd', [['PLAYER', 'JOURNALIST'], ['TIME', '3:16 PM'], ['MAP', 'DHAKA · SEPT 2025']], 300);
  big('lv', 'LEVEL 1: WHATSAPP', 120, A8.y, 1000);
  text('ins', 'A TRUE STORY', 0, 262, 1920, 40, { fontSize: P(26), fontFace: MONO, bold: true, color: A8.c, align: 'center', charSpacing: 6 }); an('ins', 'fade', 1600, 400); an('ins', 'pulse', 2200, 700, { scale: 104 });
  box('db', 260, 340, 1400, 300, A8.c, 4500);
  oval('dav', 300, 380, 120, 120, A8.y, { line: A8.w, lw: 3 }); img('davi', I.user2D, 334, 410, 52, 58, '');
  text('dn', 'NBR CHAIRMAN', 450, 376, 900, 50, { fontSize: P(34), fontFace: PX, color: A8.y, charSpacing: 2 });
  text('dt', '“I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', 450, 432, 1160, 180, { fontSize: P(40), fontFace: MONO, bold: true, color: A8.w });
  all(['dav', 'davi'], 'grow', 4900, 400, { from: 0.3 }); an('dn', 'fade', 5000, 300); an('dt', 'type', 7000, 35);
  [['▶  SEND MONEY', A8.g], ['▶  CHECK FIRST', A8.c]].forEach(([t, col], i) => {
    stext('ch' + i, t, 460 + i * 520, 680, 480, 80, A8.box, { align: 'center', line: col, lw: 3, extra: { fontFace: PX, fontSize: P(40), color: col, charSpacing: 2 } });
    an('ch' + i, 'grow', 12500 + 300 * i, 300, { from: 0.6 });
  });
  an('ch0', 'pulse', 13400, 500, { scale: 105 });
  stext('tw', [{ text: 'PLOT TWIST:  ', options: { fontFace: PX, color: A8.y } }, { text: 'IT WAS NOT HIM. HIS WHATSAPP WAS HACKED.', options: { fontFace: PX, color: A8.w } }], 160, 820, 1600, 120, 'B91C1C', { align: 'center', line: A8.w, lw: 3, extra: { fontSize: P(42), charSpacing: 1 } });
  an('tw', 'grow', 18000, 400, { from: 1.4 });
  text('src', 'NBR statement, 24 Sept 2025 (bdnews24) · translated from Bangla', 0, 1000, 1920, 34, { fontSize: P(18), fontFace: MONO, color: 'C4B5FD', align: 'center' }); an('src', 'fade', 19000, 400);

  // =============================================================== N2. THE BOSSES (Ahnaf)
  slide(SN('ahnaf', 65, `And the game has more levels. [Boss cards.] Three bosses, three real cases.

[Boss one.] The Trusted Name, on WhatsApp: the chairman's account, hijacked and used to ask people for money.

[Boss two.] The Link, on Facebook: in 2024, a student sent links on Messenger, took over more than fifty accounts, and, the CID says, blackmailed at least fifteen people.

[Boss three.] The OTP Call, on bKash: the actor Dighi got a call about a "blocked account", gave her OTP, and her account was emptied. Police later recovered one lakh sixty-two thousand taka.

[Score counter.] And the scammers' score in Bangladesh in 2025: eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards. Ninety-two point six crore taka lost.`), AB, 'fade');
  big('t2', 'BOSS BATTLES', 70, A8.p, 300, 88);
  [['wa', 'THE TRUSTED NAME', 'A hijacked WhatsApp asks people for money.', 'NBR · 2025', A8.g],
   ['fb', 'THE LINK', 'Links on Messenger: 50+ accounts taken, 15+ people blackmailed.', 'CID · 2024', A8.c],
   ['bk', 'THE OTP CALL', 'One call, one OTP: bKash emptied. Tk 1.62 lakh recovered.', 'DB · TBS', A8.p]].forEach(([k, h, b, s, col], i) => {
    const x = 150 + i * 560, d = [2500, 7500, 14000][i];
    box('bb' + i, x, 240, 500, 480, col, d);
    text('bl' + i, 'BOSS ' + (i + 1), x + 30, 262, 200, 40, { fontSize: P(24), fontFace: MONO, bold: true, color: col }); an('bl' + i, 'fade', d + 200, 300);
    appIcon('bi' + i, k, x + 190, 300, 120); all(['bi' + i, 'bi' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 });
    text('bh' + i, h, x + 20, 440, 460, 70, { fontSize: P(36), fontFace: PX, color: A8.w, align: 'center', charSpacing: 2 }); an('bh' + i, 'fade', d + 500, 300);
    text('bt' + i, b, x + 36, 520, 428, 130, { fontSize: P(26), fontFace: MONO, bold: true, color: 'E9D5FF', align: 'center' }); an('bt' + i, 'fade', d + 700, 500);
    text('bs' + i, s, x + 36, 662, 428, 34, { fontSize: P(20), fontFace: MONO, color: col, align: 'center' }); an('bs' + i, 'fade', d + 900, 300);
  });
  box('sc', 400, 790, 1120, 160, A8.y, 21000);
  text('scl', 'SCAMMERS’ SCORE · BANGLADESH 2025', 420, 800, 1080, 40, { fontSize: P(22), fontFace: MONO, bold: true, color: A8.y, align: 'center', charSpacing: 2 }); an('scl', 'fade', 21300, 300);
  text('scv', [{ text: '81,423', options: { fontFace: PX, fontSize: P(76), color: A8.w } }, { text: '  CASES  ·  TK 92.6 CRORE', options: { fontFace: PX, fontSize: P(40), color: A8.y } }], 420, 836, 1080, 100, { align: 'center', valign: 'middle', charSpacing: 2 });
  an('scv', 'grow', 21600, 500, { from: 1.5 });
  text('scs', 'Bangladesh Bank, via Daily Observer: mobile banking, cheques and cards', 0, 1000, 1920, 34, { fontSize: P(18), fontFace: MONO, color: 'C4B5FD', align: 'center' }); an('scs', 'fade', 22200, 400);

  // =============================================================== N3. SELECT YOUR PLAYER (Ahnaf)
  slide(SN('ahnaf', 60, `So how do the bosses win? [Banner.] Nobody broke the lock. The player was tricked into opening it.

[Mission.] So here is our mission for today: how strong are the locks on the apps in our pocket, and why do they still fail?

[Players.] Choose your player. Level one, WhatsApp, with Marzia Rahman. Level two, Gmail, with Tanvir Ahmed Siddique. Level three, Discord, with Jesmin Naher Sweety. Level four, Facebook, with Abdullah Al Mamun. And the final level, bKash, with Md. Masum Billah, who will show the high scores.

[Rules.] Each app is tested on seven locks, zero, one or two points each: a maximum score of fourteen. Press start, Marzia.`), AB, 'fade');
  big('t3', 'NOBODY BROKE THE LOCK', 60, A8.y, 300, 80);
  text('t3b', 'THE PLAYER WAS TRICKED INTO OPENING IT', 0, 172, 1920, 50, { fontSize: P(34), fontFace: PX, color: A8.p, align: 'center', charSpacing: 3 }); an('t3b', 'fade', 1800, 500);
  stext('ms', [{ text: 'MISSION:  ', options: { fontFace: PX, color: A8.c } }, { text: 'how strong are the locks on the apps in our pocket, and why do they still fail?', options: { fontFace: MONO, bold: true, color: A8.w } }], 260, 260, 1400, 100, A8.box, { align: 'center', line: A8.c, lw: 3, extra: { fontSize: P(30) } });
  an('ms', 'grow', 5000, 400, { from: 0.8 });
  text('sel', 'SELECT YOUR PLAYER', 0, 392, 1920, 50, { fontSize: P(30), fontFace: MONO, bold: true, color: A8.y, align: 'center', charSpacing: 6 }); an('sel', 'fade', 9500, 400); an('sel', 'pulse', 10000, 700, { scale: 104 });
  FIVE.forEach((k, i) => {
    const x = 150 + i * 330, d = 10500 + 700 * i, col = [A8.g, A8.r, 'A78BFA', A8.c, A8.p][i];
    box('pc' + i, x, 470, 290, 380, col, d);
    text('pl' + i, i === 4 ? 'FINAL LEVEL' : 'LEVEL ' + (i + 1), x, 484, 290, 36, { fontSize: P(22), fontFace: MONO, bold: true, color: col, align: 'center' });
    appIcon('pi' + i, k, x + 85, 532, 120);
    text('pn' + i, [{ text: APPS[k].n.toUpperCase(), options: { fontFace: PX, fontSize: P(36), color: A8.w, breakLine: true } }, { text: ROLE[k], options: { fontFace: MONO, bold: true, fontSize: P(20), color: 'E9D5FF', breakLine: true } }, { text: 'ROLL ' + ROLL[k], options: { fontFace: MONO, fontSize: P(18), color: col } }], x + 10, 670, 270, 170, { align: 'center' });
    an('pl' + i, 'fade', d + 200, 300); all(['pi' + i, 'pi' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('pn' + i, 'fade', d + 400, 400);
  });
  an('pc0', 'pulse', 15000, 600, { scale: 103 }); an('pc0o', 'pulse', 15000, 600, { scale: 103 });
  text('ru', [{ text: '7 LOCKS', options: { color: A8.y } }, { text: '  ·  0, 1 OR 2 POINTS EACH  ·  ', options: { color: A8.w } }, { text: 'MAX SCORE 14', options: { color: A8.y } }], 0, 900, 1920, 50, { fontSize: P(30), fontFace: PX, align: 'center', charSpacing: 2 }); an('ru', 'fade', 15500, 500);
  text('ps', 'PRESS START  ·  INTRO BY AHNAF AKIF, ROLL 24', 0, 990, 1920, 40, { fontSize: P(20), fontFace: MONO, bold: true, color: 'C4B5FD', align: 'center' }); an('ps', 'fade', 16000, 400); an('ps', 'pulse', 16500, 800, { scale: 103 });

