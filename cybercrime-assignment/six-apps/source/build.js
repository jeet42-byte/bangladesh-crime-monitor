// "Six Apps, One Pocket": security of Facebook, Gmail, WhatsApp, bKash, Discord and Telegram (MCCJ 525, Ahnaf Akif)
// usage: node build.js out.pptx  ->  out.pptx + out.anim.json (then: python3 inject.py out.pptx out.anim.json final.pptx)
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const React = require('react');
const RDS = require('react-dom/server');
const fa = require('react-icons/fa');
const OUT = process.argv[2];
const A_DIR = '/home/user/gdeck/assets/';
fs.mkdirSync(A_DIR, { recursive: true });

const K = { bg: '0B0D12', ink: '0B0D12', white: 'FFFFFF', light: 'EEF1F7', soft: 'A6AFC0', dim: '5D6577', card: '151922', card2: '1C2130', edge: '2A3142',
  fb: '1877F2', gm: 'EA4335', gmB: '4285F4', gmY: 'FBBC05', gmG: '34A853', wa: '25D366', waD: '075E54', waT: '128C7E', bk: 'E2136E', dc: '5865F2', tg: '2AABEE',
  good: '2FD27F', mid: 'FFC24B', bad: 'FF5A5F' };
const F = 'Segoe UI', FH = 'Segoe UI Semibold', FB = 'Segoe UI Black', MONO = 'Consolas';
const S = px => px / 144, P = px => Math.round(px / 2 * 10) / 10;
const CRIT = ['Login protection', 'Encryption', 'Account monitoring', 'Recovery', 'Scam and abuse protection', 'Privacy controls', 'Usability'];
const CS = ['Login', 'Encryption', 'Monitoring', 'Recovery', 'Scam & abuse', 'Privacy', 'Usability'];
const APPS = {
  fb: { n: 'Facebook', c: K.fb, s: [2, 2, 2, 1, 1, 1, 2] }, gm: { n: 'Gmail', c: K.gm, s: [2, 1, 2, 2, 2, 1, 2] }, wa: { n: 'WhatsApp', c: K.wa, s: [2, 2, 1, 1, 2, 2, 2] },
  bk: { n: 'bKash', c: K.bk, s: [2, 1, 2, 1, 1, 1, 1] }, dc: { n: 'Discord', c: K.dc, s: [2, 1, 2, 1, 1, 2, 1] }, tg: { n: 'Telegram', c: K.tg, s: [1, 1, 2, 1, 1, 2, 0] } };
const ORDER = ['fb', 'gm', 'wa', 'bk', 'dc', 'tg'];
const tot = k => APPS[k].s.reduce((a, b) => a + b, 0);
const LV = v => (v >= 2 ? K.good : v === 1 ? K.mid : K.bad);

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
pres.title = 'Six Apps, One Pocket – Ahnaf Akif';
pres.author = 'Ahnaf Akif';
pres.theme = { headFontFace: FH, bodyFontFace: F };
const SPEC = [];
let cur, A, uid = 0;
const an = (n, e, d, t, x = {}) => A.push(Object.assign({ n, e, d, t }, x));
const NOTE = (sec, t) => `SPEAKER: AHNAF AKIF (Roll 24)  ·  about ${sec} seconds\n\n${t.trim()}`;
function slide(notes, bg, trans = 'fade') {
  cur = pres.addSlide(); A = []; SPEC.push({ trans, anims: A });
  if (bg && bg.length === 6) cur.background = { color: bg }; else cur.background = { path: bg || I.bgDark };
  cur.addNotes(notes);
}
function text(name, t, x, y, w, h, o = {}) {
  cur.addText(t, Object.assign({ objectName: name, x: S(x), y: S(y), w: S(w), h: S(h), fontFace: F, fontSize: P(28), color: K.light, margin: 0, valign: 'top', isTextBox: true }, o));
  return name;
}
function rect(name, x, y, w, h, fill, o = {}) {
  const opt = { objectName: name, x: S(x), y: S(y), w: S(w), h: S(h), fill: fill ? { color: fill, transparency: o.trans || 0 } : { type: 'none' },
    line: o.line ? { color: o.line, width: o.lw || 1 } : { type: 'none' } };
  if (o.r != null) opt.rectRadius = o.r;
  if (o.shadow) opt.shadow = { type: 'outer', color: '000000', blur: o.shadow, offset: o.so || 3, angle: 90, opacity: o.sop || 0.18 };
  if (o.glow) opt.shadow = { type: 'outer', color: o.glow, blur: 14, offset: 0, angle: 90, opacity: o.go || 0.35 };
  cur.addShape(o.shape || (o.r != null ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE), opt);
  return name;
}
function stext(name, t, x, y, w, h, fill, o = {}) {
  const pad = S(o.pad == null ? 0 : o.pad) * 72;
  cur.addText(t, Object.assign({ objectName: name, x: S(x), y: S(y), w: S(w), h: S(h), fontFace: F, fontSize: P(24), color: K.light,
    shape: o.r != null ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, rectRadius: o.r || 0,
    fill: fill ? { color: fill, transparency: o.trans || 0 } : { type: 'none' }, line: o.line ? { color: o.line, width: o.lw || 1 } : { type: 'none' },
    margin: [pad, pad, pad, pad], valign: o.valign || 'middle', align: o.align || 'left' },
    o.shadow ? { shadow: { type: 'outer', color: '000000', blur: o.shadow, offset: 3, angle: 90, opacity: 0.16 } } : {}, o.extra || {}));
  return name;
}
function oval(name, x, y, w, h, fill, o = {}) {
  cur.addShape(pres.shapes.OVAL, { objectName: name, x: S(x), y: S(y), w: S(w), h: S(h), fill: fill ? { color: fill, transparency: o.trans || 0 } : { type: 'none' },
    line: o.line ? { color: o.line, width: o.lw || 1.5 } : { type: 'none' }, ...(o.glow ? { shadow: { type: 'outer', color: o.glow, blur: 14, offset: 0, angle: 90, opacity: o.go || 0.4 } } : {}) });
  return name;
}
function img(name, data, x, y, w, h, alt = '') { cur.addImage({ data, x: S(x), y: S(y), w: S(w), h: S(h), objectName: name, altText: alt }); return name; }
function imgp(name, path, x, y, w, h, alt = '') { cur.addImage({ path, x: S(x), y: S(y), w: S(w), h: S(h), objectName: name, altText: alt }); return name; }
function line(name, x1, y1, x2, y2, col, o = {}) {
  cur.addShape(pres.shapes.LINE, { objectName: name, x: S(Math.min(x1, x2)), y: S(Math.min(y1, y2)), w: S(Math.max(Math.abs(x2 - x1), 0.5)), h: S(Math.max(Math.abs(y2 - y1), 0.5)),
    flipH: x2 < x1, flipV: y2 < y1, line: { color: col, width: o.lw || 1.5, dashType: o.dash || 'solid', ...(o.arrow ? { endArrowType: 'triangle' } : {}) } });
  return name;
}
const all = (names, e, d, t, x = {}) => names.forEach(n => an(n, e, d, t, x));
const png = async (svg, w) => 'image/png;base64,' + (await sharp(Buffer.from(svg), { density: 300 }).resize(w ? Math.round(w) : null).png().toBuffer()).toString('base64');
async function icon(Comp, color, size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: '#' + color, size: String(size) }));
  return png(svg);
}
const SI = k => fs.readFileSync(`/home/user/gdeck/node_modules/simple-icons/icons/${k}.svg`, 'utf8').match(/ d="([^"]+)"/)[1];
const logo = (k, color, size = 512) => png(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><path fill="#${color}" d="${SI(k)}"/></svg>`);
const I = {};

// ---------- charts
async function donut(pre, val, max, col, x, y, d, t0, o = {}) {
  const W = 400, c = 200, r = 160, L = 2 * Math.PI * r, sw = o.sw || 30;
  I[pre + 'tr'] = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#${o.track || K.edge}" stroke-width="${sw}"/></svg>`);
  I[pre + 'ar'] = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(L * val / max).toFixed(1)} ${L}" transform="rotate(-90 ${c} ${c})"/></svg>`);
  img(pre + 'tr', I[pre + 'tr'], x, y, d, d); img(pre + 'ar', I[pre + 'ar'], x, y, d, d, `${val} out of ${max}`);
  text(pre + 'v', o.label || String(val), x, y + d * 0.28, d, d * 0.3, { fontSize: P(d * (o.fs || 0.24)), fontFace: FH, color: o.vc || col, align: 'center', valign: 'middle' });
  if (o.sub) text(pre + 's', o.sub, x + d * 0.15, y + d * 0.58, d * 0.7, d * 0.16, { fontSize: P(o.subfs || 20), color: o.sc || K.soft, align: 'center' });
  an(pre + 'tr', 'fade', t0, 500); an(pre + 'ar', 'wheel', t0 + 200, 1400); an(pre + 'v', 'grow', t0 + 600, 700, { from: 0.4 });
  if (o.sub) an(pre + 's', 'fade', t0 + 900, 500);
}
// criteria bars: 7 rows (label | track | fill | value)
function critBars(pre, k, x, y, w, rh, t0, o = {}) {
  const lw = o.lw || 200, bw = w - lw - 50, col = o.col || APPS[k].c;
  APPS[k].s.forEach((v, i) => {
    const yy = y + i * rh, d = t0 + 120 * i;
    text(pre + 'l' + i, CS[i], x, yy, lw, rh, { fontSize: P(o.fs || 21), color: o.tc || K.soft, valign: 'middle' });
    rect(pre + 't' + i, x + lw, yy + rh / 2 - 7, bw, 14, o.track || K.edge, { r: 0.5 });
    if (v) rect(pre + 'b' + i, x + lw, yy + rh / 2 - 7, bw * v / 2, 14, col, { r: 0.5 });
    text(pre + 'v' + i, String(v), x + lw + bw + 12, yy, 38, rh, { fontSize: P(o.fs || 21), fontFace: FH, color: o.vc || col, valign: 'middle' });
    an(pre + 'l' + i, 'fade', d, 400); an(pre + 't' + i, 'fade', d, 400); if (v) an(pre + 'b' + i, 'wipe', d + 100, 700); an(pre + 'v' + i, 'fade', d + 500, 400);
  });
}

