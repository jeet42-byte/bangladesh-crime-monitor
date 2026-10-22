// Assignments: per-course guides plus an APA 7 citation helper.
(function () {
  function guide(a, open) {
    const course = HUB.course(a.course);
    const list = (items) => `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
    const parts = [];

    if (a.pending) parts.push(`<p class="note">${U.esc(a.pending)}</p>`);
    if (a.instructions) {
      parts.push(`<h3>Instructions</h3>${list(a.instructions.map(U.esc))}`);
    }
    if (a.overview) parts.push(`<h3>The idea in brief</h3><p>${U.esc(a.overview)}</p>`);
    if (a.structure) {
      parts.push(`<h3>Suggested structure</h3>
        <div class="table-wrap"><table>
          <tr><th>Heading</th><th>What goes here</th></tr>
          ${a.structure.map((s) => `<tr><td><b>${U.esc(s.h)}</b></td><td>${U.esc(s.tip)}</td></tr>`).join('')}
        </table></div>`);
    }
    if (a.sample) {
      parts.push(`<h3>${U.esc(a.sample.title)}</h3>
        <div class="table-wrap"><table>
          <tr><th>#</th><th>Question</th><th>Probe</th><th>Theme</th></tr>
          ${a.sample.items
            .map((s, i) => `<tr><td>${i + 1}</td><td>${U.esc(s.q)}</td><td><small>${U.esc(s.p)}</small></td><td><span class="chip">${U.esc(s.theme)}</span></td></tr>`)
            .join('')}
        </table></div>`);
    }
    if (a.definitions) {
      parts.push(`<h3>Key definitions</h3>
        ${a.definitions.map((d) => `<div class="def"><b>${U.esc(d.term)}</b> — ${U.esc(d.def)} <small class="muted">(${U.esc(d.cite)})</small></div>`).join('')}`);
    }
    if (a.theories) {
      parts.push(`<h3>Relevant theories &amp; approaches</h3>
        ${a.theories.map((t) => `<div class="def"><b>${U.esc(t.name)}</b> — ${U.esc(t.gist)} <small class="muted">(${U.esc(t.cite)})</small></div>`).join('')}`);
    }
    if (a.classification) {
      parts.push(`<h3>Classification</h3>
        <div class="grid">${a.classification
          .map((c) => `<div class="card" style="background:var(--surface-2);box-shadow:none"><b>${U.esc(c.name)}</b>${list(c.items.map(U.esc))}</div>`)
          .join('')}</div>`);
    }
    if (a.tips) parts.push(`<h3 style="margin-top:16px">Tips</h3>${list(a.tips.map(U.esc))}`);
    if (a.references) {
      parts.push(`<h3>References (APA 7)</h3>
        <ol class="ref-list" style="list-style:none;padding:0">
          ${a.references
            .map(
              (r, i) => `<li>${r.apa}
                <button class="btn small copy" data-copy="${a.id}:${i}">Copy</button><br>
                <small class="muted">In-text: ${U.esc(r.intext)}${r.note ? ' · ' + U.esc(r.note) : ''}</small></li>`
            )
            .join('')}
        </ol>`);
    }

    return `
      <details class="card" ${open ? 'open' : ''}>
        <summary>
          <div class="row">
            <span class="chip">${U.esc(course ? course.title : a.course)}</span>
            <span class="chip">${U.esc(a.kind || 'Assignment')}</span>
            ${a.due ? `<span class="chip p-h">Due ${U.esc(U.fmtDate(U.parseDate(a.due)))}</span>` : ''}
          </div>
          <h2 style="margin-top:8px">${U.esc(a.title)}</h2>
        </summary>
        ${parts.join('')}
      </details>`;
  }

  // ── APA 7 helper ───────────────────────────────────────────
  function authorsRef(raw) {
    const a = raw.split(';').map((s) => s.trim()).filter(Boolean);
    if (a.length <= 1) return a[0] || '';
    if (a.length === 2) return `${a[0]}, & ${a[1]}`;
    return a.slice(0, -1).join(', ') + ', & ' + a[a.length - 1];
  }
  function authorsInText(raw) {
    const last = raw
      .split(';')
      .map((s) => s.trim().split(',')[0].trim())
      .filter(Boolean);
    if (!last.length) return '';
    if (last.length === 1) return last[0];
    if (last.length === 2) return `${last[0]} & ${last[1]}`;
    return `${last[0]} et al.`;
  }
  const end = (s) => (/[.?!]$/.test(s) ? s : s + '.');

  const FIELDS = {
    book: [['authors', 'Authors (Last, F. M.; Last, F.)'], ['year', 'Year'], ['title', 'Book title'], ['edition', 'Edition (e.g. 4th) — optional'], ['publisher', 'Publisher']],
    journal: [['authors', 'Authors (Last, F. M.; Last, F.)'], ['year', 'Year'], ['title', 'Article title'], ['journal', 'Journal name'], ['volume', 'Volume'], ['issue', 'Issue'], ['pages', 'Pages (e.g. 366–373)'], ['doi', 'DOI or URL — optional']],
    chapter: [['authors', 'Chapter authors (Last, F.; …)'], ['year', 'Year'], ['title', 'Chapter title'], ['editors', 'Editors (F. Last & F. Last)'], ['book', 'Book title'], ['pages', 'Pages (e.g. 83–97)'], ['publisher', 'Publisher']],
    web: [['authors', 'Author or organization'], ['year', 'Date (e.g. 2024, March 5)'], ['title', 'Page title'], ['site', 'Website name'], ['url', 'URL']],
  };

  function build(type, v) {
    const au = U.esc(authorsRef(v.authors || ''));
    const yr = `(${U.esc(v.year || 'n.d.')}).`;
    let ref = '';
    if (type === 'book') {
      ref = `${au} ${yr} <i>${U.esc(v.title || '')}</i>${v.edition ? ` (${U.esc(v.edition)} ed.)` : ''}. ${U.esc(v.publisher || '')}.`;
    } else if (type === 'journal') {
      ref = `${au} ${yr} ${U.esc(end(v.title || ''))} <i>${U.esc(v.journal || '')}</i>, <i>${U.esc(v.volume || '')}</i>${v.issue ? `(${U.esc(v.issue)})` : ''}, ${U.esc(v.pages || '')}.${v.doi ? ' ' + U.esc(v.doi) : ''}`;
    } else if (type === 'chapter') {
      ref = `${au} ${yr} ${U.esc(end(v.title || ''))} In ${U.esc(v.editors || '')} (Eds.), <i>${U.esc(v.book || '')}</i> (pp. ${U.esc(v.pages || '')}). ${U.esc(v.publisher || '')}.`;
    } else {
      ref = `${au} ${yr} <i>${U.esc(v.title || '')}</i>. ${U.esc(v.site || '')}. ${U.esc(v.url || '')}`;
    }
    const year = String(v.year || 'n.d.').split(',')[0];
    return { ref, intext: `(${authorsInText(v.authors || '')}, ${year})` };
  }

  function citer(root) {
    let type = 'book';
    const vals = {};
    root.innerHTML = `
      <div class="card">
        <h2>APA 7 citation helper</h2>
        <p class="muted">Fill in the fields to get a reference-list entry and an in-text citation. Separate authors with semicolons.</p>
        <div class="row" style="margin-bottom:10px">
          <select id="ctype">
            <option value="book">Book</option>
            <option value="journal">Journal article</option>
            <option value="chapter">Chapter in an edited book</option>
            <option value="web">Web page</option>
          </select>
        </div>
        <div id="cfields" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px"></div>
        <div id="cout" style="margin-top:14px"></div>
      </div>`;

    const fieldsEl = root.querySelector('#cfields');
    const outEl = root.querySelector('#cout');

    function out() {
      const { ref, intext } = build(type, vals);
      outEl.innerHTML = `
        <div class="model"><b>Reference:</b> ${ref} <button class="btn small copy" id="c1">Copy</button>
        <br><b>In-text:</b> ${U.esc(intext)} <button class="btn small copy" id="c2">Copy</button></div>`;
      outEl.querySelector('#c1').addEventListener('click', (e) => U.copy(U.stripTags(ref), e.target));
      outEl.querySelector('#c2').addEventListener('click', (e) => U.copy(intext, e.target));
    }

    function fields() {
      fieldsEl.innerHTML = FIELDS[type]
        .map(([k, label]) => `<div><label for="cf-${k}">${U.esc(label)}</label><input id="cf-${k}" data-k="${k}" value="${U.esc(vals[k] || '')}" style="width:100%"></div>`)
        .join('');
      fieldsEl.querySelectorAll('input').forEach((i) =>
        i.addEventListener('input', () => {
          vals[i.dataset.k] = i.value;
          out();
        })
      );
      out();
    }

    root.querySelector('#ctype').addEventListener('change', (e) => {
      type = e.target.value;
      fields();
    });
    fields();
  }

  HUB.views.assignments = function (root, params) {
    const filter = params[0] || '';
    const list = HUB.assignments.filter((a) => !filter || a.course === filter);
    root.innerHTML = `
      <div class="page-head">
        <h1>Assignments</h1>
        <p>Instructions, a suggested structure, the definitions, theories and classifications to use, and ready-to-copy APA references — course by course.</p>
        <div class="row">
          <a class="btn small ${filter ? '' : 'primary'}" href="#/assignments">All courses</a>
          ${HUB.courses.map((c) => `<a class="btn small ${filter === c.id ? 'primary' : ''}" href="#/assignments/${c.id}">${U.esc(c.title)}</a>`).join('')}
        </div>
      </div>
      ${list.map((a, i) => guide(a, i === 0)).join('') || '<p class="empty">No assignments yet.</p>'}
      <div id="citer"></div>`;

    root.querySelectorAll('[data-copy]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const [id, i] = b.dataset.copy.split(':');
        const r = HUB.assignments.find((a) => a.id === id).references[+i];
        U.copy(U.stripTags(r.apa), b);
      })
    );
    citer(root.querySelector('#citer'));
  };
})();
