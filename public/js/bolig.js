VG.bolig = {};

// City price data (DKK/m², ejerlejlighed 2025/2026)
VG.bolig.CITY_PRICES = {
  'København':     { priceM2: 60000, rentM2: 1300, label: 'København' },
  'Frederiksberg': { priceM2: 52000, rentM2: 1150, label: 'Frederiksberg' },
  'Aarhus':        { priceM2: 35000, rentM2: 900, label: 'Aarhus' },
  'Odense':        { priceM2: 22000, rentM2: 700, label: 'Odense' },
  'Aalborg':       { priceM2: 18000, rentM2: 600, label: 'Aalborg' },
  'Hele landet':   { priceM2: 28000, rentM2: 800, label: 'Hele landet' },
};

const DEFAULT_SIZE_M2 = 70;       // typical 2-room apartment
const MORTGAGE_RATE   = 0.045;    // 4.5% annual
const MORTGAGE_YEARS  = 30;
const DOWN_PAYMENT_PCT = 0.05;    // 5% krav
const INCOME_MULTIPLIER = 4;      // max 4x annual income (Danish mortgage rule)
const EJENDOMSSKAT_LOW  = 0.0051; // 0.51% under 9.2M
const EJENDOMSSKAT_HIGH = 0.014;  // 1.4% over 9.2M
const THRESHOLD_9_2M    = 9200000;

VG.bolig._state = {
  income:   45000, // DKK/month
  savings:  200000,
  city:     'Hele landet',
};

VG.bolig.renderPanel = function() {
  const panel = document.getElementById('panel-bolig');
  if (!panel) return;
  VG.bolig._renderContent(panel);
};

VG.bolig._renderContent = function(panel) {
  const s = VG.bolig._state;
  const cityData = VG.bolig.CITY_PRICES[s.city] || VG.bolig.CITY_PRICES['Hele landet'];

  const results = VG.bolig._calculate(s.income, s.savings, cityData);

  const cityOptions = Object.keys(VG.bolig.CITY_PRICES)
    .map(c => `<option value="${c}"${c === s.city ? ' selected' : ''}>${c}</option>`)
    .join('');

  panel.innerHTML = `
<div class="card">
  <h2>🏠 Boligberegner</h2>
  <p class="intro">Beregn hvornår du kan købe bolig, hvad du kan låne, og hvad det koster månedligt — baseret på danske realkreditregler.</p>
  <div class="bolig-inputs">
    <div class="bolig-input-group">
      <label class="bolig-label">Månedlig bruttoindkomst
        <span class="bolig-value-display" id="bolig-income-display">${s.income.toLocaleString('da-DK')} kr./mdr.</span>
      </label>
      <input type="range" id="bolig-income" class="slider" min="20000" max="100000" step="1000" value="${s.income}">
      <div class="slider-range-labels"><span>20.000</span><span>100.000 kr.</span></div>
    </div>
    <div class="bolig-input-group">
      <label class="bolig-label">Opsparing (udbetaling)
        <span class="bolig-value-display" id="bolig-savings-display">${s.savings.toLocaleString('da-DK')} kr.</span>
      </label>
      <input type="range" id="bolig-savings" class="slider" min="0" max="2000000" step="10000" value="${s.savings}">
      <div class="slider-range-labels"><span>0</span><span>2.000.000 kr.</span></div>
    </div>
    <div class="bolig-input-group">
      <label class="bolig-label">By / område</label>
      <select id="bolig-city" class="bolig-city-select">${cityOptions}</select>
    </div>
  </div>

  <div class="bolig-results" id="bolig-results">
    ${VG.bolig._renderResults(results, s, cityData)}
  </div>

  <div class="bolig-comparison">
    <h3>Leje vs. købe — månedlig sammenligning</h3>
    ${VG.bolig._renderComparison(results, cityData)}
  </div>

  <p class="bolig-disclaimer">Beregninger er vejledende. Bankens kreditvurdering kan afvige. Boligpriserne er gennemsnit for ejerlejligheder 2025/2026.<br>
  <strong>Ejendomsværdiskat:</strong> 0,51% af ejendomsværdien op til 9,2 mio. kr., 1,4% af det overskydende.</p>
</div>`;

  VG.bolig._bindEvents(panel);
};