async function assets() {
  let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let dots = ''; for (let i = 0; i < 900; i++) dots += `<circle cx="${(rnd() * 1920) | 0}" cy="${(rnd() * 1080) | 0}" r="${(rnd() * 1.1 + 0.3).toFixed(1)}" fill="#fff" opacity="${(rnd() * 0.05).toFixed(3)}"/>`;
  const glows = [['1877F2', 200, 120], ['25D366', 1750, 140], ['E2136E', 1700, 980], ['5865F2', 220, 1000], ['2AABEE', 960, -80], ['EA4335', 960, 1180]]
    .map(([c, x, y], i) => `<radialGradient id="g${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#${c}" stop-opacity=".16"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`).join('');
  const orbs = [['1877F2', 200, 120], ['25D366', 1750, 140], ['E2136E', 1700, 980], ['5865F2', 220, 1000], ['2AABEE', 960, -80], ['EA4335', 960, 1180]]
    .map(([c, x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="700" ry="460" fill="url(#g${i})"/>`).join('');
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10131B"/><stop offset="1" stop-color="#07080C"/></linearGradient>${glows}</defs><rect width="1920" height="1080" fill="url(#b)"/>${orbs}${dots}</svg>`)).png().toFile(A_DIR + 'bg_dark.png');
  I.bgDark = A_DIR + 'bg_dark.png';
  // chat wallpapers
  let doodle = ''; for (let i = 0; i < 160; i++) { const x = (rnd() * 1500) | 0, y = (rnd() * 1000) | 0, r = (rnd() * 10 + 6) | 0; doodle += i % 3 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#000" stroke-opacity=".045" stroke-width="2"/>` : `<rect x="${x}" y="${y}" width="${r * 2}" height="${r * 1.4}" rx="4" fill="none" stroke="#000" stroke-opacity=".045" stroke-width="2"/>`; }
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><rect width="1500" height="1000" fill="#EFE7DE"/>${doodle}</svg>`)).png().toFile(A_DIR + 'wa_wall.png');
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000"><defs><linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9DDA3"/><stop offset=".5" stop-color="#9FC8A8"/><stop offset="1" stop-color="#7FB3B8"/></linearGradient></defs><rect width="1500" height="1000" fill="url(#t)"/>${doodle.replace(/#000/g, '#fff').replace(/\.045/g, '.18')}</svg>`)).png().toFile(A_DIR + 'tg_wall.png');
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="420"><defs><linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E2136E"/><stop offset="1" stop-color="#B0105A"/></linearGradient></defs><rect width="1920" height="420" fill="url(#p)"/><circle cx="1720" cy="40" r="300" fill="#fff" opacity=".06"/><circle cx="1500" cy="420" r="220" fill="#fff" opacity=".05"/></svg>`)).png().toFile(A_DIR + 'bk_head.png');
  for (const [k, slug] of [['fb', 'facebook'], ['gm', 'gmail'], ['wa', 'whatsapp'], ['dc', 'discord'], ['tg', 'telegram'], ['google', 'google']]) {
    I[k + 'W'] = await logo(slug, 'FFFFFF'); I[k + 'C'] = await logo(slug, (APPS[k] || { c: '4285F4' }).c);
  }
  // multicolour Gmail mark
  I.gmM = await png(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24"><path fill="#EA4335" d="${SI('gmail')}"/></svg>`);
  const M = { wallet: fa.FaWallet, shield: fa.FaShieldAlt, lock: fa.FaLock, key: fa.FaKey, eye: fa.FaEye, life: fa.FaLifeRing, ban: fa.FaBan, user: fa.FaUserShield, hand: fa.FaHandPointer,
    warn: fa.FaExclamationTriangle, check: fa.FaCheck, times: fa.FaTimes, fish: fa.FaFish, bell: fa.FaBell, finger: fa.FaFingerprint, phone: fa.FaMobileAlt, search: fa.FaSearch,
    home: fa.FaHome, users: fa.FaUsers, video: fa.FaVideo, store: fa.FaStore, inbox: fa.FaInbox, star: fa.FaStar, trash: fa.FaTrash, pen: fa.FaPen, mic: fa.FaMicrophone,
    hash: fa.FaHashtag, volume: fa.FaVolumeUp, thumbs: fa.FaThumbsUp, comment: fa.FaComment, share: fa.FaShare, globe: fa.FaGlobeAsia, money: fa.FaMoneyBillWave,
    send: fa.FaPaperPlane, paperclip: fa.FaPaperclip, smile: fa.FaSmile, ellipsis: fa.FaEllipsisV, heart: fa.FaHeart, bolt: fa.FaBolt, gift: fa.FaGift, qr: fa.FaQrcode,
    robot: fa.FaRobot, crown: fa.FaCrown, chart: fa.FaChartLine, question: fa.FaQuestion, brain: fa.FaBrain, clock: fa.FaClock, briefcase: fa.FaBriefcase, link: fa.FaLink,
    coins: fa.FaCoins, handshake: fa.FaHandshake, bullhorn: fa.FaBullhorn, cog: fa.FaCog, pin: fa.FaThumbtack, plus: fa.FaPlus };
  for (const [k, c] of Object.entries(M)) { I[k] = await icon(c, 'FFFFFF'); I[k + 'D'] = await icon(c, '1C1E21'); I[k + 'G'] = await icon(c, '65676B'); }
  for (const [k, c] of [['check', fa.FaCheck], ['times', fa.FaTimes], ['warn', fa.FaExclamationTriangle], ['lock', fa.FaLock], ['shield', fa.FaShieldAlt], ['fish', fa.FaFish], ['bolt', fa.FaBolt]]) {
    I[k + 'Good'] = await icon(c, K.good); I[k + 'Bad'] = await icon(c, K.bad); I[k + 'Mid'] = await icon(c, K.mid);
    for (const a of ORDER) I[k + a] = await icon(c, APPS[a].c);
  }
}

(async () => {
  await assets();

  // =============================================================== 1. COVER
  slide(NOTE(20, `Good morning. I am Ahnaf Akif, Roll 24. My presentation looks at six apps that almost every one of us carries in our pocket: Facebook, Gmail, WhatsApp, bKash, Discord and Telegram. How well do they protect us, and where do they still leak? But let me begin with a true story.`), I.bgDark, 'black');
  text('eye', 'MCCJ 525  ·  CYBERCRIMES AND SECURITY', 128, 250, 900, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('t1', 'Six Apps.', 128, 296, 900, 150, { fontSize: P(128), fontFace: FB, color: K.white });
  text('t2', 'One Pocket.', 128, 430, 900, 150, { fontSize: P(128), fontFace: FB, color: K.white });
  rect('t2u', 134, 580, 520, 10, K.bk, { r: 0.5 });
  text('sub', 'How safe are the apps we trust with our messages, our accounts and our money?', 128, 618, 860, 100, { fontSize: P(34), color: K.soft });
  text('who', [{ text: 'Ahnaf Akif', options: { bold: true, color: K.white } }, { text: '   ·   Roll 24', options: { color: K.soft } }], 128, 770, 800, 50, { fontSize: P(32) });
  an('eye', 'wipe', 200, 800); an('t1', 'rise', 400, 900); an('t2', 'rise', 700, 900); an('t2u', 'wipe', 1400, 800); an('sub', 'fade', 1700, 800); an('who', 'fade', 2200, 700);
  // a phone holding the six app icons
  rect('phone', 1180, 150, 470, 820, '0F1218', { r: 0.12, line: '2E3545', lw: 3, shadow: 30, so: 12, sop: 0.5 });
  rect('notch', 1355, 172, 120, 22, '000000', { r: 0.5 });
  text('clk', '9:41', 1180, 214, 470, 60, { fontSize: P(54), fontFace: FH, color: K.white, align: 'center' });
  text('dt', 'Tuesday, 17 November', 1180, 278, 470, 34, { fontSize: P(22), color: K.soft, align: 'center' });
  all(['phone', 'notch', 'clk', 'dt'], 'grow', 300, 1000, { from: 0.85 });
  const tile = [['fb', K.fb], ['gm', 'FFFFFF'], ['wa', K.wa], ['bk', K.bk], ['dc', K.dc], ['tg', K.tg]];
  tile.forEach(([k, bg], i) => {
    const x = 1236 + (i % 3) * 128, y = 380 + Math.floor(i / 3) * 150, d = 1300 + 160 * i;
    rect('ap' + i, x, y, 104, 104, bg, { r: 0.24, shadow: 10 });
    if (k === 'bk') text('api' + i, 'b', x, y + 4, 104, 96, { fontSize: P(70), fontFace: FB, color: K.white, align: 'center', valign: 'middle' });
    else img('api' + i, k === 'gm' ? I.gmM : I[k + 'W'], x + 24, y + 24, 56, 56, APPS[k].n);
    text('apl' + i, APPS[k].n, x - 16, y + 110, 136, 30, { fontSize: P(18), color: K.light, align: 'center' });
    an('ap' + i, 'grow', d, 600, { from: 0.2 }); an('api' + i, 'grow', d + 80, 600, { from: 0.2 }); an('apl' + i, 'fade', d + 300, 400);
    an('ap' + i, 'breathe', 3200 + 180 * i, 2400 + 200 * i, { dy: -0.005 }); an('api' + i, 'breathe', 3200 + 180 * i, 2400 + 200 * i, { dy: -0.005 });
  });
  stext('nt', [{ text: 'Telegram  ·  now', options: { bold: true, color: K.light, breakLine: true } }, { text: 'New job offer: earn daily from home. Click to start…', options: { color: K.soft } }], 1212, 720, 406, 110, '1C2130', { r: 0.18, pad: 18, extra: { fontSize: P(20) } });
  an('nt', 'drop', 2800, 700); an('nt', 'pulse', 3800, 1600, { scale: 102 });

  // =============================================================== 2. THE STORY
  slide(NOTE(60, `[Pause.] August 2025. A 49-year-old man in Bangladesh gets a message on Telegram: a job offer, from a company posing as a jewellery brand. Easy work from home, a link to click, and a promise of high returns.

[Timeline.] He clicks. He sends money, then more money, to keep the "job" going.

[Number.] By the time he stops, he has lost ninety-four lakh taka. Almost one crore. A lifetime of savings, gone through one app on his phone.

[Bottom.] This is a real case. The CID's Cyber Police Centre has arrested at least fourteen members of the gang. And he is not alone.`), I.bgDark);
  text('tag', 'A TRUE STORY  ·  BANGLADESH', 128, 96, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.bad, charSpacing: 4 });
  text('h', [{ text: 'He wanted a job.', options: { color: K.white, breakLine: true } }, { text: 'He lost Tk 94 lakh.', options: { color: K.bad } }], 128, 140, 1100, 260, { fontSize: P(96), fontFace: FB, lineSpacingMultiple: 0.95 });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 500, 1000);
  // horizontal story timeline
  rect('tl', 160, 560, 1600, 4, K.edge, { r: 0.5 }); rect('tlr', 160, 560, 1600, 4, K.bad, { r: 0.5 });
  an('tl', 'fade', 1200, 500); an('tlr', 'wipe', 1500, 6500);
  [['tgW', 'AUG 2025', 'A Telegram message: a “job” from a fake jewellery brand', K.tg], ['link', 'THE HOOK', 'Easy online work, a link, and promises of high returns', K.mid],
   ['coins', 'THE DEPOSITS', 'Money, then more money, to keep the “job” going', K.mid], ['warn', 'THE LOSS', 'Tk 94 lakh: almost one crore taka, gone', K.bad], ['shield', 'THE ARRESTS', 'CID has arrested at least 14 gang members', K.good]].forEach(([ic, h, b, col], i) => {
    const x = 160 + i * 400, d = 1600 + 1300 * i;
    oval('n' + i, x - 36, 526, 72, 72, col, { glow: col, go: 0.5 });
    img('ni' + i, ic === 'tgW' ? I.tgW : I[ic], x - 18, 544, 36, 36);
    text('nh' + i, h, x - 150, 616, 300, 34, { fontSize: P(22), fontFace: MONO, bold: true, color: col, align: 'center', charSpacing: 2 });
    text('nb' + i, b, x - 160, 656, 320, 110, { fontSize: P(25), color: K.light, align: 'center' });
    an('n' + i, 'grow', d, 500, { from: 0.2 }); an('ni' + i, 'grow', d + 60, 500, { from: 0.2 }); an('nh' + i, 'fade', d + 200, 500); an('nb' + i, 'rise', d + 300, 600);
  });
  stext('cnt', [{ text: 'Tk 94,20,000', options: { fontFace: FB, fontSize: P(76), color: K.white, breakLine: true } }, { text: 'lost to one Telegram “job offer”', options: { fontSize: P(24), color: 'FFD9DA' } }],
    1240, 180, 552, 230, K.bad, { r: 0.08, align: 'center', extra: {}, shadow: 24 });
  an('cnt', 'grow', 6400, 900, { from: 0.5 }); an('cnt', 'pulse', 7500, 1800, { scale: 103 });
  text('src', 'Case reported by Dhaka Tribune and bdnews24 (CID Cyber Police Centre).', 128, 880, 1664, 34, { fontSize: P(20), italic: true, color: K.dim });
  an('src', 'fade', 8200, 600);

  // =============================================================== 3. THE SCALE
  slide(NOTE(75, `And he is not alone. [Left.] According to the Global Anti-Scam Alliance, people around the world lost an estimated four hundred and forty-two billion US dollars to scams in just twelve months. More than half of all adults, fifty-seven percent, faced a scam, and almost one in four lost money.

[Middle.] In the United States, the FBI recorded twenty point nine billion dollars in reported losses in 2025. The biggest category was investment fraud, eight point six billion dollars: the same trap as our Telegram "job".

[Right.] And at home: Bangladesh Bank data show eighty-one thousand four hundred and twenty-three fraud incidents across mobile financial services, cheques and cards in 2025, with losses of ninety-two point six crore taka.

These are not attacks on banks or governments. They are attacks on ordinary pockets.`), I.bgDark);
  text('tag', 'THE SCALE OF THE PROBLEM', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'Scams now empty ordinary pockets', 128, 112, 1664, 100, { fontSize: P(64), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  // panel A: world
  rect('pa', 128, 260, 540, 680, K.card, { r: 0.05, line: K.edge }); an('pa', 'rise', 800, 700);
  img('pag', I.globe, 168, 296, 40, 40); text('pah', 'WORLDWIDE  ·  12 MONTHS', 222, 300, 420, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: K.soft, charSpacing: 2 });
  text('pav', '$442B', 168, 352, 480, 130, { fontSize: P(120), fontFace: FB, color: K.tg });
  text('pas', 'lost to scams, estimated', 168, 486, 480, 40, { fontSize: P(27), color: K.light });
  an('pag', 'fade', 1000, 400); an('pah', 'fade', 1000, 500); an('pav', 'grow', 1200, 900, { from: 0.4 }); an('pas', 'fade', 1700, 500);
  await donut('d1', 57, 100, K.mid, 168, 570, 210, 2200, { label: '57%', sub: 'faced a scam', fs: 0.22 });
  await donut('d2', 23, 100, K.bad, 418, 570, 210, 2600, { label: '23%', sub: 'lost money', fs: 0.22 });
  text('pasrc', 'Global Anti-Scam Alliance, 2025', 168, 880, 480, 30, { fontSize: P(18), italic: true, color: K.dim }); an('pasrc', 'fade', 3300, 500);
  // panel B: FBI
  rect('pb', 690, 260, 540, 680, K.card, { r: 0.05, line: K.edge }); an('pb', 'rise', 3400, 700);
  img('pbg', I.chart, 730, 296, 40, 40); text('pbh', 'UNITED STATES  ·  2025', 784, 300, 420, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: K.soft, charSpacing: 2 });
  text('pbv', '$20.9B', 730, 352, 480, 130, { fontSize: P(120), fontFace: FB, color: K.white });
  text('pbs', 'reported lost to online crime', 730, 486, 480, 40, { fontSize: P(27), color: K.light });
  an('pbg', 'fade', 3600, 400); an('pbh', 'fade', 3600, 500); an('pbv', 'grow', 3800, 900, { from: 0.4 }); an('pbs', 'fade', 4300, 500);
  // vertical bars: total vs investment fraud
  [['All online crime', 20.9, K.soft], ['Investment fraud', 8.6, K.bad]].forEach(([l, v, col], i) => {
    const x = 780 + i * 220, h = 260 * v / 20.9, y = 840 - h;
    rect('bb' + i, x, y, 150, h, col, { r: 0.08 });
    text('bv' + i, '$' + v + 'B', x - 20, y - 46, 190, 40, { fontSize: P(32), fontFace: FH, color: col, align: 'center' });
    text('bl' + i, l, x - 30, 850, 210, 34, { fontSize: P(21), color: K.soft, align: 'center' });
    an('bb' + i, 'wipeU', 4600 + 400 * i, 900); an('bv' + i, 'fade', 5300 + 400 * i, 500); an('bl' + i, 'fade', 4600 + 400 * i, 500);
  });
  text('pbsrc', 'FBI Internet Crime Complaint Center, 2025', 730, 892, 480, 30, { fontSize: P(18), italic: true, color: K.dim }); an('pbsrc', 'fade', 5800, 500);
  // panel C: Bangladesh
  rect('pc', 1252, 260, 540, 680, K.card, { r: 0.05, line: K.bk, lw: 1.5 }); an('pc', 'rise', 6000, 700);
  img('pcg', I.money, 1292, 296, 40, 40); text('pch', 'BANGLADESH  ·  2025', 1346, 300, 420, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: K.bk, charSpacing: 2 });
  text('pcv', '81,423', 1292, 352, 480, 130, { fontSize: P(116), fontFace: FB, color: K.white });
  text('pcs', 'fraud incidents in MFS, cheque and card payments', 1292, 486, 470, 80, { fontSize: P(27), color: K.light });
  stext('pcl', [{ text: 'Tk 92.60 crore', options: { fontFace: FB, fontSize: P(54), color: K.white, breakLine: true } }, { text: 'lost in a single year', options: { fontSize: P(24), color: 'FFD3E6' } }], 1292, 610, 460, 200, K.bk, { r: 0.08, align: 'center' });
  an('pcg', 'fade', 6200, 400); an('pch', 'fade', 6200, 500); an('pcv', 'grow', 6400, 900, { from: 0.4 }); an('pcs', 'fade', 6900, 500); an('pcl', 'grow', 7400, 800, { from: 0.6 }); an('pcl', 'pulse', 8300, 1800, { scale: 102 });
  text('pcsrc', 'Bangladesh Bank data, reported by the Daily Observer', 1292, 880, 480, 30, { fontSize: P(18), italic: true, color: K.dim }); an('pcsrc', 'fade', 8000, 500);

  // =============================================================== 4. WHY, AND HOW I TESTED
  slide(NOTE(70, `So why do we get scammed? Is it the apps? [Left.] The apps carry the message: a Telegram job, a WhatsApp code request, a Facebook "copyright" warning, a bKash call. But the scam rarely breaks the app. It breaks the person: our trust in a friend's name or a famous brand, our fear of losing an account, and our hope of easy money.

[Right.] So I tested the locks on six apps. I opened their security settings on my own phone and checked them against their official help pages. I scored each app on the seven criteria of our course rubric: login protection, encryption, account monitoring, recovery, scam and abuse protection, privacy controls and usability. Each criterion scores zero, one or two, so a perfect app scores fourteen. Let us open the first app.`), I.bgDark);
  text('tag', 'WHY WE GET SCAMMED', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'The app carries the message. The scam breaks the person.', 128, 112, 1664, 110, { fontSize: P(56), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  [['handshake', 'Trust', 'A friend’s name, a famous brand, an official logo', K.tg], ['clock', 'Fear and urgency', '“Your account will be blocked today”', K.mid], ['coins', 'Hope', 'Easy income, high returns, a prize', K.bk]].forEach(([ic, h, b, col], i) => {
    const y = 280 + i * 220, d = 1200 + 600 * i;
    rect('w' + i, 128, y, 760, 196, K.card, { r: 0.08, line: K.edge }); rect('wb' + i, 128, y, 10, 196, col, { r: 0.5 });
    oval('wo' + i, 170, y + 50, 96, 96, col, { glow: col, go: 0.35 }); img('wi' + i, I[ic], 194, y + 74, 48, 48);
    text('wt' + i, [{ text: h, options: { fontFace: FH, fontSize: P(40), color: K.white, breakLine: true } }, { text: b, options: { fontSize: P(25), color: K.soft } }], 300, y + 36, 560, 130);
    an('w' + i, 'slide', d, 700); an('wb' + i, 'wipeD', d + 200, 400); an('wo' + i, 'grow', d + 250, 500, { from: 0.3 }); an('wi' + i, 'grow', d + 300, 500, { from: 0.3 }); an('wt' + i, 'fade', d + 300, 600);
  });
  rect('mp', 950, 280, 842, 636, K.card, { r: 0.05, line: K.edge }); an('mp', 'rise', 3300, 700);
  text('mh', [{ text: 'HOW I TESTED THE SIX APPS', options: { fontFace: MONO, bold: true, fontSize: P(22), color: K.soft, charSpacing: 2, breakLine: true } }, { text: 'Seven locks, each scored 0, 1 or 2', options: { fontFace: FH, fontSize: P(36), color: K.white } }], 990, 310, 780, 110);
  an('mh', 'fade', 3500, 600);
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  CRIT.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 990 + col * 395, y = 450 + row * 92, d = 3800 + 200 * i;
    oval('ci' + i, x, y + 6, 60, 60, K.card2, { line: K.edge }); img('cii' + i, I[CI[i]], x + 16, y + 22, 28, 28);
    text('ct' + i, c, x + 76, y, 300, 72, { fontSize: P(26), fontFace: FH, valign: 'middle' });
    an('ci' + i, 'grow', d, 400, { from: 0.3 }); an('cii' + i, 'grow', d + 50, 400, { from: 0.3 }); an('ct' + i, 'fade', d + 100, 500);
  });
  [['2', 'strong or default', K.good], ['1', 'optional or weak', K.mid], ['0', 'absent', K.bad]].forEach(([v, l, col], i) => {
    stext('lg' + i, [{ text: v + '   ', options: { fontFace: FB, fontSize: P(30), color: '0B0D12' } }, { text: l, options: { fontSize: P(21), color: '0B0D12' } }], 1385 - 395 + i * 270, 836, 252, 58, col, { r: 0.3, align: 'center' });
    an('lg' + i, 'grow', 5400 + 250 * i, 500, { from: 0.5 });
  });

  // =============================================================== 5. FACEBOOK (Facebook feed style)
  slide(NOTE(65, `First, Facebook: eleven out of fourteen. [Profile card.] On paper, its locks are strong: two-factor authentication with an authenticator app, a security key or SMS; login alerts; and "Where you're logged in", which shows every device on your account. Since December 2023, personal chats on Messenger are end-to-end encrypted by default, and Facebook now supports passkeys.

[Red post.] The weak point: two-factor authentication is optional, so many hacked accounts never had it on. In Bangladesh, account takeovers and fake pages are among the most common cyber complaints, often starting with a fake "copyright violation" page that steals the password.

[Right card.] My suggestion: two-factor authentication on by default for new accounts and pages, and faster recovery for hacked accounts.`), 'F0F2F5');
  rect('top', 0, 0, 1920, 96, 'FFFFFF', { shadow: 8, so: 2, sop: 0.12 });
  oval('fbl', 32, 16, 64, 64, K.fb); img('fbli', I.fbW, 46, 30, 36, 36, 'Facebook');
  stext('fbs', [{ text: '  Search: is my account safe?', options: { color: '65676B' } }], 116, 22, 380, 52, 'F0F2F5', { r: 0.5, extra: { fontSize: P(22) } });
  img('fbsi', I.searchG, 130, 38, 20, 20);
  ['home', 'video', 'store', 'users'].forEach((ic, i) => { img('nav' + i, I[ic + (i ? 'G' : 'D')], 740 + i * 130, 30, 36, 36); if (!i) rect('navu', 712, 90, 92, 6, K.fb); });
  all(['top', 'fbl', 'fbli', 'fbs', 'fbsi', 'nav0', 'nav1', 'nav2', 'nav3', 'navu'], 'fade', 0, 600);
  // left: profile + score
  rect('pf', 40, 126, 440, 900, 'FFFFFF', { r: 0.04, shadow: 8, so: 2, sop: 0.1 });
  rect('cov', 40, 126, 440, 150, K.fb, { r: 0.04 });
  oval('pav', 180, 200, 160, 160, 'FFFFFF', { line: 'FFFFFF', lw: 6 }); oval('pav2', 192, 212, 136, 136, K.fb); img('pavi', I.fbW, 226, 246, 68, 68);
  text('pn', 'Facebook', 40, 372, 440, 50, { fontSize: P(40), fontFace: FB, color: '1C1E21', align: 'center' });
  text('pd', 'Security review  ·  rubric score', 40, 422, 440, 32, { fontSize: P(22), color: '65676B', align: 'center' });
  all(['pf', 'cov'], 'rise', 300, 700); all(['pav', 'pav2', 'pavi'], 'grow', 700, 700, { from: 0.3 }); an('pn', 'fade', 900, 500); an('pd', 'fade', 1000, 500);
  await donut('fsc', tot('fb'), 14, K.fb, 150, 470, 220, 1300, { label: tot('fb') + '/14', track: 'E4E6EB', fs: 0.2 });
  critBars('fcb', 'fb', 70, 720, 390, 40, 1900, { tc: '65676B', track: 'E4E6EB', fs: 19, lw: 150 });
  // centre: posts
  const post = (pre, x, y, w, h, head, sub, col, d) => {
    rect(pre, x, y, w, h, 'FFFFFF', { r: 0.03, shadow: 8, so: 2, sop: 0.1 }); oval(pre + 'a', x + 24, y + 22, 56, 56, col); img(pre + 'ai', I[pre === 'p2' ? 'warn' : pre === 'p3' ? 'fish' : 'shield'], x + 40, y + 38, 24, 24);
    text(pre + 'h', [{ text: head, options: { fontFace: FH, color: '1C1E21', fontSize: P(25), breakLine: true } }, { text: sub, options: { color: '65676B', fontSize: P(19) } }], x + 96, y + 20, w - 120, 64);
    all([pre, pre + 'a', pre + 'ai', pre + 'h'], 'rise', d, 700);
  };
  post('p1', 510, 126, 840, 450, 'Security features', 'Facebook Security  ·  Settings › Accounts Center', K.fb, 1500);
  [['Two-factor authentication: app, security key or SMS'], ['Login alerts and “Where you’re logged in”'], ['Messenger chats end-to-end encrypted by default (Dec 2023)'], ['Security Checkup and passkeys']].forEach(([t], i) => {
    const y = 226 + i * 80, d = 2200 + 400 * i;
    oval('fc' + i, 540, y + 10, 44, 44, 'E7F3FF'); img('fci' + i, I.checkfb, 552, y + 22, 20, 20);
    text('ft' + i, t, 604, y, 720, 64, { fontSize: P(26), color: '1C1E21', valign: 'middle' });
    an('fc' + i, 'grow', d, 400, { from: 0.3 }); an('fci' + i, 'grow', d + 50, 400, { from: 0.3 }); an('ft' + i, 'slide', d + 100, 500);
  });
  [['thumbs', 'Like'], ['comment', 'Comment'], ['share', 'Share']].forEach(([ic, l], i) => { img('re' + i, I[ic + 'G'], 600 + i * 260, 540, 22, 22); text('rl' + i, l, 632 + i * 260, 534, 160, 32, { fontSize: P(21), color: '65676B', fontFace: FH }); an('re' + i, 'fade', 3900, 400); an('rl' + i, 'fade', 3900, 400); });
  post('p2', 510, 600, 840, 200, 'Weak point', 'Why so many accounts still fall', K.bad, 4200);
  text('p2t', 'Two-factor authentication is optional, so many hacked accounts never had it switched on.', 606, 700, 720, 90, { fontSize: P(26), color: '1C1E21' }); an('p2t', 'fade', 4600, 600);
  post('p3', 510, 824, 840, 200, 'Threat in Bangladesh', 'Common cyber complaint', K.mid, 5200);
  text('p3t', 'Fake “copyright violation” pages steal passwords; hacked pages and impersonation follow.', 606, 924, 720, 90, { fontSize: P(26), color: '1C1E21' }); an('p3t', 'fade', 5600, 600);
  // right: suggested feature
  rect('fx', 1380, 126, 500, 520, 'FFFFFF', { r: 0.04, shadow: 8, so: 2, sop: 0.1 });
  text('fxh', 'SUGGESTED FEATURE', 1416, 156, 440, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: K.fb, charSpacing: 2 });
  text('fxt', 'Two-factor authentication on by default for new accounts and pages, and a faster recovery path for hacked accounts.', 1416, 200, 430, 300, { fontSize: P(30), fontFace: FH, color: '1C1E21' });
  stext('fxb', 'Turn on 2FA today', 1416, 540, 430, 70, K.fb, { r: 0.2, align: 'center', extra: { color: 'FFFFFF', fontFace: FH, fontSize: P(26) } });
  all(['fx'], 'rise', 6200, 700); an('fxh', 'fade', 6400, 500); an('fxt', 'fade', 6600, 700); an('fxb', 'grow', 7200, 600, { from: 0.6 }); an('fxb', 'pulse', 8000, 1600, { scale: 103 });
  rect('fp', 1380, 670, 500, 354, 'FFFFFF', { r: 0.04, shadow: 8, so: 2, sop: 0.1 });
  text('fph', 'WHERE TO FIND IT', 1416, 700, 440, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: '65676B', charSpacing: 2 });
  ['Settings and privacy', 'Accounts Center', 'Password and security', 'Two-factor authentication'].forEach((t, i) => {
    text('fpt' + i, (i ? '›  ' : '') + t, 1416 + i * 18, 748 + i * 64, 440, 50, { fontSize: P(24), color: i === 3 ? K.fb : '1C1E21', fontFace: i === 3 ? FH : F, valign: 'middle' });
    an('fpt' + i, 'slide', 7400 + 300 * i, 500);
  });
  all(['fp'], 'rise', 7200, 600); an('fph', 'fade', 7300, 500);

  // =============================================================== 6. GMAIL (inbox style)
  slide(NOTE(65, `Next, Gmail: twelve out of fourteen, joint highest. [Inbox.] Its account protection is the best of all six: passkeys, 2-Step Verification and security keys, and the Advanced Protection Program for people at high risk. Google says Gmail blocks more than ninety-nine point nine percent of spam, phishing and malware, and Security Checkup shows every device and recent security event.

[Red row.] The weak point: email is encrypted in transit, but not end-to-end. And Gmail is the master key: if your Gmail falls, an attacker can reset the password of almost every other account you own. In Bangladesh, phishing emails imitate banks, universities and government offices.

[Right.] My suggestion: prompt every user to switch to passkeys, and warn more clearly about look-alike bank and government senders.`), 'FFFFFF');
  rect('sb', 0, 0, 330, 1080, 'F6F8FC');
  img('gml', I.gmM, 36, 30, 52, 52, 'Gmail'); text('gmn', 'Gmail', 100, 30, 200, 52, { fontSize: P(36), color: '5F6368', valign: 'middle' });
  stext('cmp', [{ text: 'Compose', options: { fontFace: FH } }], 30, 116, 200, 72, 'C2E7FF', { r: 0.35, align: 'center', extra: { color: '1F1F1F', fontSize: P(25) } });
  all(['sb', 'gml', 'gmn', 'cmp'], 'fade', 0, 600);
  [['inbox', 'Inbox', '4'], ['star', 'Starred', ''], ['shield', 'Security', '12/14'], ['warn', 'Spam', '99.9%'], ['trash', 'Bin', '']].forEach(([ic, l, n], i) => {
    const y = 222 + i * 64, act = i === 0;
    if (act) rect('lbA', 14, y, 300, 56, 'D3E3FD', { r: 0.5 });
    img('lbi' + i, I[ic + 'D'], 46, y + 16, 24, 24); text('lbt' + i, l, 92, y, 160, 56, { fontSize: P(25), color: '1F1F1F', fontFace: act ? FH : F, valign: 'middle' });
    if (n) text('lbn' + i, n, 210, y, 90, 56, { fontSize: P(21), color: '1F1F1F', fontFace: FH, valign: 'middle', align: 'right' });
    if (act) an('lbA', 'fade', 300, 500); an('lbi' + i, 'fade', 300 + 100 * i, 400); an('lbt' + i, 'fade', 300 + 100 * i, 400); if (n) an('lbn' + i, 'fade', 300 + 100 * i, 400);
  });
  stext('gsr', [{ text: '      Search mail: “security checkup”', options: { color: '5F6368' } }], 380, 26, 900, 64, 'EAF1FB', { r: 0.5, extra: { fontSize: P(24) } }); img('gsri', I.searchG, 404, 46, 24, 24);
  all(['gsr', 'gsri'], 'fade', 200, 500);
  text('ib', 'Primary', 380, 120, 300, 50, { fontSize: P(26), fontFace: FH, color: K.gmB }); rect('ibu', 380, 168, 140, 5, K.gmB, { r: 0.5 }); line('ibl', 380, 174, 1360, 174, 'E0E0E0');
  all(['ib', 'ibu', 'ibl'], 'fade', 400, 500);
  [['Google', 'Passkeys and 2-Step Verification', 'Sign in with your fingerprint; a stolen password alone is not enough.', '9:41', false],
   ['Gmail', 'More than 99.9% blocked', 'Spam, phishing and malware stopped before they reach you.', '9:30', false],
   ['Security Checkup', 'Your devices and recent activity', 'See every device and every security event on your account.', '8:12', false],
   ['Advanced Protection', 'For people at high risk', 'The strongest Google account protection, with security keys.', 'Mon', false],
   ['Weak point', 'Not end-to-end encrypted, and the master key', 'Encrypted in transit only. If Gmail falls, every reset link goes to the attacker.', 'now', true],
   ['Threat in Bangladesh', 'Phishing that imitates banks and universities', '“Your account will be suspended. Verify now.”', 'now', true]].forEach(([from, subj, snip, t, bad], i) => {
    const y = 186 + i * 112, d = 1200 + 650 * i;
    rect('er' + i, 380, y, 980, 104, bad ? 'FCE8E6' : (i % 2 ? 'FFFFFF' : 'F8FAFD'), { line: bad ? 'F6AEA9' : 'EEEEEE' });
    img('es' + i, bad ? I.warnBad : I.starD, 404, y + 40, 24, 24);
    text('ef' + i, from, 446, y + 8, 260, 40, { fontSize: P(24), fontFace: FH, color: bad ? 'C5221F' : '1F1F1F', valign: 'middle' });
    text('esu' + i, [{ text: subj, options: { fontFace: FH, color: '1F1F1F', breakLine: true } }, { text: snip, options: { color: '5F6368' } }], 716, y + 10, 560, 90, { fontSize: P(22) });
    text('et' + i, t, 1270, y + 8, 80, 40, { fontSize: P(20), color: '5F6368', align: 'right', fontFace: FH });
    all(['er' + i, 'es' + i, 'ef' + i, 'esu' + i, 'et' + i], 'slideR', d, 600);
  });
  // right panel
  rect('gp', 1400, 120, 490, 920, 'F6F8FC', { r: 0.04 }); an('gp', 'fade', 4800, 600);
  text('gph', 'YOUR SECURITY', 1436, 146, 420, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: '5F6368', charSpacing: 2 }); an('gph', 'fade', 5000, 400);
  await donut('gsc', tot('gm'), 14, K.gm, 1530, 186, 230, 5100, { label: tot('gm') + '/14', track: 'E3E7EE', fs: 0.2 });
  critBars('gcb', 'gm', 1436, 440, 420, 40, 5700, { tc: '5F6368', track: 'E3E7EE', fs: 19, lw: 150, col: K.gmB, vc: K.gmB });
  stext('gfx', [{ text: 'SUGGESTED FEATURE\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'FFFFFF', charSpacing: 2 } }, { text: 'Passkeys for every user, and clear warnings on look-alike bank and government senders.', options: { color: 'FFFFFF', fontSize: P(24), fontFace: FH } }],
    1436, 750, 420, 260, K.gm, { r: 0.08, pad: 24, valign: 'top' });
  an('gfx', 'rise', 6800, 800);

  // =============================================================== 7. WHATSAPP (chat style)
  slide(NOTE(70, `WhatsApp also scores twelve out of fourteen. [Yellow notice.] Its strongest point is encryption: every personal chat and call is end-to-end encrypted by default, so not even WhatsApp can read them. [Messages.] It offers a six-digit two-step verification PIN, passkeys, Chat Lock, encrypted backups, Silence Unknown Callers and Privacy Checkup.

[Red message.] But your phone number is your identity. If anyone gets your six-digit registration code, they can move your account to their own phone. In Bangladesh this happens through OTP-sharing tricks and SIM swaps, and the hijacked account then asks your friends and family for money.

[Last message.] My suggestion: make the two-step PIN mandatory at setup, and show a loud warning when a new phone takes over a number.`), 'FFFFFF');
  // chat list
  rect('cl', 0, 0, 600, 1080, 'FFFFFF'); rect('clh', 0, 0, 600, 120, K.waD);
  oval('wal', 30, 26, 68, 68, K.wa); img('wali', I.waW, 46, 42, 36, 36, 'WhatsApp'); text('wan', 'WhatsApp', 116, 30, 300, 60, { fontSize: P(38), fontFace: FH, color: 'FFFFFF', valign: 'middle' });
  all(['cl', 'clh', 'wal', 'wali', 'wan'], 'fade', 0, 600);
  CRIT.forEach((c, i) => {
    const y = 132 + i * 104, v = APPS.wa.s[i], d = 600 + 150 * i;
    oval('ca' + i, 26, y + 18, 68, 68, ['DFF6E8', 'E7F0FF', 'FFF3D6'][i % 3]); img('cai' + i, I[['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'][i] + 'D'], 46, y + 38, 28, 28);
    text('ct' + i, [{ text: c, options: { fontFace: FH, color: '111B21', breakLine: true } }, { text: v === 2 ? 'Strong, or on by default' : v === 1 ? 'Available, but optional' : 'Absent', options: { color: '667781' } }], 112, y + 14, 380, 80, { fontSize: P(23) });
    oval('cb' + i, 520, y + 34, 44, 44, LV(v)); text('cbv' + i, String(v), 520, y + 34, 44, 44, { fontSize: P(22), fontFace: FH, color: 'FFFFFF', align: 'center', valign: 'middle' });
    line('cs' + i, 112, y + 104, 600, y + 104, 'E9EDEF');
    all(['ca' + i, 'cai' + i, 'ct' + i, 'cs' + i], 'slide', d, 500); all(['cb' + i, 'cbv' + i], 'grow', d + 300, 400, { from: 0.2 });
  });
  // conversation
  imgp('wall', A_DIR + 'wa_wall.png', 600, 120, 1320, 960);
  rect('cvh', 600, 0, 1320, 120, 'F0F2F5'); oval('cva', 630, 26, 68, 68, K.waT); img('cvai', I.shield, 648, 44, 32, 32);
  text('cvn', [{ text: 'Security check', options: { fontFace: FH, color: '111B21', breakLine: true } }, { text: `online  ·  rubric score ${tot('wa')}/14`, options: { color: '667781', fontSize: P(21) } }], 716, 26, 600, 72, { fontSize: P(28) });
  all(['wall', 'cvh', 'cva', 'cvai', 'cvn'], 'fade', 300, 600);
  stext('e2e', [{ text: 'Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to or share them.' }], 860, 140, 800, 70, 'FFEECD', { r: 0.15, pad: 14, align: 'center', extra: { color: '54656F', fontSize: P(21) } });
  an('e2e', 'grow', 1800, 600, { from: 0.6 });
  const bub = (n, t, x, y, w, h, out, d, col) => { stext(n, t, x, y, w, h, col || (out ? 'D9FDD3' : 'FFFFFF'), { r: 0.12, pad: 18, valign: 'top', shadow: 3, extra: { color: '111B21', fontSize: P(25) } }); an(n, 'rise', d, 500); };
  bub('m1', 'Two-step verification PIN, passkeys and Chat Lock keep your account locked.', 640, 236, 760, 96, false, 2500);
  bub('m2', 'Encrypted backups, Silence Unknown Callers and Privacy Checkup are built in.', 640, 344, 760, 96, false, 3300);
  bub('m3', [{ text: 'Weak point  ', options: { bold: true, color: 'C5221F' } }, { text: 'Your phone number is your identity: anyone with your 6-digit code can move your account to their phone.' }], 1060, 470, 820, 130, true, 4300, 'FFE3E3');
  bub('m4', [{ text: 'Threat in Bangladesh  ', options: { bold: true, color: 'A15C00' } }, { text: 'OTP-sharing tricks and SIM swaps; the hijacked account then asks friends for money.' }], 1060, 616, 820, 130, true, 5300, 'FFF4D6');
  bub('m5', [{ text: 'Suggested feature  ', options: { bold: true, color: K.waD } }, { text: 'Make the two-step PIN mandatory at setup, and warn loudly when a new phone takes over a number.' }], 1060, 762, 820, 130, true, 6300);
  rect('inb', 600, 990, 1320, 90, 'F0F2F5'); stext('inp', '  Type a message', 680, 1006, 1080, 58, 'FFFFFF', { r: 0.5, extra: { color: '8696A0', fontSize: P(24) } });
  oval('snd', 1790, 1002, 66, 66, K.wa); img('sndi', I.send, 1806, 1018, 34, 34);
  all(['inb', 'inp', 'snd', 'sndi'], 'fade', 600, 600); an('snd', 'pulse', 7200, 1600, { scale: 106 });

  // =============================================================== 8. bKASH (wallet style)
  slide(NOTE(70, `bKash is different: it does not hold our messages, it holds our money. It scores nine out of fourteen. [Pink card.] Its locks are real: a PIN for every login and transaction, an OTP when you log in on a new device, Face ID and fingerprint login, and a notification for every transaction.

[Statement.] But the biggest weakness is the user. Scammers call pretending to be bKash, or send "wrong number" money requests, to get a PIN or an OTP. And bKash accounts are used to cash out stolen money fast: in August 2025, about twenty-seven lakh taka was taken from fifty-four Standard Chartered card holders and pushed into bKash and Nagad wallets, then cashed out within minutes.

[Bottom.] My suggestion: a short cooling-off period for the first payment to a new number, and a one-tap "freeze my account" button.`), 'F4F5F7');
  imgp('bkh', A_DIR + 'bk_head.png', 0, 0, 1920, 420); an('bkh', 'fade', 0, 600);
  oval('bkc', 60, 44, 96, 96, 'FFFFFF'); text('bkb', 'b', 60, 44, 96, 96, { fontSize: P(64), fontFace: FB, color: K.bk, align: 'center', valign: 'middle' });
  text('bkt', [{ text: 'bKash', options: { fontFace: FB, fontSize: P(54), color: 'FFFFFF', breakLine: true } }, { text: 'Mobile financial service  ·  security review', options: { fontSize: P(23), color: 'FFD3E6' } }], 180, 44, 900, 110);
  all(['bkc', 'bkb'], 'grow', 300, 600, { from: 0.3 }); an('bkt', 'fade', 500, 700);
  // balance-style score card
  rect('bal', 60, 200, 760, 190, 'FFFFFF', { r: 0.12, shadow: 16, so: 4, sop: 0.2 });
  text('balh', 'SECURITY BALANCE', 100, 224, 500, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: '8A8F99', charSpacing: 2 });
  text('balv', [{ text: String(tot('bk')), options: { fontFace: FB, fontSize: P(96), color: K.bk } }, { text: '  / 14', options: { fontSize: P(36), color: '8A8F99' } }], 100, 254, 500, 120, { valign: 'middle' });
  stext('balt', 'Tap for details', 560, 296, 220, 56, 'FDE4EF', { r: 0.5, align: 'center', extra: { color: K.bk, fontFace: FH, fontSize: P(22) } });
  an('bal', 'rise', 700, 800); an('balh', 'fade', 1000, 500); an('balv', 'grow', 1100, 800, { from: 0.4 }); an('balt', 'fade', 1500, 500); an('balt', 'pulse', 2300, 1600, { scale: 103 });
  // service grid = features
  [['key', 'PIN for every login and transaction'], ['phone', 'OTP on a new device'], ['finger', 'Face ID and fingerprint login'], ['bell', 'A notification for every transaction']].forEach(([ic, l], i) => {
    const x = 60 + i * 192, d = 1800 + 300 * i;
    rect('sv' + i, x, 430, 176, 230, 'FFFFFF', { r: 0.1, shadow: 8, so: 2, sop: 0.1 });
    oval('svo' + i, x + 48, 452, 80, 80, 'FDE4EF'); img('svi' + i, I[ic + 'D'], x + 68, 472, 40, 40);
    text('svl' + i, l, x + 10, 546, 156, 104, { fontSize: P(21), color: '1C1E21', align: 'center' });
    all(['sv' + i], 'rise', d, 600); an('svo' + i, 'grow', d + 200, 400, { from: 0.3 }); an('svi' + i, 'grow', d + 250, 400, { from: 0.3 }); an('svl' + i, 'fade', d + 300, 500);
  });
  critBars('bcb', 'bk', 60, 690, 760, 46, 3200, { tc: '5F6368', track: 'E5E7EB', fs: 20, lw: 170, col: K.bk, vc: K.bk });
  // statement panel
  rect('st', 880, 200, 1000, 840, 'FFFFFF', { r: 0.05, shadow: 16, so: 4, sop: 0.18 }); an('st', 'rise', 4300, 800);
  text('sth', 'STATEMENT  ·  WHERE THE MONEY LEAKS', 920, 230, 900, 34, { fontSize: P(21), fontFace: MONO, bold: true, color: '8A8F99', charSpacing: 2 }); an('sth', 'fade', 4500, 500);
  [['warn', 'Weak point: the user', 'Scammers pose as bKash agents or officials to get a PIN or an OTP; bKash never asks for either.', K.bad, '–'],
   ['money', 'Cash-out in minutes', 'Aug 2025: about Tk 27 lakh stolen from 54 Standard Chartered card holders went into bKash and Nagad wallets, then was cashed out.', K.mid, 'Tk 27 lakh'],
   ['chart', 'Bangladesh, 2025', '81,423 fraud incidents in MFS, cheque and card payments; Tk 92.60 crore lost (Bangladesh Bank).', K.bk, 'Tk 92.6 cr']].forEach(([ic, h, b, col, amt], i) => {
    const y = 290 + i * 210, d = 4800 + 900 * i;
    oval('so' + i, 920, y + 20, 72, 72, col); img('soi' + i, I[ic], 940, y + 40, 32, 32);
    text('stt' + i, [{ text: h, options: { fontFace: FH, color: '1C1E21', fontSize: P(28), breakLine: true } }, { text: b, options: { color: '5F6368', fontSize: P(22) } }], 1016, y + 8, 640, 180);
    text('sta' + i, amt, 1640, y + 16, 210, 50, { fontSize: P(28), fontFace: FH, color: col, align: 'right' });
    line('sts' + i, 920, y + 198, 1850, y + 198, 'EEEEEE');
    all(['so' + i, 'soi' + i], 'grow', d, 500, { from: 0.3 }); an('stt' + i, 'fade', d + 150, 600); an('sta' + i, 'slideR', d + 300, 500); an('sts' + i, 'fade', d + 300, 400);
  });
  stext('bfx', [{ text: 'SUGGESTED FEATURE   ', options: { fontFace: MONO, bold: true, color: 'FFFFFF', fontSize: P(19), charSpacing: 2 } }, { text: 'A cooling-off period for the first payment to a new number, and a one-tap “freeze my account” button.', options: { color: 'FFFFFF', fontSize: P(24), fontFace: FH } }],
    920, 924, 930, 96, K.bk, { r: 0.2, pad: 20 });
  an('bfx', 'wipe', 7700, 900);

  // =============================================================== 9. DISCORD (server style)
  slide(NOTE(65, `Discord, where many young people and gamers spend their evenings: ten out of fourteen. [Bot messages.] Its login protection is strong: two-factor authentication with an authenticator app or a security key, backup codes, and a devices list where you can log out any session. Since May 2026, every voice and video call is end-to-end encrypted by default with Discord's DAVE protocol.

[Red embed.] But text messages are not end-to-end encrypted. And Discord accounts are stolen through fake "free Nitro" gifts, fake login pages, and QR-code login tricks, where the victim scans a code that logs the scammer in. The stolen account then sends the same trap to all its friends.

[Last embed.] My suggestion: a clear warning before any QR-code login, and a cooling-off check before a new device can message all your friends.`), '313338');
  rect('rail', 0, 0, 104, 1080, '1E1F22');
  oval('rs0', 20, 20, 64, 64, K.dc); img('rs0i', I.dcW, 34, 34, 36, 36, 'Discord');
  ['wa', 'tg', 'fb'].forEach((k, i) => { oval('rs' + (i + 1), 20, 120 + i * 84, 64, 64, '313338'); img('rs' + (i + 1) + 'i', I[k + 'W'], 36, 136 + i * 84, 32, 32); });
  oval('rsp', 20, 372, 64, 64, '313338'); img('rspi', I.plus, 40, 392, 24, 24);
  all(['rail', 'rs0', 'rs0i', 'rs1', 'rs1i', 'rs2', 'rs2i', 'rs3', 'rs3i', 'rsp', 'rspi'], 'fade', 0, 600);
  rect('chs', 104, 0, 380, 1080, '2B2D31');
  text('srv', 'Security HQ', 130, 18, 330, 60, { fontSize: P(30), fontFace: FH, color: 'F2F3F5', valign: 'middle' }); line('srvl', 104, 86, 484, 86, '1F2023');
  text('tch', 'TEXT CHANNELS', 130, 112, 330, 30, { fontSize: P(19), fontFace: FH, color: '949BA4', charSpacing: 1 });
  ['security-features', 'weak-point', 'scams-in-bangladesh', 'suggested-feature'].forEach((c, i) => {
    const y = 150 + i * 56, act = i === 0;
    if (act) rect('chA', 116, y, 356, 48, '404249', { r: 0.2 });
    img('chi' + i, I.hash, 134, y + 14, 20, 20); text('chn' + i, c, 166, y, 290, 48, { fontSize: P(23), color: act ? 'F2F3F5' : '949BA4', valign: 'middle' });
  });
  text('vch', 'VOICE CHANNELS', 130, 392, 330, 30, { fontSize: P(19), fontFace: FH, color: '949BA4', charSpacing: 1 });
  img('vci', I.volume, 134, 444, 22, 22); text('vcn', 'end-to-end encrypted calls', 166, 432, 300, 48, { fontSize: P(23), color: '949BA4', valign: 'middle' });
  img('vcl', I.lock, 134, 494, 18, 18); text('vct', 'DAVE  ·  on by default since May 2026', 162, 486, 300, 34, { fontSize: P(18), color: K.good, valign: 'middle' });
  all(['chs', 'srv', 'srvl', 'tch', 'vch', 'vci', 'vcn', 'vcl', 'vct'], 'fade', 200, 600); an('chA', 'fade', 400, 400); [0, 1, 2, 3].forEach(i => { an('chi' + i, 'fade', 300 + 100 * i, 400); an('chn' + i, 'fade', 300 + 100 * i, 400); });
  // score in channel sidebar footer
  rect('scb', 116, 560, 356, 500, '232428', { r: 0.06 }); an('scb', 'fade', 900, 500);
  await donut('dsc', tot('dc'), 14, K.dc, 194, 580, 200, 1000, { label: tot('dc') + '/14', track: '3F4147', fs: 0.21, vc: 'F2F3F5' });
  critBars('dcb', 'dc', 132, 792, 324, 36, 1600, { tc: 'B5BAC1', track: '3F4147', fs: 17, lw: 120, col: K.dc, vc: 'C9CDFB' });
  // messages
  text('chh', [{ text: '#  ', options: { color: '80848E' } }, { text: 'security-features', options: { fontFace: FH, color: 'F2F3F5' } }], 520, 18, 900, 60, { fontSize: P(28), valign: 'middle' }); line('chhl', 484, 86, 1920, 86, '1F2023');
  all(['chh', 'chhl'], 'fade', 300, 500);
  const embed = (pre, y, col, title, body, d, h = 150) => {
    oval(pre + 'a', 520, y, 64, 64, K.dc); img(pre + 'ai', I.robot, 536, y + 16, 32, 32);
    text(pre + 'n', [{ text: 'SecurityBot  ', options: { fontFace: FH, color: 'F2F3F5' } }, { text: 'BOT', options: { fontSize: P(16), color: 'FFFFFF', bold: true } }, { text: '   Today at 9:41', options: { color: '949BA4', fontSize: P(18) } }], 604, y, 900, 36, { fontSize: P(24) });
    rect(pre + 'e', 604, y + 44, 1260, h, '2B2D31', { r: 0.05 }); rect(pre + 'eb', 604, y + 44, 8, h, col, { r: 0.5 });
    text(pre + 't', [{ text: title, options: { fontFace: FH, color: 'F2F3F5', fontSize: P(26), breakLine: true } }, { text: body, options: { color: 'DBDEE1', fontSize: P(23) } }], 636, y + 60, 1200, h - 30);
    all([pre + 'a', pre + 'ai', pre + 'n'], 'fade', d, 500); all([pre + 'e', pre + 'eb'], 'slideR', d + 150, 600); an(pre + 't', 'fade', d + 350, 600);
  };
  embed('e1', 112, K.good, 'Security features', 'Two-factor authentication with an authenticator app or security key, backup codes, a devices list to log out any session, and end-to-end encrypted voice and video calls.', 2400, 160);
  embed('e2', 340, K.bad, 'Weak point', 'Text messages are not end-to-end encrypted.', 3700, 110);
  embed('e3', 518, K.mid, 'Scams to watch', 'Fake “free Nitro” gifts and login pages, token-stealing downloads, and QR-code login tricks. A stolen account then sends the same trap to every friend.', 4900, 160);
  embed('e4', 746, K.dc, 'Suggested feature', 'A clear warning before any QR-code login, and a cooling-off check before a new device can message all your friends.', 6200, 160);
  stext('dmi', '   Message #security-features', 520, 984, 1350, 70, '383A40', { r: 0.2, extra: { color: '6D6F78', fontSize: P(24) } }); an('dmi', 'fade', 600, 500);

  // =============================================================== 10. TELEGRAM (channel style)
  slide(NOTE(70, `And Telegram, the app from our opening story: eight out of fourteen, the lowest. [Pinned post.] Here is the fact most users do not know: normal Telegram chats are not end-to-end encrypted. They are cloud chats, encrypted between your phone and Telegram's servers, but stored on those servers. Groups and channels are never end-to-end encrypted. Only Secret Chats are, and you have to start them yourself, one person at a time.

[Posts.] Telegram does have good tools: a two-step verification password, a passcode lock, an active sessions list where you can end any login, and you can hide your phone number.

[Red post.] But fake channels run investment and "part-time job" task scams, exactly like the one that took ninety-four lakh taka. My suggestion: end-to-end encryption by default for personal chats, and verified badges for official channels.`), 'FFFFFF');
  rect('tl', 0, 0, 560, 1080, 'FFFFFF'); rect('tlh', 0, 0, 560, 110, 'FFFFFF'); line('tlhl', 0, 110, 560, 110, 'E7E7E7');
  oval('tlo', 28, 22, 66, 66, K.tg); img('tloi', I.tgW, 44, 38, 34, 34, 'Telegram'); text('tln', 'Telegram', 112, 22, 300, 66, { fontSize: P(36), fontFace: FH, color: '222222', valign: 'middle' });
  all(['tl', 'tlh', 'tlhl', 'tlo', 'tloi', 'tln'], 'fade', 0, 500);
  [['Security Review', 'Pinned: cloud chats are NOT end-to-end encrypted', K.tg, true], ['Secret Chat', 'End-to-end encrypted · start it yourself', '2AA876', false], ['“Jewellery Co. HR”', 'Earn daily from home. Click to start…', 'E17076', false], ['Active sessions', '3 devices · terminate others?', '7E57C2', false], ['Saved Messages', 'Two-step verification: password set', '4FA3E2', false]].forEach(([n, l, col, act], i) => {
    const y = 120 + i * 100, d = 500 + 150 * i;
    if (act) rect('tlA', 0, y, 560, 100, K.tg);
    oval('tla' + i, 24, y + 14, 72, 72, col); text('tlai' + i, n.replace(/[“”]/g, '')[0], 24, y + 14, 72, 72, { fontSize: P(32), fontFace: FH, color: 'FFFFFF', align: 'center', valign: 'middle' });
    text('tlt' + i, [{ text: n, options: { fontFace: FH, color: act ? 'FFFFFF' : '222222', breakLine: true } }, { text: l, options: { color: act ? 'E8F6FF' : '8A8A8A', fontSize: P(20) } }], 112, y + 14, 430, 76, { fontSize: P(24) });
    if (act) an('tlA', 'fade', d, 400); all(['tla' + i, 'tlai' + i, 'tlt' + i], 'slide', d, 500);
  });
  rect('tsp', 24, 650, 512, 400, 'F4F8FB', { r: 0.06 }); an('tsp', 'fade', 1300, 500);
  await donut('tsc', tot('tg'), 14, K.tg, 60, 674, 170, 1400, { label: tot('tg') + '/14', track: 'DDE7EF', fs: 0.21 });
  text('tscl', [{ text: 'Rubric score', options: { fontFace: FH, color: '222222', breakLine: true } }, { text: 'the lowest of the six apps', options: { color: '8A8A8A', fontSize: P(20) } }], 252, 700, 270, 90, { fontSize: P(26) }); an('tscl', 'fade', 1800, 500);
  critBars('tcb', 'tg', 52, 860, 470, 26, 1900, { tc: '5F6B76', track: 'DDE7EF', fs: 16, lw: 140, col: K.tg });
  imgp('twl', A_DIR + 'tg_wall.png', 560, 0, 1360, 1080); an('twl', 'fade', 200, 600);
  rect('tch', 560, 0, 1360, 110, 'FFFFFF', { shadow: 6, so: 2, sop: 0.1 }); oval('tca', 588, 20, 70, 70, K.tg); img('tcai', I.shield, 606, 38, 34, 34);
  text('tcn', [{ text: 'Security Review', options: { fontFace: FH, color: '222222', breakLine: true } }, { text: 'channel  ·  6 apps tested', options: { color: '8A8A8A', fontSize: P(20) } }], 676, 20, 600, 72, { fontSize: P(28) });
  all(['tch', 'tca', 'tcai', 'tcn'], 'fade', 300, 500);
  stext('pin', [{ text: 'Pinned   ', options: { bold: true, color: K.tg } }, { text: 'Normal cloud chats, groups and channels are NOT end-to-end encrypted. Only Secret Chats are, one person at a time.', options: { color: '222222' } }], 600, 130, 1280, 96, 'FFFFFF', { r: 0.1, pad: 20, shadow: 4, extra: { fontSize: P(25) } });
  an('pin', 'drop', 1600, 700);
  const tpost = (n, t, y, h, d, col, views) => {
    stext(n, t, 600, y, 1040, h, col || 'FFFFFF', { r: 0.08, pad: 22, valign: 'top', shadow: 4, extra: { fontSize: P(25), color: '222222' } });
    img(n + 'v', I.eyeG, 1500, y + h - 38, 22, 22); text(n + 'vt', views, 1528, y + h - 44, 100, 32, { fontSize: P(18), color: '8A8A8A' });
    an(n, 'rise', d, 600); an(n + 'v', 'fade', d + 400, 400); an(n + 'vt', 'fade', d + 400, 400);
  };
  tpost('tp1', [{ text: 'Security features\n', options: { bold: true, color: K.tg } }, { text: 'Two-step verification password and passcode lock. An active sessions list to end any login. Hide your phone number; control who can add you.' }], 252, 190, 2700, null, '12.4K');
  tpost('tp2', [{ text: 'Threat in Bangladesh\n', options: { bold: true, color: 'C5221F' } }, { text: 'Fake channels run investment and “part-time job” task scams: the same trap that took Tk 94 lakh in our opening story.' }], 466, 170, 4200, 'FFF1F0', '9.8K');
  tpost('tp3', [{ text: 'Suggested feature\n', options: { bold: true, color: K.tg } }, { text: 'End-to-end encryption by default for personal chats, and verified badges for official channels.' }], 660, 150, 5600, null, '15.1K');
  rect('tib', 560, 990, 1360, 90, 'FFFFFF'); stext('tin', '  Broadcast a message…', 640, 1006, 1140, 58, 'F4F4F5', { r: 0.5, extra: { color: '9E9E9E', fontSize: P(24) } });
  oval('tsn', 1800, 1002, 66, 66, K.tg); img('tsni', I.send, 1816, 1018, 34, 34);
  all(['tib', 'tin', 'tsn', 'tsni'], 'fade', 600, 500); an('tsn', 'pulse', 7000, 1600, { scale: 106 });

  // =============================================================== 11. SCOREBOARD
  slide(NOTE(70, `So here is the scoreboard. [Bars.] Gmail and WhatsApp tie at twelve out of fourteen, Facebook scores eleven, Discord ten, bKash nine and Telegram eight.

[Heat map.] The heat map shows where each app is strong, in green, partial, in amber, and weak, in red. Two lessons stand out. First, look at the recovery column: only Gmail scores two. Recovery is where hackers lock victims out for good. Second, encryption is not the whole story: Gmail has no end-to-end encryption, yet it ties for first because its login and recovery protection is so strong.`), I.bgDark);
  text('tag', 'THE SCOREBOARD', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'Gmail and WhatsApp lead; Telegram trails', 128, 112, 1664, 100, { fontSize: P(60), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  const rank = [...ORDER].sort((a, b) => tot(b) - tot(a));
  rect('rp', 128, 250, 700, 740, K.card, { r: 0.04, line: K.edge }); an('rp', 'fade', 700, 500);
  text('rph', 'TOTAL SCORE  ·  OUT OF 14', 168, 278, 600, 30, { fontSize: P(20), fontFace: MONO, bold: true, color: K.soft, charSpacing: 2 }); an('rph', 'fade', 800, 400);
  rank.forEach((k, i) => {
    const y = 330 + i * 106, d = 900 + 300 * i, w = 420 * tot(k) / 14, col = APPS[k].c;
    oval('ro' + i, 168, y + 14, 64, 64, k === 'gm' ? 'FFFFFF' : col);
    if (k === 'bk') text('roi' + i, 'b', 168, y + 14, 64, 64, { fontSize: P(40), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
    else img('roi' + i, k === 'gm' ? I.gmM : I[k + 'W'], 182, y + 28, 36, 36);
    text('rn' + i, APPS[k].n, 248, y + 4, 200, 40, { fontSize: P(26), fontFace: FH });
    rect('rt' + i, 248, y + 52, 420, 22, K.edge, { r: 0.5 }); rect('rb' + i, 248, y + 52, w, 22, col, { r: 0.5, glow: col, go: 0.4 });
    text('rv' + i, String(tot(k)), 690, y + 22, 100, 60, { fontSize: P(48), fontFace: FB, color: K.white });
    all(['ro' + i, 'roi' + i], 'grow', d, 500, { from: 0.3 }); an('rn' + i, 'fade', d + 100, 400); an('rt' + i, 'fade', d + 100, 400); an('rb' + i, 'wipe', d + 200, 900); an('rv' + i, 'grow', d + 800, 500, { from: 0.4 });
  });
  rect('hp', 860, 250, 932, 740, K.card, { r: 0.04, line: K.edge }); an('hp', 'fade', 2800, 500);
  CS.forEach((c, j) => { text('hc' + j, c, 1010 + j * 112, 270, 112, 70, { fontSize: P(18), fontFace: FH, color: K.soft, align: 'center', valign: 'bottom' }); an('hc' + j, 'fade', 2900 + 60 * j, 400); });
  ORDER.forEach((k, i) => {
    const y = 356 + i * 100;
    text('hn' + i, APPS[k].n, 884, y, 130, 90, { fontSize: P(23), fontFace: FH, valign: 'middle' }); an('hn' + i, 'fade', 3200 + 100 * i, 400);
    APPS[k].s.forEach((v, j) => {
      stext('hx' + i + '_' + j, String(v), 1014 + j * 112, y + 6, 104, 84, LV(v), { r: 0.12, align: 'center', extra: { color: '0B0D12', fontFace: FB, fontSize: P(32) } });
      an('hx' + i + '_' + j, 'grow', 3400 + 70 * (i + j), 450, { from: 0.3 });
    });
  });
  text('hl', 'Recovery: only Gmail scores 2', 1462, 960, 330, 28, { fontSize: P(18), italic: true, color: K.mid, align: 'right' }); an('hl', 'fade', 5000, 500);

  // =============================================================== 12. WHO CAN READ YOUR MESSAGES
  slide(NOTE(60, `One question matters more than any other: who can read your messages? [Chart.] On WhatsApp, everything is end-to-end encrypted by default. On Facebook Messenger, personal chats are too. Discord encrypts every call by default, but not its text messages. Telegram encrypts end-to-end only in Secret Chats, which you must start yourself. Gmail encrypts email on the way, but it is readable on Google's servers. And bKash is not a messaging app at all: its risk is your PIN and your OTP. So when an app says "encrypted", always ask: encrypted from whom?`), I.bgDark);
  text('tag', 'ONE QUESTION THAT MATTERS', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'Who can read your messages?', 128, 112, 1664, 100, { fontSize: P(64), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  const zones = [['ONLY YOU AND THEM', 'End-to-end encrypted by default', K.good], ['PARTLY', 'End-to-end for some features only', K.mid], ['THE COMPANY CAN', 'Encrypted on the way, readable on the server', K.bad]];
  zones.forEach(([h, s, col], i) => {
    const x = 128 + i * 562, d = 900 + 300 * i;
    rect('z' + i, x, 260, 540, 10, col, { r: 0.5, glow: col, go: 0.4 });
    text('zh' + i, h, x, 288, 540, 40, { fontSize: P(26), fontFace: MONO, bold: true, color: col, charSpacing: 2 });
    text('zs' + i, s, x, 330, 540, 40, { fontSize: P(24), color: K.soft });
    an('z' + i, 'wipe', d, 700); an('zh' + i, 'fade', d + 200, 500); an('zs' + i, 'fade', d + 300, 500);
  });
  [[0, 'wa', 'WhatsApp', 'Every chat and every call'], [0, 'fb', 'Messenger', 'Personal chats, since Dec 2023'], [1, 'dc', 'Discord', 'Calls yes; text messages no'], [1, 'tg', 'Telegram', 'Secret Chats only; you start them'],
   [2, 'gm', 'Gmail', 'Encrypted in transit (TLS) only'], [2, 'tg2', 'Telegram cloud chats', 'The default chat, groups and channels']].forEach(([z, k, n, s], i) => {
    const kk = k.replace('2', ''), col = zones[z][2], cnt = [0, 1, 0, 1, 0, 1][i], x = 128 + z * 562, y = 410 + cnt * 190, d = 2200 + 500 * i;
    rect('c' + i, x, y, 540, 166, K.card, { r: 0.08, line: col, lw: 1.5 });
    oval('co' + i, x + 28, y + 41, 84, 84, kk === 'gm' ? 'FFFFFF' : APPS[kk].c); img('coi' + i, kk === 'gm' ? I.gmM : I[kk + 'W'], x + 48, y + 61, 44, 44, n);
    text('ct' + i, [{ text: n, options: { fontFace: FH, fontSize: P(32), color: K.white, breakLine: true } }, { text: s, options: { fontSize: P(23), color: K.soft } }], x + 136, y + 34, 380, 110);
    all(['c' + i, 'co' + i, 'coi' + i, 'ct' + i], 'drop', d, 700);
  });
  stext('bkn', [{ text: 'bKash  ', options: { fontFace: FH, color: K.white } }, { text: 'is not a messaging app: its risk is your PIN and your OTP, which bKash never asks for.', options: { color: 'FFD3E6' } }], 128, 806, 1664, 80, K.bk, { r: 0.2, pad: 24, extra: { fontSize: P(26) } });
  an('bkn', 'wipe', 5400, 900);
  text('ask', 'When an app says “encrypted”, ask: encrypted from whom?', 128, 912, 1664, 60, { fontSize: P(36), fontFace: FH, color: K.tg, align: 'center' }); an('ask', 'rise', 6400, 800);

  // =============================================================== 13. RECOMMENDATIONS
  slide(NOTE(75, `So what should change? [Left.] For the platforms, one default each. Facebook: two-factor authentication on by default for new accounts and pages. Gmail: passkeys for every user, and warnings on look-alike senders. WhatsApp: a mandatory two-step PIN. bKash: a cooling-off period for the first payment to a new number. Discord: a warning before any QR-code login. And Telegram: end-to-end encryption by default, and verified official channels.

[Right.] And for every one of us, a five-minute routine. Turn on two-step verification everywhere, with an app or a passkey. Never share a code or a PIN, with anyone. Give Gmail its own password, because it is the master key. Check your logged-in devices. And use Secret Chats for anything private on Telegram.`), I.bgDark);
  text('tag', 'WHAT SHOULD CHANGE', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'Turn optional locks into default locks', 128, 112, 1664, 100, { fontSize: P(60), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  text('lh', 'FOR THE PLATFORMS', 128, 250, 900, 30, { fontSize: P(21), fontFace: MONO, bold: true, color: K.soft, charSpacing: 2 }); an('lh', 'fade', 800, 400);
  [['fb', '2FA on by default for new accounts and pages'], ['gm', 'Passkeys for all; warnings on look-alike senders'], ['wa', 'A mandatory two-step PIN at setup'], ['bk', 'Cooling-off for the first payment to a new number'], ['dc', 'A warning before any QR-code login'], ['tg', 'Default end-to-end encryption; verified channels']].forEach(([k, t], i) => {
    const y = 292 + i * 116, d = 1000 + 450 * i, col = APPS[k].c;
    rect('pr' + i, 128, y, 1000, 100, K.card, { r: 0.12, line: K.edge }); rect('prb' + i, 128, y, 10, 100, col, { r: 0.5 });
    oval('po' + i, 160, y + 18, 64, 64, k === 'gm' ? 'FFFFFF' : col);
    if (k === 'bk') text('poi' + i, 'b', 160, y + 18, 64, 64, { fontSize: P(40), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
    else img('poi' + i, k === 'gm' ? I.gmM : I[k + 'W'], 176, y + 34, 32, 32);
    text('pt' + i, [{ text: APPS[k].n + '   ', options: { fontFace: FH, color: col } }, { text: t, options: { color: K.light } }], 248, y, 860, 100, { fontSize: P(27), valign: 'middle' });
    all(['pr' + i, 'prb' + i], 'slide', d, 600); all(['po' + i, 'poi' + i], 'grow', d + 150, 400, { from: 0.3 }); an('pt' + i, 'fade', d + 200, 500);
  });
  rect('up', 1168, 250, 624, 760, K.card2, { r: 0.05, line: K.good, lw: 1.5 }); an('up', 'rise', 4000, 700);
  text('uh', [{ text: 'FOR EVERY USER', options: { fontFace: MONO, bold: true, fontSize: P(21), color: K.good, charSpacing: 2, breakLine: true } }, { text: 'A five-minute routine', options: { fontFace: FH, fontSize: P(36), color: K.white } }], 1208, 278, 560, 100);
  an('uh', 'fade', 4200, 500);
  ['Two-step verification everywhere, with an app or a passkey', 'Never share a code or a PIN, with anyone', 'Give Gmail its own password: it is the master key', 'Check your logged-in devices', 'Use Secret Chats for anything private on Telegram'].forEach((t, i) => {
    const y = 404 + i * 116, d = 4500 + 600 * i;
    oval('uc' + i, 1208, y + 14, 60, 60, K.good, { glow: K.good, go: 0.4 }); img('uci' + i, I.checkD, 1226, y + 32, 24, 24);
    text('ut' + i, t, 1290, y, 470, 92, { fontSize: P(25), valign: 'middle' });
    all(['uc' + i, 'uci' + i], 'grow', d, 400, { from: 0.2 }); an('ut' + i, 'slide', d + 100, 500);
  });

  // =============================================================== 14. CONCLUSION
  slide(NOTE(45, `So which app is the most secure? There is no single answer. For your account, Gmail. For your private messages, WhatsApp. For your money, bKash's locks are strong, but only if you never hand over your PIN or OTP. And Telegram is the weakest by default.

[Pause.] Remember the man who lost ninety-four lakh taka. Not one app was hacked. The lock was opened from the inside. The most secure app is the one you set up, and the one you never let a stranger open. Thank you. I am happy to take your questions.`), I.bgDark, 'black');
  text('tag', 'THE VERDICT', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'There is no single “most secure” app', 128, 112, 1664, 100, { fontSize: P(60), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  [['gm', 'Best for your account', 'Gmail', 'Passkeys, recovery, phishing filters', K.good], ['wa', 'Best for your messages', 'WhatsApp', 'End-to-end encrypted by default', K.good], ['bk', 'Best kept with your PIN', 'bKash', 'Strong locks, if you never share a code', K.mid], ['tg', 'Weakest by default', 'Telegram', 'Cloud chats are not end-to-end encrypted', K.bad]].forEach(([k, h, n, s, col], i) => {
    const x = 128 + i * 422, d = 1000 + 600 * i;
    rect('v' + i, x, 260, 400, 400, K.card, { r: 0.06, line: col, lw: 1.5, glow: col, go: 0.18 });
    text('vh' + i, h.toUpperCase(), x + 28, 290, 344, 60, { fontSize: P(19), fontFace: MONO, bold: true, color: col, charSpacing: 1 });
    oval('vo' + i, x + 140, 360, 120, 120, k === 'gm' ? 'FFFFFF' : APPS[k].c, { glow: APPS[k].c, go: 0.4 });
    if (k === 'bk') text('voi' + i, 'b', x + 140, 360, 120, 120, { fontSize: P(78), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
    else img('voi' + i, k === 'gm' ? I.gmM : I[k + 'W'], x + 170, 390, 60, 60, n);
    text('vn' + i, n, x, 500, 400, 56, { fontSize: P(44), fontFace: FB, color: K.white, align: 'center' });
    text('vs' + i, s, x + 24, 566, 352, 80, { fontSize: P(23), color: K.soft, align: 'center' });
    an('v' + i, 'rise', d, 700); an('vh' + i, 'fade', d + 200, 500); all(['vo' + i, 'voi' + i], 'grow', d + 300, 600, { from: 0.2 }); an('vn' + i, 'fade', d + 500, 500); an('vs' + i, 'fade', d + 600, 500);
  });
  text('close', [{ text: 'Not one app was hacked. ', options: { color: K.white } }, { text: 'The lock was opened from the inside.', options: { color: K.bk } }], 128, 712, 1664, 80, { fontSize: P(48), fontFace: FB, align: 'center' });
  an('close', 'rise', 4000, 1000);
  text('close2', 'The most secure app is the one you set up, and never let a stranger open.', 128, 800, 1664, 50, { fontSize: P(30), color: K.soft, align: 'center' }); an('close2', 'fade', 5000, 800);
  stext('qa', 'Thank you  ·  Questions?', 710, 890, 500, 80, K.white, { r: 0.5, align: 'center', extra: { color: '0B0D12', fontFace: FH, fontSize: P(32) } });
  an('qa', 'grow', 6000, 700, { from: 0.6 }); an('qa', 'pulse', 7000, 1800, { scale: 103 });

  // =============================================================== 15. SOURCES
  slide(NOTE(10, `[Leave this slide up during questions.]`), I.bgDark);
  text('tag', 'SOURCES', 128, 70, 1000, 36, { fontSize: P(24), fontFace: MONO, bold: true, color: K.soft, charSpacing: 4 });
  text('h', 'References', 128, 112, 1664, 100, { fontSize: P(60), fontFace: FB, color: K.white });
  an('tag', 'wipe', 200, 700); an('h', 'rise', 400, 900);
  ['Dhaka Tribune and bdnews24 (2026). CID arrests over Tk 94 lakh Telegram job scam.', 'Global Anti-Scam Alliance and Feedzai (2025). Global State of Scams 2025.', 'Federal Bureau of Investigation, IC3 (2026). Internet Crime Report 2025.',
   'Daily Observer (2026). Bangladesh Bank data on fraud in MFS, cheque and card payments, 2025.', 'Prothom Alo and The Business Standard (2025). Tk 27 lakh stolen from 54 SCB card holders.',
   'Official help centres: Meta (Facebook, Messenger), Google (Gmail), WhatsApp, bKash, Discord (incl. DAVE, May 2026), Telegram (2025–26).', 'Scores: my own assessment with the MCCJ 525 course rubric (0–2 on seven criteria).'].forEach((r, i) => {
    text('r' + i, r, 128, 260 + i * 92, 1664, 80, { fontSize: P(27), color: i === 6 ? K.soft : K.light, italic: i === 6 });
    an('r' + i, 'slide', 900 + 250 * i, 500);
  });

  SPEC.forEach(sp => sp.anims.forEach(a => { if (a.ease === undefined) a.ease = true; }));
  await pres.writeFile({ fileName: OUT });
  fs.writeFileSync(OUT.replace(/\.pptx$/, '.anim.json'), JSON.stringify(SPEC));
  console.log('written', OUT, SPEC.length, 'slides');
})();
