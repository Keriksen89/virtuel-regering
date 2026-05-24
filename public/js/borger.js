/* ── VG.borger ───────────────────────────────────────────────────────────── */
VG.borger = {};

VG.borger.init = function() {
  // Static content — nothing async needed at init time
};

VG.borger.renderPanel = function() {
  const panel = document.getElementById('panel-borger');
  if (!panel) return;
  panel.innerHTML = VG.borger.buildHTML();
  VG.borger.bindCalc();
};

// ── 2026 Danish tax rates ────────────────────────────────────────────────
// Sources: SKAT.dk, Finansministeriet 2026
VG.borger.TAX_RATES_2026 = {
  am:             0.08,       // Arbejdsmarkedsbidrag
  personfradrag:  55600,      // Personfradrag (annual)
  beskPct:        0.1065,     // Beskæftigelsesfradrag %
  beskMax:        44800,      // Beskæftigelsesfradrag max DKK
  jobPct:         0.045,      // Jobfradrag % (above threshold)
  jobThreshold:   187500,     // Jobfradrag income threshold
  jobMax:         2500,       // Jobfradrag max DKK
  bund:           0.1201,     // Bundskat
  topRate:        0.15,       // Topskat
  topThreshold:   611500,     // Topskat threshold (personal income after AM)
  skatteloft:     0.5207,     // Max combined bund+kommune+top rate
  fagMax:         6000,       // Max fagforeningsfradrag
};

VG.borger.calcTax = function(monthly, opts = {}) {
  const R = VG.borger.TAX_RATES_2026;
  const {
    kommuneSkat  = 25.1,   // %
    kirkeSkat    = 0.7,    // %
    hasChurch    = true,
    pensionPct   = 0,      // % of gross going to pension (reduces income tax)
    fagforening  = 0,      // DKK/year union fees
    renteudgifter = 0,     // DKK/year mortgage/loan interest
    befordring   = 0       // DKK/year commuting deduction
  } = opts;

  const yearly         = monthly * 12;
  const am             = yearly * R.am;
  const personalIncome = yearly - am;           // personlig indkomst

  // Pension contribution (before-tax, reduces personal income)
  const pension = Math.min(yearly * (pensionPct / 100), yearly);

  // Beskæftigelsesfradrag: 10.65% of personal income, max 44,800
  const beskFradrag = Math.min(personalIncome * R.beskPct, R.beskMax);

  // Jobfradrag: 4.5% of (personalIncome − 187,500), max 2,500
  const jobFradrag = personalIncome > R.jobThreshold
    ? Math.min((personalIncome - R.jobThreshold) * R.jobPct, R.jobMax)
    : 0;

  // Other deductions (capped)
  const fagFradrag    = Math.min(fagforening, R.fagMax);
  const renteFradrag  = renteudgifter; // full deduction at lower rate — credit applied later
  const befordFradrag = befordring;

  // Taxable income for bund/kommune/kirke/topskat-base
  const taxableBase = Math.max(0,
    personalIncome
    - R.personfradrag
    - beskFradrag
    - jobFradrag
    - pension
    - fagFradrag
    - befordFradrag
  );

  // Bund + kommune + kirke
  const bund    = taxableBase * R.bund;
  const kommune = taxableBase * (kommuneSkat / 100);
  const kirke   = hasChurch ? taxableBase * (kirkeSkat / 100) : 0;

  // Topskat: 15% of personal income (after AM) above threshold
  // Applied on personalIncome - pension - personfradrag vs threshold
  const topBase = Math.max(0, personalIncome - pension - R.personfradrag - R.topThreshold);
  // Note: in practice SKAT uses gross personal income vs threshold directly
  const topBaseSimple = Math.max(0, personalIncome - pension - R.topThreshold);
  const top = topBaseSimple * R.topRate;

  // Skatteloft: if bund+kommune+top rate > 52.07%, reduce bundskat
  const combinedRate = R.bund + (kommuneSkat / 100) + (hasChurch ? kirkeSkat / 100 : 0) + R.topRate;
  const skatteloftActive = (topBaseSimple > 0) && (combinedRate > R.skatteloft);
  // (Simplified: we note it but don't auto-adjust since kommuneskat varies)

  // Rentefradrag credit: ~33% of interest expenses (ligningsmæssigt fradrag)
  const renteKredit = renteFradrag * 0.33;

  const totalTax = Math.max(0, am + bund + kommune + top + kirke - renteKredit);
  const netYearly = yearly - totalTax;

  // Effective rate
  const effectiveRate = yearly > 0 ? (totalTax / yearly * 100) : 0;

  // Marginal rate on next earned DKK (gross)
  const kRate = kommuneSkat / 100 + (hasChurch ? kirkeSkat / 100 : 0);
  const inTopBracket = (personalIncome - pension) > R.topThreshold;
  const marginalLocal = inTopBracket
    ? Math.min(R.bund + kRate + R.topRate, R.skatteloft) // skatteloft applies
    : R.bund + kRate;
  // Marginal on gross: 8% AM, then (1-0.08) × marginalLocal on personal income
  // Beskæftigelsesfradrag phases out at beskMax so marginal savings end there
  const marginalRate = (R.am + (1 - R.am) * marginalLocal) * 100;

  return {
    yearly, monthly, am, personalIncome, pension,
    personfradrag: R.personfradrag,
    beskFradrag, jobFradrag, fagFradrag, befordFradrag,
    taxableBase, bund, kommune, top, kirke,
    renteKredit, totalTax, netYearly,
    netMonthly: netYearly / 12,
    effectiveRate, marginalRate,
    inTopBracket,
    skatteloftActive
  };
};

