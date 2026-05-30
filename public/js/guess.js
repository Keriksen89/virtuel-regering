// ─────────────────────────────────────────────────────────────────────────
// guess.js — "Gæt Danmark": a guess-before-reveal quiz. The user drags a
// slider to guess a real number about Denmark, then reveals the truth and
// sees how close they were. Guessing first sharply increases attention and
// recall vs. passively reading a number. Questions are seeded from the budget
// baseline (VG.state.baseline) and live data (VG.state.live) so they track
// the same figures the rest of the app shows.
// ─────────────────────────────────────────────────────────────────────────
VG.guess = {};

VG.guess._round   = [];     // the questions for the current round
VG.guess._idx     = 0;
VG.guess._answers = [];     // { qid, guess, actual, pct, points }
VG.guess._guess   = null;   // current slider value
VG.guess._revealed = false;

// Build the question bank from real data. Each: id, q, actual, min, max,
// step, fmt, explain, link (panel).
VG.guess._bank = function () {
  const b = VG.state.baseline;
  const live = VG.state.live || {};
  const exp = b ? b.expense : {};
  const rev = b ? b.revenue : {};
  const bn = v => v.toFixed(0) + ' mia. kr.';
  const Q = [];

  if (b) {
    Q.push({ id: 'pension', q: 'Hvor meget bruger staten på folkepension + førtidspension om året?',
      actual: exp.pension.val, min: 100, max: 400, step: 5, fmt: bn,
      explain: 'Folkepension er statens største enkeltpost — ca. 1,1 mio. modtagere.', link: 'pension' });
    Q.push({ id: 'health', q: 'Hvad koster hele sundhedsvæsenet om året?',
      actual: exp.health.val, min: 80, max: 400, step: 5, fmt: bn,
      explain: 'Regioner (~154 mia.) + kommunal sundhed + medicintilskud + psykiatri.', link: 'sundhed' });
    Q.push({ id: 'defense', q: 'Hvor mange milliarder går der til forsvaret om året?',
      actual: exp.defense.val, min: 20, max: 200, step: 5, fmt: bn,
      explain: 'Stiger kraftigt mod 3,5% af BNP i 2030 fra blot 1,36% i 2022.', link: 'forsvar' });
    Q.push({ id: 'vat', q: 'Hvor meget tjener staten på moms (25%) om året?',
      actual: rev.vat.val, min: 150, max: 400, step: 10, fmt: bn,
      explain: 'Momsen er statens næststørste indtægt efter personskat.', link: 'revenue' });
    Q.push({ id: 'income', q: 'Hvor meget kommer ind via personlig indkomstskat om året?',
      actual: rev.income.val, min: 350, max: 800, step: 10, fmt: bn,
      explain: 'Bund-, mellem-, top- og top-topskat + kommuneskat tilsammen.', link: 'indkomst' });
    Q.push({ id: 'education', q: 'Hvad bruger Danmark på undervisning og forskning om året?',
      actual: exp.education.val, min: 80, max: 350, step: 5, fmt: bn,
      explain: 'Folkeskole, gymnasium, videregående uddannelser, SU og forskning.', link: 'uddannelse' });
    Q.push({ id: 'asylum', q: 'Hvor meget koster asyl og integration staten om året?',
      actual: exp.asylum.val, min: 0, max: 40, step: 1, fmt: bn,
      explain: 'Ofte overvurderet — udgør under 0,5% af de samlede udgifter.', link: 'integration' });
    Q.push({ id: 'climate', q: 'Hvad bruger staten på klima og grøn omstilling om året?',
      actual: exp.climate.val, min: 5, max: 120, step: 5, fmt: bn,
      explain: 'CO₂-fond, energitilskud og transportomstilling — stiger mod 2030.', link: 'co2' });
    Q.push({ id: 'interest', q: 'Hvor meget betaler staten i renter på statsgælden om året?',
      actual: exp.interest.val, min: 0, max: 80, step: 2, fmt: bn,
      explain: 'Lav i dag pga. lav gæld — men meget følsom over for renteniveauet.', link: 'statsgaeld' });
    Q.push({ id: 'retire', q: 'Hvad er den vedtagne folkepensionsalder i 2026?',
      actual: b.policy.retireAge.val, min: 60, max: 75, step: 1, fmt: v => v.toFixed(0) + ' år',
      explain: 'Stiger til 70 år fra 2040 — blandt verdens højeste.', link: 'pension' });
  }
  if (live.population) {
    Q.push({ id: 'pop', q: 'Hvor mange mennesker bor der i Danmark?',
      actual: live.population, min: 4e6, max: 8e6, step: 1e4,
      fmt: v => (v/1e6).toFixed(2) + ' mio.',
      explain: 'Danmarks befolkning passerede 6 mio. i 2023.', link: 'demographics' });
  }
  return Q;
};

VG.guess._pickRound = function (n = 5) {
  const all = VG.guess._bank();
  // shuffle
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [all[i],all[j]]=[all[j],all[i]]; }
  return all.slice(0, Math.min(n, all.length));
};

VG.guess.startRound = function () {
  VG.guess._round = VG.guess._pickRound(5);
  VG.guess._idx = 0;
  VG.guess._answers = [];
  VG.guess._revealed = false;
  const q = VG.guess._round[0];
  VG.guess._guess = q ? Math.round((q.min + q.max) / 2 / (q.step||1)) * (q.step||1) : 0;
  VG.guess.renderPanel();
};

