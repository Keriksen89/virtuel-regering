VG.pension = {};

// 2026 folkepension rates (DKK/month)
const FOLKEPENSION_GRUNDBELOB    = 6800;   // grundbeløb
const FOLKEPENSION_TILLÆG_SINGLE = 6000;   // pensionstillæg (single)
const FOLKEPENSION_TOTAL_SINGLE  = FOLKEPENSION_GRUNDBELOB + FOLKEPENSION_TILLÆG_SINGLE; // 12,800

// Pensionsalder in 2026: 67 years. Target: 70 by 2040.
const PENSION_AGE_2026  = 67;
const PENSION_AGE_2040  = 70;
const RETURN_RATE       = 0.055; // 5.5% annual return on pension savings
const INFLATION_RATE    = 0.02;  // 2% inflation
const REAL_RETURN       = RETURN_RATE - INFLATION_RATE; // ~3.5% real return
const ANNUITY_YEARS     = 20;    // assume 20 years in retirement (payout period)

VG.pension._state = {
  age:               35,
  monthlySalary:     45000,
  currentSavings:    300000,
  employerContrib:   12,   // % of salary
};

VG.pension.renderPanel = function() {
  const panel = document.getElementById('panel-pension');
  if (!panel) return;
  VG.pension._renderContent(panel);
};

VG.pension._renderContent = function(panel) {
  const s = VG.pension._state;
  const results = VG.pension._calculate(s);

  panel.innerHTML = `
<div class="card">
  <h2>💼 Pensionsberegner</h2>
  <p class="intro">Beregn din forventede pension baseret på folkepension, arbejdsgiverbidrag og eksisterende opsparing. Baseret på 2026-satser og DREAM-fremskrivninger.</p>

  <div class="pension-inputs">
    <div class="pension-input-group">
      <label class="pension-label">Alder
        <span class="pension-value-display" id="pen-age-display">${s.age} år</span>
      </label>
      <input type="range" id="pen-age" class="slider" min="25" max="65" step="1" value="${s.age}">
      <div class="slider-range-labels"><span>25 år</span><span>65 år</span></div>
    </div>
    <div class="pension-input-group">
      <label class="pension-label">Månedlig bruttoløn
        <span class="pension-value-display" id="pen-salary-display">${s.monthlySalary.toLocaleString('da-DK')} kr.</span>
      </label>
      <input type="range" id="pen-salary" class="slider" min="20000" max="100000" step="1000" value="${s.monthlySalary}">
      <div class="slider-range-labels"><span>20.000</span><span>100.000 kr.</span></div>
    </div>
    <div class="pension-input-group">
      <label class="pension-label">Eksisterende pensionsopsparing
        <span class="pension-value-display" id="pen-savings-display">${s.currentSavings.toLocaleString('da-DK')} kr.</span>
      </label>
      <input type="range" id="pen-savings" class="slider" min="0" max="5000000" step="25000" value="${s.currentSavings}">
      <div class="slider-range-labels"><span>0</span><span>5.000.000 kr.</span></div>
    </div>
    <div class="pension-input-group">
      <label class="pension-label">Arbejdsgiverbidrag til pension
        <span class="pension-value-display" id="pen-contrib-display">${s.employerContrib}%</span>
      </label>
      <input type="range" id="pen-contrib" class="slider" min="8" max="17" step="0.5" value="${s.employerContrib}">
      <div class="slider-range-labels"><span>8%</span><span>17%</span></div>
    </div>
  </div>

  <div class="pension-results" id="pension-results">
    ${VG.pension._renderResults(results, s)}
  </div>

  <div class="pension-timeline" id="pension-timeline">
    ${VG.pension._renderTimeline(results, s)}
  </div>

  <p class="pension-disclaimer">Beregninger er vejledende. Folkepension 2026: grundbeløb 6.800 kr./mdr. + tillæg 6.000 kr./mdr. (single).
  Pensionsalder 67 år (2026), forventes at stige til 70 år i 2040. Afkast estimeret til 5,5% p.a. (3,5% realt efter 2% inflation).</p>
</div>`;

  VG.pension._bindEvents(panel);
};

