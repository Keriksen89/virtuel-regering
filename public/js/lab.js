VG.lab = {};

/* ── Policy proposals ────────────────────────────────────────────────── */
VG.lab.POLICIES = [
  { id: 'fri_transport',
    icon: '🚌', tag: 'Transport', label: 'Gratis kollektiv trafik',
    desc: 'Staten overtager billetindtægterne fra DSB, Movia, metro og regionale busser.',
    costBn: 6.2, link: 'dsb',
    apply: { type: 'expense', key: 'transport', delta: 6.2 },
    note: 'Baseret på DSB + Movia årsrapporter 2024 (netto efter eksisterende subsidier)' },

  { id: 'pension_65',
    icon: '👴', tag: 'Pension', label: 'Sænk pensionsalderen til 65 år',
    desc: 'Folkepensionsalderen sænkes fra 67 til 65 år — to ekstra årgange på pension.',
    costBn: 28, link: 'pension',
    apply: { type: 'policy', key: 'retireAge', newVal: 65 },
    note: 'Hvert år koster ~14 mia. kr. (pensionsudbetalinger). Kilde: DREAM 2023' },

  { id: 'fri_tandlaege',
    icon: '🦷', tag: 'Sundhed', label: 'Gratis tandlæge til alle',
    desc: 'Tandlægebehandling dækkes af det offentlige for alle borgere over 18 år.',
    costBn: 8.5, link: 'sundhed',
    apply: { type: 'expense', key: 'health', delta: 8.5 },
    note: 'Baseret på Sundhedsministeriet + Tandlægeforeningens tal 2024' },

  { id: 'forsvar_5pct',
    icon: '🛡️', tag: 'Forsvar', label: 'Forsvar op til 5% af BNP',
    desc: 'Forsvarsudgifter hæves til 5% af BNP — over NATOs mål og Europas topniveau.',
    costBn: 40.5, link: 'forsvar',
    apply: { type: 'policy', key: 'defGoal', newVal: 5.0 },
    note: 'Fra nuværende 3,5% til 5%. Hvert 0,1 pct.point = ~2,7 mia. kr.' },

  { id: 'fri_pasning',
    icon: '👶', tag: 'Familie', label: 'Gratis daginstitution 0–6 år',
    desc: 'Forældrenes egenbetaling til vuggestue og børnehave afskaffes.',
    costBn: 5.5, link: 'demographics',
    apply: { type: 'expense', key: 'childcare', delta: 5.5 },
    note: 'Baseret på kommunernes daginstitutionsbudgetter 2026' },

  { id: 'afskaf_topskat',
    icon: '💸', tag: 'Skat', label: 'Afskaf topskatten',
    desc: 'Topskatten (7,5%) på indkomster over 568.900 kr./år afskaffes helt.',
    costBn: 22, link: 'indkomst',
    apply: { type: 'policy', key: 'topTax', newVal: 0 },
    note: 'Hvert pct.point topskat = ~4 mia. (25% selvfinansiering). Kilde: FM 2022' },

  { id: 'klimafond',
    icon: '🌱', tag: 'Klima', label: 'Ny grøn klimafond (10 mia./år)',
    desc: 'Statslig fond til solceller, varmepumper, jernbane og grønt landbrug.',
    costBn: 10, link: 'co2',
    apply: { type: 'expense', key: 'climate', delta: 10 },
    note: 'Supplement til eksisterende klimainvesteringer. Kilde: Klimarådet 2024' },

  { id: 'psykiatri_loeft',
    icon: '🧠', tag: 'Sundhed', label: '10-årsplan for psykiatri (5 mia./år)',
    desc: 'Ekstra 5 mia. kr./år til psykiatrien for at nedbringe de lange ventetider.',
    costBn: 5, link: 'psykiatri',
    apply: { type: 'expense', key: 'health', delta: 5 },
    note: 'Baseret på Psykiatrikommissionens anbefalinger 2022' },

  { id: 'laererloeen',
    icon: '🏫', tag: 'Uddannelse', label: 'Løft lærerlønnen 10%',
    desc: 'Folkeskolens lærere og pædagoger får 10% lønforhøjelse for at tiltrække flere.',
    costBn: 4.2, link: 'folkeskolen',
    apply: { type: 'expense', key: 'education', delta: 4.2 },
    note: 'Ca. 70.000 lærere/pæd. á gennemsnitsløn 480.000 kr. × 10% + pension' },

  { id: 'hev_kontanthjaelp',
    icon: '🤝', tag: 'Velfærd', label: 'Hæv kontanthjælp til SU-niveau',
    desc: 'Kontanthjælpsloftet ophæves — alle modtagere sikres mindst SU-niveau.',
    costBn: 2.8, link: 'ledighed',
    apply: { type: 'expense', key: 'social', delta: 2.8 },
    note: 'Ca. 80.000 modtagere berøres. Kilde: Beskæftigelsesministeriet 2024' },
];

