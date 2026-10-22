// Small helpers shared by all views.
const U = {
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
    );
  },

  // localStorage can throw (private mode, blocked storage) — never let that break a page.
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('studyhub:' + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('studyhub:' + key, JSON.stringify(value));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  },
  del(key) {
    try {
      localStorage.removeItem('studyhub:' + key);
    } catch {
      /* ignore */
    }
  },

  num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  },
  round(n, d = 2) {
    const f = 10 ** d;
    return Math.round(n * f) / f;
  },

  parseDate(s) {
    if (!s) return null;
    const d = new Date(s.length <= 10 ? s + 'T00:00:00' : s);
    return isNaN(d) ? null : d;
  },
  daysUntil(d) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    return Math.round((day - today) / 86400000);
  },
  fmtDate(d) {
    const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    let s = d.toLocaleDateString(undefined, opts);
    if (d.getHours() || d.getMinutes()) {
      s += ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    return s;
  },
  relDays(n) {
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
  },

  // Probability model shared by the quiz views (documented in the quiz data file).
  topicScore(t) {
    return 45 * t.S + 25 * t.D + 15 * t.E + 15 * t.F;
  },
  tier(score) {
    if (score >= 80) return { key: 'vh', label: 'Very high' };
    if (score >= 60) return { key: 'h', label: 'High' };
    if (score >= 40) return { key: 'm', label: 'Medium' };
    return { key: 'l', label: 'Low' };
  },
  probChip(score) {
    const t = U.tier(score);
    return `<span class="chip p-${t.key}" title="Probability score ${Math.round(score)}/100">${t.label} · ${Math.round(score)}</span>`;
  },

  // Events with a personal date set on the Forecast page override a TBA date.
  eventDate(ev) {
    return U.parseDate(ev.date || U.get('eventDate:' + ev.id, null));
  },
  allEvents() {
    const personal = U.get('personalEvents', []).map((e) => ({ ...e, personal: true }));
    return [...HUB.events, ...personal];
  },

  copy(text, btn) {
    const done = () => {
      if (!btn) return;
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => (btn.textContent = old), 1200);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, () => {});
  },

  stripTags(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent;
  },
};