VG.pension._calculate = function(s) {
  const yearsToRetirement = Math.max(1, PENSION_AGE_2026 - s.age);
  const retirementAge = PENSION_AGE_2026;

  // Monthly contribution (employer + employee ~2/3 employer, ~1/3 employee, simplified)
  const monthlyContrib = s.monthlySalary * (s.employerContrib / 100);

  // Future value of existing savings
  const fvCurrentSavings = s.currentSavings * Math.pow(1 + REAL_RETURN, yearsToRetirement);

  // Future value of monthly contributions (annuity)
  const rMonthly = REAL_RETURN / 12;
  const nMonths  = yearsToRetirement * 12;
  const fvContributions = nMonths > 0
    ? monthlyContrib * ((Math.pow(1 + rMonthly, nMonths) - 1) / rMonthly)
    : 0;

  const totalSavingsAtRetirement = fvCurrentSavings + fvContributions;

  // Monthly payout from savings (annuity over ANNUITY_YEARS)
  const rAnnuity = REAL_RETURN / 12;
  const nAnnuity = ANNUITY_YEARS * 12;
  const monthlyFromSavings = totalSavingsAtRetirement > 0
    ? totalSavingsAtRetirement * rAnnuity / (1 - Math.pow(1 + rAnnuity, -nAnnuity))
    : 0;

  const folkepension = FOLKEPENSION_TOTAL_SINGLE;

  const totalMonthlyPension = monthlyFromSavings + folkepension;
  const replacementRate     = totalMonthlyPension / s.monthlySalary * 100;
  const pensionGap          = s.monthlySalary * 0.7 - totalMonthlyPension; // target: 70% of salary

  // Effect of working 1-2 extra years
  const extraYear1 = VG.pension._calculateExtra(s, 1);
  const extraYear2 = VG.pension._calculateExtra(s, 2);

  return {
    yearsToRetirement,
    retirementAge,
    monthlyContrib,
    totalSavingsAtRetirement,
    monthlyFromSavings,
    folkepension,
    totalMonthlyPension,
    replacementRate,
    pensionGap,
    extraYear1,
    extraYear2,
  };
};

VG.pension._calculateExtra = function(s, extraYears) {
  const altState = { ...s, age: s.age - extraYears }; // effectively work extra years by starting "later"
  // Simpler: recalculate with more years
  const yearsToRetirement = Math.max(1, PENSION_AGE_2026 - s.age + extraYears);
  const monthlyContrib = s.monthlySalary * (s.employerContrib / 100);
  const fvCurrentSavings = s.currentSavings * Math.pow(1 + REAL_RETURN, yearsToRetirement);
  const rMonthly = REAL_RETURN / 12;
  const nMonths  = yearsToRetirement * 12;
  const fvContributions = monthlyContrib * ((Math.pow(1 + rMonthly, nMonths) - 1) / rMonthly);
  const totalSavings = fvCurrentSavings + fvContributions;
  const rAnnuity = REAL_RETURN / 12;
  const nAnnuity = (ANNUITY_YEARS - extraYears) * 12;
  const monthlyFromSavings = nAnnuity > 0
    ? totalSavings * rAnnuity / (1 - Math.pow(1 + rAnnuity, -nAnnuity))
    : 0;
  return {
    totalMonthlyPension: monthlyFromSavings + FOLKEPENSION_TOTAL_SINGLE,
    totalSavings,
  };
};