/* ── Financing options ───────────────────────────────────────────────── */
VG.lab.FINANCING = [
  { id: 'topskat_12',
    icon: '📊', tag: 'Skat', label: 'Hæv topskat til 12,5%',
    desc: 'Topskatten fordobles til 12,5% på indkomster over 568.900 kr.',
    saveBn: 15, apply: { type: 'policy', key: 'topTax', newVal: 12.5 },
    note: '+5 pct.point × 4 mia./pct. × 75% nettoeffekt' },

  { id: 'moms_2pct',
    icon: '🛒', tag: 'Skat', label: 'Hæv moms med 2%',
    desc: 'Momsen øges fra 25% til 27%. Bredt grundlag — lav adfærdseffekt.',
    saveBn: 21, apply: { type: 'policy', key: 'vatRate', newVal: 27 },
    note: 'Hvert pct.point ≈ 11,2 mia. kr. Kilde: DREAM/FM' },

  { id: 'selskabsskat_25',
    icon: '🏢', tag: 'Skat', label: 'Hæv selskabsskat til 25%',
    desc: 'Fra 22% til 25%. Over EU-minimum (15%) men under OECD-gennemsnit.',
    saveBn: 8.4, apply: { type: 'policy', key: 'corpTax', newVal: 25 },
    note: '+3 pct.point × 4,3 mia. × 65% (selvfinansieringsgrad 35%)' },

  { id: 'pension_68',
    icon: '⏳', tag: 'Pension', label: 'Hæv pensionsalderen til 68 år',
    desc: 'Folkepensionsalderen hæves ét år — sparer pensionsudbetalinger.',
    saveBn: 14, apply: { type: 'policy', key: 'retireAge', newVal: 68 },
    note: 'Hvert år hævet sparer ~14 mia. kr. Kilde: DREAM 2023' },

  { id: 'halveer_bistand',
    icon: '✈️', tag: 'Bistand', label: 'Halvér udviklingsbistand',
    desc: 'Bistanden sænkes fra 0,7% til 0,35% af BNI.',
    saveBn: 9.5, apply: { type: 'policy', key: 'devAid', newVal: 0.35 },
    note: '0,35% × 2.700 mia. BNP. Medfører tab af FN 0,7%-mål-status.' },

  { id: 'effektivisering',
    icon: '⚙️', tag: 'Admin', label: 'Effektivisering af statsadministration',
    desc: '5% besparelse på statens driftsudgifter via digitalisering og sammenlægning.',
    saveBn: 3, apply: { type: 'expense', key: 'admin', delta: -3 },
    note: 'Forsigtig opgørelse. Kilde: Produktivitetskommissionen' },

  { id: 'co2_1200',
    icon: '🌿', tag: 'Klima', label: 'Hæv CO₂-afgift til 1.200 kr./ton',
    desc: 'CO₂-afgiften øges fra 750 til 1.200 kr. pr. ton — accelererer grøn omstilling.',
    saveBn: 3.6, apply: { type: 'policy', key: 'co2Tax', newVal: 1200 },
    note: '+450 kr/ton × 0,008 mia./kr. Kilde: Klimarådet' },

  { id: 'formueskat',
    icon: '💎', tag: 'Skat', label: 'Ny formueskat (1% over 10 mio. kr.)',
    desc: 'Ny progressiv formueskat på 1% af formuer over 10 mio. kr.',
    saveBn: 8, apply: { type: 'revenue', key: 'income', delta: 8 },
    note: '~80.000 husstande berøres. Estimat Finansministeriet/CEPOS' },

  { id: 'topskat_20',
    icon: '📈', tag: 'Skat', label: 'Hæv topskat til 20%',
    desc: 'En markant hævet topskat — på niveau med Sverige og Norge.',
    saveBn: 25, apply: { type: 'policy', key: 'topTax', newVal: 20 },
    note: '+12,5 pct.point × 4 mia. × 75% nettoeffekt ≈ 37 → 25 mia. netto' },
];

/* ── State ───────────────────────────────────────────────────────────── */
VG.lab._active    = new Set();
VG.lab._financing = new Set();