VG.borger.fmtKr = function(n) {
  return Math.round(n).toLocaleString('da-DK') + ' kr';
};

VG.borger._calcOpts = {
  kommuneSkat: 25.1, kirkeSkat: 0.7, hasChurch: true,
  pensionPct: 0, fagforening: 0, renteudgifter: 0, befordring: 0
};

VG.borger.updateCalc = function(monthly) {
  const opts = VG.borger._calcOpts;
  const t = VG.borger.calcTax(monthly, opts);
  const res = document.getElementById('tax-results');
  if (!res) return;

  const fmtM = n => VG.borger.fmtKr(n / 12);
  const fmtY = n => VG.borger.fmtKr(n);

  // Waterfall: gross → deductions → taxes → net
  const waterfallSteps = [
    { label: 'Bruttoløn',                      val: t.yearly,     type: 'gross' },
    { label: 'AM-bidrag (8%)',                 val: -t.am,        type: 'tax'   },
    { label: 'Personlig indkomst',             val: t.personalIncome, type: 'subtotal' },
    { label: `Personfradrag`,                  val: -t.personfradrag, type: 'deduct' },
    { label: `Beskæftigelsesfradrag (${(t.beskFradrag/t.personalIncome*100).toFixed(1)}%)`, val: -t.beskFradrag, type: 'deduct' },
    t.jobFradrag   > 0 ? { label: 'Jobfradrag',      val: -t.jobFradrag,   type: 'deduct' } : null,
    t.pension      > 0 ? { label: 'Pensionsbidrag',  val: -t.pension,      type: 'deduct' } : null,
    t.fagFradrag   > 0 ? { label: 'Fagforeningsfradrag', val: -t.fagFradrag, type: 'deduct' } : null,
    t.befordFradrag> 0 ? { label: 'Befordringsfradrag', val: -t.befordFradrag, type: 'deduct' } : null,
    { label: 'Skattepligtig indkomst',         val: t.taxableBase, type: 'subtotal' },
  ].filter(Boolean);

  const taxRows = [
    { name: 'AM-bidrag (8%)',                    val: t.am,      pct: 8.0 },
    { name: `Bundskat (${(R => R.bund * 100)(VG.borger.TAX_RATES_2026).toFixed(2)}%)`, val: t.bund, pct: VG.borger.TAX_RATES_2026.bund * 100 },
    { name: `Kommuneskat (${opts.kommuneSkat}%)`, val: t.kommune, pct: opts.kommuneSkat },
    t.top  > 0 ? { name: 'Topskat (15%)',        val: t.top,     pct: 15 } : null,
    opts.hasChurch ? { name: `Kirkeskat (${opts.kirkeSkat}%)`, val: t.kirke, pct: opts.kirkeSkat } : null,
    t.renteKredit > 0 ? { name: 'Rentefradrag (kredit)', val: -t.renteKredit, pct: null } : null,
  ].filter(Boolean);

  const maxTaxVal = Math.max(...taxRows.map(r => Math.abs(r.val)), 1);

  const spending = [
    { label: 'Sociale ydelser & pension', pct: 30, icon: '👴' },
    { label: 'Sundhed',                   pct: 17, icon: '🏥' },
    { label: 'Uddannelse & forskning',    pct: 15, icon: '📚' },
    { label: 'Forsvar & politi',          pct: 9,  icon: '🛡' },
    { label: 'Kommuner (service)',        pct: 10, icon: '🏘' },
    { label: 'Transport & infra',         pct: 4,  icon: '🚂' },
    { label: 'Klima & miljø',             pct: 3,  icon: '🌱' },
    { label: 'Administration',            pct: 6,  icon: '🏛' },
    { label: 'Øvrig stat',               pct: 6,  icon: '📋' },
  ];

  // Summary hero
  let html = `
  <div class="tax-summary-hero">
    <div class="tax-hero-item">
      <div class="tax-hero-val">${fmtM(t.netYearly)}<span class="tax-hero-unit">/md</span></div>
      <div class="tax-hero-label">Udbetalt netto</div>
    </div>
    <div class="tax-hero-item">
      <div class="tax-hero-val">${t.effectiveRate.toFixed(1)}<span class="tax-hero-unit">%</span></div>
      <div class="tax-hero-label">Effektiv skatteprocent</div>
    </div>
    <div class="tax-hero-item ${t.inTopBracket ? 'tax-hero-warn' : ''}">
      <div class="tax-hero-val">${t.marginalRate.toFixed(1)}<span class="tax-hero-unit">%</span></div>
      <div class="tax-hero-label">Marginalskat${t.inTopBracket ? ' ⚠ topskat' : ''}</div>
    </div>
    <div class="tax-hero-item">
      <div class="tax-hero-val">${fmtM(t.totalTax)}<span class="tax-hero-unit">/md</span></div>
      <div class="tax-hero-label">Samlet skat/år: ${fmtY(t.totalTax)}</div>
    </div>
  </div>`;

  // Deduction summary
  const totalDeductions = t.beskFradrag + t.jobFradrag + t.personfradrag + t.pension + t.fagFradrag + t.befordFradrag;
  html += `
  <div class="tax-deduct-summary">
    <span>Fradrag i alt: <strong>${fmtY(totalDeductions)}</strong></span>
    <span style="color:var(--text-3)">· sparer dig ca. <strong style="color:var(--neg)">${fmtY(totalDeductions * (opts.kommuneSkat + 12.01 + (opts.hasChurch ? opts.kirkeSkat : 0)) / 100)}</strong> i skat</span>
  </div>`;

  // Tax breakdown bars
  html += '<div class="tax-breakdown">';
  taxRows.forEach(r => {
    const barPct = Math.abs(r.val) / maxTaxVal * 100;
    const isCredit = r.val < 0;
    html += `<div class="tax-row">
      <span class="tax-name">${r.name}</span>
      <div class="tax-bar-track"><div class="tax-bar-fill${isCredit ? ' tax-bar-credit' : ''}" style="width:${barPct.toFixed(1)}%"></div></div>
      <span class="tax-amount${isCredit ? ' tax-credit' : ''}">${isCredit ? '−' : ''}${fmtM(Math.abs(r.val))}/md</span>
    </div>`;
  });
  html += '</div>';

  // Marginal tax explanation
  if (t.inTopBracket) {
    html += `<div class="tax-marginal-note tax-marginal-top">
      ⚠ <strong>Du er i topskattebraketten.</strong> Af den næste tjente krone går ${t.marginalRate.toFixed(0)} øre i skat.
      Det svarer til en marginalskat på ${t.marginalRate.toFixed(1)}% (AM 8% + bundskat 12% + kommuneskat ${opts.kommuneSkat}% + topskat 15%).
    </div>`;
  } else {
    const toTop = ((VG.borger.TAX_RATES_2026.topThreshold + t.am) / 12 - monthly);
    if (toTop > 0 && toTop < 50000) {
      html += `<div class="tax-marginal-note">
        Du er <strong>${VG.borger.fmtKr(toTop)}/md</strong> fra topskattegrænsen (${VG.borger.fmtKr(VG.borger.TAX_RATES_2026.topThreshold / 12)}/md i personlig indkomst).
      </div>`;
    }
  }

  // Where taxes go
  html += `<h4 class="tax-where-heading">Dine ${fmtY(t.totalTax)} i skat bruges til…</h4>`;
  html += '<div class="tax-where-grid">';
  spending.forEach(s => {
    const amount = t.totalTax * s.pct / 100;
    html += `<div class="tax-where-item">
      <div class="tax-where-icon">${s.icon}</div>
      <div class="tax-where-num">${s.pct}%</div>
      <div class="tax-where-label">${s.label}</div>
      <div class="tax-where-amt">${VG.borger.fmtKr(amount / 12)}/md</div>
    </div>`;
  });
  html += '</div>';

  // International comparison
  const intl = [
    { country: 'Sverige',    rate: 45.2 },
    { country: 'Norge',      rate: 39.8 },
    { country: 'Finland',    rate: 42.7 },
    { country: 'Danmark',    rate: t.effectiveRate, isUser: true },
    { country: 'Tyskland',   rate: 37.4 },
    { country: 'Frankrig',   rate: 38.1 },
    { country: 'EU-gns',     rate: 34.5 },
    { country: 'USA',        rate: 28.3 },
  ].sort((a, b) => b.rate - a.rate);
  const maxIntl = Math.max(...intl.map(r => r.rate));

  html += `<h4 class="tax-where-heading" style="margin-top:20px">Sammenligning med andre lande (effektiv skatteprocent)</h4>`;
  html += '<div class="tax-intl">';
  intl.forEach(r => {
    html += `<div class="tax-intl-row${r.isUser ? ' tax-intl-user' : ''}">
      <span class="tax-intl-country">${r.country}</span>
      <div class="tax-intl-track"><div class="tax-intl-fill" style="width:${(r.rate/maxIntl*100).toFixed(1)}%"></div></div>
      <span class="tax-intl-pct">${r.rate.toFixed(1)}%</span>
    </div>`;
  });
  html += '</div><p style="font-size:10px;color:var(--text-3);margin-top:6px">Kilde: OECD Taxing Wages 2024 · Sammenligning ved ca. gennemsnitlig indkomst</p>';

  res.innerHTML = html;
};