VG.bolig._calculate = function(income, savings, cityData) {
  const monthlyGross = income;
  const annualGross  = monthlyGross * 12;

  // Max loan: 4x annual income (Danish mortgage rule)
  const maxLoan = annualGross * INCOME_MULTIPLIER;

  // Max property price from loan + savings
  const maxPropertyFromLoan = maxLoan + savings;

  // Typical apartment price in city
  const typicalPrice = cityData.priceM2 * DEFAULT_SIZE_M2;

  // How many years to save for 5% down payment
  const requiredDownPayment = typicalPrice * DOWN_PAYMENT_PCT;
  const monthlySavingRate   = Math.max(0, monthlyGross * 0.15); // assume 15% savings rate
  let yearsToSave = 0;
  if (savings < requiredDownPayment && monthlySavingRate > 0) {
    yearsToSave = Math.ceil((requiredDownPayment - savings) / (monthlySavingRate * 12));
  }

  // Monthly mortgage payment (annuity formula)
  const r = MORTGAGE_RATE / 12;
  const n = MORTGAGE_YEARS * 12;
  const principalLoan = maxLoan;
  const monthlyPayment = principalLoan > 0
    ? (principalLoan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
    : 0;

  // Ejendomsværdiskat (annual)
  let ejendomsskat = 0;
  if (typicalPrice <= THRESHOLD_9_2M) {
    ejendomsskat = typicalPrice * EJENDOMSSKAT_LOW;
  } else {
    ejendomsskat = THRESHOLD_9_2M * EJENDOMSSKAT_LOW + (typicalPrice - THRESHOLD_9_2M) * EJENDOMSSKAT_HIGH;
  }
  const monthlyEjendomsskat = ejendomsskat / 12;

  // Total monthly cost of ownership
  const monthlyOwnership = monthlyPayment + monthlyEjendomsskat;

  // Rental cost comparison
  const monthlyRent = cityData.rentM2 * DEFAULT_SIZE_M2;

  // Can you afford it?
  const canAfford = savings >= requiredDownPayment && maxLoan >= (typicalPrice - savings);
  const affordableM2 = maxPropertyFromLoan / cityData.priceM2;

  return {
    typicalPrice,
    maxLoan,
    maxPropertyFromLoan,
    requiredDownPayment,
    yearsToSave,
    monthlyPayment,
    monthlyEjendomsskat,
    monthlyOwnership,
    monthlyRent,
    canAfford,
    affordableM2,
    priceM2: cityData.priceM2,
  };
};

VG.bolig._renderResults = function(r, s, cityData) {
  const fmt = n => Math.round(n).toLocaleString('da-DK');
  const canStr = r.canAfford
    ? '<span style="color:var(--neg)">✓ Ja, med nuværende opsparing</span>'
    : `<span style="color:var(--warn)">Mangler ${fmt(r.requiredDownPayment - s.savings)} kr. i udbetaling</span>`;

  return `<div class="bolig-results-grid">
  <div class="bolig-result-card">
    <div class="bolig-result-label">Typisk pris (${DEFAULT_SIZE_M2} m², ${cityData.label})</div>
    <div class="bolig-result-value">${fmt(r.typicalPrice)} kr.</div>
    <div class="bolig-result-sub">${fmt(r.priceM2)} kr./m²</div>
  </div>
  <div class="bolig-result-card">
    <div class="bolig-result-label">Maks lånbeløb (4× årsindkomst)</div>
    <div class="bolig-result-value">${fmt(r.maxLoan)} kr.</div>
    <div class="bolig-result-sub">+ ${fmt(s.savings)} kr. i opsparing = ${fmt(r.maxPropertyFromLoan)} kr. i alt</div>
  </div>
  <div class="bolig-result-card ${r.canAfford ? 'result-ok' : 'result-warn'}">
    <div class="bolig-result-label">Klar til at købe?</div>
    <div class="bolig-result-value">${canStr}</div>
    <div class="bolig-result-sub">Krævet udbetaling: ${fmt(r.requiredDownPayment)} kr. (5%)</div>
  </div>
  <div class="bolig-result-card">
    <div class="bolig-result-label">År til at spare op (ved 15% opsparing)</div>
    <div class="bolig-result-value">${r.yearsToSave <= 0 ? '0 år ✓' : r.yearsToSave + ' år'}</div>
    <div class="bolig-result-sub">Sparer ca. ${fmt(s.income * 0.15)} kr./mdr.</div>
  </div>
  <div class="bolig-result-card">
    <div class="bolig-result-label">Månedlig ydelse (${MORTGAGE_YEARS} år, ${(MORTGAGE_RATE*100).toFixed(1)}%)</div>
    <div class="bolig-result-value">${fmt(r.monthlyPayment)} kr./mdr.</div>
    <div class="bolig-result-sub">Renter + afdrag på ${fmt(r.maxLoan)} kr.</div>
  </div>
  <div class="bolig-result-card">
    <div class="bolig-result-label">Samlet månedlig ejeromkostning</div>
    <div class="bolig-result-value">${fmt(r.monthlyOwnership)} kr./mdr.</div>
    <div class="bolig-result-sub">Inkl. ejendomsværdiskat (${fmt(r.monthlyEjendomsskat)} kr./mdr.)</div>
  </div>
</div>`;
};

VG.bolig._renderComparison = function(r, cityData) {
  const fmt = n => Math.round(n).toLocaleString('da-DK');
  const diff = r.monthlyOwnership - r.monthlyRent;
  const diffColor = diff > 0 ? 'var(--pos)' : 'var(--neg)';
  const diffText = diff > 0
    ? `Køb er ${fmt(diff)} kr./mdr. dyrere end leje`
    : `Køb er ${fmt(Math.abs(diff))} kr./mdr. billigere end leje`;

  return `<table class="bolig-compare-table">
  <thead><tr><th></th><th>Leje</th><th>Køb</th></tr></thead>
  <tbody>
    <tr><td>Månedlig betaling</td><td>${fmt(r.monthlyRent)} kr.</td><td>${fmt(r.monthlyOwnership)} kr.</td></tr>
    <tr><td>Udbetaling/indskud</td><td>3 mdrs. leje ≈ ${fmt(r.monthlyRent * 3)} kr.</td><td>${fmt(r.requiredDownPayment)} kr. (5%)</td></tr>
    <tr><td>Opbygger formue?</td><td>Nej</td><td>Ja (via afdrag)</td></tr>
    <tr><td>Fleksibilitet</td><td>Høj</td><td>Lav (bindingsperiode)</td></tr>
  </tbody>
</table>
<p class="bolig-compare-note" style="color:${diffColor}">${diffText}. Lejepriser er estimeret (${fmt(cityData.rentM2)} kr./m²).</p>`;
};

VG.bolig._bindEvents = function(panel) {
  if (panel._vgBound) return;
  panel._vgBound = true;

  panel.addEventListener('input', e => {
    if (e.target.id === 'bolig-income') {
      VG.bolig._state.income = parseInt(e.target.value);
      document.getElementById('bolig-income-display').textContent =
        VG.bolig._state.income.toLocaleString('da-DK') + ' kr./mdr.';
      VG.bolig._refreshResults(panel);
    } else if (e.target.id === 'bolig-savings') {
      VG.bolig._state.savings = parseInt(e.target.value);
      document.getElementById('bolig-savings-display').textContent =
        VG.bolig._state.savings.toLocaleString('da-DK') + ' kr.';
      VG.bolig._refreshResults(panel);
    }
  });

  panel.addEventListener('change', e => {
    if (e.target.id === 'bolig-city') {
      VG.bolig._state.city = e.target.value;
      VG.bolig._refreshResults(panel);
    }
  });
};

VG.bolig._refreshResults = function(panel) {
  const s = VG.bolig._state;
  const cityData = VG.bolig.CITY_PRICES[s.city] || VG.bolig.CITY_PRICES['Hele landet'];
  const results = VG.bolig._calculate(s.income, s.savings, cityData);

  const resultsEl = document.getElementById('bolig-results');
  if (resultsEl) {
    resultsEl.innerHTML = VG.bolig._renderResults(results, s, cityData);
    const cmpEl = panel.querySelector('.bolig-comparison');
    if (cmpEl) {
      cmpEl.innerHTML = '<h3>Leje vs. købe — månedlig sammenligning</h3>' + VG.bolig._renderComparison(results, cityData);
    }
  }
};
