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
pres.title = 'Five Apps, One Pocket';
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
    coins: fa.FaCoins, handshake: fa.FaHandshake, bullhorn: fa.FaBullhorn, cog: fa.FaCog, pin: fa.FaThumbtack, plus: fa.FaPlus, msg: fa.FaCommentDots, unlock: fa.FaUnlock, user2: fa.FaUser };
  for (const [k, c] of Object.entries(M)) { I[k] = await icon(c, 'FFFFFF'); I[k + 'D'] = await icon(c, '1C1E21'); I[k + 'G'] = await icon(c, '65676B'); }
  for (const [k, c] of [['check', fa.FaCheck], ['times', fa.FaTimes], ['warn', fa.FaExclamationTriangle], ['lock', fa.FaLock], ['shield', fa.FaShieldAlt], ['fish', fa.FaFish], ['bolt', fa.FaBolt]]) {
    I[k + 'Good'] = await icon(c, K.good); I[k + 'Bad'] = await icon(c, K.bad); I[k + 'Mid'] = await icon(c, K.mid);
    for (const a of ORDER) I[k + a] = await icon(c, APPS[a].c);
  }
}


// ---- 12-slide group version: intro (Ahnaf) + WhatsApp (Marzia) + Gmail (Tanvir) + Discord (Sweety) + Facebook (Mamun) + bKash (Masum)
const SPK = { ahnaf: ['AHNAF AKIF', '24'], marzia: ['MARZIA RAHMAN', '29'], tanvir: ['TANVIR AHMED SIDDIQUE', '28'], sweety: ['JESMIN NAHER SWEETY', '08'], mamun: ['ABDULLAH AL MAMUN', '02'], masum: ['MD. MASUM BILLAH', '18'] };
const SN = (who, sec, t) => `SPEAKER: ${SPK[who][0]} (Roll ${SPK[who][1]})  ·  about ${sec} seconds\n\n${t.trim()}`;
const FIVE = ['wa', 'gm', 'dc', 'fb', 'bk'];
const ROLE = { wa: 'Marzia Rahman', gm: 'Tanvir Ahmed Siddique', dc: 'Jesmin Naher Sweety', fb: 'Abdullah Al Mamun', bk: 'Md. Masum Billah' };
const appIcon = (pre, k, x, y, d) => {
  oval(pre, x, y, d, d, k === 'gm' ? 'FFFFFF' : APPS[k].c);
  if (k === 'bk') text(pre + 'i', 'b', x, y, d, d, { fontSize: P(d * 0.62), fontFace: FB, color: 'FFFFFF', align: 'center', valign: 'middle' });
  else img(pre + 'i', k === 'gm' ? I.gmM : I[k + 'W'], x + d * 0.24, y + d * 0.24, d * 0.52, d * 0.52, APPS[k].n);
  return [pre, pre + 'i'];
};
const label = (name, t, x, y, w, col, o = {}) => text(name, t, x, y, w, 34, Object.assign({ fontSize: P(21), fontFace: MONO, bold: true, color: col, charSpacing: 2 }, o));
const steps = (pre, items, x, y, w, h, t0, colors, o = {}) => {   // a left-to-right flow of rounded cards with arrows
  const n = items.length, gap = 40, cw = (w - gap * (n - 1)) / n;
  items.forEach(([ic, hd, bd], i) => {
    const cx = x + i * (cw + gap), d = t0 + (o.step || 650) * i, col = colors[i] || colors[0];
    rect(pre + i, cx, y, cw, h, o.fill || K.card, { r: 0.08, line: col, lw: 1.5, shadow: o.shadow });
    oval(pre + 'o' + i, cx + 24, y + 24, 64, 64, col); img(pre + 'oi' + i, I[ic], cx + 42, y + 42, 28, 28);
    text(pre + 't' + i, [{ text: hd, options: { fontFace: FH, fontSize: P(27), color: o.hc || K.white, breakLine: true } }, { text: bd, options: { fontSize: P(22), color: o.bc || K.soft } }], cx + 24, y + 104, cw - 44, h - 116);
    an(pre + i, 'rise', d, 600); an(pre + 'o' + i, 'grow', d + 200, 400, { from: 0.3 }); an(pre + 'oi' + i, 'grow', d + 250, 400, { from: 0.3 }); an(pre + 't' + i, 'fade', d + 300, 500);
    if (i < n - 1) { line(pre + 'a' + i, cx + cw + 6, y + h / 2, cx + cw + gap - 6, y + h / 2, o.ac || K.soft, { lw: 2, arrow: 1 }); an(pre + 'a' + i, 'wipe', d + 450, 300); }
  });
};

