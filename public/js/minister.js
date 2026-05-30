// ─────────────────────────────────────────────────────────────────────────
// minister.js — "Bliv Finansminister": a scored budget challenge built on top
// of the real budget engine (VG.state.current.policy → VG.applyPolicy →
// VG.sumRev/sumExp). The player picks values, pulls a handful of big policy
// levers with live consequence read-outs, then hands in the budget and is
// scored on (1) value alignment, (2) fiscal responsibility, (3) realism.
// Includes a weekly challenge, a localStorage leaderboard, and sharing.
// ─────────────────────────────────────────────────────────────────────────
VG.minister = {};

/* ── Values the player can champion ──────────────────────────────────────
   Each value defines `signals`: weighted directions on policy params and on
   budget buckets. Positive weight = "more of this serves the value".        */
VG.minister.VALUES = {
  velfaerd: {
    icon: '🏥', label: 'Stærk velfærd',
    desc: 'Sundhed, ældre, børn og uddannelse i top.',
    signals: { welfareLevel: 1, housingSupport: 0.6, 'e_health': 1, 'e_elderly': 0.8, 'e_education': 0.8, 'e_childcare': 0.6 },
  },
  groen: {
    icon: '🌱', label: 'Grøn omstilling',
    desc: 'Klimainvestering og CO₂-afgift driver omstillingen.',
    signals: { co2Tax: 1, 'e_climate': 1, 'r_green': 0.5, defGoal: -0.1 },
  },
  lavskat: {
    icon: '💸', label: 'Lavere skat',
    desc: 'Lavere skattetryk — flere penge til borgerne.',
    signals: { topTax: -1, vatRate: -0.8, corpTax: -0.6 },
  },
  forsvar: {
    icon: '🛡️', label: 'Stærkt forsvar',
    desc: 'Et robust dansk forsvar i en urolig tid.',
    signals: { defGoal: 1, 'e_defense': 0.8 },
  },
  lighed: {
    icon: '⚖️', label: 'Lav ulighed',
    desc: 'Omfordeling: progressiv skat og stærke ydelser.',
    signals: { topTax: 1, welfareLevel: 0.8, housingSupport: 0.7, vatRate: -0.5, corpTax: 0.4 },
  },
  erhverv: {
    icon: '📈', label: 'Erhvervsvenlig',
    desc: 'Lav selskabsskat og en slank, effektiv stat.',
    signals: { corpTax: -1, publicEmp: -0.5, topTax: -0.4, 'e_admin': -0.5 },
  },
};

/* ── The big levers the player pulls (subset of the real policy params) ──── */
VG.minister.LEVERS = [
  { key: 'topTax',       icon: '💰', fmt: v => v.toFixed(1) + '%',  step: 0.5 },
  { key: 'vatRate',      icon: '🛒', fmt: v => v.toFixed(0) + '%',  step: 1   },
  { key: 'corpTax',      icon: '🏢', fmt: v => v.toFixed(0) + '%',  step: 1   },
  { key: 'retireAge',    icon: '👴', fmt: v => v.toFixed(0) + ' år', step: 1  },
  { key: 'defGoal',      icon: '🛡️', fmt: v => v.toFixed(1) + '% BNP', step: 0.1 },
  { key: 'welfareLevel', icon: '🤝', fmt: v => v.toFixed(0) + '%',  step: 5   },
  { key: 'co2Tax',       icon: '🌿', fmt: v => v.toFixed(0) + ' kr', step: 50 },
  { key: 'devAid',       icon: '✈️', fmt: v => v.toFixed(2) + '% BNI', step: 0.05 },
];

/* ── Game state ──────────────────────────────────────────────────────────── */
VG.minister._chosen   = new Set();   // chosen value keys
VG.minister._phase    = 'intro';     // intro | play | result
VG.minister._lastScore = null;

/* ── Weekly challenge (deterministic by ISO week) ────────────────────────── */
VG.minister.CHALLENGES = [
  { id: 'forsvar4',  label: 'Forsvar på mindst 4% af BNP',          test: () => VG.state.current.policy.defGoal.val >= 4 },
  { id: 'notopskat', label: 'Afskaf topskatten helt',               test: () => VG.state.current.policy.topTax.val <= 0.01 },
  { id: 'groen',     label: 'CO₂-afgift på mindst 1.500 kr/ton',    test: () => VG.state.current.policy.co2Tax.val >= 1500 },
  { id: 'pension66', label: 'Hold pensionsalderen på 66 eller under', test: () => VG.state.current.policy.retireAge.val <= 66 },
  { id: 'moms22',    label: 'Sænk momsen til 22% eller lavere',      test: () => VG.state.current.policy.vatRate.val <= 22 },
];
VG.minister._weekNo = function () {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - start) / (7 * 864e5));
};
VG.minister.weeklyChallenge = function () {
  return VG.minister.CHALLENGES[VG.minister._weekNo() % VG.minister.CHALLENGES.length];
};