VG.pension._renderResults = function(r, s) {
  const fmt  = n => Math.round(n).toLocaleString('da-DK');
  const fmtM = n => fmt(n) + ' kr./mdr.';
  const replColor = r.replacementRate >= 70 ? 'var(--neg)' : r.replacementRate >= 50 ? 'var(--warn)' : 'var(--pos)';
  const gapColor  = r.pensionGap > 0 ? 'var(--pos)' : 'var(--neg)';
  const gapLabel  = r.pensionGap > 0
    ? `Pensionsgab: mangler ${fmt(r.pensionGap)} kr./mdr. ift. 70%-mål`
    : `Over 70%-målet med ${fmt(Math.abs(r.pensionGap))} kr./mdr.`;

  return `<div class="pension-results-grid">
  <div class="pension-result-card">
    <div class="pension-result-label">År til pension (alder ${r.retirementAge})</div>
    <div class="pension-result-value">${r.yearsToRetirement} år</div>
    <div class="pension-result-sub">Pensionsalder: 67 år (2026). Forventes 70 år i 2040.</div>
  </div>
  <div class="pension-result-card">
    <div class="pension-result-label">Opsparing ved pension</div>
    <div class="pension-result-value">${fmt(r.totalSavingsAtRetirement)} kr.</div>
    <div class="pension-result-sub">${fmt(r.monthlyContrib)} kr./mdr. bidrag · 5,5% p.a. afkast</div>
  </div>
  <div class="pension-result-card">
    <div class="pension-result-label">Folkepension (grundbeløb + tillæg)</div>
    <div class="pension-result-value">${fmtM(r.folkepension)}</div>
    <div class="pension-result-sub">Grundbeløb: 6.800 · Tillæg: 6.000 kr. (single, 2026)</div>
  </div>
  <div class="pension-result-card">
    <div class="pension-result-label">Livrente fra opsparing (20 år)</div>
    <div class="pension-result-value">${fmtM(r.monthlyFromSavings)}</div>
    <div class="pension-result-sub">Udbetalt over ${ANNUITY_YEARS} år (annuitetsform)</div>
  </div>
  <div class="pension-result-card accent-card">
    <div class="pension-result-label">Samlet estimeret pension</div>
    <div class="pension-result-value">${fmtM(r.totalMonthlyPension)}</div>
    <div class="pension-result-sub" style="color:${replColor}">= ${r.replacementRate.toFixed(0)}% af nuværende løn</div>
  </div>
  <div class="pension-result-card ${r.pensionGap > 0 ? 'result-warn' : 'result-ok'}">
    <div class="pension-result-label">Pensionsgab (vs. 70%-mål)</div>
    <div class="pension-result-value" style="color:${gapColor}">${gapLabel}</div>
    <div class="pension-result-sub">Mål: ${fmt(s.monthlySalary * 0.7)} kr./mdr.</div>
  </div>
</div>

<div class="pension-extra-years">
  <h3>Hvad giver 1–2 ekstra arbejdsår?</h3>
  <table class="pension-extra-table">
    <thead><tr><th>Scenarie</th><th>Samlet pension</th><th>Gevinst</th></tr></thead>
    <tbody>
      <tr>
        <td>Pension ved ${r.retirementAge} (nu)</td>
        <td>${fmtM(r.totalMonthlyPension)}</td>
        <td>—</td>
      </tr>
      <tr>
        <td>+1 år (pension ved ${r.retirementAge + 1})</td>
        <td>${fmtM(r.extraYear1.totalMonthlyPension)}</td>
        <td style="color:var(--neg)">+${fmt(r.extraYear1.totalMonthlyPension - r.totalMonthlyPension)} kr./mdr.</td>
      </tr>
      <tr>
        <td>+2 år (pension ved ${r.retirementAge + 2})</td>
        <td>${fmtM(r.extraYear2.totalMonthlyPension)}</td>
        <td style="color:var(--neg)">+${fmt(r.extraYear2.totalMonthlyPension - r.totalMonthlyPension)} kr./mdr.</td>
      </tr>
    </tbody>
  </table>
</div>`;
};

VG.pension._renderTimeline = function(r, s) {
  const totalYears = r.retirementAge - s.age;
  const retirePct  = Math.min(100, (r.yearsToRetirement / Math.max(totalYears, 1)) * 100).toFixed(0);
  const agePct     = (100 - parseFloat(retirePct)).toFixed(0);

  return `<div class="pension-timeline-wrap">
  <div class="pension-timeline-label">
    <span>Alder ${s.age}</span>
    <span>Pension alder ${r.retirementAge}</span>
  </div>
  <div class="pension-timeline-bar">
    <div class="pension-timeline-done" style="width:${agePct}%"></div>
    <div class="pension-timeline-remaining" style="width:${retirePct}%"></div>
  </div>
  <div class="pension-timeline-desc">
    <span style="color:var(--accent)">${s.age - 25} år tilbagelagt</span>
    <span style="color:var(--text-3)">${r.yearsToRetirement} år tilbage til pension</span>
  </div>
</div>`;
};

VG.pension._bindEvents = function(panel) {
  if (panel._vgBound) return;
  panel._vgBound = true;

  panel.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'pen-age') {
      VG.pension._state.age = parseInt(e.target.value);
      document.getElementById('pen-age-display').textContent = VG.pension._state.age + ' år';
    } else if (id === 'pen-salary') {
      VG.pension._state.monthlySalary = parseInt(e.target.value);
      document.getElementById('pen-salary-display').textContent = VG.pension._state.monthlySalary.toLocaleString('da-DK') + ' kr.';
    } else if (id === 'pen-savings') {
      VG.pension._state.currentSavings = parseInt(e.target.value);
      document.getElementById('pen-savings-display').textContent = VG.pension._state.currentSavings.toLocaleString('da-DK') + ' kr.';
    } else if (id === 'pen-contrib') {
      VG.pension._state.employerContrib = parseFloat(e.target.value);
      document.getElementById('pen-contrib-display').textContent = VG.pension._state.employerContrib + '%';
    } else {
      return;
    }

    const s = VG.pension._state;
    const results = VG.pension._calculate(s);
    const resultsEl = document.getElementById('pension-results');
    const timelineEl = document.getElementById('pension-timeline');
    if (resultsEl)  resultsEl.innerHTML  = VG.pension._renderResults(results, s);
    if (timelineEl) timelineEl.innerHTML = VG.pension._renderTimeline(results, s);
  });
};
