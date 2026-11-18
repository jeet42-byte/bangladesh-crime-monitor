  // ======== OPTION M · "NOTEBOOK": the introduction as a student's handwritten case notes
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const NB = { ink: '1E3A8A', pen: '111827', red: 'DC2626', hl: 'FDE047', hlp: 'F9A8D4', hlg: '86EFAC', grey: '6B7280' };
  const HW = 'Segoe Print';
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let l = ''; for (let y = 150; y < 1080; y += 54) l += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#93C5FD" stroke-opacity=".55" stroke-width="2"/>`;
    let holes = ''; for (let y = 120; y < 1080; y += 180) holes += `<circle cx="48" cy="${y}" r="16" fill="#E5E1D8"/>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#FFFDF6"/>${l}<line x1="150" y1="0" x2="150" y2="1080" stroke="#F87171" stroke-opacity=".7" stroke-width="3"/>${holes}</svg>`)).png().toFile(A_DIR + 'note_bg.png');
  }
  const NBG = A_DIR + 'note_bg.png';
  const hand = (n, t, x, y, w, h, o = {}) => text(n, t, x, y, w, h, Object.assign({ fontFace: HW, fontSize: P(36), color: NB.ink, valign: 'top' }, o));
  const hl = (n, x, y, w, h, col, d) => { rect(n, x, y, w, h, col, { trans: 35 }); an(n, 'wipe', d, 600); };
  const sticky = (n, x, y, w, h, col, rot, d) => {
    cur.addShape(pres.shapes.RECTANGLE, { objectName: n, x: S(x), y: S(y), w: S(w), h: S(h), rotate: rot, fill: { color: col }, line: { type: 'none' }, shadow: { type: 'outer', color: '000000', blur: 10, offset: 5, angle: 70, opacity: 0.25 } });
    an(n, 'drop', d, 500);
  };

  // =============================================================== M1. CASE 1 NOTES (Ahnaf)
  slide(SN('ahnaf', 60, `Good morning. While we were preparing this topic, I kept notes on real cases. Let me read you case one.

[Notes, line by line.] September 2025, three-sixteen in the afternoon. A journalist in Dhaka gets a WhatsApp message.

It comes from the chairman of the National Board of Revenue, the head of the country's tax office.

It says: "I need thirty-five thousand taka on my bKash right now. I will return it tomorrow."

[Sticky note.] Ask yourself: would you say no to him?

[Red circle.] But it was not him. His WhatsApp had been hacked, and the NBR had to warn the public not to send any money.`), NBG, 'fade');
  hand('t', 'Case 1: the NBR chairman', 200, 70, 1100, 80, { fontSize: P(60), color: NB.pen, bold: true });
  line('tu', 204, 152, 900, 156, NB.red, { lw: 3 }); an('t', 'fade', 300, 800); an('tu', 'wipe', 1100, 600);
  hand('n1', '•  Sept 2025, 3:16 PM, Dhaka: a journalist gets a WhatsApp message', 200, 206, 1150, 110, { fontSize: P(32) }); an('n1', 'fade', 2500, 900);
  hand('n2', '•  From: the NBR chairman (head of the tax office!)', 200, 320, 1150, 60, { fontSize: P(32), color: 'BE185D' }); an('n2', 'fade', 6300, 900);
  hand('n3', '•  “I need Tk 35,000 on my bKash right now. I’ll return it tomorrow.”', 200, 428, 1150, 110, { color: NB.pen, fontSize: P(32) }); an('n3', 'fade', 9800, 1000);
  line('ar', 260, 590, 330, 640, NB.red, { lw: 3, arrow: true }); an('ar', 'wipe', 16000, 400);
  hand('n4', 'It was NOT him.', 350, 610, 800, 90, { fontSize: P(62), color: NB.red, bold: true }); an('n4', 'fade', 16300, 700);
  oval('ring', 330, 600, 560, 120, null, { line: NB.red, lw: 4 }); an('ring', 'wheel', 17000, 900);
  hand('n5', 'His WhatsApp had been hacked. NBR warned the public on 24 Sept.', 350, 728, 1000, 60, { fontSize: P(30) }); an('n5', 'fade', 18000, 800);
  sticky('sn', 1400, 230, 400, 360, 'FEF08A', 4, 13500);
  hand('snt', 'Would YOU say no to him?', 1430, 280, 340, 260, { fontSize: P(44), color: NB.pen, rotate: 4, align: 'center', valign: 'middle' }); an('snt', 'fade', 13900, 600);
  hand('src', 'source: bdnews24 (message translated from Bangla)', 200, 940, 1100, 50, { fontSize: P(22), color: NB.grey }); an('src', 'fade', 19000, 500);

  // =============================================================== M2. MORE CASES (Ahnaf)
  slide(SN('ahnaf', 65, `Then I found more cases, on other apps. [Index cards.]

Case two, Facebook, 2024: a student sent links on Messenger. He took over more than fifty accounts, and the CID says he blackmailed at least fifteen people.

Case three, bKash: the actor Dighi got one phone call about a "blocked account". The caller asked for her OTP, and her account was emptied. Police later recovered one lakh sixty-two thousand taka.

[Circled number.] And then the big number. In 2025, Bangladesh Bank counted eighty-one thousand four hundred and twenty-three fraud cases in mobile banking, cheques and cards: ninety-two point six crore taka lost.`), NBG, 'fade');
  hand('t2', 'More cases: same trick, other apps', 200, 70, 1500, 80, { fontSize: P(56), color: NB.pen, bold: true });
  line('tu2', 204, 150, 1180, 154, NB.red, { lw: 3 }); an('t2', 'fade', 300, 800); an('tu2', 'wipe', 1100, 600);
  [['fb', 'Case 2 · Facebook · 2024', 'A student sends links on Messenger, takes over 50+ accounts, blackmails at least 15 people.', 'source: CID, Banglanews24', -2, 'DBEAFE'],
   ['bk', 'Case 3 · bKash', 'Actor Dighi gets a call about a “blocked account”, gives the OTP, and her bKash is emptied. Police recover Tk 1.62 lakh.', 'source: DB, TBS', 1.5, 'FCE7F3']].forEach(([k, h, b, s, rot, col], i) => {
    const x = 200 + i * 780, d = [2500, 9500][i];
    sticky('ic' + i, x, 210, 720, 430, col, rot, d);
    rect('tp' + i, x + 290, 192, 140, 40, 'E7DCC4', { trans: 20 }); an('tp' + i, 'fade', d + 300, 300);
    appIcon('ii' + i, k, x + 40, 250, 80);
    hand('ih' + i, h, x + 140, 258, 560, 70, { fontSize: P(34), color: NB.pen, bold: true, rotate: rot });
    hand('ib' + i, b, x + 40, 350, 650, 220, { fontSize: P(30), rotate: rot });
    hand('is' + i, s, x + 40, 580, 650, 40, { fontSize: P(20), color: NB.grey, rotate: rot });
    all(['ii' + i, 'ii' + i + 'i'], 'grow', d + 400, 400, { from: 0.3 }); an('ih' + i, 'fade', d + 500, 500); an('ib' + i, 'fade', d + 800, 900); an('is' + i, 'fade', d + 1200, 400);
  });
  hand('big', '81,423', 300, 700, 700, 200, { fontSize: P(140), color: NB.red, bold: true }); an('big', 'fade', 19500, 800);
  oval('br', 270, 700, 720, 220, null, { line: NB.red, lw: 4 }); an('br', 'wheel', 20200, 900);
  hand('bt', 'fraud cases in Bangladesh in 2025 (mobile banking, cheques and cards). Tk 92.6 crore lost!', 1040, 720, 760, 170, { fontSize: P(32) }); an('bt', 'fade', 20800, 800);
  hand('bs', 'source: Bangladesh Bank, via Daily Observer', 1040, 900, 760, 40, { fontSize: P(20), color: NB.grey }); an('bs', 'fade', 21300, 400);

  // =============================================================== M3. CONCLUSION AND PLAN (Ahnaf)
  slide(SN('ahnaf', 60, `So what did my notes teach me? [Highlighted line.] Nobody broke the lock. Someone was tricked into opening it.

[Question.] That gave us our question: how strong are the locks on the apps in our pocket, and why do they still fail?

[Checklist.] Here is our plan for today, our to-do list. WhatsApp, Marzia Rahman. Gmail, Tanvir Ahmed Siddique. Discord, Jesmin Naher Sweety. Facebook, Abdullah Al Mamun. And bKash, Md. Masum Billah, with the final scores.

[Margin note.] Every app gets tested on seven locks, each scored zero, one or two: fourteen points in total. Marzia, over to you.`), NBG, 'fade');
  hand('t3', 'What I learned', 200, 70, 1100, 80, { fontSize: P(60), color: NB.pen, bold: true });
  line('tu3', 204, 152, 700, 156, NB.red, { lw: 3 }); an('t3', 'fade', 300, 800); an('tu3', 'wipe', 1100, 600);
  hl('l1', 200, 226, 830, 64, NB.hl, 2000);
  hand('les', 'Nobody broke the lock.', 210, 206, 1000, 90, { fontSize: P(56), color: NB.pen, bold: true }); an('les', 'fade', 1800, 700);
  hand('les2', 'Someone was tricked into opening it.', 210, 310, 1000, 60, { fontSize: P(36), color: NB.red }); an('les2', 'fade', 3300, 700);
  hand('qq', 'Our question: how strong are the locks on the apps in our pocket, and why do they still fail?', 210, 400, 900, 130, { fontSize: P(32) }); an('qq', 'fade', 6000, 900);
  hand('td', 'To do today:', 210, 560, 600, 60, { fontSize: P(38), color: NB.pen, bold: true }); an('td', 'fade', 9500, 500);
  FIVE.forEach((k, i) => {
    const y = 630 + i * 74, d = 10200 + 900 * i;
    rect('cb' + i, 220, y + 14, 36, 36, 'FFFFFF', { line: NB.ink, lw: 2 });
    appIcon('ci' + i, k, 280, y + 6, 52);
    hand('cl' + i, [{ text: APPS[k].n, options: { bold: true, color: NB.pen } }, { text: '  —  ' + ROLE[k] + ' (' + ROLL[k] + ')', options: { color: NB.ink } }], 352, y, 900, 64, { fontSize: P(30), valign: 'middle' });
    an('cb' + i, 'fade', d, 300); all(['ci' + i, 'ci' + i + 'i'], 'grow', d + 100, 400, { from: 0.3 }); an('cl' + i, 'fade', d + 200, 600);
  });
  sticky('rn', 1360, 480, 440, 400, 'BBF7D0', -3, 15000);
  hand('rnt', '7 locks per app\n0, 1 or 2 points each\n= out of 14', 1390, 520, 380, 320, { fontSize: P(36), color: NB.pen, rotate: -3, align: 'center', valign: 'middle' }); an('rnt', 'fade', 15400, 600);
  hand('by', 'notes by Ahnaf Akif, Roll 24', 1360, 960, 440, 40, { fontSize: P(22), color: NB.grey, align: 'right' }); an('by', 'fade', 16000, 400);