VG.guess.reveal = function () {
  const q = VG.guess._round[VG.guess._idx];
  if (!q) return;
  const g = VG.guess._guess;
  const pct = q.actual ? Math.abs(g - q.actual) / q.actual * 100 : 100;
  // points: 100 for spot on, decaying with % error
  const points = Math.max(0, Math.round(100 - pct * 2));
  VG.guess._answers.push({ qid: q.id, guess: g, actual: q.actual, pct, points });
  VG.guess._revealed = true;
  VG.guess.renderPanel();
};

VG.guess.next = function () {
  VG.guess._idx++;
  VG.guess._revealed = false;
  const q = VG.guess._round[VG.guess._idx];
  if (q) VG.guess._guess = Math.round((q.min + q.max) / 2 / (q.step||1)) * (q.step||1);
  VG.guess.renderPanel();
};

VG.guess.renderPanel = function () {
  const el = document.getElementById('panel-guess');
  if (!el) return;
  if (!VG.state.baseline) { el.innerHTML = '<div class="card"><p>Indlæser data…</p></div>'; return; }

  // Not started yet
  if (!VG.guess._round.length) {
    el.innerHTML = `<div class="gz-wrap"><div class="card gz-hero">
      <h2>🎯 Gæt Danmark</h2>
      <p class="intro">Hvor godt kender du tallene bag Danmark? Gæt fem rigtige tal — fra hvad forsvaret koster til hvor mange vi er — og se hvor tæt du rammer. Du gætter <em>før</em> du får svaret.</p>
      <button class="btn primary" data-gz-start>Start quiz →</button>
    </div></div>`;
    el.onclick = VG.guess._onClick;
    return;
  }

  // Finished
  if (VG.guess._idx >= VG.guess._round.length) {
    const total = VG.guess._answers.reduce((s, a) => s + a.points, 0);
    const max = VG.guess._round.length * 100;
    const grade = total/max >= 0.85 ? 'Økonomi-nørd 🧠' : total/max >= 0.6 ? 'Godt gået 👍' : total/max >= 0.35 ? 'Ikke helt skævt 🤔' : 'Øvelse gør mester 📚';
    const rows = VG.guess._answers.map((a, i) => {
      const q = VG.guess._round[i];
      return `<tr><td>${q.q}</td><td>${q.fmt(a.guess)}</td><td><strong>${q.fmt(a.actual)}</strong></td><td>${a.points}</td></tr>`;
    }).join('');
    el.innerHTML = `<div class="gz-wrap"><div class="card gz-result">
      <h2>${grade}</h2>
      <div class="gz-score">${total}<span>/${max} point</span></div>
      <table class="gz-table"><thead><tr><th>Spørgsmål</th><th>Dit gæt</th><th>Facit</th><th>Point</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="gz-actions">
        <button class="btn primary" data-gz-start>Spil igen ↺</button>
      </div>
    </div></div>`;
    el.onclick = VG.guess._onClick;
    return;
  }

  // A question
  const q = VG.guess._round[VG.guess._idx];
  const ans = VG.guess._revealed ? VG.guess._answers[VG.guess._answers.length - 1] : null;
  const progress = `${VG.guess._idx + 1} / ${VG.guess._round.length}`;
  let revealHtml = '';
  if (ans) {
    const closeness = ans.pct < 5 ? 'Helt vildt tæt på! 🎯' : ans.pct < 15 ? 'Rigtig tæt på 👏' : ans.pct < 35 ? 'Tæt nok 🙂' : 'Et stykke fra 😅';
    const pos = q.actual >= q.min && q.actual <= q.max ? (q.actual - q.min) / (q.max - q.min) * 100 : 50;
    revealHtml = `<div class="gz-reveal">
      <div class="gz-reveal-line"><span>Dit gæt</span><strong>${q.fmt(ans.guess)}</strong></div>
      <div class="gz-reveal-line gz-actual"><span>Facit</span><strong>${q.fmt(q.actual)}</strong></div>
      <div class="gz-closeness">${closeness} — <strong>${ans.points} point</strong> (${ans.pct.toFixed(0)}% fra)</div>
      <p class="gz-explain">${q.explain} <a data-gz-link="${q.link}">Se data →</a></p>
      <button class="btn primary" data-gz-next>${VG.guess._idx + 1 < VG.guess._round.length ? 'Næste →' : 'Se resultat →'}</button>
    </div>`;
  }
  el.innerHTML = `<div class="gz-wrap"><div class="card gz-q">
    <div class="gz-progress">Spørgsmål ${progress}</div>
    <h2 class="gz-question">${q.q}</h2>
    <div class="gz-guess-val">${q.fmt(VG.guess._guess)}</div>
    <input type="range" class="gz-slider" id="gz-slider" min="${q.min}" max="${q.max}" step="${q.step||1}" value="${VG.guess._guess}" ${ans ? 'disabled' : ''}>
    <div class="gz-scale"><span>${q.fmt(q.min)}</span><span>${q.fmt(q.max)}</span></div>
    ${ans ? revealHtml : `<button class="btn primary gz-reveal-btn" data-gz-reveal>Afslør facit</button>`}
  </div></div>`;
  const sl = document.getElementById('gz-slider');
  if (sl && !ans) sl.addEventListener('input', e => {
    VG.guess._guess = parseFloat(e.target.value);
    const out = el.querySelector('.gz-guess-val');
    if (out) out.textContent = q.fmt(VG.guess._guess);
  });
  el.onclick = VG.guess._onClick;
};

VG.guess._onClick = function (e) {
  if (e.target.closest('[data-gz-start]'))  return VG.guess.startRound();
  if (e.target.closest('[data-gz-reveal]')) return VG.guess.reveal();
  if (e.target.closest('[data-gz-next]'))   return VG.guess.next();
  const link = e.target.closest('[data-gz-link]');
  if (link && window.__mkClick) window.__mkClick(link.dataset.gzLink);
};
