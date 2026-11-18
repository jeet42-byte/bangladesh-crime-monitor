  // ======== OPTION G · "SIMPLE STORY": the real cases, told simply, on clean premium slides
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  {
    let seed = 13; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let dots = ''; for (let i = 0; i < 600; i++) dots += `<circle cx="${(rnd() * 1920) | 0}" cy="${(rnd() * 1080) | 0}" r="${(rnd() * 1.1 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.05).toFixed(3)}"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="r" cx=".82" cy=".95" r=".75"><stop offset="0" stop-color="#7F1D1D" stop-opacity=".55"/><stop offset="1" stop-color="#7F1D1D" stop-opacity="0"/></radialGradient><radialGradient id="g" cx=".2" cy=".1" r=".6"><stop offset="0" stop-color="#25D366" stop-opacity=".10"/><stop offset="1" stop-color="#25D366" stop-opacity="0"/></radialGradient></defs><rect width="1920" height="1080" fill="#09090D"/><rect width="1920" height="1080" fill="url(#r)"/><rect width="1920" height="1080" fill="url(#g)"/>${dots}</svg>`)).png().toFile(A_DIR + 'g1_bg.png');
  }
  const G1 = A_DIR + 'g1_bg.png';
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };

  // =============================================================== G1. THE MESSAGE (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. Let me start with a true story.

September 2025. A journalist in Dhaka gets a WhatsApp message. [Screenshot.] It says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Right side.] And the sender? The chairman of the National Board of Revenue, the head of the country's tax office. Would you say no to him?

[Pause. Red banner.] But it was not him. His WhatsApp had been hacked. On the twenty-fourth of September, the NBR warned everyone not to send any money.`), G1, 'black');
  label('k', 'A TRUE STORY  ·  DHAKA, SEPTEMBER 2025', 128, 96, 1200, K.bad, { fontSize: P(24), charSpacing: 4 });
  an('k', 'wipe', 300, 900);
  rect('fr', 118, 176, 980, 560, '000000', { r: 0.035, line: '2E3545', lw: 2, shadow: 30, so: 10, sop: 0.6 });
  imgp('shot', '/home/user/gdeck/assets/nbr_msg.png', 128, 186, 960, 540, 'WhatsApp message in Bangla asking for 35,000 taka on bKash');
  text('cap', 'The real message, received at 3:16 PM', 128, 752, 960, 32, { fontSize: P(20), italic: true, color: K.dim });
  an('fr', 'fade', 1000, 900); an('shot', 'fade', 1200, 1400); an('cap', 'fade', 2400, 600);
  text('q', '“I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', 1180, 176, 612, 280, { fontSize: P(40), fontFace: FH, color: K.white });
  an('q', 'fade', 4500, 1200);
  line('dv', 1180, 492, 1792, 492, K.edge, { lw: 1.5 }); an('dv', 'wipe', 9000, 700);
  label('sh', 'THE SENDER', 1180, 524, 600, K.soft, { fontSize: P(21) }); an('sh', 'fade', 9500, 500);
  text('sn', 'The chairman of the National Board of Revenue', 1180, 566, 612, 170, { fontSize: P(40), fontFace: FB, color: K.white });
  an('sn', 'rise', 10000, 900);
  rect('band', 128, 830, 1664, 130, '170A0D', { r: 0.12, line: '5C1A20', lw: 1.5 }); rect('bar', 128, 830, 14, 130, K.bad);
  text('bt', [{ text: 'It was not him.   ', options: { fontFace: FB, fontSize: P(56), color: K.white } }, { text: 'His WhatsApp had been hacked.', options: { fontSize: P(36), color: 'FFB4B4' } }], 180, 830, 1580, 130, { valign: 'middle' });
  an('band', 'fade', 16500, 700); an('bar', 'wipeD', 16600, 500); an('bt', 'fade', 16900, 900);
  text('src', 'Source: NBR statement, 24 September 2025 (bdnews24)', 1092, 982, 700, 30, { fontSize: P(18), color: K.dim, align: 'right' }); an('src', 'fade', 18000, 500);

  // =============================================================== G2. IT KEEPS HAPPENING (Ahnaf)
  slide(SN('ahnaf', 60, `And this is not just one story. [Cards.] Here are three real cases.

The chairman's WhatsApp, which we just saw.

[Facebook.] In 2024, the CID arrested a student who hacked more than fifty Facebook accounts, just by sending links on Messenger. He blackmailed at least fifteen people.

[bKash.] And the actor Dighi lost money from her bKash account after one phone call. The caller asked for her OTP. The police later got back one lakh sixty-two thousand taka.

