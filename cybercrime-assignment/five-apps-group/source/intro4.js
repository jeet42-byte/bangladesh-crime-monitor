  // ======== editorial intro (light "newspaper investigation" design)
  const NP = { paper: 'F6F2EA', ink: '161412', red: 'C8102E', grey: '6B6660', rule: 'CFC6B8', soft: 'EDE6DA', gold: 'B8860B' };
  const SER = 'Georgia';
  const kicker = (n, t, x, y, w, col = NP.red) => text(n, t, x, y, w, 30, { fontSize: P(20), fontFace: F, bold: true, color: col, charSpacing: 3 });
  const masthead = (sub, d = 0) => {
    text('mh', 'FIVE APPS, ONE POCKET', 0, 34, 1920, 84, { fontSize: P(66), fontFace: SER, bold: true, color: NP.ink, align: 'center', charSpacing: 2 });
    line('mr1', 128, 128, 1792, 128, NP.ink, { lw: 2.5 }); line('mr2', 128, 134, 1792, 134, NP.ink, { lw: 0.75 });
    text('ms', sub, 128, 140, 1664, 34, { fontSize: P(19), color: NP.grey, align: 'center', charSpacing: 2 });
    an('mh', 'fade', d, 900); an('mr1', 'wipe', d + 300, 900); an('mr2', 'wipe', d + 450, 900); an('ms', 'fade', d + 800, 600);
  };

  // =============================================================== 1. THE FRONT PAGE (Ahnaf)
  slide(SN('ahnaf', 60, `[Calm, curious voice.] Good morning. Imagine you are a journalist in Dhaka. It is the middle of the afternoon, and a WhatsApp message arrives from one of the most powerful officials in the country: the chairman of the National Board of Revenue.

[Point to the screenshot.] It says, in Bangla: "I need thirty-five thousand taka on my bKash right now. Can you send it? I will return it tomorrow."

[Pause. Look at the audience.] What would you do? He is the head of the tax authority. You would probably send it.

[Point to the right column.] But on the twenty-fourth of September 2025, the NBR announced that the chairman's WhatsApp account had been hacked. The message came from a scammer.

[Masthead.] That is where our presentation begins: Five Apps, One Pocket. Because if the head of the tax authority can be hacked, so can any one of us.`), 'F6F2EA', 'black');
  masthead('MCCJ 525 · CYBERCRIMES AND SECURITY  ·  A GROUP INVESTIGATION  ·  DHAKA', 200);
  kicker('k1', 'CYBERCRIME  ·  SEPTEMBER 2025', 128, 200, 1100); an('k1', 'fade', 1200, 500);
  text('hl', '“I need Tk 35,000 on my bKash”: the message that was not from the NBR chairman', 128, 236, 1664, 150, { fontSize: P(56), fontFace: SER, bold: true, color: NP.ink, lineSpacingMultiple: 0.98 });
  an('hl', 'rise', 1500, 1000);
  line('hr', 128, 400, 1792, 400, NP.rule, { lw: 1 }); an('hr', 'wipe', 2300, 700);
  // lead photo: the real screenshot
  rect('pf', 128, 430, 1000, 563, NP.ink); imgp('shot', '/home/user/gdeck/assets/nbr_msg.png', 128, 430, 1000, 563, 'WhatsApp message in Bangla asking for 35,000 taka on bKash');
  an('pf', 'fade', 2600, 600); an('shot', 'fade', 2800, 1200); an('shot', 'dolly', 4200, 12000, { scale: 102 });
  text('cap', [{ text: 'The message. ', options: { bold: true, color: NP.ink } }, { text: 'Sent from the NBR chairman’s hacked WhatsApp account, 3:16 PM. The real screenshot, as published in the news.', options: { color: NP.grey } }],
    128, 1000, 1000, 50, { fontSize: P(19), fontFace: F, italic: true });
  an('cap', 'fade', 3600, 600);
  // right column: translation and the facts
  kicker('k2', 'IN ENGLISH', 1180, 430, 600); an('k2', 'fade', 4200, 500);
  text('tq', '“I need Tk 35,000 on my bKash right now. Can you send it? I’ll return it tomorrow.”', 1180, 466, 612, 220, { fontSize: P(34), fontFace: SER, italic: true, color: NP.ink, lineSpacingMultiple: 1.05 });
  an('tq', 'fade', 4500, 1200);
  line('cr', 1180, 700, 1792, 700, NP.rule); an('cr', 'wipe', 9000, 600);
  kicker('k3', 'WHAT HAPPENED', 1180, 718, 600); an('k3', 'fade', 9200, 500);
  [['24 Sept 2025', 'The NBR announces that its chairman’s WhatsApp account has been hacked.'], ['The messages', 'People, including journalists, were asked for money.'], ['The sender', 'Not the chairman: a scammer using his account.']].forEach(([h, b], i) => {
    const y = 760 + i * 78, d = 9600 + 1500 * i;
    rect('fb' + i, 1180, y + 8, 8, 56, NP.red);
    text('ft' + i, [{ text: h + '  ', options: { bold: true, color: NP.ink } }, { text: b, options: { color: NP.ink } }], 1204, y, 588, 76, { fontSize: P(22), valign: 'middle' });
    an('fb' + i, 'wipeD', d, 400); an('ft' + i, 'fade', d + 150, 600);
  });
  stext('stamp', 'IT WAS NOT HIM', 470, 846, 620, 92, 'F6F2EA', { r: 0.08, align: 'center', line: NP.red, lw: 5, trans: 8, extra: { color: NP.red, fontFace: SER, bold: true, fontSize: P(44), charSpacing: 2, rotate: -6 } });
  an('stamp', 'grow', 14500, 500, { from: 1.8 });

  // =============================================================== 2. THE DATA PAGE (Ahnaf)
  slide(SN('ahnaf', 70, `And this was not one unlucky official. It is an industry. [Left chart.] Around the world, people lost an estimated four hundred and forty-two billion US dollars to scams in just twelve months. More than half of all adults faced a scam, and almost one in four lost money.

[Middle chart.] In the United States, the FBI recorded twenty point nine billion dollars in reported losses in 2025, and the biggest category was investment fraud: eight point six billion.

[Right.] And here at home, Bangladesh Bank data show eighty-one thousand four hundred and twenty-three fraud incidents in mobile financial services, cheques and cards in 2025, with ninety-two point six crore taka lost.

[Bottom.] The cases keep coming. The CID arrested a student who hacked more than fifty Facebook accounts through Messenger links and blackmailed at least fifteen victims. And the actor Prarthana Fardin Dighi lost money from her bKash account after a caller asked for her OTP "to fix a blocked account".`), 'F6F2EA');
  masthead('THE DATA PAGE  ·  THE SCAM ECONOMY, IN NUMBERS', 0);
  text('hl', 'Not one unlucky official. An industry.', 128, 196, 1664, 90, { fontSize: P(58), fontFace: SER, bold: true, color: NP.ink });
  an('hl', 'rise', 600, 900);
  // panel A: worldwide (proportion squares: 100 adults)
  kicker('ka', 'WORLDWIDE  ·  12 MONTHS', 128, 312, 520); an('ka', 'fade', 1200, 500);
  text('va', '$442 billion', 128, 344, 520, 90, { fontSize: P(70), fontFace: SER, bold: true, color: NP.ink });
  text('la', 'lost to scams, estimated', 128, 432, 520, 36, { fontSize: P(23), color: NP.grey });
  an('va', 'grow', 1400, 900, { from: 0.5 }); an('la', 'fade', 1900, 500);
  for (let i = 0; i < 100; i++) {
    const x = 128 + (i % 20) * 25, y = 496 + Math.floor(i / 20) * 25, col = i < 23 ? NP.red : i < 57 ? 'E8A0A9' : 'DCD4C6';
    rect('sq' + i, x, y, 21, 21, col);
    an('sq' + i, 'fade', 2200 + 12 * i, 250);
  }
  text('sql', [{ text: '■ ', options: { color: 'E8A0A9' } }, { text: '57 of every 100 adults faced a scam   ', options: { color: NP.ink } }, { text: '■ ', options: { color: NP.red } }, { text: '23 lost money', options: { color: NP.ink } }], 128, 630, 540, 60, { fontSize: P(20) });
  text('sqs', 'Global Anti-Scam Alliance, 2025', 128, 690, 520, 30, { fontSize: P(17), italic: true, color: NP.grey });
  an('sql', 'fade', 3500, 600); an('sqs', 'fade', 3700, 500);
  line('d1', 690, 312, 690, 720, NP.rule); an('d1', 'wipeD', 3800, 600);
  // panel B: USA bars
  kicker('kb', 'UNITED STATES  ·  2025', 730, 312, 500); an('kb', 'fade', 4000, 500);
  text('vb', '$20.9 billion', 730, 344, 520, 90, { fontSize: P(70), fontFace: SER, bold: true, color: NP.ink });
  text('lb', 'reported lost to online crime', 730, 432, 520, 36, { fontSize: P(23), color: NP.grey });
  an('vb', 'grow', 4200, 900, { from: 0.5 }); an('lb', 'fade', 4700, 500);
  [['All reported losses', 20.9, NP.ink], ['Investment fraud', 8.6, NP.red]].forEach(([l, v, col], i) => {
    const y = 500 + i * 80, w = 400 * v / 20.9;
    text('bl' + i, l, 730, y, 480, 30, { fontSize: P(20), color: NP.grey });
    rect('bb' + i, 730, y + 32, w, 30, col); text('bv' + i, '$' + v + 'B', 730 + w + 10, y + 28, 120, 38, { fontSize: P(26), fontFace: SER, bold: true, color: col });
    an('bl' + i, 'fade', 5000 + 400 * i, 400); an('bb' + i, 'wipe', 5100 + 400 * i, 900); an('bv' + i, 'fade', 5800 + 400 * i, 400);
  });
  text('bs', 'FBI Internet Crime Complaint Center, 2025', 730, 690, 520, 30, { fontSize: P(17), italic: true, color: NP.grey }); an('bs', 'fade', 6400, 500);
  line('d2', 1290, 312, 1290, 720, NP.rule); an('d2', 'wipeD', 6500, 600);
  // panel C: Bangladesh
  kicker('kc', 'BANGLADESH  ·  2025', 1330, 312, 460); an('kc', 'fade', 6700, 500);
  text('vc', '81,423', 1330, 344, 460, 90, { fontSize: P(70), fontFace: SER, bold: true, color: NP.red });
  text('lc', 'fraud incidents in MFS, cheque and card payments', 1330, 432, 460, 70, { fontSize: P(23), color: NP.grey });
  an('vc', 'grow', 6900, 900, { from: 0.5 }); an('lc', 'fade', 7400, 500);
  stext('tk', [{ text: 'Tk 92.6 crore', options: { fontFace: SER, bold: true, fontSize: P(52), color: 'FFFFFF', breakLine: true } }, { text: 'lost in a single year', options: { fontSize: P(22), color: 'F5D0D6' } }], 1330, 520, 460, 160, NP.red, { align: 'center' });
  text('cs', 'Bangladesh Bank data, reported by the Daily Observer', 1330, 690, 460, 30, { fontSize: P(17), italic: true, color: NP.grey });
  an('tk', 'grow', 7800, 800, { from: 0.6 }); an('cs', 'fade', 8200, 500);
  // bottom: also in the news
  line('br', 128, 748, 1792, 748, NP.ink, { lw: 2 }); an('br', 'wipe', 8800, 800);
  kicker('kn', 'ALSO IN THE NEWS', 128, 764, 600); an('kn', 'fade', 9000, 500);
  [['fb', 'CID arrests student who hacked 50+ Facebook accounts', 'Links sent on Messenger stole logins; at least 15 victims were blackmailed. (Oct 2024)'], ['bk', 'Actor Dighi’s bKash emptied by an OTP call', 'A caller asked for her OTP “to fix a blocked account”; police recovered Tk 1.62 lakh.']].forEach(([k, h, b], i) => {
    const x = 128 + i * 842, d = 9400 + 1500 * i;
    appIcon('ni' + i, k, x, 806, 80);
    text('nh' + i, [{ text: h, options: { fontFace: SER, bold: true, fontSize: P(30), color: NP.ink, breakLine: true } }, { text: b, options: { fontSize: P(22), color: NP.grey } }], x + 104, 800, 700, 200);
    all(['ni' + i, 'ni' + i + 'i'], 'grow', d, 500, { from: 0.3 }); an('nh' + i, 'fade', d + 200, 700);
  });

  // =============================================================== 3. WHY IT WORKS + OUR INVESTIGATION (Ahnaf)
  slide(SN('ahnaf', 70, `So why does it work? Look again at the chairman's message. [Card one.] Trust: it came from a name we respect. [Card two.] Urgency: "right now". [Card three.] A promise: "I'll return it tomorrow." No virus, and no hacking skill was needed on our side. Just three buttons pressed in our minds: trust, urgency and hope.

[Bottom left.] So are the apps to blame, or are we? To find out, our group investigated five apps where this happens every day: WhatsApp, Gmail, Discord, Facebook and bKash. We tested each one on seven criteria from our course rubric, from login protection to privacy, each scored zero, one or two, out of fourteen.

[Team.] Each of us investigated one app. Marzia will begin with WhatsApp, the app where our story began.`), 'F6F2EA');
  masthead('ANALYSIS  ·  WHY IT WORKS, AND WHAT WE INVESTIGATED', 0);
  text('hl', 'Three words did all the hacking: trust, urgency, hope', 128, 196, 1664, 90, { fontSize: P(54), fontFace: SER, bold: true, color: NP.ink });
  an('hl', 'rise', 500, 900);
  // the message, dissected
  stext('msg', [{ text: '“', options: { color: NP.grey } }, { text: 'NBR Chairman', options: { highlight: 'FFE08A', color: NP.ink } }, { text: '” · ', options: { color: NP.grey } }, { text: 'I need Tk 35,000 on my bKash ', options: { color: NP.ink } }, { text: 'right now', options: { highlight: 'F5C2CA', color: NP.ink } }, { text: '. Can you send it? ', options: { color: NP.ink } }, { text: 'I’ll return it tomorrow.', options: { highlight: 'BFE3D0', color: NP.ink } }],
    128, 304, 1664, 90, 'FFFFFF', { pad: 20, line: NP.rule, extra: { fontSize: P(29), fontFace: SER, italic: true } });
  an('msg', 'fade', 1300, 900);
  [['handshake', 'Trust', 'A name we respect, a friend, a famous brand. We do not question authority.', 'FFE08A', 'B8860B'], ['clock', 'Urgency', '“Right now”, “blocked today”. Panic switches off careful thinking.', 'F5C2CA', NP.red], ['coins', 'Hope', '“I’ll return it tomorrow”, easy income, a prize. A small risk for a big reward.', 'BFE3D0', '1E7B4F']].forEach(([ic, h, b, hi, col], i) => {
    const x = 128 + i * 562, d = 2600 + 1600 * i;
    rect('tc' + i, x, 420, 540, 230, 'FFFFFF', { line: NP.rule }); rect('tcb' + i, x, 420, 540, 10, hi);
    oval('to' + i, x + 28, 460, 76, 76, col); img('toi' + i, I[ic], x + 48, 480, 36, 36);
    text('tt' + i, [{ text: h, options: { fontFace: SER, bold: true, fontSize: P(38), color: NP.ink, breakLine: true } }, { text: b, options: { fontSize: P(22), color: NP.grey } }], x + 124, 448, 396, 190);
    an('tc' + i, 'rise', d, 700); an('tcb' + i, 'wipe', d + 200, 500); all(['to' + i, 'toi' + i], 'grow', d + 300, 500, { from: 0.3 }); an('tt' + i, 'fade', d + 400, 600);
  });
  line('br', 128, 680, 1792, 680, NP.ink, { lw: 2 }); an('br', 'wipe', 7400, 800);
  kicker('kq', 'OUR INVESTIGATION  ·  FIVE APPS, SEVEN LOCKS, SCORED 0–2, OUT OF 14', 128, 696, 1664); an('kq', 'fade', 7600, 500);
  [['wa', 'WhatsApp', 'Marzia Rahman', '29'], ['gm', 'Gmail', 'Tanvir Ahmed Siddique', '28'], ['dc', 'Discord', 'Jesmin Naher Sweety', '08'], ['fb', 'Facebook', 'Abdullah Al Mamun', '02'], ['bk', 'bKash', 'Md. Masum Billah', '18']].forEach(([k, n, who, r], i) => {
    const x = 128 + i * 336, d = 7900 + 400 * i;
    rect('ac' + i, x, 742, 316, 236, 'FFFFFF', { line: NP.rule });
    appIcon('ai' + i, k, x + 118, 760, 80);
    text('an' + i, n, x, 848, 316, 44, { fontSize: P(30), fontFace: SER, bold: true, color: NP.ink, align: 'center' });
    text('aw' + i, [{ text: who, options: { color: NP.ink, breakLine: true } }, { text: 'Roll ' + r, options: { color: NP.grey } }], x + 10, 896, 296, 70, { fontSize: P(20), align: 'center' });
    an('ac' + i, 'rise', d, 600); all(['ai' + i, 'ai' + i + 'i'], 'grow', d + 200, 500, { from: 0.3 }); an('an' + i, 'fade', d + 300, 500); an('aw' + i, 'fade', d + 450, 500);
  });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 128, 990, 1664, 30, { fontSize: P(19), italic: true, color: NP.grey, align: 'right' }); an('by', 'fade', 10200, 500);