VG.borger.bindCalc = function() {
  const slider = document.getElementById('tax-salary-slider');
  const valEl  = document.getElementById('tax-salary-val');
  if (!slider || slider._vgBound) return;
  slider._vgBound = true;

  const getMonthly = () => parseInt(slider.value, 10);

  const syncOpts = () => {
    const kommuneEl  = document.getElementById('tax-kommune-slider');
    const pensionEl  = document.getElementById('tax-pension-slider');
    const fagEl      = document.getElementById('tax-fag-input');
    const renteEl    = document.getElementById('tax-rente-input');
    const kircheEl   = document.getElementById('tax-kirche-check');
    VG.borger._calcOpts = {
      kommuneSkat:   kommuneEl  ? parseFloat(kommuneEl.value)  : 25.1,
      kirkeSkat:     0.7,
      hasChurch:     kircheEl   ? kircheEl.checked              : true,
      pensionPct:    pensionEl  ? parseFloat(pensionEl.value)   : 0,
      fagforening:   fagEl      ? parseInt(fagEl.value) || 0    : 0,
      renteudgifter: renteEl    ? parseInt(renteEl.value) || 0  : 0,
      befordring:    0
    };
  };

  const update = () => {
    const v = getMonthly();
    if (valEl) valEl.textContent = v.toLocaleString('da-DK') + ' kr/md';
    syncOpts();
    VG.borger.updateCalc(v);
    // Sync sub-labels
    const kv = document.getElementById('tax-kommune-val');
    const pv = document.getElementById('tax-pension-val');
    const kommuneEl = document.getElementById('tax-kommune-slider');
    const pensionEl = document.getElementById('tax-pension-slider');
    if (kv && kommuneEl) kv.textContent = parseFloat(kommuneEl.value).toFixed(1) + '%';
    if (pv && pensionEl) pv.textContent = parseFloat(pensionEl.value).toFixed(0) + '%';
  };

  slider.addEventListener('input', update);

  // Wire sub-controls via delegation on the calc wrap
  const wrap = document.querySelector('.tax-calc-wrap');
  if (wrap && !wrap._vgBound) {
    wrap._vgBound = true;
    wrap.addEventListener('input', update);
    wrap.addEventListener('change', update);
  }

  update();
};

