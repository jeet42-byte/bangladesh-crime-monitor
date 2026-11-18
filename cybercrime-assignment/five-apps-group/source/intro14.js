  // ======== OPTION J · "CINEMA": the introduction as film title cards, a film strip and opening credits
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const C = { gold: 'D4AF37', cream: 'F5F0E6', dim: '8C8577', frame: '1F1C19' };
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  const SER = 'Georgia';
  {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let g = ''; for (let i = 0; i < 4000; i++) g += `<rect x="${(rnd() * 1920) | 0}" y="${(rnd() * 1080) | 0}" width="2" height="2" fill="#fff" opacity="${(rnd() * 0.06).toFixed(3)}"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="v" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#1E1A15"/><stop offset="1" stop-color="#050505"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#v)"/>${g}<rect width="1920" height="96" fill="#000"/><rect y="984" width="1920" height="96" fill="#000"/></svg>`)).png().toFile(A_DIR + 'cine_bg.png');
  }
  const CB = A_DIR + 'cine_bg.png';
  const kick = (n, t, y, d, w = 1920, x = 0) => { text(n, t, x, y, w, 40, { fontSize: P(24), fontFace: F, bold: true, color: C.gold, align: 'center', charSpacing: 8 }); an(n, 'fade', d, 1200); };

  // =============================================================== J1. TITLE CARDS (Ahnaf)
  slide(SN('ahnaf', 60, `[Speak slowly, like the opening of a film. Let each line appear before you say it.]

September 2025. Dhaka.

A journalist gets one WhatsApp message.

It comes from the chairman of the National Board of Revenue, the head of the country's tax office.

The message says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Long pause.] But it was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.

[Normal voice.] Good morning. This is a true story, and it is where our presentation begins.`), CB, 'black');
  kick('k', 'SEPTEMBER 2025  ·  DHAKA', 190, 600);
  text('l1', 'A journalist gets one WhatsApp message.', 160, 280, 1600, 80, { fontSize: P(50), fontFace: SER, italic: true, color: C.cream, align: 'center' });
  text('l2', 'From the chairman of the National Board of Revenue.', 160, 380, 1600, 80, { fontSize: P(50), fontFace: SER, italic: true, color: C.cream, align: 'center' });
  text('l3', '“I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', 160, 480, 1600, 90, { fontSize: P(44), fontFace: SER, color: C.gold, align: 'center' });
  an('l1', 'fade', 2500, 1500); an('l2', 'fade', 6500, 1500); an('l3', 'fade', 11500, 1500);
  line('rl', 760, 630, 1160, 630, C.gold, { lw: 1.5 }); an('rl', 'wipe', 17000, 900);
  text('l4', 'It was not him.', 160, 660, 1600, 160, { fontSize: P(130), fontFace: SER, bold: true, color: C.cream, align: 'center' });
  text('l5', 'His WhatsApp had been hacked.', 160, 830, 1600, 70, { fontSize: P(40), fontFace: SER, italic: true, color: 'E06C5A', align: 'center' });
  an('l4', 'fade', 18000, 2000); an('l5', 'fade', 20500, 1200);
  text('src', 'A true story · NBR statement, 24 September 2025 (bdnews24)', 0, 1016, 1920, 30, { fontSize: P(17), color: C.dim, align: 'center' }); an('src', 'fade', 21500, 800);

  // =============================================================== J2. THE FILM STRIP (Ahnaf)
  slide(SN('ahnaf', 65, `And this story is not alone. [Film strip.] Here are three scenes from the same film.

[Scene one.] The chairman's WhatsApp: a trusted name, used to ask people for money.

[Scene two.] In 2024, a student sent links on Facebook Messenger. He took over more than fifty accounts, and the CID says he blackmailed at least fifteen people.

[Scene three.] The actor Dighi got one phone call about a "blocked account". The caller asked for her OTP, and her bKash was emptied. Police later recovered one lakh sixty-two thousand taka.

[Gold line.] And in 2025, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards: ninety-two point six crore taka lost.`), CB, 'fade');
  kick('k2', 'IT KEEPS HAPPENING', 150, 200);
  text('t2', 'Three scenes. One trick.', 0, 196, 1920, 100, { fontSize: P(72), fontFace: SER, color: C.cream, align: 'center' });
  an('t2', 'fade', 600, 1200);
  rect('strip', 0, 330, 1920, 520, '0C0B0A'); an('strip', 'wipe', 1600, 1200);
  for (let i = 0; i < 24; i++) { rect('hT' + i, 20 + i * 80, 346, 40, 26, '3A352E', { r: 0.25 }); rect('hB' + i, 20 + i * 80, 808, 40, 26, '3A352E', { r: 0.25 }); }
  all([...Array(24).keys()].flatMap(i => ['hT' + i, 'hB' + i]), 'fade', 2200, 800);
  [['wa', 'SCENE 1', 'A trusted name', 'The chairman’s hijacked WhatsApp asks people for money.', 'NBR · Sept 2025'],
   ['fb', 'SCENE 2', 'A link on Messenger', 'A student takes over 50+ Facebook accounts and blackmails at least 15 people.', 'CID · Oct 2024'],
   ['bk', 'SCENE 3', 'One call for the OTP', 'Actor Dighi’s bKash is emptied; police recover Tk 1.62 lakh.', 'DB · TBS']].forEach(([k, sc, h, b, s], i) => {
    const x = 150 + i * 560, d = [4500, 9000, 15500][i];
    rect('fr' + i, x, 392, 500, 396, C.frame, { line: '3A352E', lw: 1.5 });
    appIcon('fi' + i, k, x + 36, 426, 84);
    text('fs' + i, sc, x + 140, 426, 330, 40, { fontSize: P(20), fontFace: F, bold: true, color: C.gold, charSpacing: 4 });
    text('fsrc' + i, s, x + 140, 466, 330, 40, { fontSize: P(19), color: C.dim });
    text('fh' + i, [{ text: h, options: { fontFace: SER, fontSize: P(38), color: C.cream, breakLine: true } }, { text: b, options: { fontFace: F, fontSize: P(25), color: 'CFC8BA' } }], x + 36, 540, 430, 230);
    an('fr' + i, 'fade', d, 900); all(['fi' + i, 'fi' + i + 'i'], 'fade', d + 300, 700); an('fs' + i, 'fade', d + 400, 600); an('fsrc' + i, 'fade', d + 500, 600); an('fh' + i, 'fade', d + 700, 900);
  });
  text('stat', [{ text: '81,423', options: { fontFace: SER, bold: true, fontSize: P(54), color: C.gold } }, { text: '   fraud cases in Bangladesh in 2025  ·  Tk 92.6 crore lost', options: { fontFace: SER, italic: true, fontSize: P(32), color: C.cream } }],
    0, 878, 1920, 80, { align: 'center', valign: 'middle' });
  text('stats', 'Bangladesh Bank, via Daily Observer: mobile banking, cheques and cards', 0, 1016, 1920, 30, { fontSize: P(17), color: C.dim, align: 'center' });
  an('stat', 'fade', 22000, 1300); an('stats', 'fade', 22800, 700);

  // =============================================================== J3. OPENING CREDITS (Ahnaf)
  slide(SN('ahnaf', 60, `Three scenes, and one pattern. [Title.] Nobody broke the lock. Someone was tricked into opening it.

[Credits.] So today, our film has five stars: the five apps in our pocket. And each one has a presenter. WhatsApp, with Marzia Rahman. Gmail, with Tanvir Ahmed Siddique. Discord, with Jesmin Naher Sweety. Facebook, with Abdullah Al Mamun. And bKash, with Md. Masum Billah, who will show the final scores.

[Bottom.] Our question: how strong are the locks on these apps, and why do they still fail? Each app is tested on seven locks, scored zero, one or two: fourteen points in total. Marzia, over to you.`), CB, 'fade');
  kick('k3', 'THE PATTERN', 140, 200);
  text('t3', 'Nobody broke the lock. Someone opened it.', 0, 186, 1920, 100, { fontSize: P(62), fontFace: SER, color: C.cream, align: 'center' });
  an('t3', 'fade', 700, 1500);
  kick('st', 'S T A R R I N G', 336, 5500);
  FIVE.forEach((k, i) => {
    const y = 392 + i * 82, d = 7000 + 1500 * i;
    text('ca' + i, APPS[k].n.toUpperCase(), 160, y, 760, 70, { fontSize: P(36), fontFace: F, bold: true, color: C.gold, align: 'right', valign: 'middle', charSpacing: 5 });
    text('cd' + i, '·', 920, y, 80, 70, { fontSize: P(36), color: C.dim, align: 'center', valign: 'middle' });
    text('cp' + i, [{ text: ROLE[k], options: { fontFace: SER, fontSize: P(36), color: C.cream } }, { text: '   ' + ROLL[k], options: { fontFace: F, fontSize: P(22), color: C.dim } }], 1000, y, 800, 70, { valign: 'middle' });
    an('ca' + i, 'fade', d, 1000); an('cd' + i, 'fade', d + 200, 600); an('cp' + i, 'fade', d + 300, 1000);
  });
  text('qq', [{ text: 'Our question: ', options: { fontFace: SER, italic: true, color: C.gold } }, { text: 'how strong are the locks, and why do they still fail?', options: { fontFace: SER, italic: true, color: C.cream } }], 0, 822, 1920, 60, { fontSize: P(36), align: 'center' });
  text('rule', '7 locks  ·  0, 1 or 2 points each  ·  scored out of 14', 0, 890, 1920, 44, { fontSize: P(24), color: C.dim, align: 'center', charSpacing: 2 });
  text('by', 'Introduced by Ahnaf Akif, Roll 24', 0, 1016, 1920, 30, { fontSize: P(17), color: C.dim, align: 'center' });
  an('qq', 'fade', 15500, 1200); an('rule', 'fade', 16500, 800); an('by', 'fade', 17000, 600);

