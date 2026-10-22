// Grade planner (what do I need out of the final?) and CGPA calculator.
(function () {
  const G = () => HUB.grading;

  function gradeFor(pct) {
    return G().scale.find((r) => pct >= r.min) || G().scale[G().scale.length - 1];
  }

  function fmt(n) {
    return String(U.round(n, 2));
  }

  // ── Course grade planner ───────────────────────────────────
  function planner(root) {
    const key = 'grades:planner';
    const fresh = () => ({
      components: G().components.map((c) => ({ name: c.name, max: c.max, got: '' })),
      finalMax: G().finalMax,
      target: '3.5',
      finalGuess: '',
    });
    let st = U.get(key, null) || fresh();
    const save = () => U.set(key, st);

    function draw() {
      root.innerHTML = `
        <div class="card">
          <h2>Course grade planner</h2>
          <p class="muted">Enter the marks you already have. The planner works out what you need in the final (out of ${st.finalMax}) for each grade.</p>
          <div class="comp-row"><label>Component</label><label>Obtained</label><label>Out of</label><span></span></div>
          ${st.components
            .map(
              (c, i) => `
              <div class="comp-row">
                <input data-i="${i}" data-f="name" value="${U.esc(c.name)}" aria-label="Component name">
                <input data-i="${i}" data-f="got" type="number" min="0" step="0.25" value="${U.esc(c.got)}" placeholder="—" aria-label="${U.esc(c.name)} obtained">
                <input data-i="${i}" data-f="max" type="number" min="0" step="0.5" value="${U.esc(c.max)}" aria-label="${U.esc(c.name)} out of">
                <button class="btn small" data-rm="${i}" title="Remove">✕</button>
              </div>`
            )
            .join('')}
          <div class="comp-row">
            <b>Final exam</b><span class="muted">?</span>
            <input id="final-max" type="number" min="1" step="1" value="${U.esc(st.finalMax)}" aria-label="Final exam out of">
            <span></span>
          </div>
          <div class="row" style="margin-top:8px">
            <button class="btn small" id="add">+ Add component</button>
            <button class="btn small" id="reset">Reset to default</button>
          </div>
          <div id="planner-out"></div>
        </div>`;

      root.querySelectorAll('[data-f]').forEach((inp) =>
        inp.addEventListener('input', () => {
          const c = st.components[+inp.dataset.i];
          c[inp.dataset.f] = inp.value;
          save();
          compute();
        })
      );
      root.querySelectorAll('[data-rm]').forEach((b) =>
        b.addEventListener('click', () => {
          st.components.splice(+b.dataset.rm, 1);
          save();
          draw();
        })
      );
      root.querySelector('#final-max').addEventListener('input', (e) => {
        st.finalMax = U.num(e.target.value) || 0;
        save();
        compute();
      });
      root.querySelector('#add').addEventListener('click', () => {
        st.components.push({ name: 'New component', max: 5, got: '' });
        save();
        draw();
      });
      root.querySelector('#reset').addEventListener('click', () => {
        st = fresh();
        save();
        draw();
      });
      compute();
    }

    function compute() {
      const out = root.querySelector('#planner-out');
      const earned = st.components.reduce((s, c) => s + (U.num(c.got) || 0), 0);
      const maxIn = st.components.reduce((s, c) => s + (U.num(c.max) || 0), 0);
      const finalMax = U.num(st.finalMax) || 0;
      const total = maxIn + finalMax;
      const missing = st.components.filter((c) => U.num(c.got) === null).length;

      if (!total) {
        out.innerHTML = '<p class="empty">Add at least one component.</p>';
        return;
      }

      const need = (minPct) => (minPct / 100) * total - earned;
      const status = (n) =>
        n <= 0
          ? '<span class="need-done">Secured ✓</span>'
          : n > finalMax
            ? '<span class="need-no">Not reachable</span>'
            : `<span class="need-ok">${fmt(n)} / ${finalMax}</span>`;

      const target = U.num(st.target);
      const targetRow = target === null ? null : [...G().scale].reverse().find((r) => r.gp >= target);
      const guess = U.num(st.finalGuess);
      const guessPct = guess === null ? null : ((earned + guess) / total) * 100;

      out.innerHTML = `
        <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
        <div class="row" style="gap:24px">
          <div><div class="stat">${fmt(earned)} / ${fmt(maxIn)}</div><div class="stat-label">Marks so far</div></div>
          <div><div class="stat">${fmt(total)}</div><div class="stat-label">Course total</div></div>
        </div>
        ${missing ? `<p class="note" style="margin-top:12px">${missing} component${missing > 1 ? 's are' : ' is'} still blank and counted as 0 — results update as you fill them in.</p>` : ''}
        ${total !== 100 ? `<p class="note" style="margin-top:12px">Components add up to ${fmt(total)}, not 100 — grades are worked out as a percentage of ${fmt(total)}.</p>` : ''}

        <h3 style="margin-top:16px">Your target</h3>
        <div class="row">
          <label for="target">Desired grade point</label>
          <input id="target" type="number" min="0" max="4" step="0.01" value="${U.esc(st.target)}" style="width:100px">
          ${
            targetRow
              ? `<span>→ at least <b>${targetRow.grade} (${targetRow.gp.toFixed(2)})</b>, ${targetRow.min}%+ · you need ${status(need(targetRow.min))}</span>`
              : target !== null
                ? '<span class="need-no">Above the top of the scale</span>'
                : ''
          }
        </div>
        <div class="row" style="margin-top:10px">
          <label for="guess">If I score in the final</label>
          <input id="guess" type="number" min="0" max="${finalMax}" step="0.5" value="${U.esc(st.finalGuess)}" style="width:100px">
          ${guessPct !== null ? `<span>→ <b>${fmt(guessPct)}%</b> = <b>${gradeFor(guessPct).grade} (${gradeFor(guessPct).gp.toFixed(2)})</b></span>` : ''}
        </div>

        <h3 style="margin-top:16px">Marks needed in the final for each grade</h3>
        <div class="table-wrap"><table>
          <tr><th>Grade</th><th>GP</th><th>Needs</th><th>Final marks needed</th></tr>
          ${G()
            .scale.filter((r) => r.gp > 0)
            .map((r) => `<tr><td><b>${r.grade}</b></td><td>${r.gp.toFixed(2)}</td><td>${r.min}%+</td><td>${status(need(r.min))}</td></tr>`)
            .join('')}
        </table></div>
        <p class="muted" style="margin-top:8px"><small>Exact figures — departments often round the total, so aim a mark or two above.</small></p>`;

      const t = out.querySelector('#target');
      t.addEventListener('change', () => {
        st.target = t.value;
        save();
        compute();
      });
      const g = out.querySelector('#guess');
      g.addEventListener('change', () => {
        st.finalGuess = g.value;
        save();
        compute();
      });
    }

    draw();
  }

  // ── CGPA calculator ────────────────────────────────────────
  function cgpa(root) {
    const key = 'grades:cgpa';
    let st = U.get(key, null) || {
      prevCgpa: '',
      prevCredits: '',
      target: '',
      courses: [
        { name: 'Research Methodology', credits: 3, gp: '' },
        { name: '', credits: 3, gp: '' },
      ],
    };
    const save = () => U.set(key, st);
    const gradeOptions = (sel) =>
      `<option value="">Grade…</option>` +
      G()
        .scale.map((r) => `<option value="${r.gp}" ${String(sel) === String(r.gp) ? 'selected' : ''}>${r.grade} (${r.gp.toFixed(2)})</option>`)
        .join('');

    function draw() {
      root.innerHTML = `
        <div class="card">
          <h2>CGPA calculator</h2>
          <p class="muted">Add this semester's courses. Previous CGPA is optional — fill it in to see your new CGPA.</p>
          <div class="row">
            <div><label for="pc">Previous CGPA</label><br><input id="pc" type="number" min="0" max="4" step="0.01" value="${U.esc(st.prevCgpa)}" style="width:110px"></div>
            <div><label for="pcr">Credits completed</label><br><input id="pcr" type="number" min="0" step="0.5" value="${U.esc(st.prevCredits)}" style="width:110px"></div>
          </div>
          <h3 style="margin-top:16px">This semester</h3>
          ${st.courses
            .map(
              (c, i) => `
              <div class="comp-row" style="grid-template-columns:1fr 70px 130px 32px">
                <input data-i="${i}" data-f="name" value="${U.esc(c.name)}" placeholder="Course name" aria-label="Course name">
                <input data-i="${i}" data-f="credits" type="number" min="0" step="0.5" value="${U.esc(c.credits)}" aria-label="Credits">
                <select data-i="${i}" data-f="gp" aria-label="Grade">${gradeOptions(c.gp)}</select>
                <button class="btn small" data-rm="${i}" title="Remove">✕</button>
              </div>`
            )
            .join('')}
          <button class="btn small" id="add-c">+ Add course</button>
          <div id="cgpa-out"></div>
        </div>`;

      root.querySelectorAll('[data-f]').forEach((inp) =>
        inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', () => {
          st.courses[+inp.dataset.i][inp.dataset.f] = inp.value;
          save();
          compute();
        })
      );
      root.querySelectorAll('[data-rm]').forEach((b) =>
        b.addEventListener('click', () => {
          st.courses.splice(+b.dataset.rm, 1);
          save();
          draw();
        })
      );
      root.querySelector('#add-c').addEventListener('click', () => {
        st.courses.push({ name: '', credits: 3, gp: '' });
        save();
        draw();
      });
      root.querySelector('#pc').addEventListener('input', (e) => {
        st.prevCgpa = e.target.value;
        save();
        compute();
      });
      root.querySelector('#pcr').addEventListener('input', (e) => {
        st.prevCredits = e.target.value;
        save();
        compute();
      });
      compute();
    }

    function compute() {
      const out = root.querySelector('#cgpa-out');
      const graded = st.courses.filter((c) => U.num(c.credits) && U.num(c.gp) !== null);
      const cr = graded.reduce((s, c) => s + U.num(c.credits), 0);
      const pts = graded.reduce((s, c) => s + U.num(c.credits) * U.num(c.gp), 0);
      const plannedCr = st.courses.reduce((s, c) => s + (U.num(c.credits) || 0), 0);
      const pc = U.num(st.prevCgpa);
      const pcr = U.num(st.prevCredits) || 0;
      const hasPrev = pc !== null && pcr > 0;
      const gpa = cr ? pts / cr : null;
      const cg = gpa === null ? null : hasPrev ? (pc * pcr + pts) / (pcr + cr) : gpa;

      const target = U.num(st.target);
      let need = '';
      if (target !== null && plannedCr) {
        const req = hasPrev ? (target * (pcr + plannedCr) - pc * pcr) / plannedCr : target;
        need =
          req > 4
            ? `<span class="need-no">Needs a GPA of ${fmt(req)} — not reachable this semester (max 4.00).</span>`
            : req <= 0
              ? '<span class="need-done">Already secured ✓</span>'
              : `<span class="need-ok">You need a semester GPA of ${fmt(req)} over ${fmt(plannedCr)} credits.</span>`;
      }

      out.innerHTML = `
        <hr style="border:0;border-top:1px solid var(--border);margin:16px 0">
        <div class="row" style="gap:24px">
          <div><div class="stat">${gpa === null ? '—' : gpa.toFixed(2)}</div><div class="stat-label">Semester GPA</div></div>
          <div><div class="stat">${cg === null ? '—' : cg.toFixed(2)}</div><div class="stat-label">${hasPrev ? 'New CGPA' : 'CGPA'}</div></div>
          <div><div class="stat">${fmt(pcr + cr)}</div><div class="stat-label">Total credits</div></div>
        </div>
        <h3 style="margin-top:16px">Target CGPA</h3>
        <div class="row">
          <input id="tg" type="number" min="0" max="4" step="0.01" value="${U.esc(st.target)}" placeholder="e.g. 3.60" style="width:110px">
          ${need}
        </div>
        <p class="muted" style="margin-top:8px"><small>Then use the grade planner to see the final-exam marks each course needs for that grade.</small></p>`;

      const tg = out.querySelector('#tg');
      tg.addEventListener('change', () => {
        st.target = tg.value;
        save();
        compute();
      });
    }

    draw();
  }

  HUB.views.grades = function (root) {
    root.innerHTML = `
      <div class="page-head">
        <h1>Grade &amp; CGPA planner</h1>
        <p>Find out exactly how many marks you need out of ${G().finalMax} in the final to reach a target grade point, and track your CGPA. Everything is saved in this browser only.</p>
      </div>
      <div class="two-col"><div id="planner"></div><div id="cgpa"></div></div>
      <div class="card" style="margin-top:16px">
        <h2>Grading scale</h2>
        <p class="muted">${U.esc(G().scaleName)}. Edit <code>data/grading.js</code> if your department uses a different scale or mark distribution.</p>
        <div class="table-wrap"><table>
          <tr><th>Marks</th><th>Grade</th><th>Grade point</th></tr>
          ${G()
            .scale.map((r, i, a) => `<tr><td>${r.min}${i ? `–${a[i - 1].min - 1}` : '+'}</td><td><b>${r.grade}</b></td><td>${r.gp.toFixed(2)}</td></tr>`)
            .join('')}
        </table></div>
      </div>`;
    planner(root.querySelector('#planner'));
    cgpa(root.querySelector('#cgpa'));
  };
})();