VG.borger.buildBorgerforslagHTML = function() {
  const proposals = VG.state.live.borgerforslag || [];

  if (!proposals.length) {
    return `<div class="card" style="margin-bottom:12px">
  <h2>Aktive borgerforslag</h2>
  <p class="intro">Forslag der samler 50.000 underskrifter inden for 180 dage behandles af Folketing-udvalget. Kilde: borgerforslag.dk</p>
  <div class="loading">Henter aktive forslag…</div>
</div>`;
  }

  const cards = proposals.slice(0, 10).map(p => {
    const pct     = Math.min(100, (p.signatures / p.required) * 100);
    const sigFmt  = p.signatures.toLocaleString('da-DK');
    const reqFmt  = p.required.toLocaleString('da-DK');
    const urgency = p.daysLeft != null && p.daysLeft <= 14 ? 'bf-urgent' : '';
    const daysStr = p.daysLeft != null
      ? (p.daysLeft === 0 ? 'Udløber i dag' : `${p.daysLeft} dage tilbage`)
      : '';

    return `<div class="bf-card ${urgency}">
  <div class="bf-top">
    <div class="bf-title">${p.title}</div>
    <div class="bf-sigs">${sigFmt} <span>/ ${reqFmt}</span></div>
  </div>
  <div class="bf-bar-track"><div class="bf-bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
  <div class="bf-foot">
    <span class="bf-pct">${pct.toFixed(0)}% nået</span>
    ${daysStr ? `<span class="bf-days ${p.daysLeft != null && p.daysLeft <= 14 ? 'bf-days--urgent' : ''}">${daysStr}</span>` : ''}
    <a class="bf-link" href="${p.url}" target="_blank" rel="noopener">Skriv under ↗</a>
  </div>
</div>`;
  }).join('');

  return `<div class="card" style="margin-bottom:12px">
  <h2>Aktive borgerforslag — ${proposals.length} åbne</h2>
  <p class="intro">Forslag der samler 50.000 underskrifter inden for 180 dage behandles af Folketing-udvalget. Kilde: borgerforslag.dk</p>
  <div class="bf-list">${cards}</div>
</div>`;
};