[Number.] In 2025 alone, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards. Ninety-two point six crore taka, lost.`), I.bgDark, 'fade');
  label('k2', 'IT KEEPS HAPPENING', 128, 96, 1000, K.mid, { fontSize: P(24), charSpacing: 4 });
  text('t2', 'Three apps. Three real cases. One trick.', 128, 132, 1664, 100, { fontSize: P(64), fontFace: FB, color: K.white });
  an('k2', 'wipe', 200, 700); an('t2', 'rise', 500, 900);
  [['wa', 'NBR · bdnews24', 'The NBR chairman’s WhatsApp is hacked and used to ask people for money', 'A hijacked account'],
   ['fb', 'CID · Banglanews24', 'A student hacks 50+ Facebook accounts and blackmails at least 15 people', 'Links sent on Messenger'],
   ['bk', 'DB · TBS', 'Actor Dighi’s bKash is emptied; police later recover Tk 1.62 lakh', 'One call asking for the OTP']].forEach(([k, src, h, how], i) => {
    const x = 128 + i * 568, d = [2200, 5500, 13000][i];
    rect('c' + i, x, 290, 528, 470, K.card, { r: 0.06, line: K.edge });
    rect('ct' + i, x, 290, 528, 8, APPS[k].c, { r: 0.5 });
    appIcon('ci' + i, k, x + 40, 334, 92);
    text('cs' + i, src, x + 150, 334, 340, 92, { fontSize: P(20), fontFace: MONO, bold: true, color: K.soft, valign: 'middle', align: 'right' });
    text('ch' + i, h, x + 40, 456, 450, 180, { fontSize: P(32), fontFace: FH, color: K.white });
    line('cl' + i, x + 40, 652, x + 488, 652, K.edge, { lw: 1 });
    text('cw' + i, [{ text: 'HOW  ', options: { fontFace: MONO, bold: true, fontSize: P(20), color: K.dim } }, { text: how, options: { fontFace: FH, fontSize: P(28), color: k === 'fb' ? '5B9DFF' : APPS[k].c } }], x + 40, 668, 460, 70, { valign: 'middle' });
    an('c' + i, 'rise', d, 700); an('ct' + i, 'wipe', d + 200, 500); all(['ci' + i, 'ci' + i + 'i'], 'grow', d + 300, 500, { from: 0.3 }); an('cs' + i, 'fade', d + 400, 500); an('ch' + i, 'fade', d + 500, 700);
    an('cl' + i, 'wipe', d + 900, 400); an('cw' + i, 'fade', d + 1100, 600);
  });
  rect('nb', 128, 806, 1664, 170, '1A1216', { r: 0.12, line: '3A2228', lw: 1 });
  text('nv', '81,423', 168, 806, 520, 170, { fontSize: P(104), fontFace: FB, color: K.bad, valign: 'middle' });
  text('nt', [{ text: 'fraud cases in Bangladesh in 2025: mobile banking, cheques, cards', options: { color: K.white, breakLine: true } }, { text: 'Tk 92.6 crore lost  ·  Bangladesh Bank, via Daily Observer', options: { color: K.soft, fontSize: P(24) } }],
    700, 806, 1060, 170, { fontSize: P(31), fontFace: FH, valign: 'middle' });
  an('nb', 'fade', 20500, 600); an('nv', 'grow', 20800, 800, { from: 0.6 }); an('nt', 'fade', 21300, 800);

  // =============================================================== G3. THE PATTERN AND OUR QUESTION (Ahnaf)
  slide(SN('ahnaf', 60, `Three stories, and one pattern. [Headline.] Nobody broke the lock. The owner was tricked into opening it.

[Question.] So today we ask two simple questions. How strong are the locks on the apps in our pocket? And why do they still fail?

[Apps.] We tested five apps: WhatsApp, Gmail, Discord, Facebook and bKash. Each one is checked on seven locks, and each lock gets zero, one or two points. So every app is scored out of fourteen.

Each of us will present one app. Marzia will start with WhatsApp.`), I.bgDark, 'fade');
  label('k3', 'THE PATTERN', 128, 96, 1000, K.wa, { fontSize: P(24), charSpacing: 4 });
  text('h1', 'No lock was broken.', 128, 132, 1664, 130, { fontSize: P(104), fontFace: FB, color: K.white });
  text('h2', 'The owner was tricked into opening it.', 128, 268, 1664, 80, { fontSize: P(52), fontFace: FH, color: K.mid });
  an('k3', 'wipe', 200, 700); an('h1', 'rise', 500, 900); an('h2', 'fade', 2600, 900);
  stext('qq', [{ text: 'OUR QUESTION   ', options: { fontFace: MONO, bold: true, fontSize: P(22), color: K.wa } }, { text: 'How strong are the locks on the apps in our pocket, and why do they still fail?', options: { fontFace: FH, fontSize: P(34), color: K.white } }],
    128, 400, 1664, 120, K.card, { r: 0.14, pad: 32, line: K.edge });
  an('qq', 'rise', 6000, 800);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 338, d = 11500 + 350 * i;
    rect('a' + i, x, 568, 312, 330, K.card, { r: 0.08, line: K.edge });
    rect('ab' + i, x + 40, 568, 232, 6, APPS[k].c, { r: 0.5 });
    appIcon('ai' + i, k, x + 106, 606, 100);
    text('an' + i, [{ text: APPS[k].n, options: { fontFace: FB, fontSize: P(32), color: K.white, breakLine: true } }, { text: ROLE[k], options: { fontFace: FH, fontSize: P(21), color: K.light, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(19), color: K.soft } }],
      x + 16, 726, 280, 160, { align: 'center' });
    an('a' + i, 'rise', d, 600); an('ab' + i, 'wipe', d + 200, 400); all(['ai' + i, 'ai' + i + 'i'], 'grow', d + 250, 500, { from: 0.3 }); an('an' + i, 'fade', d + 400, 500);
  });
  text('m', [{ text: '7 locks', options: { fontFace: FH, color: K.white } }, { text: '   ·   0, 1 or 2 points each   ·   ', options: { color: K.soft } }, { text: 'scored out of 14', options: { fontFace: FH, color: K.white } }], 128, 930, 1100, 50, { fontSize: P(28) });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 930, 600, 50, { fontSize: P(22), color: K.dim, align: 'right' });
  an('m', 'fade', 14500, 700); an('by', 'fade', 15000, 500);

