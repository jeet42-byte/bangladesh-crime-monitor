// Hash router + home view. Routes look like #/exams/rm-ch3/essay.
(function () {
  const ROUTES = {
    '': 'home',
    exams: 'exams',
    resources: 'resources',
    grades: 'grades',
    assignments: 'assignments',
    forecast: 'forecast',
  };

  function render() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    const view = ROUTES[parts[0] || ''] || 'home';
    const root = document.getElementById('app');

    document.querySelectorAll('.nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.view === view);
    });

    root.innerHTML = '';
    HUB.views[view](root, parts.slice(1));
    window.scrollTo(0, 0);
  }

  function initTheme() {
    const btn = document.getElementById('theme-btn');
    const saved = U.get('theme', null);
    if (saved) document.documentElement.dataset.theme = saved;
    const isDark = () =>
      document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const paint = () => (btn.textContent = isDark() ? '☀' : '☾');
    paint();
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      U.set('theme', next);
      paint();
    });
  }

  HUB.views.home = function (root) {
    const now = U.allEvents()
      .map((e) => ({ e, d: U.eventDate(e) }))
      .filter((x) => x.d && U.daysUntil(x.d) >= 0)
      .sort((a, b) => a.d - b.d);
    const next = now[0];
    const tba = HUB.events.filter((e) => !U.eventDate(e));

    const quizCards = HUB.quizzes
      .map((q) => {
        const ans = U.get(`quiz:${q.id}:mcq`, {});
        const done = Object.keys(ans).length;
        const right = Object.entries(ans).filter(([i, a]) => q.mcq[i] && q.mcq[i].a === a).length;
        const c = HUB.course(q.course);
        return `
          <a class="card tile" href="#/exams/${q.id}">
            <div class="row"><span class="chip">${U.esc(c ? c.title : q.course)}</span></div>
            <h3 style="margin-top:8px">${U.esc(q.title)}</h3>
            <p class="muted" style="margin:0">${q.mcq.length} MCQs · ${q.essays.length} short essays</p>
            <div class="progress"><div style="width:${(done / q.mcq.length) * 100}%"></div></div>
            <small>${done ? `${done}/${q.mcq.length} answered · ${right} correct` : 'Not started'}</small>
          </a>`;
      })
      .join('');

    const notice = HUB.notices[0];

    root.innerHTML = `
      <div class="page-head">
        <h1>Study Hub</h1>
        <p>Quiz banks, study material, grade planning, assignment guides and exam countdowns — organized course by course.</p>
      </div>

      <div class="grid">
        ${
          next
            ? `<a class="card tile countdown" href="#/forecast">
                 <div class="stat-label">Next up</div>
                 <div class="big">${U.daysUntil(next.d)}</div>
                 <div>day${U.daysUntil(next.d) === 1 ? '' : 's'} left</div>
                 <p style="margin:8px 0 0"><b>${U.esc(next.e.title)}</b><br><small>${U.fmtDate(next.d)}</small></p>
               </a>`
            : `<a class="card tile countdown" href="#/forecast">
                 <div class="stat-label">Next up</div>
                 <div class="big">TBA</div>
                 <p style="margin:8px 0 0">${tba.length ? `<b>${U.esc(tba[0].title)}</b><br><small>${U.esc(tba[0].tentative || 'Date not announced')}</small>` : 'No upcoming dates'}</p>
               </a>`
        }
        ${quizCards}
      </div>

      <h2 class="section-title">Sections</h2>
      <div class="grid">
        <a class="card tile" href="#/exams"><div class="icon">📝</div><h3>Exams</h3><p class="muted">Interactive MCQ banks with hints, references, short-essay practice and topic probability.</p></a>
        <a class="card tile" href="#/resources"><div class="icon">📚</div><h3>Resources</h3><p class="muted">Slides, book chapters and study notes to download.</p></a>
        <a class="card tile" href="#/grades"><div class="icon">🎯</div><h3>Grade &amp; CGPA</h3><p class="muted">What you need out of 50 in the final, and your CGPA.</p></a>
        <a class="card tile" href="#/assignments"><div class="icon">🗂️</div><h3>Assignments</h3><p class="muted">Instructions, structure, theories, definitions and APA references.</p></a>
        <a class="card tile" href="#/forecast"><div class="icon">📅</div><h3>Forecast</h3><p class="muted">Countdowns, important dates, notices and class routine.</p></a>
      </div>

      ${
        notice
          ? `<h2 class="section-title">Latest notice</h2>
             <div class="card"><h3>${U.esc(notice.title)}</h3><p style="margin:0">${U.esc(notice.body)}</p></div>`
          : ''
      }`;
  };

  window.addEventListener('hashchange', render);
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('year').textContent = new Date().getFullYear();
    render();
  });
})();
