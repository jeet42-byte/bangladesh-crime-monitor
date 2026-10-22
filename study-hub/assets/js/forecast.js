// Forecast: countdowns, important dates, notices and the weekly class routine.
// Shared dates come from data/schedule.js; personal dates and routine entries live in this browser.
HUB.views.forecast = function (root) {
  const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const courseName = (id) => (HUB.course(id) || {}).title || '';

  function draw() {
    const events = U.allEvents().map((e) => ({ e, d: U.eventDate(e) }));
    const dated = events.filter((x) => x.d).sort((a, b) => a.d - b.d);
    const upcoming = dated.filter((x) => U.daysUntil(x.d) >= 0);
    const tba = events.filter((x) => !x.d);
    const classes = [...HUB.classes, ...U.get('personalClasses', []).map((c) => ({ ...c, personal: true }))].sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.start.localeCompare(b.start)
    );

    const countdown = ({ e, d }) => {
      const n = U.daysUntil(d);
      return `
        <div class="card countdown ${n < 0 ? 'past' : ''}">
          <div class="stat-label">${U.esc(e.type || 'Event')}</div>
          <div class="big">${Math.abs(n)}</div>
          <div>${n < 0 ? 'days ago' : n === 1 ? 'day left' : 'days left'}</div>
          <p style="margin:8px 0 0"><b>${U.esc(e.title)}</b><br><small>${U.fmtDate(d)}</small></p>
          ${!e.date && !e.personal ? `<button class="btn small" data-clear="${U.esc(e.id)}">Clear my date</button>` : ''}
        </div>`;
    };

    root.innerHTML = `
      <div class="page-head">
        <h1>Forecast</h1>
        <p>Days left before exams, important dates, notices and your class routine. Dates marked TBA can be set for yourself until they are officially announced.</p>
      </div>

      <div class="grid">
        ${upcoming.map(countdown).join('')}
        ${tba
          .map(
            ({ e }) => `
            <div class="card countdown">
              <div class="stat-label">${U.esc(e.type || 'Event')}</div>
              <div class="big">TBA</div>
              <p style="margin:8px 0"><b>${U.esc(e.title)}</b><br><small>${U.esc(e.tentative || 'Date not announced')}</small></p>
              <div class="row" style="justify-content:center">
                <input type="date" data-set="${U.esc(e.id)}" aria-label="Set a date for ${U.esc(e.title)}">
              </div>
              <small class="muted">Set your own date to start the countdown</small>
            </div>`
          )
          .join('')}
      </div>

      <h2 class="section-title">Notices</h2>
      ${
        HUB.notices.length
          ? HUB.notices
              .map(
                (n) => `
            <div class="card">
              <div class="row"><span class="chip">${U.esc(courseName(n.course))}</span>${n.date ? `<small class="muted">${U.fmtDate(U.parseDate(n.date))}</small>` : ''}</div>
              <h3 style="margin-top:8px">${U.esc(n.title)}</h3>
              <p style="margin:0">${U.esc(n.body)}</p>
            </div>`
              )
              .join('')
          : '<p class="empty">No notices.</p>'
      }

      <h2 class="section-title">Important dates</h2>
      <div class="card">
        ${
          dated.length || tba.length
            ? `<ul class="timeline">
                ${dated
                  .map(({ e, d }) => {
                    const n = U.daysUntil(d);
                    return `<li class="${n < 0 ? 'past' : ''}">
                      <div class="when">${U.fmtDate(d)}<br><small class="muted">${U.relDays(n)}</small></div>
                      <div>
                        <b>${e.link ? `<a href="${U.esc(e.link)}">${U.esc(e.title)}</a>` : U.esc(e.title)}</b>
                        ${e.personal ? '<span class="chip">Personal</span>' : `<span class="chip">${U.esc(courseName(e.course))}</span>`}
                        ${e.note ? `<br><small class="muted">${U.esc(e.note)}</small>` : ''}
                        ${e.personal ? `<br><button class="btn small" data-del-ev="${U.esc(e.id)}">Remove</button>` : ''}
                      </div></li>`;
                  })
                  .join('')}
                ${tba
                  .map(
                    ({ e }) => `<li>
                      <div class="when">TBA<br><small class="muted">${U.esc(e.tentative || '')}</small></div>
                      <div><b>${e.link ? `<a href="${U.esc(e.link)}">${U.esc(e.title)}</a>` : U.esc(e.title)}</b>
                      ${e.note ? `<br><small class="muted">${U.esc(e.note)}</small>` : ''}</div></li>`
                  )
                  .join('')}
              </ul>`
            : '<p class="empty">No dates yet.</p>'
        }
        <h3 style="margin-top:16px">Add a personal date</h3>
        <form id="ev-form" class="row">
          <input name="title" placeholder="e.g. Assignment submission" required style="flex:1;min-width:180px">
          <input name="date" type="date" required>
          <input name="time" type="time" aria-label="Time (optional)">
          <button class="btn primary small">Add</button>
        </form>
      </div>

      <h2 class="section-title">Class routine</h2>
      <div class="card">
        ${
          classes.length
            ? `<div class="table-wrap"><table>
                <tr><th>Day</th><th>Time</th><th>Course</th><th>Room</th><th></th></tr>
                ${classes
                  .map(
                    (c) => `<tr>
                      <td><b>${U.esc(c.day)}</b></td><td>${U.esc(c.start)}–${U.esc(c.end)}</td>
                      <td>${U.esc(courseName(c.course) || c.course)}</td><td>${U.esc(c.room || '—')}</td>
                      <td>${c.personal ? `<button class="btn small" data-del-cl="${U.esc(c.id)}">✕</button>` : ''}</td></tr>`
                  )
                  .join('')}
              </table></div>`
            : '<p class="empty">No classes added yet.</p>'
        }
        <h3 style="margin-top:16px">Add a class</h3>
        <form id="cl-form" class="row">
          <input name="course" placeholder="Course" required list="course-list" style="flex:1;min-width:150px">
          <datalist id="course-list">${HUB.courses.map((c) => `<option value="${U.esc(c.title)}">`).join('')}</datalist>
          <select name="day">${DAYS.map((d) => `<option>${d}</option>`).join('')}</select>
          <input name="start" type="time" required aria-label="Start">
          <input name="end" type="time" required aria-label="End">
          <input name="room" placeholder="Room" style="width:90px">
          <button class="btn primary small">Add</button>
        </form>
      </div>`;

    root.querySelectorAll('[data-set]').forEach((inp) =>
      inp.addEventListener('change', () => {
        if (!inp.value) return;
        U.set('eventDate:' + inp.dataset.set, inp.value);
        draw();
      })
    );
    root.querySelectorAll('[data-clear]').forEach((b) =>
      b.addEventListener('click', () => {
        U.del('eventDate:' + b.dataset.clear);
        draw();
      })
    );
    root.querySelectorAll('[data-del-ev]').forEach((b) =>
      b.addEventListener('click', () => {
        U.set('personalEvents', U.get('personalEvents', []).filter((e) => e.id !== b.dataset.delEv));
        draw();
      })
    );
    root.querySelectorAll('[data-del-cl]').forEach((b) =>
      b.addEventListener('click', () => {
        U.set('personalClasses', U.get('personalClasses', []).filter((c) => c.id !== b.dataset.delCl));
        draw();
      })
    );
    root.querySelector('#ev-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const list = U.get('personalEvents', []);
      list.push({
        id: 'p' + Date.now(),
        type: 'Personal',
        title: f.get('title'),
        date: f.get('time') ? `${f.get('date')}T${f.get('time')}` : f.get('date'),
      });
      U.set('personalEvents', list);
      draw();
    });
    root.querySelector('#cl-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const match = HUB.courses.find((c) => c.title === f.get('course'));
      const list = U.get('personalClasses', []);
      list.push({
        id: 'c' + Date.now(),
        course: match ? match.id : f.get('course'),
        day: f.get('day'),
        start: f.get('start'),
        end: f.get('end'),
        room: f.get('room'),
      });
      U.set('personalClasses', list);
      draw();
    });
  }

  draw();
};