(async () => {
  await assets();

  // ======== OPTION Q2 · "THE STAKES ONLINE": online scams, hacking and personal data breaches
  const CI = ['key', 'lock', 'eye', 'life', 'ban', 'user', 'hand'];
  const Z = { cy: '5EEAD4', vi: 'A78BFA', ro: 'F472B6', wh: 'F8FAFC', sl: 'CBD5E1', dim: '8B93B8', glass: '0A1024', hair: '2B3566' };
  const LT = 'Segoe UI Light';
  const ROLL = { wa: '29', gm: '28', dc: '08', fb: '02', bk: '18' };
  {
    let grid = ''; for (let x = 0; x <= 1920; x += 80) grid += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="#A5B4FC" stroke-opacity=".028"/>`;
    for (let y = 0; y <= 1080; y += 80) grid += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="#A5B4FC" stroke-opacity=".028"/>`;
    const blob = (id, c, cx, cy, r, op) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0" stop-color="#${c}" stop-opacity="${op}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs>${blob('a', '5EEAD4', '.95', '0', '.5', '.16')}${blob('b', 'A78BFA', '.75', '.1', '.55', '.18')}${blob('c', 'F472B6', '1', '.45', '.4', '.12')}${blob('d', '312E81', '.1', '1', '.7', '.45')}<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs><rect width="1920" height="1080" fill="#04060F"/><rect width="1920" height="1080" fill="url(#d)"/><rect width="1920" height="1080" fill="url(#b)"/><rect width="1920" height="1080" fill="url(#a)"/><rect width="1920" height="1080" fill="url(#c)"/>${grid}<rect width="1920" height="1080" fill="url(#v)"/></svg>`)).png().toFile(A_DIR + 'stakes_bg.png');
    await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1664" height="6"><defs><linearGradient id="g"><stop offset="0" stop-color="#5EEAD4"/><stop offset=".5" stop-color="#A78BFA"/><stop offset="1" stop-color="#F472B6"/></linearGradient></defs><rect width="1664" height="6" rx="3" fill="url(#g)"/></svg>`)).png().toFile(A_DIR + 'stakes_bar.png');
  }
  const SB = A_DIR + 'stakes_bg.png';
  const kick = (n, t, x, y, w, col = Z.cy, d = 200) => { text(n, t, x, y, w, 32, { fontSize: P(21), fontFace: MONO, bold: true, color: col, charSpacing: 4 }); an(n, 'wipe', d, 800); };
  const head = (n, t, d = 500) => { text(n, t, 128, 108, 1664, 90, { fontSize: P(56), fontFace: FH, color: Z.wh }); an(n, 'rise', d, 900); imgp(n + 'b', A_DIR + 'stakes_bar.png', 128, 200, 360, 5, ''); an(n + 'b', 'wipe', d + 800, 900); };
  const glass = (n, x, y, w, h, col = '6366F1', o = {}) => rect(n, x, y, w, h, Z.glass, { r: o.r == null ? 0.05 : o.r, trans: 12, line: o.line || Z.hair, lw: 1.25, glow: col, go: o.go || 0.28 });
  const lab = (n, t, x, y, w, col = Z.dim) => text(n, t, x, y, w, 30, { fontSize: P(19), fontFace: MONO, bold: true, color: col, charSpacing: 3 });

  // =============================================================== Q1. THE STAKES (Ahnaf)
  slide(SN('ahnaf', 35, `[Pause. Look at the audience.] Good morning. In the two minutes of this introduction, more than one and a half million dollars will be lost to online scams.

[Big number.] In one year: four hundred and forty-two billion dollars. About fourteen thousand dollars every second.

[Rings.] More than half of all adults faced a scam. One in four lost money.

[Pause.] So the question is not if it happens to us. It is when.`), SB, 'black');
  kick('k1', 'THE STAKES  ·  WHAT ONLINE SCAMS COST', 128, 70, 1200);
  head('h1', 'Every second, someone loses money to an online scam.');
  glass('p1', 128, 250, 1010, 560, Z.cy);
  lab('p1l', 'LOST TO SCAMS IN 12 MONTHS  ·  ONLINE, SMS AND CALLS', 176, 286, 940, Z.cy);
  text('big', [{ text: '$442', options: { fontFace: LT, fontSize: P(210), color: Z.wh } }, { text: ' billion', options: { fontFace: LT, fontSize: P(76), color: Z.cy } }], 160, 318, 960, 260, { valign: 'middle' });
  text('sec', [{ text: '≈ $14,000 ', options: { fontFace: FH, color: Z.ro } }, { text: 'every second', options: { color: Z.wh } }], 176, 590, 900, 64, { fontSize: P(40) });
  text('now', 'In the two minutes of this introduction: about $1.7 million.', 176, 662, 900, 44, { fontSize: P(26), color: Z.sl, italic: true });
  text('s1', 'Global Anti-Scam Alliance, Global State of Scams 2025 (estimate)', 176, 752, 900, 30, { fontSize: P(17), color: Z.dim });
  an('p1', 'fade', 1400, 800); an('p1l', 'fade', 1800, 500); an('big', 'grow', 4200, 1200, { from: 0.85 }); an('sec', 'fade', 8500, 900); an('now', 'fade', 2000, 900); an('s1', 'fade', 9000, 500);
  glass('p2', 1170, 250, 622, 560, Z.vi);
  lab('p2l', 'ADULTS, LAST 12 MONTHS', 1218, 286, 560, Z.vi);
  an('p2', 'fade', 11500, 800); an('p2l', 'fade', 11800, 400);
  await donut('d1', 57, 100, Z.cy, 1226, 340, 240, 12300, { label: '57%', sub: 'faced a scam', fs: 0.2, track: '1E2547', vc: Z.wh, sc: Z.sl, subfs: 20 });
  await donut('d2', 23, 100, Z.ro, 1500, 340, 240, 13600, { label: '23%', sub: 'lost money', fs: 0.2, track: '1E2547', vc: Z.wh, sc: Z.sl, subfs: 20 });
  text('p2t', [{ text: 'More than half faced a scam. ', options: { color: Z.wh } }, { text: 'Almost one in four lost money.', options: { color: Z.ro } }], 1218, 620, 540, 120, { fontSize: P(28), fontFace: FH });
  an('p2t', 'fade', 15000, 800);
  [['1 SECOND', '$14,000'], ['1 MINUTE', '$840,000'], ['1 HOUR', '$50 million'], ['1 DAY', '$1.2 billion']].forEach(([k, v], i) => {
    const x = 128 + i * 424, d = 17500 + 1400 * i;
    glass('t' + i, x, 846, 392, 140, i === 3 ? Z.ro : '6366F1', { r: 0.12, go: i === 3 ? 0.5 : 0.25 });
    lab('tk' + i, k, x + 32, 868, 330, i === 3 ? Z.ro : Z.dim);
    text('tv' + i, v, x + 32, 900, 340, 70, { fontSize: P(46), fontFace: LT, color: Z.wh });
    an('t' + i, 'rise', d, 600); an('tk' + i, 'fade', d + 200, 400); an('tv' + i, 'fade', d + 300, 600);
  });
  an('t3', 'pulse', 23500, 1400, { scale: 102 });

  // =============================================================== Q2. THE CURVE (Ahnaf)
  slide(SN('ahnaf', 40, `And it is growing. [Chart.] Internet crime losses reported to the FBI: four point two billion dollars in 2020, twenty point nine billion in 2025. Five times more.

[Right panel.] And it is personal. The top online crime is phishing: a fake message or a fake login page, a hundred and ninety-one thousand reports. Personal data breaches: one point three billion dollars lost.

[Bangladesh.] Here, the data of around five crore citizens was exposed online in 2023. Account hacking is our number one cybercrime, and four in five victims are eighteen to thirty. [Pause.] That is us.`), SB, 'fade');
  kick('k2', 'THE CURVE IS CLIMBING  ·  AND IT GETS PERSONAL', 128, 70, 1400);
  head('h2', 'Online crime losses grew five times in five years.');
  glass('c', 128, 250, 1010, 736, Z.vi);
  lab('cl', 'FBI  ·  INTERNET CRIME LOSSES  ·  US$ BILLION', 176, 284, 940, Z.vi);
  an('c', 'fade', 1300, 700); an('cl', 'fade', 1600, 400);
  const YR = [['2020', 4.2], ['2021', 6.9], ['2022', 10.3], ['2023', 12.5], ['2024', 16.6], ['2025', 20.9]], BASE = 880, SC = 21.5;
  line('ax', 176, BASE, 1090, BASE, Z.hair, { lw: 1.5 }); an('ax', 'wipe', 2000, 600);
  const tops = [];
  YR.forEach(([y, v], i) => {
    const x = 210 + i * 146, h = v * SC, d = 3000 + 1700 * i, last = i === YR.length - 1;
    rect('b' + i, x, BASE - h, 96, h, last ? Z.ro : Z.vi, { trans: last ? 0 : 35, glow: last ? Z.ro : Z.vi, go: last ? 0.7 : 0.3 });
    text('bv' + i, '$' + v, x - 20, BASE - h - 52, 136, 44, { fontSize: P(last ? 32 : 26), fontFace: last ? FH : F, color: last ? Z.ro : Z.wh, align: 'center' });
    text('by' + i, y, x - 20, BASE + 12, 136, 36, { fontSize: P(22), fontFace: MONO, color: Z.dim, align: 'center' });
    an('b' + i, 'wipeU', d, 700); an('bv' + i, 'fade', d + 500, 400); an('by' + i, 'fade', d, 400);
    tops.push([x + 48, BASE - h]);
  });
  tops.slice(1).forEach(([x, y], i) => { line('tr' + i, tops[i][0], tops[i][1] - 70, x, y - 70, Z.ro, { lw: 2.5, dash: 'dash' }); an('tr' + i, 'fade', 13500 + 200 * i, 500); });
  stext('x5', '× 5 since 2020', 196, 336, 300, 64, null, { r: 0.4, align: 'center', line: Z.ro, lw: 2, extra: { fontFace: FH, fontSize: P(30), color: Z.ro } });
  an('x5', 'grow', 14800, 500, { from: 1.6 });
  text('cs', 'FBI Internet Crime Complaint Center (IC3), annual reports 2020–2025', 176, 940, 940, 30, { fontSize: P(17), color: Z.dim }); an('cs', 'fade', 15000, 500);
  glass('bd', 1170, 250, 622, 736, Z.cy);
  lab('bdl', 'IT GETS PERSONAL  ·  FBI 2025', 1218, 284, 560, Z.cy);
  [['191,561', 'phishing reports: the No. 1 online crime', Z.wh], ['67,456', 'personal data breaches: $1.31 billion lost', Z.ro]].forEach(([v, t, col], i) => {
    const y = 322 + i * 100, d = 17000 + 2600 * i;
    text('pv' + i, v, 1214, y, 300, 86, { fontSize: P(64), fontFace: LT, color: col, valign: 'middle' });
    text('pt' + i, t, 1500, y, 260, 86, { fontSize: P(21), color: Z.sl, valign: 'middle' });
    an('pv' + i, 'grow', d, 700, { from: 0.8 }); an('pt' + i, 'fade', d + 400, 600);
  });
  an('bd', 'fade', 16500, 700); an('bdl', 'fade', 16700, 400);
  line('bdline', 1218, 534, 1744, 534, Z.hair, { lw: 1 }); an('bdline', 'wipe', 22000, 500);
  lab('bnl', 'BANGLADESH', 1218, 552, 560, Z.vi); an('bnl', 'fade', 22300, 400);
  text('nid', '≈ 5 crore', 1214, 590, 300, 86, { fontSize: P(60), fontFace: LT, color: Z.wh, valign: 'middle' });
  text('nidt', 'citizens’ names, phones and NID numbers exposed online (July 2023)', 1500, 590, 270, 96, { fontSize: P(19), color: Z.sl, valign: 'middle' });
  an('nid', 'grow', 23000, 700, { from: 0.8 }); an('nidt', 'fade', 23400, 600);
  text('hk', [{ text: 'Account hacking: ', options: { fontFace: FH, color: Z.wh } }, { text: 'the No. 1 cybercrime (21.65%)', options: { color: Z.sl } }], 1218, 694, 540, 36, { fontSize: P(21) });
  an('hk', 'fade', 26500, 600);
  [['Victims aged 18–30', 78.78, '78.8%', Z.cy], ['Reported to the police', 12, '12%', Z.ro]].forEach(([k, v, s, col], i) => {
    const y = 744 + i * 80, d = 27500 + 1800 * i;
    text('vk' + i, k, 1218, y, 360, 34, { fontSize: P(22), color: Z.wh });
    text('vv' + i, s, 1600, y, 144, 34, { fontSize: P(25), fontFace: FH, color: col, align: 'right' });
    rect('vt' + i, 1218, y + 40, 526, 12, '1E2547', { r: 0.5 }); rect('vf' + i, 1218, y + 40, 526 * v / 100, 12, col, { r: 0.5, glow: col, go: 0.6 });
    an('vk' + i, 'fade', d, 400); an('vt' + i, 'fade', d, 400); an('vf' + i, 'wipe', d + 200, 900); an('vv' + i, 'fade', d + 800, 400);
  });
  text('srcs', 'FBI IC3 2025 · TechCrunch, Daily Star · CCAF 2024', 1218, 908, 540, 30, { fontSize: P(14), color: Z.dim });
  text('us', 'Eighteen to thirty. That is us.', 1218, 940, 540, 36, { fontSize: P(24), fontFace: FH, italic: true, color: Z.cy });
  an('srcs', 'fade', 31000, 400); an('us', 'fade', 31500, 900);

  // =============================================================== Q3. THE STORIES BEHIND THE NUMBERS (Ahnaf)
  slide(SN('ahnaf', 40, `Behind every number, a real story. [Cards.] A Telegram "job" that took ninety-four lakh taka. A WhatsApp message from the NBR chairman: thirty-five thousand taka, right now. It was not him. Fifty Facebook accounts hacked through Messenger links. One OTP call that emptied an actor's bKash.

[Statement.] No lock was broken. The door was opened from the inside.

[Bottom row.] So we test five apps: WhatsApp, Gmail, Discord, Facebook and bKash. How strong are their locks, and why do they still fail? Marzia, over to you.`), SB, 'fade');
  kick('k3', 'THE STORIES BEHIND THE NUMBERS', 128, 70, 1200);
  head('h3', 'Four real cases. Four apps. One trick.');
  [['tg', 'AUG 2025', 'Tk 94 lakh', 'A “part-time job” on Telegram. Deposit after deposit, until a lifetime of savings was gone.', 'A fake job', 'Dhaka Tribune · bdnews24'],
   ['wa', 'SEPT 2025', 'Tk 35,000', 'The NBR chairman asks for money on bKash, “right now”. It was not him.', 'A hijacked account', 'NBR · bdnews24'],
   ['fb', 'OCT 2024', '50+ accounts', 'Links on Messenger. Accounts taken over, at least 15 people blackmailed.', 'A link', 'CID · Banglanews24'],
   ['bk', 'DB CASE', '1 phone call', 'Actor Dighi’s bKash emptied after a call asking for her OTP. Tk 1.62 lakh recovered.', 'An OTP request', 'DB · TBS']].forEach(([k, dt, amt, b, how, src], i) => {
    const x = 128 + i * 424, d = [1200, 4500, 8500, 12000][i], col = [Z.ro, Z.cy, Z.vi, Z.ro][i];
    glass('sc' + i, x, 236, 392, 420, col, { r: 0.06, go: 0.35 });
    appIcon('si' + i, k, x + 28, 262, 64);
    text('sd' + i, dt, x + 110, 262, 252, 64, { fontSize: P(19), fontFace: MONO, bold: true, color: col, valign: 'middle', align: 'right', charSpacing: 2 });
    text('sa' + i, amt, x + 26, 340, 350, 80, { fontSize: P(52), fontFace: LT, color: Z.wh });
    text('sb' + i, b, x + 28, 426, 340, 140, { fontSize: P(22), color: Z.sl });
    line('sl' + i, x + 28, 578, x + 364, 578, Z.hair, { lw: 1 });
    text('sh' + i, [{ text: 'HOW  ', options: { fontFace: MONO, bold: true, fontSize: P(17), color: Z.dim } }, { text: how, options: { fontFace: FH, fontSize: P(23), color: col } }], x + 28, 588, 340, 34, {});
    text('ss' + i, src, x + 28, 620, 340, 26, { fontSize: P(15), color: Z.dim });
    an('sc' + i, 'rise', d, 700); all(['si' + i, 'si' + i + 'i'], 'grow', d + 300, 400, { from: 0.3 }); an('sd' + i, 'fade', d + 400, 400);
    an('sa' + i, 'grow', d + 700, 700, { from: 0.7 }); an('sb' + i, 'fade', d + 1100, 700); an('sl' + i, 'wipe', d + 1500, 400); an('sh' + i, 'fade', d + 1700, 500); an('ss' + i, 'fade', d + 1900, 400);
  });
  text('st', [{ text: 'No lock was broken. ', options: { color: Z.wh } }, { text: 'Every door was opened from the inside.', options: { color: Z.ro } }], 128, 680, 1664, 60, { fontSize: P(38), fontFace: FH, align: 'center' });
  an('st', 'fade', 15500, 900);
  text('qq', [{ text: 'OUR QUESTION  ', options: { fontFace: MONO, bold: true, fontSize: P(19), color: Z.cy } }, { text: 'How strong are the locks on the five apps in our pocket, and why do they still fail?', options: { color: Z.sl } }], 128, 752, 1664, 40, { fontSize: P(24), align: 'center' });
  an('qq', 'fade', 19000, 600);
  FIVE.forEach((k, i) => {
    const x = 128 + i * 338, d = 20000 + 400 * i;
    glass('lt' + i, x, 810, 314, 150, k === 'gm' ? 'EA4335' : APPS[k].c, { r: 0.12, go: 0.35 });
    appIcon('li' + i, k, x + 20, 853, 64);
    text('ln' + i, [{ text: APPS[k].n, options: { fontFace: FH, fontSize: P(28), color: Z.wh, breakLine: true } }, { text: ROLE[k], options: { fontSize: P(16), color: Z.sl, breakLine: true } }, { text: 'Roll ' + ROLL[k], options: { fontFace: MONO, fontSize: P(16), color: Z.dim } }], x + 96, 818, 214, 134, { valign: 'middle' });
    an('lt' + i, 'rise', d, 500); all(['li' + i, 'li' + i + 'i'], 'grow', d + 200, 400, { from: 0.3 }); an('ln' + i, 'fade', d + 300, 400);
  });
  text('ru', '7 locks  ·  0, 1 or 2 points each  ·  scored out of 14', 128, 984, 1100, 34, { fontSize: P(20), color: Z.dim });
  text('by', 'Introduction: Ahnaf Akif, Roll 24', 1192, 984, 600, 34, { fontSize: P(20), color: Z.dim, align: 'right' });
  an('ru', 'fade', 22500, 500); an('by', 'fade', 22700, 500);

  // =============================================================== 3. WHATSAPP A (Marzia)
  slide(SN('marzia', 60, `Thank you, Ahnaf. I will start with WhatsApp, which scored twelve out of fourteen, joint highest. [Yellow notice.] Its strongest point is encryption: every personal chat and call is end-to-end encrypted by default, so not even WhatsApp can read them.

[Messages.] It also gives us a six-digit two-step verification PIN, passkeys, Chat Lock, end-to-end encrypted backups, Silence Unknown Callers, and a Privacy Checkup that guides you through the settings.

[Chat list.] On our rubric it is strong almost everywhere. Its weaker scores are account monitoring and recovery, and that is exactly where the hijackers come in.`), 'FFFFFF');
  rect('cl', 0, 0, 600, 1080, 'FFFFFF'); rect('clh', 0, 0, 600, 120, K.waD);
  oval('wal', 30, 26, 68, 68, K.wa); img('wali', I.waW, 46, 42, 36, 36, 'WhatsApp'); text('wan', 'WhatsApp', 116, 30, 300, 60, { fontSize: P(38), fontFace: FH, color: 'FFFFFF', valign: 'middle' });
  all(['cl', 'clh', 'wal', 'wali', 'wan'], 'fade', 0, 600);
  CRIT.forEach((c, i) => {
    const y = 132 + i * 104, v = APPS.wa.s[i], d = 600 + 150 * i;
    oval('ca' + i, 26, y + 18, 68, 68, ['DFF6E8', 'E7F0FF', 'FFF3D6'][i % 3]); img('cai' + i, I[CI[i] + 'D'], 46, y + 38, 28, 28);
    text('ct' + i, [{ text: c, options: { fontFace: FH, color: '111B21', breakLine: true } }, { text: v === 2 ? 'Strong, or on by default' : v === 1 ? 'Available, but optional' : 'Absent', options: { color: '667781' } }], 112, y + 14, 380, 80, { fontSize: P(23) });
    oval('cb' + i, 520, y + 34, 44, 44, LV(v)); text('cbv' + i, String(v), 520, y + 34, 44, 44, { fontSize: P(22), fontFace: FH, color: 'FFFFFF', align: 'center', valign: 'middle' });
    line('cs' + i, 112, y + 104, 600, y + 104, 'E9EDEF');
    all(['ca' + i, 'cai' + i, 'ct' + i, 'cs' + i], 'slide', d, 500); all(['cb' + i, 'cbv' + i], 'grow', d + 300, 400, { from: 0.2 });
  });
  imgp('wall', A_DIR + 'wa_wall.png', 600, 120, 1320, 960);
  rect('cvh', 600, 0, 1320, 120, 'F0F2F5'); oval('cva', 630, 26, 68, 68, K.waT); img('cvai', I.shield, 648, 44, 32, 32);
  text('cvn', [{ text: 'How WhatsApp protects you', options: { fontFace: FH, color: '111B21', breakLine: true } }, { text: 'online  ·  security review', options: { color: '667781', fontSize: P(21) } }], 716, 26, 700, 72, { fontSize: P(28) });
  all(['wall', 'cvh', 'cva', 'cvai', 'cvn'], 'fade', 300, 600);
  stext('e2e', 'Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to or share them.', 860, 144, 800, 70, 'FFEECD', { r: 0.15, pad: 14, align: 'center', extra: { color: '54656F', fontSize: P(21) } });
  an('e2e', 'grow', 1800, 600, { from: 0.6 });
  const bub = (n, t, x, y, w, h, out, d, col) => { stext(n, t, x, y, w, h, col || (out ? 'D9FDD3' : 'FFFFFF'), { r: 0.12, pad: 18, valign: 'top', shadow: 3, extra: { color: '111B21', fontSize: P(25) } }); an(n, 'rise', d, 500); };
  bub('m1', [{ text: 'Two-step verification PIN  ', options: { bold: true } }, { text: 'a 6-digit PIN that stops anyone re-registering your number' }], 640, 244, 820, 100, false, 2500);
  bub('m2', [{ text: 'Passkeys and Chat Lock  ', options: { bold: true } }, { text: 'sign in with your face or fingerprint; lock private chats' }], 640, 360, 820, 100, false, 3200);
  bub('m3', [{ text: 'Encrypted backups  ', options: { bold: true } }, { text: 'your chat backup is end-to-end encrypted too' }], 640, 476, 820, 100, false, 3900);
  bub('m4', [{ text: 'Silence Unknown Callers and Privacy Checkup  ', options: { bold: true } }, { text: 'block spam calls; a guided tour of every setting' }], 640, 592, 820, 100, false, 4600);
  rect('scc', 1500, 244, 380, 470, 'FFFFFF', { r: 0.06, shadow: 8 }); an('scc', 'rise', 5300, 700);
  label('sch', 'RUBRIC SCORE', 1536, 266, 320, '667781'); an('sch', 'fade', 5500, 400);
  await donut('wsc', tot('wa'), 14, K.wa, 1570, 316, 240, 5600, { label: tot('wa') + '/14', track: 'E9EDEF', fs: 0.2, vc: K.waD });
  text('scs', 'joint highest of the five apps', 1520, 580, 340, 60, { fontSize: P(23), color: '667781', align: 'center' }); an('scs', 'fade', 6300, 500);
  rect('inb', 600, 990, 1320, 90, 'F0F2F5'); stext('inp', '  Type a message', 680, 1006, 1080, 58, 'FFFFFF', { r: 0.5, extra: { color: '8696A0', fontSize: P(24) } });
  oval('snd', 1790, 1002, 66, 66, K.wa); img('sndi', I.send, 1806, 1018, 34, 34);
  all(['inb', 'inp', 'snd', 'sndi'], 'fade', 600, 600);

  // =============================================================== 4. WHATSAPP B (Marzia)
  slide(SN('marzia', 65, `So where does WhatsApp leak? Not in the encryption. In the account. [Chat.] It starts with a message from someone pretending to be a friend: "I sent you a code by mistake, please send it to me." That six-digit code is your WhatsApp registration code. Share it, and your account moves to the scammer's phone. If you never set a two-step PIN, nothing stops it. A SIM swap does the same thing without even asking you.

[Flow.] Then the hijacked account messages your friends and family, just like the NBR chairman's account, asking for money, often on bKash.

[Right.] To lock it: Settings, Account, Two-step verification, and set a PIN. Our suggestion to WhatsApp: make that PIN mandatory at setup, and show a loud warning when a new phone takes over a number. Tanvir will now open Gmail.`), 'ECE5DD');
  rect('top', 0, 0, 1920, 120, K.waD); oval('tl', 40, 26, 68, 68, K.wa); img('tli', I.waW, 56, 42, 36, 36);
  text('tt', [{ text: 'Where WhatsApp leaks', options: { fontFace: FB, color: 'FFFFFF', breakLine: true } }, { text: 'not in the encryption, but in the account', options: { color: 'C8E6DE', fontSize: P(22) } }], 128, 22, 1200, 80, { fontSize: P(36) });
  all(['top', 'tl', 'tli', 'tt'], 'fade', 0, 600);
  // phone: the hijack conversation
  rect('ph', 128, 160, 600, 860, 'FFFFFF', { r: 0.06, shadow: 18, so: 6, sop: 0.25 });
  rect('phh', 128, 160, 600, 100, 'F0F2F5', { r: 0.06 }); oval('pha', 148, 176, 68, 68, 'DFE5E7'); img('phai', I.userD, 166, 194, 32, 32);
  text('phn', [{ text: '“Friend” (new number)', options: { fontFace: FH, color: '111B21', breakLine: true } }, { text: 'online', options: { color: '667781', fontSize: P(20) } }], 232, 180, 480, 64, { fontSize: P(26) });
  imgp('phw', A_DIR + 'wa_wall.png', 128, 260, 600, 760);
  all(['ph', 'phh', 'pha', 'phai', 'phn', 'phw'], 'rise', 400, 800);
  stext('c1', 'Hey! I sent a 6-digit code to your number by mistake. Can you send it to me? It’s urgent!', 150, 284, 470, 130, 'FFFFFF', { r: 0.12, pad: 16, valign: 'top', shadow: 3, extra: { color: '111B21', fontSize: P(23) } });
  stext('c2', '482 915', 470, 440, 230, 66, 'D9FDD3', { r: 0.2, align: 'center', shadow: 3, extra: { color: '111B21', fontSize: P(30), fontFace: FH, charSpacing: 3 } });
  stext('c3', [{ text: 'Your phone number is no longer registered with WhatsApp on this phone.', options: { bold: true } }], 150, 540, 556, 110, 'FFE3E3', { r: 0.1, pad: 18, align: 'center', extra: { color: 'C5221F', fontSize: P(23) } });
  stext('c4', [{ text: 'Then, to your contacts:  ', options: { bold: true, color: '7A5300' } }, { text: '“I am in trouble. Please send Tk 20,000 on bKash, I will return it tomorrow.”', options: { color: '111B21' } }], 150, 680, 556, 140, 'FFF4D6', { r: 0.1, pad: 18, valign: 'top', extra: { fontSize: P(22) } });
  text('c4n', 'illustration of a typical case', 150, 830, 556, 30, { fontSize: P(17), italic: true, color: '667781' });
  an('c1', 'rise', 1300, 500); an('c2', 'rise', 2300, 500); an('c3', 'grow', 3300, 600, { from: 0.6 }); an('c4', 'rise', 4300, 600); an('c4n', 'fade', 4800, 400);
  // flow on the right
  label('fh', 'HOW THE HIJACK WORKS', 790, 164, 900, K.waD); an('fh', 'fade', 900, 400);
  steps('f', [['msg', 'The lure', 'A “friend” asks for a code'], ['key', 'The code', 'Your registration code is shared'], ['phone', 'The takeover', 'No PIN: the account moves phones'], ['money', 'The scam', 'Friends are asked for money']], 790, 208, 1090, 300, 1500, [K.waT, K.mid, K.bad, K.bad],
    { fill: 'FFFFFF', hc: '111B21', bc: '54656F', ac: '8696A0', step: 800, shadow: 6 });
  rect('lk', 790, 548, 530, 460, 'FFFFFF', { r: 0.06, shadow: 8 }); an('lk', 'rise', 5000, 700);
  label('lkh', 'LOCK IT IN 30 SECONDS', 826, 572, 480, K.waD); an('lkh', 'fade', 5200, 400);
  ['Settings', 'Account', 'Two-step verification', 'Turn on, set a 6-digit PIN'].forEach((t, i) => {
    text('lkt' + i, (i ? '›  ' : '') + t, 826 + i * 18, 622 + i * 72, 460, 60, { fontSize: P(26), color: i === 3 ? K.waD : '111B21', fontFace: i === 3 ? FH : F, valign: 'middle' });
    an('lkt' + i, 'slide', 5400 + 300 * i, 500);
  });
  stext('sug', [{ text: 'OUR SUGGESTION\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'C8E6DE', charSpacing: 2 } }, { text: 'Make the two-step PIN mandatory at setup, and warn loudly when a new phone takes over a number.', options: { fontFace: FH, fontSize: P(26), color: 'FFFFFF' } }],
    1350, 548, 530, 460, K.waD, { r: 0.06, pad: 32, valign: 'middle' });
  an('sug', 'rise', 6800, 800); an('sug', 'pulse', 7800, 1800, { scale: 102 });

  // =============================================================== 5. GMAIL A (Tanvir)
  slide(SN('tanvir', 60, `Thank you, Marzia. I am presenting Gmail, which also scored twelve out of fourteen. [Inbox rows.] Gmail has the best account protection of all five apps. It supports passkeys, so you can sign in with your fingerprint; 2-Step Verification and physical security keys; and the Advanced Protection Program for people at high risk, like journalists and activists.

[Spam row.] Google says Gmail blocks more than ninety-nine point nine percent of spam, phishing and malware before it reaches you. And Security Checkup shows every device signed in to your account and every recent security event.

[Right.] On our rubric, it scores two on almost everything, including recovery, where every other app is weak.`), 'FFFFFF');
  rect('sb', 0, 0, 330, 1080, 'F6F8FC');
  img('gml', I.gmM, 36, 30, 52, 52, 'Gmail'); text('gmn', 'Gmail', 100, 30, 200, 52, { fontSize: P(36), color: '5F6368', valign: 'middle' });
  stext('cmp', 'Compose', 30, 116, 200, 72, 'C2E7FF', { r: 0.35, align: 'center', extra: { color: '1F1F1F', fontSize: P(25), fontFace: FH } });
  all(['sb', 'gml', 'gmn', 'cmp'], 'fade', 0, 600);
  [['inbox', 'Inbox', '4'], ['star', 'Starred', ''], ['shield', 'Security', '12/14'], ['warn', 'Spam', '99.9%'], ['trash', 'Bin', '']].forEach(([ic, l, n], i) => {
    const y = 222 + i * 64, act = i === 0;
    if (act) rect('lbA', 14, y, 300, 56, 'D3E3FD', { r: 0.5 });
    img('lbi' + i, I[ic + 'D'], 46, y + 16, 24, 24); text('lbt' + i, l, 92, y, 160, 56, { fontSize: P(25), color: '1F1F1F', fontFace: act ? FH : F, valign: 'middle' });
    if (n) text('lbn' + i, n, 210, y, 90, 56, { fontSize: P(21), color: '1F1F1F', fontFace: FH, valign: 'middle', align: 'right' });
    if (act) an('lbA', 'fade', 300, 500); an('lbi' + i, 'fade', 300 + 100 * i, 400); an('lbt' + i, 'fade', 300 + 100 * i, 400); if (n) an('lbn' + i, 'fade', 300 + 100 * i, 400);
  });
  stext('gsr', '      Search mail: “security checkup”', 380, 26, 900, 64, 'EAF1FB', { r: 0.5, extra: { fontSize: P(24), color: '5F6368' } }); img('gsri', I.searchG, 404, 46, 24, 24);
  all(['gsr', 'gsri'], 'fade', 200, 500);
  text('ib', 'Primary', 380, 120, 300, 50, { fontSize: P(26), fontFace: FH, color: K.gmB }); rect('ibu', 380, 168, 140, 5, K.gmB, { r: 0.5 }); line('ibl', 380, 174, 1360, 174, 'E0E0E0');
  all(['ib', 'ibu', 'ibl'], 'fade', 400, 500);
  [['Google', 'Passkeys', 'Sign in with your fingerprint or face: there is no password to steal.', '9:41'],
   ['Google', '2-Step Verification and security keys', 'A stolen password alone is not enough to get in.', '9:38'],
   ['Gmail', 'More than 99.9% blocked', 'Spam, phishing and malware stopped before they reach you.', '9:30'],
   ['Security Checkup', 'Your devices and recent activity', 'See every device and every security event on your account.', '8:12'],
   ['Advanced Protection', 'For people at high risk', 'The strongest Google protection, built on security keys.', 'Mon'],
   ['Google Account', 'Recovery you can trust', 'Several recovery options, checked in Security Checkup.', 'Sun']].forEach(([from, subj, snip, t], i) => {
    const y = 186 + i * 132, d = 1000 + 650 * i;
    rect('er' + i, 380, y, 980, 124, i % 2 ? 'FFFFFF' : 'F8FAFD', { line: 'EEEEEE' });
    img('es' + i, I.checkGood, 404, y + 50, 24, 24);
    text('ef' + i, from, 446, y + 12, 250, 40, { fontSize: P(24), fontFace: FH, color: '1F1F1F', valign: 'middle' });
    text('esu' + i, [{ text: subj, options: { fontFace: FH, color: '1F1F1F', breakLine: true } }, { text: snip, options: { color: '5F6368' } }], 706, y + 14, 570, 100, { fontSize: P(23) });
    text('et' + i, t, 1270, y + 12, 80, 40, { fontSize: P(20), color: '5F6368', align: 'right', fontFace: FH });
    all(['er' + i, 'es' + i, 'ef' + i, 'esu' + i, 'et' + i], 'slideR', d, 600);
  });
  rect('gp', 1400, 120, 490, 920, 'F6F8FC', { r: 0.04 }); an('gp', 'fade', 4900, 600);
  label('gph', 'YOUR SECURITY', 1436, 146, 420, '5F6368'); an('gph', 'fade', 5000, 400);
  await donut('gsc', tot('gm'), 14, K.gm, 1530, 196, 230, 5100, { label: tot('gm') + '/14', track: 'E3E7EE', fs: 0.2 });
  critBars('gcb', 'gm', 1436, 460, 420, 46, 5700, { tc: '5F6368', track: 'E3E7EE', fs: 20, lw: 150, col: K.gmB, vc: K.gmB });
  stext('gnote', 'Joint highest, and the only app with a 2 for recovery.', 1436, 800, 420, 120, 'FFFFFF', { r: 0.1, pad: 20, extra: { color: '1F1F1F', fontFace: FH, fontSize: P(24) } });
  an('gnote', 'rise', 6800, 700);

  // =============================================================== 6. GMAIL B: THE MASTER KEY (Tanvir)
  slide(SN('tanvir', 65, `But Gmail has two weak points. [Left card.] First, email is encrypted on the way, but it is not end-to-end encrypted: it is readable on Google's servers.

[Centre.] Second, and more dangerous, Gmail is the master key. Look at the arrows. When you press "forgot password" on Facebook, Discord, your university portal or your bank, the reset link comes to your Gmail. If an attacker opens your Gmail, he can open almost every other door you own.

[Phishing email.] In Bangladesh, the attack usually comes as phishing: an email that looks like it is from a bank, a university or a government office, saying your account will be suspended unless you log in now.

[Right.] To lock it: Google Account, Security, turn on 2-Step Verification or a passkey. Our suggestion: prompt every user to switch to passkeys, and warn more clearly about look-alike senders. Sweety will now take us to Discord.`), 'FFFFFF');
  rect('top', 0, 0, 1920, 110, 'F6F8FC'); img('tl', I.gmM, 40, 28, 54, 54);
  text('tt', [{ text: 'Gmail: the master key', options: { fontFace: FB, color: '1F1F1F', breakLine: true } }, { text: 'if it falls, every reset link goes to the attacker', options: { color: '5F6368', fontSize: P(22) } }], 116, 18, 1200, 80, { fontSize: P(36) });
  all(['top', 'tl', 'tt'], 'fade', 0, 600);
  // hub diagram
  const g = [800, 560];
  oval('gh', g[0] - 130, g[1] - 130, 260, 260, 'FFFFFF', { line: K.gm, lw: 4, glow: K.gm, go: 0.35 }); img('ghi', I.gmM, g[0] - 66, g[1] - 66, 132, 132, 'Gmail');
  an('gh', 'grow', 500, 800, { from: 0.3 }); an('ghi', 'grow', 700, 700, { from: 0.3 }); an('gh', 'pulse', 1600, 2200, { scale: 104 });
  [['fb', 'Facebook'], ['dc', 'Discord'], ['grad', 'University portal'], ['bank', 'Bank'], ['cart', 'Online shops'], ['bk', 'bKash alerts']].forEach(([k, n], i) => {
    const ang = -Math.PI / 2 + i * Math.PI / 3, R = 340, x = g[0] + R * Math.cos(ang), y = g[1] + R * Math.sin(ang) * 0.86, d = 1500 + 450 * i;
    line('ln' + i, g[0] + 140 * Math.cos(ang), g[1] + 140 * Math.sin(ang) * 0.86, x - 60 * Math.cos(ang), y - 52 * Math.sin(ang), K.gm, { lw: 2, dash: 'dash', arrow: 1 });
    if (APPS[k]) appIcon('sn' + i, k, x - 50, y - 50, 100);
    else { oval('sn' + i, x - 50, y - 50, 100, 100, 'F1F3F4', { line: 'DADCE0' }); img('sn' + i + 'i', I[(k === 'grad' ? 'user' : k === 'bank' ? 'money' : 'store') + 'D'], x - 22, y - 22, 44, 44, n); }
    text('st' + i, n, x - 110, y + 54, 220, 34, { fontSize: P(22), fontFace: FH, color: '1F1F1F', align: 'center' });
    an('ln' + i, 'fade', d, 500); all(['sn' + i, 'sn' + i + 'i'], 'grow', d + 100, 500, { from: 0.3 }); an('st' + i, 'fade', d + 200, 400);
  });
  text('fp', '“Forgot password?”  →  a reset link to your Gmail', 400, 990, 800, 40, { fontSize: P(24), italic: true, color: K.gm, align: 'center' }); an('fp', 'fade', 4400, 600);
  // left: weak point card
  stext('wk', [{ text: 'WEAK POINT\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'C5221F', charSpacing: 2 } }, { text: 'Encrypted in transit only, not end-to-end: email is readable on Google’s servers.', options: { color: '1F1F1F', fontSize: P(25), fontFace: FH } }],
    40, 160, 330, 400, 'FCE8E6', { r: 0.06, pad: 24, valign: 'top' });
  an('wk', 'slide', 1000, 700);
  // right: phishing mail + lock + suggestion
  rect('pm', 1290, 150, 590, 340, 'FFFFFF', { r: 0.04, line: 'F6AEA9', lw: 2, shadow: 10 }); an('pm', 'rise', 4800, 700);
  label('pmh', 'THREAT IN BANGLADESH: PHISHING', 1320, 170, 540, 'C5221F', { fontSize: P(19) }); an('pmh', 'fade', 5000, 400);
  text('pmt', [{ text: 'From: Account Security <no-reply@bank-verify-bd.co>', options: { color: '5F6368', fontSize: P(19), breakLine: true } }, { text: 'Your account will be suspended today', options: { fontFace: FH, color: '1F1F1F', fontSize: P(27), breakLine: true } }, { text: 'Verify your details now to avoid closure. Click here to log in.', options: { color: '1F1F1F', fontSize: P(22) } }],
    1320, 214, 540, 180);
  stext('pmb', 'Log in now', 1320, 404, 200, 56, K.gmB, { r: 0.3, align: 'center', extra: { color: 'FFFFFF', fontFace: FH, fontSize: P(22) } });
  text('pmn', 'illustration of a typical phishing email', 1540, 418, 330, 30, { fontSize: P(17), italic: true, color: '9AA0A6' });
  an('pmt', 'fade', 5200, 600); an('pmb', 'grow', 5600, 400, { from: 0.6 }); an('pmn', 'fade', 5800, 400);
  rect('lk', 1290, 516, 590, 220, 'F6F8FC', { r: 0.06 }); an('lk', 'rise', 6200, 600);
  label('lkh', 'LOCK IT', 1320, 534, 540, K.gmB); an('lkh', 'fade', 6300, 400);
  ['Google Account', 'Security', '2-Step Verification or a passkey'].forEach((t, i) => { text('lkt' + i, (i ? '›  ' : '') + t, 1320 + i * 18, 576 + i * 50, 540, 44, { fontSize: P(25), color: i === 2 ? K.gmB : '1F1F1F', fontFace: i === 2 ? FH : F, valign: 'middle' }); an('lkt' + i, 'slide', 6500 + 300 * i, 500); });
  stext('sug', [{ text: 'OUR SUGGESTION\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'FFFFFF', charSpacing: 2 } }, { text: 'Passkeys for every user, and clear warnings on look-alike bank, university and government senders.', options: { color: 'FFFFFF', fontSize: P(25), fontFace: FH } }],
    1290, 762, 590, 260, K.gm, { r: 0.06, pad: 28, valign: 'middle' });
  an('sug', 'rise', 7600, 800);

  // =============================================================== 7. DISCORD A (Sweety)
  slide(SN('sweety', 60, `Thank you, Tanvir. My app is Discord, where many students and gamers spend their evenings. It scored ten out of fourteen. [Bot message.] Its login protection is strong: two-factor authentication with an authenticator app or a physical security key, backup codes, and a devices list where you can see and log out every session.

[Voice channel.] And since May 2026, every voice and video call on Discord is end-to-end encrypted by default, using its DAVE protocol. Not even Discord can listen in.

[Left panel.] It also gives you strong privacy controls: who can send you direct messages and friend requests, and filters for explicit images. Its weaker scores are encryption of text, recovery, and scam protection.`), '313338');
  rect('rail', 0, 0, 104, 1080, '1E1F22');
  oval('rs0', 20, 20, 64, 64, K.dc); img('rs0i', I.dcW, 34, 34, 36, 36, 'Discord');
  ['wa', 'fb'].forEach((k, i) => { oval('rs' + (i + 1), 20, 120 + i * 84, 64, 64, '313338'); img('rs' + (i + 1) + 'i', I[k + 'W'], 36, 136 + i * 84, 32, 32); });
  oval('rsp', 20, 288, 64, 64, '313338'); img('rspi', I.plus, 40, 308, 24, 24);
  all(['rail', 'rs0', 'rs0i', 'rs1', 'rs1i', 'rs2', 'rs2i', 'rsp', 'rspi'], 'fade', 0, 600);
  rect('chs', 104, 0, 380, 1080, '2B2D31');
  text('srv', 'Security HQ', 130, 18, 330, 60, { fontSize: P(30), fontFace: FH, color: 'F2F3F5', valign: 'middle' }); line('srvl', 104, 86, 484, 86, '1F2023');
  text('tch', 'TEXT CHANNELS', 130, 112, 330, 30, { fontSize: P(19), fontFace: FH, color: '949BA4', charSpacing: 1 });
  ['how-discord-protects-you', 'privacy-controls'].forEach((c, i) => {
    const y = 150 + i * 56, act = i === 0;
    if (act) rect('chA', 116, y, 356, 48, '404249', { r: 0.2 });
    img('chi' + i, I.hash, 134, y + 14, 20, 20); text('chn' + i, c, 166, y, 300, 48, { fontSize: P(22), color: act ? 'F2F3F5' : '949BA4', valign: 'middle' });
  });
  text('vch', 'VOICE CHANNELS', 130, 290, 330, 30, { fontSize: P(19), fontFace: FH, color: '949BA4', charSpacing: 1 });
  img('vci', I.volume, 134, 342, 22, 22); text('vcn', 'study-group call', 166, 330, 300, 48, { fontSize: P(23), color: 'F2F3F5', valign: 'middle' });
  stext('vct', [{ text: '  End-to-end encrypted', options: { bold: true } }, { text: '  ·  DAVE, default since May 2026' }], 130, 384, 340, 44, '23A55A', { r: 0.3, extra: { fontSize: P(17), color: 'FFFFFF' } });
  all(['chs', 'srv', 'srvl', 'tch', 'vch', 'vci', 'vcn'], 'fade', 200, 600); an('chA', 'fade', 400, 400); [0, 1].forEach(i => { an('chi' + i, 'fade', 300 + 100 * i, 400); an('chn' + i, 'fade', 300 + 100 * i, 400); });
  an('vct', 'grow', 4200, 600, { from: 0.5 }); an('vct', 'pulse', 5000, 1800, { scale: 103 });
  rect('scb', 116, 470, 356, 590, '232428', { r: 0.06 }); an('scb', 'fade', 900, 500);
  await donut('dsc', tot('dc'), 14, K.dc, 194, 494, 200, 1000, { label: tot('dc') + '/14', track: '3F4147', fs: 0.21, vc: 'F2F3F5' });
  critBars('dcb', 'dc', 132, 716, 324, 44, 1600, { tc: 'B5BAC1', track: '3F4147', fs: 18, lw: 120, col: K.dc, vc: 'C9CDFB' });
  text('chh', [{ text: '#  ', options: { color: '80848E' } }, { text: 'how-discord-protects-you', options: { fontFace: FH, color: 'F2F3F5' } }], 520, 18, 1000, 60, { fontSize: P(28), valign: 'middle' }); line('chhl', 484, 86, 1920, 86, '1F2023');
  all(['chh', 'chhl'], 'fade', 300, 500);
  const embed = (pre, y, col, title, body, d, h = 150) => {
    oval(pre + 'a', 520, y, 64, 64, K.dc); img(pre + 'ai', I.robot, 536, y + 16, 32, 32);
    text(pre + 'n', [{ text: 'SecurityBot  ', options: { fontFace: FH, color: 'F2F3F5' } }, { text: 'BOT', options: { fontSize: P(16), color: 'FFFFFF', bold: true } }, { text: '   Today at 9:41', options: { color: '949BA4', fontSize: P(18) } }], 604, y, 900, 36, { fontSize: P(24) });
    rect(pre + 'e', 604, y + 44, 1260, h, '2B2D31', { r: 0.05 }); rect(pre + 'eb', 604, y + 44, 8, h, col, { r: 0.5 });
    text(pre + 't', [{ text: title, options: { fontFace: FH, color: 'F2F3F5', fontSize: P(27), breakLine: true } }, { text: body, options: { color: 'DBDEE1', fontSize: P(24) } }], 636, y + 60, 1200, h - 30);
    all([pre + 'a', pre + 'ai', pre + 'n'], 'fade', d, 500); all([pre + 'e', pre + 'eb'], 'slideR', d + 150, 600); an(pre + 't', 'fade', d + 350, 600);
  };
  embed('e1', 112, K.good, 'Login protection', 'Two-factor authentication with an authenticator app or a physical security key, plus backup codes.', 1800, 130);
  embed('e2', 320, K.good, 'See every session', 'A devices list shows where you are logged in, and logs out any device with one click.', 2900, 130);
  embed('e3', 528, K.dc, 'Encrypted calls', 'Every voice and video call is end-to-end encrypted by default with the DAVE protocol (May 2026).', 4000, 130);
  embed('e4', 736, K.good, 'Privacy controls', 'Choose who can message you or send friend requests; filter explicit images.', 5100, 130);
  stext('dmi', '   Message #how-discord-protects-you', 520, 984, 1350, 70, '383A40', { r: 0.2, extra: { color: '6D6F78', fontSize: P(24) } }); an('dmi', 'fade', 600, 500);

  // =============================================================== 8. DISCORD B (Sweety)
  slide(SN('sweety', 65, `So how do Discord accounts get stolen? [First card.] First, text messages are not end-to-end encrypted. [Scam cards.] Second, three common tricks. Fake "free Nitro" gifts that lead to a fake login page. QR-code login tricks: you scan a code to "claim a prize", and you have actually logged the scammer into your account. And fake games or tools that steal your login token, which lets the attacker in without your password or your two-factor code.

[Chain.] Then the stolen account sends the same trap to every friend, and because it comes from a friend, people trust it.

[Right.] To lock it: User Settings, My Account, enable an authenticator app, and check your Devices list. Our suggestion to Discord: a clear warning before any QR-code login, and a pause before a new device can message all your friends. Mamun will now present Facebook.`), '313338');
  rect('top', 0, 0, 1920, 110, '1E1F22'); oval('tl', 40, 22, 66, 66, K.dc); img('tli', I.dcW, 55, 37, 36, 36);
  text('tt', [{ text: 'How Discord accounts get stolen', options: { fontFace: FB, color: 'F2F3F5', breakLine: true } }, { text: 'text is not end-to-end encrypted, and the scam spreads through friends', options: { color: '949BA4', fontSize: P(22) } }], 128, 16, 1400, 80, { fontSize: P(36) });
  all(['top', 'tl', 'tli', 'tt'], 'fade', 0, 600);
  [['gift', 'Fake “free Nitro”', 'A gift link opens a fake Discord login page that steals your password.'], ['qr', 'QR-code login trick', 'Scan to “claim a prize”, and you log the scammer into your account.'], ['bolt', 'Token stealers', 'A fake game or tool steals your login token: no password or 2FA needed.']].forEach(([ic, h, b], i) => {
    const x = 128 + i * 562, d = 800 + 900 * i;
    rect('sc' + i, x, 150, 540, 330, '2B2D31', { r: 0.06, line: K.bad, lw: 1.5 }); rect('scb' + i, x, 150, 540, 8, K.bad, { r: 0.5 });
    oval('so' + i, x + 30, 190, 84, 84, K.bad, { glow: K.bad, go: 0.35 }); img('soi' + i, I[ic], x + 52, 212, 40, 40);
    text('st' + i, [{ text: h, options: { fontFace: FH, fontSize: P(32), color: 'F2F3F5', breakLine: true } }, { text: b, options: { fontSize: P(24), color: 'DBDEE1' } }], x + 30, 296, 480, 170);
    an('sc' + i, 'rise', d, 700); an('scb' + i, 'wipe', d + 200, 500); an('so' + i, 'grow', d + 250, 500, { from: 0.3 }); an('soi' + i, 'grow', d + 300, 500, { from: 0.3 }); an('st' + i, 'fade', d + 400, 600);
  });
  // spread chain: one account -> friends
  rect('spr', 128, 510, 1110, 520, '2B2D31', { r: 0.05 }); an('spr', 'fade', 3600, 600);
  label('sph', 'THEN IT SPREADS THROUGH FRIENDS', 164, 532, 900, '949BA4'); an('sph', 'fade', 3700, 400);
  oval('src', 230, 660, 160, 160, K.bad, { glow: K.bad, go: 0.5 });
  cur.addImage({ data: I.user, x: S(278), y: S(708), w: S(64), h: S(64), objectName: 'srcw', altText: '' });
  text('srct', 'one stolen account', 160, 836, 300, 40, { fontSize: P(23), color: 'F2F3F5', align: 'center', fontFace: FH });
  an('src', 'grow', 3900, 600, { from: 0.3 }); an('srcw', 'grow', 4000, 500, { from: 0.3 }); an('srct', 'fade', 4100, 500);
  for (let i = 0; i < 6; i++) {
    const x = 640 + (i % 3) * 190, y = 600 + Math.floor(i / 3) * 210, d = 4500 + 250 * i;
    line('sl' + i, 400, 740, x + 10, y + 50, 'F23F43', { lw: 1.5, dash: 'dash', arrow: 1 });
    oval('sf' + i, x, y, 100, 100, '404249'); cur.addImage({ data: I.user, x: S(x + 30), y: S(y + 30), w: S(40), h: S(40), objectName: 'sfi' + i, altText: '' });
    stext('sfm' + i, 'free Nitro!', x - 20, y + 108, 140, 36, 'F23F43', { r: 0.4, align: 'center', extra: { color: 'FFFFFF', fontSize: P(16), fontFace: FH } });
    an('sl' + i, 'fade', d, 400); all(['sf' + i, 'sfi' + i], 'grow', d + 100, 400, { from: 0.3 }); an('sfm' + i, 'grow', d + 300, 400, { from: 0.4 });
  }
  rect('lk', 1270, 510, 610, 250, '2B2D31', { r: 0.06 }); an('lk', 'rise', 6200, 600);
  label('lkh', 'LOCK IT', 1306, 530, 540, '23A55A'); an('lkh', 'fade', 6300, 400);
  ['User Settings', 'My Account', 'Enable Authenticator App', 'check your Devices list'].forEach((t, i) => { text('lkt' + i, (i ? '›  ' : '') + t, 1306 + i * 16, 570 + i * 44, 560, 40, { fontSize: P(24), color: i >= 2 ? 'C9CDFB' : 'F2F3F5', fontFace: i >= 2 ? FH : F, valign: 'middle' }); an('lkt' + i, 'slide', 6500 + 300 * i, 500); });
  stext('sug', [{ text: 'OUR SUGGESTION\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'DDE0FF', charSpacing: 2 } }, { text: 'A clear warning before any QR-code login, and a pause before a new device can message all your friends.', options: { color: 'FFFFFF', fontSize: P(25), fontFace: FH } }],
    1270, 780, 610, 250, K.dc, { r: 0.06, pad: 28, valign: 'middle' });
  an('sug', 'rise', 7800, 800);

  // =============================================================== 9. FACEBOOK A (Mamun)
  slide(SN('mamun', 60, `Thank you, Sweety. I will present Facebook, which scored eleven out of fourteen. [Posts.] On paper, its locks are strong. Two-factor authentication with an authenticator app, a physical security key or SMS. Login alerts, and "Where you're logged in", which shows every device on your account. Since December 2023, personal chats on Messenger are end-to-end encrypted by default. And Facebook now supports passkeys and a guided Security Checkup.

[Profile card.] On our rubric, Facebook is strong on login, encryption, monitoring and usability, but weak on recovery, scam protection and privacy. And as we will see, the strongest lock does nothing if it is switched off.`), 'F0F2F5');
  rect('top', 0, 0, 1920, 96, 'FFFFFF', { shadow: 8, so: 2, sop: 0.12 });
  oval('fbl', 32, 16, 64, 64, K.fb); img('fbli', I.fbW, 46, 30, 36, 36, 'Facebook');
  stext('fbs', '      Search: is my account safe?', 116, 22, 380, 52, 'F0F2F5', { r: 0.5, extra: { fontSize: P(22), color: '65676B' } }); img('fbsi', I.searchG, 130, 38, 20, 20);
  ['home', 'video', 'store', 'users'].forEach((ic, i) => { img('nav' + i, I[ic + (i ? 'G' : 'D')], 740 + i * 130, 30, 36, 36); });
  rect('navu', 712, 90, 92, 6, K.fb);
  all(['top', 'fbl', 'fbli', 'fbs', 'fbsi', 'nav0', 'nav1', 'nav2', 'nav3', 'navu'], 'fade', 0, 600);
  rect('pf', 40, 126, 440, 900, 'FFFFFF', { r: 0.04, shadow: 8, so: 2, sop: 0.1 }); rect('cov', 40, 126, 440, 150, K.fb, { r: 0.04 });
  oval('pav', 180, 200, 160, 160, 'FFFFFF'); oval('pav2', 192, 212, 136, 136, K.fb); img('pavi', I.fbW, 226, 246, 68, 68);
  text('pn', 'Facebook', 40, 372, 440, 50, { fontSize: P(40), fontFace: FB, color: '1C1E21', align: 'center' });
  text('pd', 'Security review  ·  rubric score', 40, 422, 440, 32, { fontSize: P(22), color: '65676B', align: 'center' });
  all(['pf', 'cov'], 'rise', 300, 700); all(['pav', 'pav2', 'pavi'], 'grow', 700, 700, { from: 0.3 }); an('pn', 'fade', 900, 500); an('pd', 'fade', 1000, 500);
  await donut('fsc', tot('fb'), 14, K.fb, 150, 470, 220, 1300, { label: tot('fb') + '/14', track: 'E4E6EB', fs: 0.2 });
  critBars('fcb', 'fb', 70, 720, 390, 40, 1900, { tc: '65676B', track: 'E4E6EB', fs: 19, lw: 150 });
  [['key', 'Two-factor authentication', 'An authenticator app, a security key or SMS'], ['bell', 'Login alerts and “Where you’re logged in”', 'See and remove every device on your account'],
   ['lock', 'Encrypted Messenger chats', 'End-to-end encrypted by default since December 2023'], ['finger', 'Passkeys and Security Checkup', 'Sign in with your face or fingerprint; a guided tour of your settings']].forEach(([ic, h, b], i) => {
    const y = 126 + i * 228, d = 1500 + 900 * i;
    rect('pp' + i, 510, y, 1370, 208, 'FFFFFF', { r: 0.04, shadow: 8, so: 2, sop: 0.1 });
    oval('ppa' + i, 540, y + 26, 64, 64, K.fb); img('ppi' + i, I[ic], 558, y + 44, 28, 28);
    text('ppn' + i, [{ text: 'Facebook Security', options: { fontFace: FH, color: '1C1E21', breakLine: true } }, { text: 'Just now  ·  Settings › Accounts Center', options: { color: '65676B', fontSize: P(19) } }], 622, y + 26, 800, 64, { fontSize: P(23) });
    text('ppt' + i, [{ text: h, options: { fontFace: FH, color: '1C1E21', fontSize: P(30), breakLine: true } }, { text: b, options: { color: '3A3B3C', fontSize: P(24) } }], 540, y + 104, 1300, 90);
    [['thumbs', 'Like'], ['comment', 'Comment'], ['share', 'Share']].forEach(([ri, rl], j) => { img('pr' + i + j, I[ri + 'G'], 1500 + j * 120, y + 34, 22, 22); });
    all(['pp' + i, 'ppa' + i, 'ppi' + i, 'ppn' + i, 'ppt' + i, 'pr' + i + '0', 'pr' + i + '1', 'pr' + i + '2'], 'rise', d, 700);
  });

  // =============================================================== 10. FACEBOOK B (Mamun)
  slide(SN('mamun', 65, `So why are so many Facebook accounts still hacked in Bangladesh? [Left.] Because two-factor authentication is optional, and many people never switch it on. Then a single link is enough. Remember the student the CID arrested: he hacked more than fifty accounts just by sending links on Messenger.

[Fake page.] A very common version is the fake "copyright violation" page. It says your page will be removed in twenty-four hours unless you log in to appeal. The address looks almost like Facebook, but it is not. You type your password, and it goes straight to the attacker.

[Chain.] Without two-factor authentication, he logs in, changes your recovery email and phone, and you are locked out, while he uses your account to blackmail or to scam your friends.

[Right.] To lock it: Settings, Accounts Center, Password and security, Two-factor authentication. Our suggestion: two-factor authentication on by default for new accounts and pages, and faster recovery for hacked accounts. Masum will finish with bKash.`), 'F0F2F5');
  rect('top', 0, 0, 1920, 110, 'FFFFFF', { shadow: 8, so: 2, sop: 0.12 }); oval('tl', 40, 22, 66, 66, K.fb); img('tli', I.fbW, 55, 37, 36, 36);
  text('tt', [{ text: 'How Facebook accounts are lost', options: { fontFace: FB, color: '1C1E21', breakLine: true } }, { text: 'two-factor authentication is optional, so one link is enough', options: { color: '65676B', fontSize: P(22) } }], 128, 16, 1400, 80, { fontSize: P(36) });
  all(['top', 'tl', 'tli', 'tt'], 'fade', 0, 600);
  // fake copyright page in a browser frame
  rect('br', 40, 140, 760, 620, 'FFFFFF', { r: 0.03, shadow: 14, so: 4, sop: 0.2 }); rect('brb', 40, 140, 760, 64, 'E4E6EB', { r: 0.03 });
  [0, 1, 2].forEach(i => oval('brd' + i, 62 + i * 30, 164, 16, 16, ['FF5F57', 'FEBC2E', '28C840'][i]));
  stext('url', [{ text: 'Not secure   ', options: { bold: true, color: 'C5221F' } }, { text: 'faceb00k-appeal-center.net', options: { color: '1C1E21' } }], 160, 152, 600, 42, 'FFFFFF', { r: 0.5, pad: 12, extra: { fontSize: P(20), fontFace: MONO } });
  all(['br', 'brb', 'brd0', 'brd1', 'brd2', 'url'], 'rise', 500, 700);
  stext('cph', 'Copyright Violation Notice', 40, 204, 760, 80, K.fb, { pad: 24, extra: { color: 'FFFFFF', fontFace: FH, fontSize: P(30) } });
  text('cpt', 'Your page will be removed in 24 hours for a copyright violation. Log in to appeal.', 80, 306, 680, 90, { fontSize: P(25), color: '1C1E21' });
  [['Email or phone', 'sparrow.21@gmail.com'], ['Password', '●●●●●●●●●●']].forEach(([l, v], i) => { stext('cpf' + i, [{ text: v }], 80, 410 + i * 86, 680, 66, 'F5F6F7', { r: 0.12, pad: 14, line: 'CCD0D5', extra: { color: '1C1E21', fontSize: P(24), fontFace: MONO } }); an('cpf' + i, 'fade', 1500 + 400 * i, 500); });
  stext('cpb', 'Log in to appeal', 80, 590, 680, 70, K.fb, { r: 0.12, align: 'center', extra: { color: 'FFFFFF', fontFace: FH, fontSize: P(26) } });
  text('cpn', 'illustration of a typical fake page', 80, 676, 680, 30, { fontSize: P(18), italic: true, color: '8A8D91' });
  an('cph', 'fade', 900, 500); an('cpt', 'fade', 1100, 500); an('cpb', 'grow', 2400, 500, { from: 0.6 }); an('cpn', 'fade', 2600, 400);
  stext('stamp', 'FAKE PAGE', 470, 300, 300, 80, null, { r: 0.1, align: 'center', line: 'C5221F', lw: 4, extra: { color: 'C5221F', fontFace: FB, fontSize: P(36), charSpacing: 3, rotate: -10 } });
  an('stamp', 'grow', 3000, 400, { from: 1.6 });
  // takeover chain
  steps('tk', [['fish', 'The link', 'A fake page steals the password'], ['unlock', 'No 2FA', 'Nothing stops the login'], ['cog', 'Locked out', 'Recovery email and phone changed'], ['money', 'Abuse', 'Blackmail, or scams to friends']], 840, 140, 1040, 300, 3400, [K.fb, K.bad, K.bad, K.bad],
    { fill: 'FFFFFF', hc: '1C1E21', bc: '3A3B3C', ac: '8A8D91', step: 750, shadow: 8 });
  stext('cid', [{ text: 'REAL CASE  ', options: { bold: true, color: K.fb, fontFace: MONO } }, { text: 'CID (Oct 2024): a student hacked more than 50 Facebook accounts with Messenger links and blackmailed at least 15 victims.', options: { color: '1C1E21' } }],
    40, 790, 760, 230, 'FFFFFF', { r: 0.04, pad: 26, shadow: 8, extra: { fontSize: P(25) } });
  an('cid', 'rise', 6600, 700);
  rect('lk', 840, 470, 500, 550, 'FFFFFF', { r: 0.04, shadow: 8 }); an('lk', 'rise', 6800, 600);
  label('lkh', 'LOCK IT', 876, 494, 440, K.fb); an('lkh', 'fade', 6900, 400);
  ['Settings and privacy', 'Accounts Center', 'Password and security', 'Two-factor authentication'].forEach((t, i) => { text('lkt' + i, (i ? '›  ' : '') + t, 876 + i * 16, 546 + i * 72, 440, 60, { fontSize: P(25), color: i === 3 ? K.fb : '1C1E21', fontFace: i === 3 ? FH : F, valign: 'middle' }); an('lkt' + i, 'slide', 7100 + 300 * i, 500); });
  stext('sug', [{ text: 'OUR SUGGESTION\n', options: { fontFace: MONO, bold: true, fontSize: P(19), color: 'DCE8FF', charSpacing: 2 } }, { text: 'Two-factor authentication on by default for new accounts and pages, and a faster recovery path for hacked accounts.', options: { color: 'FFFFFF', fontSize: P(26), fontFace: FH } }],
    1370, 470, 510, 550, K.fb, { r: 0.04, pad: 30, valign: 'middle' });
  an('sug', 'rise', 8400, 800);

  // =============================================================== 11. bKASH A (Masum)
  slide(SN('masum', 60, `Thank you, Mamun. I will present bKash, which is different from the others: it does not hold our messages, it holds our money. It scored nine out of fourteen.

[Service tiles.] Its locks are real. A PIN for every login and every transaction. A one-time password when you log in on a new device. Face ID and fingerprint login. And a notification for every single transaction, so you know at once when money moves.

[Bars.] On our rubric, bKash is strong on login and monitoring. But it has no messages to encrypt, its privacy controls are limited, and its recovery and scam protection depend on the user, which, as we will see, is exactly where the money leaks.`), 'F4F5F7');
  imgp('bkh', A_DIR + 'bk_head.png', 0, 0, 1920, 420); an('bkh', 'fade', 0, 600);
  oval('bkc', 60, 44, 96, 96, 'FFFFFF'); text('bkb', 'b', 60, 44, 96, 96, { fontSize: P(64), fontFace: FB, color: K.bk, align: 'center', valign: 'middle' });
  text('bkt', [{ text: 'bKash', options: { fontFace: FB, fontSize: P(54), color: 'FFFFFF', breakLine: true } }, { text: 'Mobile financial service  ·  how it protects your money', options: { fontSize: P(23), color: 'FFD3E6' } }], 180, 44, 1100, 110);
  all(['bkc', 'bkb'], 'grow', 300, 600, { from: 0.3 }); an('bkt', 'fade', 500, 700);
  rect('bal', 60, 200, 760, 190, 'FFFFFF', { r: 0.12, shadow: 16, so: 4, sop: 0.2 });
  label('balh', 'SECURITY BALANCE', 100, 224, 500, '8A8F99', { fontSize: P(20) });
  text('balv', [{ text: String(tot('bk')), options: { fontFace: FB, fontSize: P(96), color: K.bk } }, { text: '  / 14', options: { fontSize: P(36), color: '8A8F99' } }], 100, 254, 500, 120, { valign: 'middle' });
  stext('balt', 'Tap for details', 560, 296, 220, 56, 'FDE4EF', { r: 0.5, align: 'center', extra: { color: K.bk, fontFace: FH, fontSize: P(22) } });
  an('bal', 'rise', 700, 800); an('balh', 'fade', 1000, 500); an('balv', 'grow', 1100, 800, { from: 0.4 }); an('balt', 'fade', 1500, 500); an('balt', 'pulse', 2300, 1600, { scale: 103 });
  [['key', 'PIN for every login and transaction'], ['phone', 'OTP when you log in on a new device'], ['finger', 'Face ID and fingerprint login'], ['bell', 'A notification for every transaction']].forEach(([ic, l], i) => {
    const x = 60 + i * 450, d = 1800 + 400 * i;
    rect('sv' + i, x, 470, 420, 250, 'FFFFFF', { r: 0.08, shadow: 8, so: 2, sop: 0.1 });
    oval('svo' + i, x + 160, 496, 100, 100, 'FDE4EF'); img('svi' + i, I[ic + 'D'], x + 186, 522, 48, 48);
    text('svl' + i, l, x + 20, 610, 380, 96, { fontSize: P(26), color: '1C1E21', align: 'center', fontFace: FH });
    an('sv' + i, 'rise', d, 600); an('svo' + i, 'grow', d + 200, 400, { from: 0.3 }); an('svi' + i, 'grow', d + 250, 400, { from: 0.3 }); an('svl' + i, 'fade', d + 300, 500);
  });
  rect('cbp', 60, 750, 1800, 290, 'FFFFFF', { r: 0.06, shadow: 8, so: 2, sop: 0.1 }); an('cbp', 'rise', 3600, 600);
  label('cbh', 'RUBRIC SCORE BY CRITERION', 100, 770, 900, '8A8F99', { fontSize: P(20) }); an('cbh', 'fade', 3700, 400);
  APPS.bk.s.forEach((v, i) => {
    const x = 100 + i * 250, h = 150 * Math.max(v, 0.05) / 2, d = 3900 + 200 * i;
    rect('cbt' + i, x + 60, 820, 90, 150, 'F1F2F4', { r: 0.1 }); rect('cbb' + i, x + 60, 970 - h, 90, h, K.bk, { r: 0.1 });
    text('cbv' + i, String(v), x + 160, 930, 50, 40, { fontSize: P(30), fontFace: FB, color: K.bk });
    text('cbl' + i, CS[i], x, 978, 230, 40, { fontSize: P(21), color: '5F6368', align: 'center' });
    an('cbt' + i, 'fade', d, 400); an('cbb' + i, 'wipeU', d + 100, 700); an('cbv' + i, 'fade', d + 600, 400); an('cbl' + i, 'fade', d, 400);
  });

  // =============================================================== 12. bKASH B + VERDICT (Masum)
  slide(SN('masum', 85, `So where does the money leak? [Statement.] Not through the app. Through the user. Scammers call pretending to be bKash, or say "your account is blocked", to get your PIN or your OTP, just like the call to the actor Dighi. bKash never asks for either. And bKash wallets are used to cash out stolen money fast: in August 2025, about twenty-seven lakh taka was taken from fifty-four Standard Chartered card holders, pushed into bKash and Nagad wallets, and cashed out within minutes. Across Bangladesh in 2025: eighty-one thousand four hundred and twenty-three fraud incidents, and ninety-two point six crore taka lost.

Our suggestion to bKash: a short cooling-off period for the first payment to a new number, and a one-tap "freeze my account" button.

[Scoreboard.] Finally, all five apps together. WhatsApp and Gmail lead with twelve, Facebook eleven, Discord ten, bKash nine. But in every story today, from the NBR chairman to the actor, the lock was not broken. It was opened from the inside. The most secure app is the one you set up, and never let a stranger open. Thank you. We are happy to take your questions.`), 'F4F5F7', 'fade');
  rect('top', 0, 0, 1920, 110, K.bk); oval('tl', 40, 22, 66, 66, 'FFFFFF'); text('tlb', 'b', 40, 22, 66, 66, { fontSize: P(44), fontFace: FB, color: K.bk, align: 'center', valign: 'middle' });
  text('tt', [{ text: 'Where the money leaks', options: { fontFace: FB, color: 'FFFFFF', breakLine: true } }, { text: 'not through the app, but through the user', options: { color: 'FFD3E6', fontSize: P(22) } }], 128, 16, 1200, 80, { fontSize: P(36) });
  all(['top', 'tl', 'tlb', 'tt'], 'fade', 0, 600);
  rect('st', 40, 140, 960, 640, 'FFFFFF', { r: 0.04, shadow: 14, so: 4, sop: 0.16 }); an('st', 'rise', 400, 700);
  label('sth', 'STATEMENT', 76, 162, 880, '8A8F99', { fontSize: P(20) }); an('sth', 'fade', 600, 400);
  [['phone', 'Fake “bKash” calls', '“Your account is blocked”: callers trick people into sharing a PIN or an OTP. bKash never asks for either.', K.bad, 'PIN / OTP'],
   ['money', 'Cash-out in minutes', 'Aug 2025: about Tk 27 lakh from 54 Standard Chartered card holders went into bKash and Nagad wallets, then was cashed out.', K.mid, 'Tk 27 lakh'],
   ['chart', 'Bangladesh, 2025', '81,423 fraud incidents in MFS, cheque and card payments; Tk 92.60 crore lost (Bangladesh Bank).', K.bk, 'Tk 92.6 cr']].forEach(([ic, h, b, col, amt], i) => {
    const y = 210 + i * 186, d = 1000 + 1000 * i;
    oval('so' + i, 76, y + 16, 72, 72, col); img('soi' + i, I[ic], 96, y + 36, 32, 32);
    text('stt' + i, [{ text: h, options: { fontFace: FH, color: '1C1E21', fontSize: P(28), breakLine: true } }, { text: b, options: { color: '5F6368', fontSize: P(22) } }], 172, y + 4, 600, 170);
    text('sta' + i, amt, 760, y + 12, 210, 50, { fontSize: P(28), fontFace: FH, color: col, align: 'right' });
    if (i < 2) line('sts' + i, 76, y + 180, 970, y + 180, 'EEEEEE');
    all(['so' + i, 'soi' + i], 'grow', d, 500, { from: 0.3 }); an('stt' + i, 'fade', d + 150, 600); an('sta' + i, 'slideR', d + 300, 500); if (i < 2) an('sts' + i, 'fade', d + 300, 400);
  });
  stext('sug', [{ text: 'OUR SUGGESTION   ', options: { fontFace: MONO, bold: true, color: 'FFD3E6', fontSize: P(19), charSpacing: 2 } }, { text: 'A cooling-off period for the first payment to a new number, and a one-tap “freeze my account” button.', options: { color: 'FFFFFF', fontSize: P(25), fontFace: FH } }],
    40, 800, 960, 120, K.bk, { r: 0.15, pad: 24 });
  an('sug', 'wipe', 4200, 900);
  // final scoreboard (dark card)
  rect('fs', 1030, 140, 850, 640, '0F1218', { r: 0.04, shadow: 14, so: 4, sop: 0.3 }); an('fs', 'rise', 5200, 700);
  label('fsh', 'FINAL SCOREBOARD  ·  OUT OF 14', 1070, 166, 780, K.soft, { fontSize: P(20) }); an('fsh', 'fade', 5400, 400);
  [...FIVE].sort((a, b) => tot(b) - tot(a)).forEach((k, i) => {
    const y = 230 + i * 106, d = 5600 + 350 * i, w = 470 * tot(k) / 14;
    appIcon('ro' + i, k, 1070, y + 10, 72);
    text('rn' + i, APPS[k].n, 1162, y + 2, 300, 40, { fontSize: P(26), fontFace: FH, color: K.white });
    rect('rt' + i, 1162, y + 50, 470, 22, '2A3142', { r: 0.5 }); rect('rb' + i, 1162, y + 50, w, 22, APPS[k].c, { r: 0.5 });
    text('rv' + i, String(tot(k)), 1660, y + 14, 120, 64, { fontSize: P(52), fontFace: FB, color: K.white });
    all(['ro' + i, 'ro' + i + 'i'], 'grow', d, 400, { from: 0.3 }); an('rn' + i, 'fade', d + 100, 400); an('rt' + i, 'fade', d + 100, 300); an('rb' + i, 'wipe', d + 200, 800); an('rv' + i, 'grow', d + 700, 400, { from: 0.4 });
  });
  stext('close', [{ text: 'The lock was not broken. ', options: { color: 'FFFFFF' } }, { text: 'It was opened from the inside.', options: { color: 'FFD3E6' } }], 1030, 800, 850, 120, '1C1E21', { r: 0.15, pad: 24, align: 'center', extra: { fontFace: FB, fontSize: P(32) } });
  an('close', 'rise', 7800, 900);
  stext('qa', 'Thank you  ·  Questions?', 660, 950, 600, 90, K.bk, { r: 0.5, align: 'center', extra: { color: 'FFFFFF', fontFace: FH, fontSize: P(34) } });
  an('qa', 'grow', 8800, 700, { from: 0.6 }); an('qa', 'pulse', 9600, 1800, { scale: 103 });

  await pres.writeFile({ fileName: OUT });
  fs.writeFileSync(OUT.replace(/\.pptx$/, '.anim.json'), JSON.stringify(SPEC));
  console.log('written', OUT, SPEC.length, 'slides');
})();