/* ── Scoring ────────────────────────────────────────────────────────────── */
VG.minister.score = function () {
  const s = VG.state.current, b = VG.state.baseline;
  if (!s || !b) return null;
  VG.applyPolicy();

  const rev = VG.sumRev(), exp = VG.sumExp(), bal = rev - exp;
  const BNP = b.gdp;
  const balPct = bal / BNP * 100;

  // signed, range-normalised delta for a single signal key
  const signalDelta = (key) => {
    if (key.startsWith('e_')) {
      const k = key.slice(2);
      if (!b.expense[k]) return 0;
      return (s.expense[k].val - b.expense[k].val) / Math.max(1, b.expense[k].val); // relative
    }
    if (key.startsWith('r_')) {
      const k = key.slice(2);
      if (!b.revenue[k]) return 0;
      return (s.revenue[k].val - b.revenue[k].val) / Math.max(1, b.revenue[k].val);
    }
    const p = s.policy[key], bp = b.policy[key];
    if (!p || !bp) return 0;
    const span = (p.max - p.min) || 1;
    return (p.val - bp.val) / span; // -1..1 ish
  };

  // 1) Value alignment (0–40)
  let valueScore = 0;
  const valueDetails = [];
  if (VG.minister._chosen.size) {
    let sum = 0;
    VG.minister._chosen.forEach(vk => {
      const v = VG.minister.VALUES[vk];
      let a = 0, wsum = 0;
      for (const [key, w] of Object.entries(v.signals)) {
        a += signalDelta(key) * w;
        wsum += Math.abs(w);
      }
      const norm = wsum ? a / wsum : 0;             // roughly -1..1
      const pct = Math.max(0, Math.min(1, 0.5 + norm * 1.4)); // 0.5 = neutral start
      sum += pct;
      valueDetails.push({ label: v.label, icon: v.icon, pct });
    });
    valueScore = (sum / VG.minister._chosen.size) * 40;
  } else {
    valueScore = 20; // neutral if no value chosen
  }

  // 2) Fiscal responsibility (0–40)
  let fiscalScore;
  if (balPct >= -1 && balPct <= 4)      fiscalScore = 40;             // healthy band
  else if (balPct > 4)                  fiscalScore = Math.max(24, 40 - (balPct - 4) * 2); // hoarding
  else if (balPct >= -3)                fiscalScore = 40 + (balPct + 1) * 10;  // -1..-3 → 40..20
  else                                  fiscalScore = Math.max(0, 20 + (balPct + 3) * 4);  // < -3 steep
  fiscalScore = Math.max(0, Math.min(40, fiscalScore));

  // 3) Realism (0–20) — reuse the spirit of the existing realism check
  const warnings = [];
  const P = s.policy;
  if (P.topTax.val < 3)       warnings.push('Meget lav topskat — dynamiske tab ikke medregnet.');
  if (P.topTax.val > 18)      warnings.push('Ekstrem topskat — risiko for kapitalflugt (jf. Sverige).');
  if (P.retireAge.val < 64)   warnings.push('Meget lav pensionsalder — uholdbart velfærdshul.');
  if (P.vatRate.val < 18)     warnings.push('Lav moms — grænsehandel og stort provenutab.');
  if (P.corpTax.val < 15)     warnings.push('Selskabsskat under EU-minimum (15%).');
  if (P.devAid.val > 1.2)     warnings.push('Meget høj udviklingsbistand — politisk svær at vedtage.');
  const realismScore = Math.max(0, 20 - warnings.length * 5);

  const total = Math.round(valueScore + fiscalScore + realismScore);

  // Grade
  let grade;
  if (total >= 90) grade = 'A';
  else if (total >= 75) grade = 'B';
  else if (total >= 60) grade = 'C';
  else if (total >= 45) grade = 'D';
  else grade = 'F';

  // Survival year: project debt ratio forward; deficit adds to debt
  let debt = b.debtStartRatio * 100;
  let survivalYear = b.fiscalYear;
  let crashed = false;
  for (let y = b.fiscalYear; y <= b.fiscalYear + 30; y++) {
    debt -= balPct;            // surplus lowers debt, deficit raises it
    survivalYear = y;
    if (debt > 60) { crashed = true; break; }       // EU 60% debt ceiling
    if (debt < 0) debt = 0;
  }

  // Weekly challenge
  const ch = VG.minister.weeklyChallenge();
  const challengeMet = ch.test();
  const challengeBonus = challengeMet ? 5 : 0;

  return {
    total: Math.min(100, total + challengeBonus),
    rawTotal: total,
    grade, balPct, bal, rev, exp,
    valueScore: Math.round(valueScore),
    fiscalScore: Math.round(fiscalScore),
    realismScore,
    valueDetails, warnings,
    survivalYear, crashed,
    challenge: ch, challengeMet, challengeBonus,
  };
};

