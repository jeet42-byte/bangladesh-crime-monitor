// Exams: quiz list, interactive MCQ runner, short-essay practice and probability analysis.
(function () {
  const LETTERS = 'ABCDEFGH';

  function topicMap(quiz) {
    const m = {};
    quiz.topics.forEach((t) => (m[t.id] = { ...t, score: U.topicScore(t) }));
    return m;
  }

  // ── Quiz list ──────────────────────────────────────────────
  function renderList(root) {
    const byCourse = HUB.courses
      .map((c) => {
        const quizzes = HUB.quizzes.filter((q) => q.course === c.id);
        if (!quizzes.length) return '';
        return `
          <h2 class="section-title">${U.esc(c.title)} <small class="muted">${U.esc(c.subtitle || '')}</small></h2>
          <div class="grid">
            ${quizzes
              .map((q) => {
                const ans = U.get(`quiz:${q.id}:mcq`, {});
                const done = Object.keys(ans).length;
                return `
                  <a class="card tile" href="#/exams/${q.id}">
                    <span class="chip">${U.esc(q.format)}</span>
                    <h3 style="margin-top:8px">${U.esc(q.title)}</h3>
                    <p class="muted">${U.esc(q.scope)}</p>
                    <div class="progress"><div style="width:${(done / q.mcq.length) * 100}%"></div></div>
                    <small>${q.mcq.length} MCQs · ${q.essays.length} short essays · ${done} answered</small>
                  </a>`;
              })
              .join('')}
          </div>`;
      })
      .join('');

    root.innerHTML = `
      <div class="page-head">
        <h1>Exams</h1>
        <p>Practice banks built from each exam's syllabus. Questions are tagged by how likely their topic is to appear — open "Probability analysis" in any quiz to see how that is worked out.</p>
      </div>
      ${byCourse || '<p class="empty">No quizzes yet.</p>'}`;
  }

  // ── Quiz page ──────────────────────────────────────────────
  function renderQuiz(root, quiz, tab) {
    const course = HUB.course(quiz.course);
    const tabs = [
      ['mcq', `Multiple choice (${quiz.mcq.length})`],
      ['essay', `Short essay (${quiz.essays.length})`],
      ['probability', 'Probability analysis'],
    ];
    root.innerHTML = `
      <div class="page-head">
        <a href="#/exams" class="muted">← All exams</a>
        <h1 style="margin-top:6px">${U.esc(quiz.title)}</h1>
        <p><span class="chip">${U.esc(course ? course.title : '')}</span> ${U.esc(quiz.scope)}</p>
      </div>
      <div class="tabs">
        ${tabs
          .map(([id, label]) => `<button data-tab="${id}" class="${id === tab ? 'active' : ''}">${label}</button>`)
          .join('')}
      </div>
      <div id="tab-body"></div>`;

    root.querySelectorAll('.tabs button').forEach((b) =>
      b.addEventListener('click', () => (location.hash = `#/exams/${quiz.id}/${b.dataset.tab}`))
    );
    const body = root.querySelector('#tab-body');
    if (tab === 'essay') renderEssays(body, quiz);
    else if (tab === 'probability') renderProbability(body, quiz);
    else renderMcq(body, quiz);
  }

  // ── MCQ ────────────────────────────────────────────────────
  function renderMcq(body, quiz) {
    const key = `quiz:${quiz.id}:mcq`;
    const topics = topicMap(quiz);
    let answers = U.get(key, {});
    const hintsOpen = new Set();
    let order = quiz.mcq.map((_, i) => i);
    const filters = { topic: '', status: '', sort: 'order' };

    body.innerHTML = `
      <div class="scorebar">
        <div class="card" style="margin:0">
          <div class="row">
            <b id="score"></b>
            <span class="spacer"></span>
            <select id="f-topic" aria-label="Filter by topic">
              <option value="">All topics</option>
              ${quiz.topics.map((t) => `<option value="${t.id}">${U.esc(t.name)}</option>`).join('')}
            </select>
            <select id="f-status" aria-label="Filter by status">
              <option value="">All questions</option>
              <option value="open">Unanswered</option>
              <option value="wrong">Wrong only</option>
              <option value="right">Correct only</option>
            </select>
            <select id="f-sort" aria-label="Order">
              <option value="order">Syllabus order</option>
              <option value="prob">Highest probability first</option>
              <option value="shuffle">Shuffled</option>
            </select>
            <button class="btn small" id="reset">Reset</button>
          </div>
          <div class="progress"><div id="bar"></div></div>
        </div>
      </div>
      <div id="list"></div>`;

    const list = body.querySelector('#list');

    function score() {
      const done = Object.keys(answers).length;
      const right = Object.entries(answers).filter(([i, a]) => quiz.mcq[i].a === a).length;
      const pct = done ? Math.round((right / done) * 100) : 0;
      body.querySelector('#score').innerHTML =
        `${right} / ${done} correct <small class="muted">· ${done} of ${quiz.mcq.length} answered${done ? ` · ${pct}%` : ''}</small>`;
      body.querySelector('#bar').style.width = (done / quiz.mcq.length) * 100 + '%';
    }

    function card(i, n) {
      const m = quiz.mcq[i];
      const t = topics[m.t];
      const chosen = answers[i];
      const answered = chosen !== undefined;
      const opts = m.o
        .map((text, j) => {
          let cls = '';
          let mark = '';
          if (answered) {
            if (j === m.a) {
              cls = 'correct';
              mark = '✓';
            } else if (j === chosen) {
              cls = 'wrong';
              mark = '✗';
            }
          }
          return `<button class="opt ${cls}" data-q="${i}" data-o="${j}" ${answered ? 'disabled' : ''}>
                    <span class="letter">${LETTERS[j]}</span><span>${U.esc(text)}</span><span class="mark">${mark}</span>
                  </button>`;
        })
        .join('');
      const verdict = answered
        ? chosen === m.a
          ? '<span class="verdict-good">Correct!</span> '
          : `<span class="verdict-bad">Not quite — the answer is ${LETTERS[m.a]}.</span> `
        : '';
      return `
        <div class="card" id="q-${i}">
          <div class="row">
            <span class="q-num">Q${n}</span>
            <span class="chip">${U.esc(t ? t.name : m.t)}</span>
            ${t ? U.probChip(t.score) : ''}
          </div>
          <div class="q-text">${U.esc(m.q)}</div>
          <div class="options">${opts}</div>
          ${
            answered
              ? `<div class="explain">${verdict}${U.esc(m.e)}<span class="ref">📖 Reference: ${U.esc(m.r)}</span></div>`
              : `<div class="row" style="margin-top:10px"><button class="btn small" data-hint="${i}">💡 ${hintsOpen.has(i) ? 'Hide hint' : 'Hint'}</button></div>
                 ${hintsOpen.has(i) ? `<div class="hint">${U.esc(m.h)}</div>` : ''}`
          }
        </div>`;
    }

    function visible() {
      let ids = order.slice();
      if (filters.sort === 'prob') {
        ids.sort((a, b) => topics[quiz.mcq[b].t].score - topics[quiz.mcq[a].t].score || a - b);
      }
      return ids.filter((i) => {
        const m = quiz.mcq[i];
        if (filters.topic && m.t !== filters.topic) return false;
        const a = answers[i];
        if (filters.status === 'open' && a !== undefined) return false;
        if (filters.status === 'wrong' && (a === undefined || a === m.a)) return false;
        if (filters.status === 'right' && a !== m.a) return false;
        return true;
      });
    }

    // Question numbers stay tied to the syllabus order so "Q12" means the same question everywhere.
    function draw() {
      const ids = visible();
      list.innerHTML = ids.length
        ? ids.map((i) => card(i, i + 1)).join('')
        : '<p class="empty">No questions match these filters.</p>';
      score();
    }

    function redrawCard(i) {
      const el = list.querySelector('#q-' + i);
      if (el) el.outerHTML = card(i, i + 1);
      score();
    }

    list.addEventListener('click', (ev) => {
      const opt = ev.target.closest('.opt');
      if (opt && !opt.disabled) {
        const i = +opt.dataset.q;
        answers[i] = +opt.dataset.o;
        U.set(key, answers);
        redrawCard(i);
        return;
      }
      const hint = ev.target.closest('[data-hint]');
      if (hint) {
        const i = +hint.dataset.hint;
        hintsOpen.has(i) ? hintsOpen.delete(i) : hintsOpen.add(i);
        redrawCard(i);
      }
    });

    body.querySelector('#f-topic').addEventListener('change', (e) => {
      filters.topic = e.target.value;
      draw();
    });
    body.querySelector('#f-status').addEventListener('change', (e) => {
      filters.status = e.target.value;
      draw();
    });
    body.querySelector('#f-sort').addEventListener('change', (e) => {
      filters.sort = e.target.value;
      order = quiz.mcq.map((_, i) => i);
      if (filters.sort === 'shuffle') {
        for (let k = order.length - 1; k > 0; k--) {
          const r = Math.floor(Math.random() * (k + 1));
          [order[k], order[r]] = [order[r], order[k]];
        }
      }
      draw();
    });
    body.querySelector('#reset').addEventListener('click', () => {
      if (!confirm('Clear all your MCQ answers for this quiz?')) return;
      answers = {};
      U.del(key);
      hintsOpen.clear();
      draw();
    });

    draw();
  }

  // ── Short essays ───────────────────────────────────────────
  function renderEssays(body, quiz) {
    const topics = topicMap(quiz);
    const ids = quiz.essays.map((_, i) => i);
    ids.sort((a, b) => topics[quiz.essays[b].t].score - topics[quiz.essays[a].t].score || a - b);

    body.innerHTML = `
      <p class="muted">Sorted by probability. Write your own answer first, tick the key points you covered, then compare with the model answer. Your drafts are saved in this browser.</p>
      ${ids
        .map((i, n) => {
          const e = quiz.essays[i];
          const t = topics[e.t];
          const ticks = U.get(`quiz:${quiz.id}:essay:${i}:ticks`, []);
          const draft = U.get(`quiz:${quiz.id}:essay:${i}:draft`, '');
          return `
            <div class="card" data-essay="${i}">
              <div class="row">
                <span class="q-num">E${n + 1}</span>
                <span class="chip">${U.esc(t.name)}</span>
                ${U.probChip(t.score)}
                <span class="chip">${e.marks} marks</span>
              </div>
              <div class="q-text">${U.esc(e.q)}</div>
              <textarea placeholder="Write your answer here…" data-draft>${U.esc(draft)}</textarea>
              <div class="row" style="margin-top:6px">
                <small class="muted" data-wc></small>
                <span class="spacer"></span>
                <button class="btn small" data-toggle="points">Key points</button>
                <button class="btn small" data-toggle="model">Model answer</button>
              </div>
              <div data-panel="points" hidden>
                <h4 style="margin-top:12px">Key points — tick what you covered <small class="muted" data-covered></small></h4>
                <ul class="points">
                  ${e.points
                    .map(
                      (p, j) =>
                        `<li><input type="checkbox" id="p-${i}-${j}" data-tick="${j}" ${ticks.includes(j) ? 'checked' : ''}><label for="p-${i}-${j}" style="color:var(--text);font-size:0.95rem">${U.esc(p)}</label></li>`
                    )
                    .join('')}
                </ul>
              </div>
              <div data-panel="model" hidden>
                <h4 style="margin-top:12px">Model answer</h4>
                <div class="model">${U.esc(e.model)}</div>
              </div>
            </div>`;
        })
        .join('')}`;

    body.querySelectorAll('[data-essay]').forEach((cardEl) => {
      const i = +cardEl.dataset.essay;
      const e = quiz.essays[i];
      const ta = cardEl.querySelector('[data-draft]');
      const wc = cardEl.querySelector('[data-wc]');
      const covered = cardEl.querySelector('[data-covered]');
      const words = () => {
        const n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
        wc.textContent = `${n} word${n === 1 ? '' : 's'}`;
      };
      const tally = () => {
        const ticks = [...cardEl.querySelectorAll('[data-tick]:checked')].map((c) => +c.dataset.tick);
        covered.textContent = `(${ticks.length}/${e.points.length})`;
        return ticks;
      };
      words();
      tally();
      let timer;
      ta.addEventListener('input', () => {
        words();
        clearTimeout(timer);
        timer = setTimeout(() => U.set(`quiz:${quiz.id}:essay:${i}:draft`, ta.value), 300);
      });
      cardEl.querySelectorAll('[data-tick]').forEach((c) =>
        c.addEventListener('change', () => U.set(`quiz:${quiz.id}:essay:${i}:ticks`, tally()))
      );
      cardEl.querySelectorAll('[data-toggle]').forEach((b) =>
        b.addEventListener('click', () => {
          const panel = cardEl.querySelector(`[data-panel="${b.dataset.toggle}"]`);
          panel.hidden = !panel.hidden;
        })
      );
    });
  }

  // ── Probability analysis ───────────────────────────────────
  function renderProbability(body, quiz) {
    const rows = quiz.topics
      .map((t) => ({
        ...t,
        score: U.topicScore(t),
        nM: quiz.mcq.filter((m) => m.t === t.id).length,
        nE: quiz.essays.filter((e) => e.t === t.id).length,
      }))
      .sort((a, b) => b.score - a.score);

    body.innerHTML = `
      <div class="card">
        <h2>How the probability is estimated</h2>
        <p>Each syllabus topic gets a score out of 100 from four factors. It is a structured estimate of where an examiner is most likely to draw questions — not a guarantee — so use it to decide what to revise <i>first</i>, not what to skip.</p>
        <div class="table-wrap"><table>
          <tr><th>Factor</th><th>Weight</th><th>What it measures</th></tr>
          <tr><td><b>S</b> Lecture emphasis</td><td>45</td><td>1 = on the slides; 0.75 = a slide idea that the book expands; 0.5 = book pages only. The instructor writes the quiz, so the slides weigh most.</td></tr>
          <tr><td><b>D</b> Definition weight</td><td>25</td><td>1 = a formal definition on a slide or a boxed key term in the book; 0.5 = defined in running text. Defined terms convert directly into MCQs and "define and explain" essays.</td></tr>
          <tr><td><b>E</b> Example anchor</td><td>15</td><td>1 = tied to a named study (Whyte, Humphreys, Decker &amp; Van Winkle…); examiners love "who studied what".</td></tr>
          <tr><td><b>F</b> Format fit</td><td>15</td><td>How cleanly it frames as an MCQ <i>and</i> a short essay (lists, comparisons, definitions score highest).</td></tr>
        </table></div>
        <p style="margin-top:12px"><code>score = 45·S + 25·D + 15·E + 15·F</code> → Very high ≥ 80 · High 60–79 · Medium 40–59 · Low &lt; 40. Question counts in this bank follow the same ranking.</p>
      </div>
      <div class="card">
        <h2>Topic ranking</h2>
        <div class="table-wrap"><table>
          <tr><th>#</th><th>Topic</th><th>S</th><th>D</th><th>E</th><th>F</th><th>Score</th><th>MCQ</th><th>Essay</th><th>Why</th></tr>
          ${rows
            .map(
              (t, n) => `<tr>
                <td>${n + 1}</td><td><b>${U.esc(t.name)}</b></td>
                <td>${t.S}</td><td>${t.D}</td><td>${t.E}</td><td>${t.F}</td>
                <td>${U.probChip(t.score)}</td><td>${t.nM}</td><td>${t.nE}</td>
                <td><small>${U.esc(t.why)}</small></td></tr>`
            )
            .join('')}
        </table></div>
      </div>`;
  }

  HUB.views.exams = function (root, params) {
    const quiz = params[0] && HUB.quizzes.find((q) => q.id === params[0]);
    if (quiz) renderQuiz(root, quiz, params[1] || 'mcq');
    else renderList(root);
  };
})();