VG.borger.buildHTML = function() {
  const civicCards = [
    {
      icon: '🗳',
      title: 'Folketing-valget',
      text: 'Folkevalget foregår med forholdstalsvalg (d\'Hondt-metoden) i 10 storkredse og 2 landsdele. En spærregrænse på 2% sikrer, at kun de bredest støttede partier kommer i Folketing. Der er 179 mandater i alt.',
      link: null
    },
    {
      icon: '📝',
      title: 'Tilmelding til valglisten',
      text: 'Danske statsborgere der er fyldt 18 år og har fast bopæl i Danmark er automatisk optaget på valglisten. Du modtager valgkort med post til din folkeregisteradresse.',
      link: null
    },
    {
      icon: '🏛',
      title: 'Næste valg',
      text: 'Det seneste Folketing-valg blev afholdt 1. november 2022. Valgperioden er normalt 4 år, men statsministeren kan udskrive valg til enhver tid. Senest mulige valgdag: 2. november 2026.',
      link: null
    },
    {
      icon: '✍️',
      title: 'Borgerforslag.dk',
      text: 'Du kan stille et borgerforslag på borgerforslag.dk. Samler forslaget 50.000 underskrifter inden for 180 dage, behandler Folketing-udvalget det. Enhver med valgret kan skrive under.',
      link: 'https://www.borgerforslag.dk'
    },
    {
      icon: '📬',
      title: 'Kontakt dit MF',
      text: 'Alle 179 medlemmer af Folketinget (MF) er tilgængelige via ft.dk. Du kan finde din lokale repræsentant, skrive til dem, følge deres afstemninger og tale med dem til MF-møder i din kreds.',
      link: 'https://www.ft.dk/da/medlemmer'
    },
    {
      icon: '📋',
      title: 'Høringer',
      text: 'Når der foreslås nye love, sendes de i offentlig høring. Du, organisationer og virksomheder kan afgive høringssvar. Find aktuelle høringer på høringsportalen.',
      link: 'https://www.høringsportalen.dk'
    }
  ];

  const stepsHTML = `<ul class="steps-list">
    <li><span class="step-num-sm">1</span><span>Partier opstiller kandidater i 10 storkredse</span></li>
    <li><span class="step-num-sm">2</span><span>Du stemmer på enten et parti eller en bestemt kandidat</span></li>
    <li><span class="step-num-sm">3</span><span>Mandater fordeles med d'Hondt-metoden i kredsene</span></li>
    <li><span class="step-num-sm">4</span><span>Tillægsmandater sikrer proportionalitet på landsplan</span></li>
    <li><span class="step-num-sm">5</span><span>Partier under 2%-spærregrænsen får ingen mandater</span></li>
  </ul>`;

  let cardsHTML = '<div class="civic-grid">';
  civicCards.forEach(c => {
    cardsHTML += `<div class="civic-card">
      <div class="civic-icon">${c.icon}</div>
      <div class="civic-title">${c.title}</div>
      <div class="civic-text">${c.text}</div>
      ${c.link ? `<a class="civic-link" href="${c.link}" target="_blank" rel="noopener">Læs mere →</a>` : ''}
    </div>`;
  });
  cardsHTML += '</div>';

  const taxCalcHTML = `
<div style="margin-top:24px" id="tax-calc-section">
  <h3 style="font-size:16px;margin-bottom:4px">💰 Skatteberegner 2026</h3>
  <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">Beregn din personlige skat med korrekte 2026-satser inkl. beskæftigelsesfradrag og topskat.</p>
  <div class="tax-calc-wrap">

    <div class="tax-inputs-grid">
      <div class="tax-input-group">
        <label class="tax-input-label">Månedsløn (brutto)</label>
        <div class="tax-slider-row">
          <input type="range" id="tax-salary-slider" min="15000" max="150000" step="1000" value="45000" style="accent-color:var(--accent)">
          <span class="tax-salary-val" id="tax-salary-val">45.000 kr/md</span>
        </div>
      </div>

      <div class="tax-input-group">
        <label class="tax-input-label">Kommuneskat <span id="tax-kommune-val">25,1%</span></label>
        <div class="tax-slider-row">
          <input type="range" id="tax-kommune-slider" min="22.0" max="28.5" step="0.1" value="25.1" style="accent-color:var(--accent)">
          <span style="font-size:11px;color:var(--text-3)">22% → 28,5%</span>
        </div>
      </div>

      <div class="tax-input-group">
        <label class="tax-input-label">Pensionsbidrag <span id="tax-pension-val">0%</span></label>
        <div class="tax-slider-row">
          <input type="range" id="tax-pension-slider" min="0" max="30" step="1" value="0" style="accent-color:var(--accent)">
          <span style="font-size:11px;color:var(--text-3)">0% → 30%</span>
        </div>
      </div>

      <div class="tax-input-group tax-input-row-extra">
        <div class="tax-extra-field">
          <label class="tax-input-label">Fagforening (kr/år)</label>
          <input type="number" id="tax-fag-input" min="0" max="6000" step="100" value="0" placeholder="0" class="tax-num-input">
        </div>
        <div class="tax-extra-field">
          <label class="tax-input-label">Renteudgifter (kr/år)</label>
          <input type="number" id="tax-rente-input" min="0" max="500000" step="1000" value="0" placeholder="0" class="tax-num-input">
        </div>
        <div class="tax-extra-field tax-check-field">
          <label class="tax-input-label">Kirkeskat</label>
          <label class="tax-toggle"><input type="checkbox" id="tax-kirche-check" checked> Medlem af folkekirken</label>
        </div>
      </div>
    </div>

    <div id="tax-results"></div>
    <p style="font-size:10px;color:var(--text-3);margin-top:12px">Satser: AM-bidrag 8% · Bundskat 12,01% · Topskat 15% (over 611.500 kr personlig indkomst) · Personfradrag 55.600 kr · Beskæftigelsesfradrag maks 44.800 kr. Beregning er vejledende — individuelle forhold kan variere. Kilde: SKAT.dk 2026.</p>
  </div>
</div>`;

  return `
${VG.borger.buildBorgerforslagHTML()}
<div class="card">
  <div class="election-banner">
    <h3>🇩🇰 Din stemme tæller</h3>
    <p>Næste Folketing-valg afholdes senest november 2026. Her er alt du skal vide om demokratiet og dine muligheder for at påvirke politik.</p>
  </div>

  <h3 style="font-size:15px;margin-bottom:8px">Sådan virker valget</h3>
  ${stepsHTML}

  <h3 style="font-size:15px;margin-top:20px;margin-bottom:8px">Demokratiske muligheder</h3>
  ${cardsHTML}

  ${taxCalcHTML}
</div>`;
};