VG.lab.costBn     = function() { return VG.lab.POLICIES.filter(p => VG.lab._active.has(p.id)).reduce((s,p) => s+p.costBn, 0); };
VG.lab.financedBn = function() { return VG.lab.FINANCING.filter(f => VG.lab._financing.has(f.id)).reduce((s,f) => s+f.saveBn, 0); };
VG.lab.gapBn      = function() { return VG.lab.costBn() - VG.lab.financedBn(); };

VG.lab.toggle = function(id) {
  VG.lab._active.has(id) ? VG.lab._active.delete(id) : VG.lab._active.add(id);
  VG.lab.renderPanel();
};
VG.lab.toggleFin = function(id) {
  VG.lab._financing.has(id) ? VG.lab._financing.delete(id) : VG.lab._financing.add(id);
  VG.lab.renderPanel();
};
VG.lab.reset = function() {
  VG.lab._active.clear();
  VG.lab._financing.clear();
  VG.lab.renderPanel();
};

VG.lab.applyToBudget = function() {
  if (!VG.state.current) return;
  VG.lab._active.forEach(id => {
    const p = VG.lab.POLICIES.find(x => x.id === id);
    if (!p) return;
    const a = p.apply;
    if (a.type === 'policy' && VG.state.current.policy[a.key]) {
      VG.state.current.policy[a.key].val = a.newVal;
    } else if (a.type === 'expense' && VG.state.current.expense[a.key]) {
      const cur = VG.state.manualAdj.expense[a.key] ?? VG.state.current.expense[a.key].val;
      VG.state.manualAdj.expense[a.key] = cur + a.delta;
    } else if (a.type === 'revenue' && VG.state.current.revenue[a.key]) {
      const cur = VG.state.manualAdj.revenue[a.key] ?? VG.state.current.revenue[a.key].val;
      VG.state.manualAdj.revenue[a.key] = cur + a.delta;
    }
  });
  VG.lab._financing.forEach(id => {
    const f = VG.lab.FINANCING.find(x => x.id === id);
    if (!f) return;
    const a = f.apply;
    if (a.type === 'policy' && VG.state.current.policy[a.key]) {
      VG.state.current.policy[a.key].val = a.newVal;
    } else if (a.type === 'expense' && VG.state.current.expense[a.key]) {
      const cur = VG.state.manualAdj.expense[a.key] ?? VG.state.current.expense[a.key].val;
      VG.state.manualAdj.expense[a.key] = cur + a.delta;
    } else if (a.type === 'revenue' && VG.state.current.revenue[a.key]) {
      const cur = VG.state.manualAdj.revenue[a.key] ?? VG.state.current.revenue[a.key].val;
      VG.state.manualAdj.revenue[a.key] = cur + a.delta;
    }
  });
  VG.applyPolicy();
  VG.render.summary();
  VG.toast('Ændringerne er overført til budgettet ✓');
  if (window.__switchGroup) window.__switchGroup('oekonomi');
};

