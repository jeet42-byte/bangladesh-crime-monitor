// Resources: downloadable slides, book chapters and notes, grouped by course.
HUB.views.resources = function (root) {
  const icons = { Slides: '🖥️', Book: '📖', Notes: '🗒️', Link: '🔗' };

  const item = (r) => {
    let action;
    if (r.file) {
      action = `<a class="btn small primary" href="${U.esc(r.file)}" download>Download</a>
                <a class="btn small" href="${U.esc(r.file)}" target="_blank" rel="noopener">Open</a>`;
    } else if (r.url) {
      action = `<a class="btn small primary" href="${U.esc(r.url)}" target="_blank" rel="noopener">Open link</a>`;
    } else {
      action = `<button class="btn small" disabled>Not uploaded yet</button>`;
    }
    return `
      <div class="card">
        <div class="row"><span class="chip">${icons[r.type] || '📄'} ${U.esc(r.type)}</span></div>
        <h3 style="margin-top:8px">${U.esc(r.title)}</h3>
        <p class="muted">${U.esc(r.desc || '')}</p>
        <div class="row">${action}</div>
      </div>`;
  };

  const sections = HUB.courses
    .map((c) => {
      const list = HUB.resources.filter((r) => r.course === c.id);
      if (!list.length) return '';
      return `
        <h2 class="section-title">${U.esc(c.title)}</h2>
        ${c.textbook ? `<p class="muted">Textbook: ${U.esc(c.textbook)}</p>` : ''}
        <div class="grid">${list.map(item).join('')}</div>`;
    })
    .join('');

  root.innerHTML = `
    <div class="page-head">
      <h1>Resources</h1>
      <p>Slides, book chapters and notes for each course. To add a file, drop it in <code>resources/&lt;course&gt;/</code> and list it in <code>data/resources.js</code>.</p>
    </div>
    ${sections || '<p class="empty">No resources yet.</p>'}`;
};