/* ── Leaderboard (localStorage personal bests) ───────────────────────────── */
VG.minister.LB_KEY = 'vg-minister-scores';
VG.minister.loadLB = function () {
  try { return JSON.parse(localStorage.getItem(VG.minister.LB_KEY)) || []; } catch { return []; }
};
VG.minister.saveScore = function (sc) {
  const lb = VG.minister.loadLB();
  lb.push({
    total: sc.total, grade: sc.grade, balPct: Math.round(sc.balPct * 10) / 10,
    values: [...VG.minister._chosen].map(k => VG.minister.VALUES[k].label),
    date: new Date().toLocaleDateString('da-DK'),
  });
  lb.sort((a, b) => b.total - a.total);
  const top = lb.slice(0, 10);
  try { localStorage.setItem(VG.minister.LB_KEY, JSON.stringify(top)); } catch {}
  return top;
};

/* ── Flow control ────────────────────────────────────────────────────────── */
VG.minister.start = function () {
  if (VG.minister._chosen.size === 0) { VG.toast('Vælg mindst én værdi'); return; }
  VG.minister._phase = 'play';
  VG.minister.renderPanel();
};
VG.minister.toggleValue = function (k) {
  const set = VG.minister._chosen;
  if (set.has(k)) set.delete(k);
  else { if (set.size >= 3) { VG.toast('Vælg højst 3 værdier'); return; } set.add(k); }
  VG.minister.renderPanel();
};
VG.minister.setLever = function (key, val) {
  if (VG.state.current.policy[key]) {
    VG.state.current.policy[key].val = val;
    VG.applyPolicy();
    VG.minister._renderLive();
  }
};
VG.minister.restart = function () {
  VG.reset();
  VG.minister._phase = 'intro';
  VG.minister._chosen.clear();
  VG.minister._lastScore = null;
  VG.minister.renderPanel();
};
VG.minister.submit = function () {
  const sc = VG.minister.score();
  if (!sc) return;
  VG.minister._lastScore = sc;
  VG.minister._phase = 'result';
  VG.minister.saveScore(sc);
  VG.minister.renderPanel();
};
VG.minister.replay = function () {
  VG.minister._phase = 'play';
  VG.minister.renderPanel();
};
VG.minister.shareScore = function () {
  const sc = VG.minister._lastScore;
  if (!sc) return;
  const url = VG.share.getURL();
  const txt = `Jeg blev finansminister på Oculus Omnividens og fik karakteren ${sc.grade} (${sc.total}/100). Min regering holdt til ${sc.survivalYear}. Kan du slå mig?`;
  const html = `<p>${txt}</p>
    <input type="text" class="share-input" value="${url}" readonly id="ms-share-url">
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" id="ms-copy">Kopier link</button>
      <button class="btn" id="ms-x">Del på X</button>
    </div>`;
  VG.showModal('Del dit resultat', html);
  setTimeout(() => {
    document.getElementById('ms-copy')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(url); VG.toast('Link kopieret'); } catch { VG.toast('Kopier manuelt'); }
    });
    document.getElementById('ms-x')?.addEventListener('click', () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}&url=${encodeURIComponent(url)}`, '_blank');
    });
  }, 50);
};

/* ── Live read-out during play ───────────────────────────────────────────── */
VG.minister._renderLive = function () {
  const host = document.getElementById('ms-live');
  if (!host) return;
  const sc = VG.minister.score();
  if (!sc) return;
  const balCls = sc.balPct >= -1 ? 'ms-good' : sc.balPct >= -3 ? 'ms-warn' : 'ms-bad';
  const valueMeters = sc.valueDetails.map(v =>
    `<div class="ms-meter-row"><span>${v.icon} ${v.label}</span>
       <div class="ms-meter"><div class="ms-meter-fill" style="width:${Math.round(v.pct*100)}%"></div></div></div>`).join('');
  host.innerHTML = `
    <div class="ms-live-bal ${balCls}">
      <div class="ms-live-label">Budgetsaldo</div>
      <div class="ms-live-val">${VG.fmtSigned(sc.bal)}<span class="ms-live-pct">${VG.ppct(sc.balPct)} af BNP</span></div>
    </div>
    <div class="ms-live-meters">${valueMeters || '<span class="ms-dim">Ingen værdier valgt</span>'}</div>`;

  // sync slider value labels
  VG.minister.LEVERS.forEach(l => {
    const out = document.getElementById('ms-out-' + l.key);
    if (out) out.textContent = l.fmt(VG.state.current.policy[l.key].val);
  });
};

/* ── Render ──────────────────────────────────────────────────────────────── */
VG.minister.renderPanel = function () {
  const el = document.getElementById('panel-minister');
  if (!el) return;
  if (!VG.state.current) { el.innerHTML = '<div class="card"><p>Indlæser budget…</p></div>'; return; }

  if (VG.minister._phase === 'intro')  return VG.minister._renderIntro(el);
  if (VG.minister._phase === 'play')   return VG.minister._renderPlay(el);
  if (VG.minister._phase === 'result') return VG.minister._renderResult(el);
};

VG.minister._renderIntro = function (el) {
  const ch = VG.minister.weeklyChallenge();
  const cards = Object.entries(VG.minister.VALUES).map(([k, v]) => {
    const on = VG.minister._chosen.has(k);
    return `<button class="ms-value-card${on ? ' ms-on' : ''}" data-ms-val="${k}">
      <span class="ms-value-icon">${v.icon}</span>
      <span class="ms-value-label">${v.label}</span>
      <span class="ms-value-desc">${v.desc}</span>
    </button>`;
  }).join('');
  const lb = VG.minister.loadLB();
  el.innerHTML = `
  <div class="ms-wrap">
    <div class="card ms-hero">
      <h2>🏛 Bliv Finansminister</h2>
      <p class="intro">Du har fået nøglerne til statskassen. Vælg de værdier du vil kæmpe for, træk i de store håndtag, og aflever et budget der både holder Danmark kørende og lever op til dine idealer. Du får en karakter til sidst.</p>
      <div class="ms-challenge">🎯 <strong>Ugens udfordring:</strong> ${ch.label} <span class="ms-challenge-bonus">+5 point</span></div>
    </div>
    <div class="card">
      <h3>1. Vælg dine værdier <span class="ms-dim">(1–3)</span></h3>
      <div class="ms-values">${cards}</div>
      <button class="btn primary ms-start" data-ms-start ${VG.minister._chosen.size ? '' : 'disabled'}>Start dit ministerium →</button>
    </div>
    ${lb.length ? `<div class="card">
      <h3>🏆 Dine bedste budgetter</h3>
      <table class="ms-lb"><thead><tr><th>#</th><th>Karakter</th><th>Point</th><th>Saldo</th><th>Værdier</th><th>Dato</th></tr></thead>
      <tbody>${lb.map((r,i)=>`<tr><td>${i+1}</td><td><span class="ms-grade ms-grade-${r.grade}">${r.grade}</span></td><td>${r.total}</td><td>${r.balPct>0?'+':''}${r.balPct}%</td><td>${(r.values||[]).join(', ')}</td><td>${r.date}</td></tr>`).join('')}</tbody></table>
    </div>` : ''}
  </div>`;
  el.onclick = VG.minister._onClick;
};

VG.minister._renderPlay = function (el) {
  const levers = VG.minister.LEVERS.map(l => {
    const p = VG.state.current.policy[l.key];
    return `<div class="ms-lever">
      <div class="ms-lever-head">
        <span class="ms-lever-name">${l.icon} ${p.name}</span>
        <span class="ms-lever-out" id="ms-out-${l.key}">${l.fmt(p.val)}</span>
      </div>
      <input type="range" class="ms-slider" data-ms-lever="${l.key}"
        min="${p.min}" max="${p.max}" step="${l.step}" value="${p.val}">
      <div class="ms-lever-info">${p.info}</div>
    </div>`;
  }).join('');
  const chosen = [...VG.minister._chosen].map(k => `${VG.minister.VALUES[k].icon} ${VG.minister.VALUES[k].label}`).join(' · ');
  el.innerHTML = `
  <div class="ms-wrap ms-play">
    <div class="ms-play-main">
      <div class="card">
        <div class="ms-play-head">
          <h2>🏛 Dit ministerium</h2>
          <span class="ms-chosen">${chosen}</span>
        </div>
        <p class="ms-dim">Træk i håndtagene — tallene opdateres live. Når du er klar, afleverer du budgettet.</p>
        <div class="ms-levers">${levers}</div>
      </div>
    </div>
    <aside class="ms-play-side">
      <div class="card ms-sticky">
        <div id="ms-live"></div>
        <button class="btn primary ms-submit" data-ms-submit>✓ Aflever budget</button>
        <button class="btn ms-back" data-ms-restart>↺ Forfra</button>
      </div>
    </aside>
  </div>`;
  el.oninput = function (e) {
    const sl = e.target.closest('[data-ms-lever]');
    if (sl) VG.minister.setLever(sl.dataset.msLever, parseFloat(sl.value));
  };
  el.onclick = VG.minister._onClick;
  VG.minister._renderLive();
};

VG.minister._renderResult = function (el) {
  const sc = VG.minister._lastScore;
  if (!sc) { VG.minister._phase = 'intro'; return VG.minister.renderPanel(); }
  const valueMeters = sc.valueDetails.map(v =>
    `<div class="ms-meter-row"><span>${v.icon} ${v.label}</span>
       <div class="ms-meter"><div class="ms-meter-fill" style="width:${Math.round(v.pct*100)}%"></div></div>
       <span class="ms-meter-pct">${Math.round(v.pct*100)}%</span></div>`).join('');
  const survivalMsg = sc.crashed
    ? `Din regering holdt til <strong>${sc.survivalYear}</strong> — så ramte statsgælden EU's 60%-loft.`
    : `Statsgælden er under kontrol helt frem til <strong>${sc.survivalYear}</strong>. Flot styret.`;
  el.innerHTML = `
  <div class="ms-wrap ms-result">
    <div class="card ms-scorecard">
      <div class="ms-grade-big ms-grade-${sc.grade}">${sc.grade}</div>
      <div class="ms-score-num">${sc.total}<span>/100</span></div>
      <div class="ms-survival">${survivalMsg}</div>
      <div class="ms-breakdown">
        <div class="ms-bd"><span>Værdier</span><strong>${sc.valueScore}/40</strong></div>
        <div class="ms-bd"><span>Ansvarlighed</span><strong>${sc.fiscalScore}/40</strong></div>
        <div class="ms-bd"><span>Realisme</span><strong>${sc.realismScore}/20</strong></div>
        ${sc.challengeBonus ? `<div class="ms-bd ms-bd-bonus"><span>🎯 Ugens udfordring</span><strong>+${sc.challengeBonus}</strong></div>` : ''}
      </div>
    </div>
    <div class="card">
      <h3>Saldo: ${VG.fmtSigned(sc.bal)} (${VG.ppct(sc.balPct)} af BNP)</h3>
      <div class="ms-meters-result">${valueMeters}</div>
      <div class="ms-challenge ${sc.challengeMet ? 'ms-ch-met' : 'ms-ch-miss'}">
        ${sc.challengeMet ? '✓' : '✗'} Ugens udfordring: ${sc.challenge.label}
      </div>
    </div>
    ${sc.warnings.length ? `<div class="card ms-warnings">
      <h3>⚠ Realisme-tjek</h3>
      <ul>${sc.warnings.map(w => `<li>${w}</li>`).join('')}</ul>
    </div>` : `<div class="card"><p>✓ Ingen realisme-advarsler — et troværdigt budget.</p></div>`}
    <div class="card"><h3>Dit budget i kroner og flow</h3><div id="ms-sankey"></div></div>
    <div class="ms-actions">
      <button class="btn" data-ms-replay>↩ Juster budgettet</button>
      <button class="btn" data-ms-restart>↺ Helt forfra</button>
      <button class="btn primary" data-ms-share>↗ Del resultat</button>
    </div>
    <p class="ms-disclaimer">Karakteren bygger på den statiske budgetmodel (Finansministeriet/DREAM-kalibreret). Dynamiske MAKRO-effekter er ikke fuldt indregnet.</p>
  </div>`;
  el.onclick = VG.minister._onClick;
  if (VG.sankey) { try { VG.sankey.render(document.getElementById('ms-sankey')); } catch (e) {} }
};

VG.minister._onClick = function (e) {
  const v = e.target.closest('[data-ms-val]');     if (v) return VG.minister.toggleValue(v.dataset.msVal);
  if (e.target.closest('[data-ms-start]'))   return VG.minister.start();
  if (e.target.closest('[data-ms-submit]'))  return VG.minister.submit();
  if (e.target.closest('[data-ms-restart]')) return VG.minister.restart();
  if (e.target.closest('[data-ms-replay]'))  return VG.minister.replay();
  if (e.target.closest('[data-ms-share]'))   return VG.minister.shareScore();
};