/* ── Render ──────────────────────────────────────────────────────────── */
VG.lab.renderPanel = function() {
  const el = document.getElementById('panel-laboratorium');
  if (!el) return;

  const cost      = VG.lab.costBn();
  const financed  = VG.lab.financedBn();
  const gap       = VG.lab.gapBn();
  const hasActive = VG.lab._active.size > 0;
  const pct       = cost > 0 ? Math.min(100, (financed / cost) * 100) : 0;

  const fmtBn = n => Math.abs(n).toFixed(1).replace('.', ',') + ' mia. kr./år';
  const sign  = n => (n >= 0 ? '+' : '−') + fmtBn(n);

  const gapLabel = gap < -0.1 ? '✓ Overfinansieret' : gap < 0.1 ? '✓ Balanceret' : '⚠ Finansieringsgab';
  const gapClass = gap < -0.1 ? 'lab-balanced' : gap < 0.1 ? 'lab-balanced' : 'lab-deficit';

  const policyCards = VG.lab.POLICIES.map(p => {
    const active = VG.lab._active.has(p.id);
    return `<div class="lab-card${active ? ' lab-active' : ''}">
      <div class="lab-card-top">
        <span class="lab-icon">${p.icon}</span>
        <span class="lab-tag">${p.tag}</span>
      </div>
      <div class="lab-card-label">${p.label}</div>
      <div class="lab-card-desc">${p.desc}</div>
      <div class="lab-card-cost lab-cost-expense">+${fmtBn(p.costBn)}</div>
      <div class="lab-card-note">${p.note}</div>
      <div class="lab-card-btns">
        <button class="btn${active ? '' : ' primary'} lab-btn-sm" data-lab-toggle="${p.id}">
          ${active ? '✓ Aktiveret' : 'Aktiver'}
        </button>
        <button class="btn lab-btn-sm" data-lab-link="${p.link}">Se data →</button>
      </div>
    </div>`;
  }).join('');

  const showFinancing = hasActive && cost > 0;
  const finCards = showFinancing ? VG.lab.FINANCING.map(f => {
    const active = VG.lab._financing.has(f.id);
    return `<div class="lab-card lab-fin-card${active ? ' lab-active' : ''}">
      <div class="lab-card-top">
        <span class="lab-icon">${f.icon}</span>
        <span class="lab-tag">${f.tag}</span>
      </div>
      <div class="lab-card-label">${f.label}</div>
      <div class="lab-card-desc">${f.desc}</div>
      <div class="lab-card-cost lab-cost-saving">−${fmtBn(f.saveBn)}</div>
      <div class="lab-card-note">${f.note}</div>
      <button class="btn${active ? '' : ' primary'} lab-btn-sm" data-lab-fin="${f.id}">
        ${active ? '✓ Valgt' : 'Vælg'}
      </button>
    </div>`;
  }).join('') : '';

  el.innerHTML = `
  <div class="card lab-intro-card">
    <h2>🧪 Politisk Laboratorium</h2>
    <p class="intro">Hvad koster det? Aktiver et forslag og se budgeteffekten — finansier det bagefter med skatteforhøjelser eller besparelser.</p>
    ${VG.state.current ? (() => {
      const bal = VG.sumRev() - VG.sumExp();
      const balSign = bal >= 0 ? '+' : '';
      return `<div class="lab-context">Aktuel budgetsaldo (FL2026): <strong>${balSign}${fmtBn(bal)}</strong></div>`;
    })() : ''}
  </div>

  ${hasActive ? `<div class="lab-summary-bar">
    <div class="lab-sum-item">
      <div class="lab-sum-label">Forslag koster</div>
      <div class="lab-sum-val lab-cost-expense">+${fmtBn(cost)}</div>
    </div>
    <div class="lab-sum-sep">−</div>
    <div class="lab-sum-item">
      <div class="lab-sum-label">Finansieret</div>
      <div class="lab-sum-val lab-cost-saving">${fmtBn(financed)}</div>
    </div>
    <div class="lab-sum-sep">=</div>
    <div class="lab-sum-item ${gapClass}">
      <div class="lab-sum-label">${gapLabel}</div>
      <div class="lab-sum-val">${fmtBn(Math.abs(gap))}</div>
    </div>
  </div>
  ${cost > 0 ? `<div class="lab-progress-wrap">
    <div class="lab-progress">
      <div class="lab-progress-fill" style="width:${pct}%"></div>
    </div>
    <span class="lab-progress-label">${Math.round(pct)}% finansieret</span>
  </div>` : ''}` : ''}

  <div class="lab-section">
    <h3 class="lab-sec-title">Politiske forslag</h3>
    <p class="lab-sec-sub">Vælg et eller flere forslag — se hvad det koster statsbudgettet om året</p>
    <div class="lab-grid">${policyCards}</div>
  </div>

  ${showFinancing ? `<div class="lab-section">
    <h3 class="lab-sec-title">Finansiering</h3>
    <p class="lab-sec-sub">Hvad skal betale regningen? Vælg en eller flere finansieringsmuligheder</p>
    <div class="lab-grid lab-fin-grid">${finCards}</div>
  </div>` : ''}

  ${hasActive ? `<div class="lab-actions">
    <button class="btn" data-lab-reset>↺ Start forfra</button>
    <button class="btn primary" data-lab-apply>Anvend på budgettet →</button>
  </div>
  <p class="lab-disclaimer">Alle beløb er estimater baseret på Finansministeriet, DREAM og relevante ministerier. Dynamiske effekter (MAKRO) er ikke inkluderet i ovenstående — se "Økonomi & Politik" for MAKRO-analyse.</p>` : ''}
  `;

  el.onclick = function(e) {
    const toggle = e.target.closest('[data-lab-toggle]');
    if (toggle) { VG.lab.toggle(toggle.dataset.labToggle); return; }
    const fin = e.target.closest('[data-lab-fin]');
    if (fin) { VG.lab.toggleFin(fin.dataset.labFin); return; }
    if (e.target.closest('[data-lab-reset]')) { VG.lab.reset(); return; }
    if (e.target.closest('[data-lab-apply]')) { VG.lab.applyToBudget(); return; }
    const link = e.target.closest('[data-lab-link]');
    if (link && window.__mkClick) { window.__mkClick(link.dataset.labLink); }
  };
};
