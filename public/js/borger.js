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

VG.borger.calcTax = function(monthly) {
  const yearly  = monthly * 12;
  const am      = yearly * 0.08;
  const afterAM = yearly - am;
  const allowance = 52400;
  const taxable = Math.max(0, afterAM - allowance);
  const bund    = taxable * 0.1201;
  const kommune = taxable * 0.251;
  const top     = Math.max(0, afterAM - 589100) * 0.075;
  const kirke   = taxable * 0.007;
  const total   = am + bund + kommune + top + kirke;
  return {
    yearly, am, bund, kommune, top, kirke,
    total, net: yearly - total,
    rate: yearly > 0 ? total / yearly * 100 : 0
  };
};

VG.borger.fmtKr = function(n) {
  return Math.round(n).toLocaleString('da-DK') + ' kr';
};

VG.borger.updateCalc = function(monthly) {
  const t = VG.borger.calcTax(monthly);
  const res = document.getElementById('tax-results');
  if (!res) return;

  const rows = [
    { name: 'AM-bidrag (8%)',           val: t.am },
    { name: 'Bundskat (12%)',           val: t.bund },
    { name: 'Kommuneskat (25,1%)',      val: t.kommune },
    { name: 'Topskat (7,5% over grænse)', val: t.top },
    { name: 'Kirkeskat (0,7%)',         val: t.kirke }
  ];

  const maxVal = Math.max(...rows.map(r => r.val), 1);

  const spending = [
    { label: 'Sociale ydelser & pension', pct: 30 },
    { label: 'Sundhed',                   pct: 18 },
    { label: 'Uddannelse & forskning',    pct: 18 },
    { label: 'Forsvar & sikkerhed',       pct: 8  },
    { label: 'Transport & infrastruktur', pct: 4  },
    { label: 'Administration & IT',       pct: 6  },
    { label: 'Klima & miljø',             pct: 3  },
    { label: 'Anden offentlig service',   pct: 13 }
  ];

  let breakdownHTML = '<div class="tax-breakdown">';
  rows.forEach(r => {
    const barPct = maxVal > 0 ? (r.val / maxVal * 100) : 0;
    breakdownHTML += `<div class="tax-row">
      <span class="tax-name">${r.name}</span>
      <div class="tax-bar-track"><div class="tax-bar-fill" style="width:${barPct.toFixed(1)}%"></div></div>
      <span class="tax-amount">${VG.borger.fmtKr(r.val / 12)}/md</span>
    </div>`;
  });
  breakdownHTML += '</div>';

  breakdownHTML += `<div class="tax-net-row">
    <span style="font-weight:600">Udbetalt månedligt (netto)</span>
    <span style="font-size:18px;font-weight:700;color:var(--neg)">${VG.borger.fmtKr(t.net / 12)}</span>
  </div>
  <div style="font-size:12px;color:var(--text-2);margin-top:4px">
    Samlet skatteprocent: <strong>${t.rate.toFixed(1)}%</strong> ·
    Skat/år: <strong>${VG.borger.fmtKr(t.total)}</strong>
  </div>`;

  // Where taxes go
  breakdownHTML += `<h4 style="margin-top:18px;margin-bottom:8px;font-size:13px">Dine skattekroner bruges til…</h4>`;
  breakdownHTML += '<div class="tax-where-grid">';
  spending.forEach(s => {
    const amount = t.total * s.pct / 100 / 12;
    breakdownHTML += `<div class="tax-where-item">
      <div class="tax-where-num">${s.pct}%</div>
      <div style="font-size:11px;color:var(--text-2);margin-top:2px">${s.label}</div>
      <div style="font-size:10px;color:var(--text-3);margin-top:2px">${VG.borger.fmtKr(amount)}/md</div>
    </div>`;
  });
  breakdownHTML += '</div>';

  res.innerHTML = breakdownHTML;
};

VG.borger.bindCalc = function() {
  const slider = document.getElementById('tax-salary-slider');
  const valEl  = document.getElementById('tax-salary-val');
  if (!slider) return;

  const update = () => {
    const v = parseInt(slider.value, 10);
    if (valEl) valEl.textContent = v.toLocaleString('da-DK') + ' kr/md';
    VG.borger.updateCalc(v);
  };

  slider.addEventListener('input', update);
  update(); // Initial render
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
<div style="margin-top:24px">
  <h3 style="font-size:16px;margin-bottom:4px">💰 Skatteberegner</h3>
  <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">Beregn din personlige skat og se, hvad dine skattekroner bruges til.</p>
  <div class="tax-calc-wrap">
    <div class="tax-salary-row">
      <label for="tax-salary-slider" class="tax-salary-label">Månedsløn (brutto):</label>
      <input type="range" id="tax-salary-slider" min="0" max="100000" step="1000" value="45000"
        style="flex:1;min-width:120px;max-width:300px;accent-color:var(--accent)">
      <span class="tax-salary-val" id="tax-salary-val">45.000 kr/md</span>
    </div>
    <div id="tax-results"></div>
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
