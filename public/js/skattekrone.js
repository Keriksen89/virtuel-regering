// ─────────────────────────────────────────────────────────────────────────
// skattekrone.js — "Din Skattekrone": enter your income, see (roughly) how
// much tax you pay and exactly where each krone goes, distributed across the
// real spending categories by their share of the budget. Turns the abstract
// national budget into the user's own money — the personalisation lever again.
// ─────────────────────────────────────────────────────────────────────────
VG.skattekrone = {};

// Very simplified Danish income-tax estimate (good enough to feel real):
// AM-bidrag 8% of gross, then ~37.7% average municipal+bottom rate on the
// remainder above the personal allowance, plus top tax over the threshold.
VG.skattekrone.estimateTax = function (gross) {
  const am = gross * 0.08;
  const afterAm = gross - am;
  const personfradrag = 49700;            // 2026-ish
  const taxable = Math.max(0, afterAm - personfradrag);
  const baseRate = 0.377;                 // kommune + bund (gennemsnit)
  let tax = taxable * baseRate;
  const topThreshold = 611800;            // topskattegrænse efter AM (2026-ish)
  if (afterAm > topThreshold) tax += (afterAm - topThreshold) * 0.075;
  return Math.round(am + tax);
};

VG.skattekrone._saved = function () {
  try { return localStorage.getItem('vg-income') || ''; } catch { return ''; }
};

VG.skattekrone.submit = function (income) {
  const g = parseInt(String(income).replace(/\D/g, ''), 10);
  if (!(g >= 50000 && g <= 5000000)) { VG.toast('Indtast en årsindkomst (fx 480000)'); return; }
  try { localStorage.setItem('vg-income', String(g)); } catch {}
  VG.skattekrone._show(g);
};

VG.skattekrone.renderPanel = function () {
  const el = document.getElementById('panel-skattekrone');
  if (!el) return;
  const saved = VG.skattekrone._saved();
  el.innerHTML = `
  <div class="sk2-wrap">
    <div class="card sk2-hero">
      <h2>🪙 Din Skattekrone</h2>
      <p class="intro">Indtast din årsindkomst før skat, og se hvor mange skattekroner du sender til staten — og præcis hvor de havner. Hver krone fordeles efter statens faktiske budget.</p>
      <form class="sk2-form" id="sk2-form">
        <input type="text" inputmode="numeric" id="sk2-input" class="sk2-input" placeholder="fx 480000" value="${saved}" aria-label="Årsindkomst">
        <button type="submit" class="btn primary">Beregn</button>
      </form>
    </div>
    <div id="sk2-result"></div>
  </div>`;
  document.getElementById('sk2-form').addEventListener('submit', e => {
    e.preventDefault();
    VG.skattekrone.submit(document.getElementById('sk2-input').value);
  });
  if (saved) VG.skattekrone._show(parseInt(saved, 10));
};

VG.skattekrone._show = function (gross) {
  const host = document.getElementById('sk2-result');
  if (!host || !VG.state.current) return;
  const tax = VG.skattekrone.estimateTax(gross);
  const rate = tax / gross * 100;

  const exp = Object.entries(VG.state.current.expense).map(([k, v]) => ({ k, name: v.name, val: v.val }));
  const totalExp = exp.reduce((s, d) => s + d.val, 0);
  exp.sort((a, b) => b.val - a.val);

  const rows = exp.map(d => {
    const share = d.val / totalExp;
    const kr = Math.round(tax * share);
    return { name: d.name, share, kr };
  });
  const maxKr = rows[0].kr || 1;

  const barRows = rows.map(r => `
    <div class="sk2-row">
      <span class="sk2-cat">${r.name}</span>
      <div class="sk2-bar"><div class="sk2-bar-fill" style="width:${Math.round(r.kr/maxKr*100)}%"></div></div>
      <span class="sk2-kr">${r.kr.toLocaleString('da-DK')} kr</span>
    </div>`).join('');

  const perDay = Math.round(tax / 365);
  host.innerHTML = `
    <div class="card sk2-summary">
      <div class="sk2-big">
        <div><div class="sk2-big-num">${tax.toLocaleString('da-DK')} kr</div><div class="sk2-dim">i skat om året (estimat)</div></div>
        <div><div class="sk2-big-num">${rate.toFixed(0)}%</div><div class="sk2-dim">af din indkomst</div></div>
        <div><div class="sk2-big-num">${perDay.toLocaleString('da-DK')} kr</div><div class="sk2-dim">om dagen</div></div>
      </div>
    </div>
    <div class="card">
      <h3>Sådan fordeles din skattekrone</h3>
      <div class="sk2-rows">${barRows}</div>
      <p class="sk2-disclaimer">Forenklet estimat: AM-bidrag 8% + gennemsnitlig kommune-/bundskat + evt. topskat, med personfradrag. Fordelingen følger statens udgiftsandele i Finanslov 2026 — ikke en juridisk skatteberegning.</p>
    </div>`;
};
