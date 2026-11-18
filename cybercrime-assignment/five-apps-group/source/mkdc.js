const sharp = require('/home/user/gdeck/node_modules/sharp');
const React = require('/home/user/gdeck/node_modules/react'), RDS = require('/home/user/gdeck/node_modules/react-dom/server'), fa = require('/home/user/gdeck/node_modules/react-icons/fa');
const fs = require('fs'); const OUT = process.argv[2];
const SI = k => fs.readFileSync(`/home/user/gdeck/node_modules/simple-icons/icons/${k}.svg`, 'utf8').match(/ d="([^"]+)"/)[1];
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const scan = h => { let s = ''; for (let y = 0; y < h; y += 6) s += `<rect y="${y}" width="672" height="1" fill="#fff" opacity=".025"/>`; return s; };
function screen(title, rows, btn, H, o = {}) {
  let y = 200, body = '';
  rows.forEach(r => {
    const lines = Array.isArray(r.t) ? r.t : [r.t];
    if (r.kind === 'qr') {
      let q = ''; const s = 12, x0 = 252, y0 = y;
      for (let i = 0; i < 14; i++) for (let j = 0; j < 14; j++) if (((i * 7 + j * 13 + i * j) % 5) < 2 || (i < 3 && j < 3) || (i < 3 && j > 10) || (i > 10 && j < 3)) q += `<rect x="${x0 + j * s}" y="${y0 + i * s}" width="${s}" height="${s}" fill="#E5E7EB"/>`;
      body += `<rect x="${x0 - 14}" y="${y0 - 14}" width="${14 * s + 28}" height="${14 * s + 28}" rx="10" fill="#1F2937"/>${q}`;
      y += 14 * s + 40; return;
    }
    if (r.kind === 'msg') {
      const h = 140 + (lines.length - 1) * 58;
      body += `<rect x="20" y="${y}" width="632" height="${h}" rx="18" fill="#1E2A38" stroke="#3B4A5E" stroke-width="2"/>`;
      body += `<text x="40" y="${y + 46}" font-family="Arial" font-size="34" font-weight="bold" fill="#${r.c || 'F472B6'}">${esc(r.who)}</text>`;
      lines.forEach((l, k) => body += `<text x="40" y="${y + 100 + k * 58}" font-family="Arial" font-size="46" fill="#F1F5F9">${esc(l)}</text>`);
      y += h + 22; return;
    }
    body += `<circle cx="44" cy="${y + 46}" r="22" fill="#${r.dot || '8B2E48'}"/>`;
    lines.forEach((l, k) => body += `<text x="86" y="${y + 62 + k * 62 - (lines.length - 1) * 31}" font-family="Arial" font-size="50" fill="#F1F5F9">${esc(l)}</text>`);
    body += `<line x1="16" y1="${y + 40 + lines.length * 62}" x2="656" y2="${y + 40 + lines.length * 62}" stroke="#334155" stroke-width="2"/>`;
    y += 60 + lines.length * 62;
  });
  const bl = Array.isArray(btn) ? btn : [btn], bh = 56 + bl.length * 64;
  body += `<rect x="14" y="${y + 6}" width="644" height="${bh}" rx="26" fill="#4A2032" stroke="#FF5A7A" stroke-width="6"/>`;
  bl.forEach((l, k) => body += `<text x="336" y="${y + 6 + bh / 2 + 18 - (bl.length - 1) * 32 + k * 64}" text-anchor="middle" font-family="Arial" font-size="52" font-weight="bold" fill="#F1F5F9">${esc(l)}</text>`);
  H = y + 6 + bh + 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="672" height="${H}"><defs><clipPath id="c"><rect width="672" height="${H + 60}" rx="46"/></clipPath></defs><g clip-path="url(#c)"><rect width="672" height="${H}" fill="#0E1720"/>${scan(H)}<rect width="672" height="160" fill="#5A1F35"/><rect width="672" height="160" fill="#fff" opacity=".02"/><rect x="256" y="16" width="160" height="16" rx="8" fill="#E0496B"/><text x="636" y="56" text-anchor="end" font-family="Arial" font-size="30" fill="#CBD5E1">${o.time || '1:10 AM'}</text><text x="32" y="112" font-family="Arial" font-size="54" font-weight="bold" fill="#F1F5F9">${esc(title)}</text>${body}</g><rect x="3" y="3" width="666" height="${H + 40}" rx="44" fill="none" stroke="#E0496B" stroke-width="6" opacity=".8"/></svg>`;
}
(async () => {
  const S = [
    ['shot0', screen('Her Gmail', [{ t: ['Discord: reset', 'password'] }, { t: ['Discord: verify', 'new login'] }], ['Fox clicks', 'both'], 800)],
    ['shot1', screen('#class-2026', [{ kind: 'msg', who: 'Sparrow (Fox)', t: ['FREE Nitro!', 'Scan to claim'] }, { kind: 'qr' }], 'Fake QR', 900)],
    ['shot2', screen('Rafi', [{ kind: 'msg', who: 'Rafi', c: '93C5FD', t: ['I scanned it…', 'I’m logged out!'] }], ['Account', 'stolen'], 860)]];
  for (const [n, svg] of S) await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${n}.png`);
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24"><path fill="#FFFFFF" d="${SI('discord')}"/></svg>`)).png().toFile(`${OUT}/discord_w.png`);
  for (const [n, C] of [['si_shield', fa.FaShieldAlt], ['si_qr', fa.FaQrcode], ['si_key', fa.FaKey]]) {
    const svg = RDS.renderToStaticMarkup(React.createElement(C, { color: '#070B14', size: '128' }));
    await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${n}.png`);
  }
  console.log('done');
})();
