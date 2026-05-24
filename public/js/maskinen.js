VG.maskinen = {};

/* ── Cluster colours ────────────────────────────────────────────────── */
VG.maskinen.CLUSTER_COLORS = {
  velfaerd:   '#1e7eb4',
  klima:      '#2d8a50',
  okonomi:    '#0a7a8a',
  samfund:    '#6b5ea8',
  uddannelse: '#b87333',
  sikkerhed:  '#9a4040',
};

VG.maskinen.CLUSTER_LABELS = {
  velfaerd: 'Velfærd', klima: 'Klima', okonomi: 'Økonomi',
  samfund: 'Samfund', uddannelse: 'Uddannelse', sikkerhed: 'Sikkerhed'
};

/* ── Phosphor icon helper ─────────────────────────────────────────────── */
VG.maskinen.ph = function(name, extra) {
  return '<i class="ph-bold ph-' + name + (extra ? ' ' + extra : '') + '"></i>';
};

/* ── Nodes (icon = Phosphor bold icon name, x/y in 900×520 space) ─────── */
VG.maskinen.NODES = [
  { id: 'sundhed',     label: 'Sundhed',     icon: 'hospital',      x: 130, y: 88,  cluster: 'velfaerd',
    stat: '184 mia. kr. i offentlige sundhedsudgifter',
    details: ['184 mia. kr. i offentlige sundhedsudgifter', '13.500 sygehussenge fordelt på 40 sygehuse', 'Median ventetid på elektiv kirurgi: 32 dage'] },
  { id: 'psykiatri',   label: 'Psykiatri',   icon: 'brain',         x: 65,  y: 185, cluster: 'velfaerd',
    stat: '2,1 år gennemsnitlig ventetid i børnepsykiatri',
    details: ['250.000 danskere i aktiv psykiatrisk behandling', 'Børnepsykiatri: 2,1 år gennemsnitlig ventetid', 'Investeringsplan: 10 mia. kr. over 10 år (2022–2030)'] },
  { id: 'ventetider',  label: 'Ventetider',  icon: 'hourglass',     x: 205, y: 175, cluster: 'velfaerd',
    stat: '18% af elektive patienter venter over 2 måneder',
    details: ['18% af elektive patienter venter over 2 måneder', 'Kræftpakker: 84% behandlet inden for standardforløb', 'Ortopædi har de længste ventetider i systemet'] },
  { id: 'aeldrepleje', label: 'Ældrepleje',  icon: 'person',        x: 268, y: 88,  cluster: 'velfaerd',
    stat: '135.000 modtager hjemmehjælp i Danmark',
    details: ['135.000 modtager hjemmehjælp i Danmark', '1 af 4 plejehjemsboliger leveres af privat leverandør', 'Udgifter: ~105 mia. kr./år til ældre og handicap'] },
  { id: 'co2',         label: 'CO₂ & Klima', icon: 'leaf',          x: 742, y: 88,  cluster: 'klima',
    stat: '47% CO₂-reduktion siden 1990 — mål: 70% i 2030',
    details: ['47% CO₂-reduktion siden 1990 (mål: 70% i 2030)', 'Danmark eksporterer grøn teknologi for 110 mia. kr./år', 'Landbruget tegner sig for 24% af Danmarks emissioner'] },
  { id: 'energi',      label: 'Energi',       icon: 'lightning',     x: 830, y: 175, cluster: 'klima',
    stat: '84% af elforbruget dækkes af vedvarende energi',
    details: ['84% af elforbruget dækkes af vedvarende energi', 'Havvind: 2.300 MW kapacitet — tredobles inden 2030', 'El-eksport: Danmark er netto-eksportør i Europa'] },
  { id: 'naturvand',   label: 'Natur & Vand', icon: 'drop',          x: 655, y: 175, cluster: 'klima',
    stat: '39 mg/l nitrat i grundvand (grænse: 50 mg/l)',
    details: ['39 mg/l gennemsnitlig nitrat i grundvand (grænse: 50)', '62% af danske søer har god eller høj vandkvalitet', '900.000 ha. beskyttet natur — 22% af landets areal'] },
  { id: 'landbrug',    label: 'Landbrug',     icon: 'farm',          x: 800, y: 48,  cluster: 'klima',
    stat: '14,8 mio. svin — 2,5 per dansker',
    details: ['14,8 mio. svin svarende til 2,5 per dansker', '62% af Danmarks areal er landbrugsjord', 'Landbrugseksport: 175 mia. kr./år'] },
  { id: 'overview',    label: 'Budget',       icon: 'chart-bar',     x: 450, y: 208, cluster: 'okonomi',
    stat: 'Finanslov 2026: 1.444 mia. kr. i samlede udgifter',
    details: ['Finanslov 2026: 1.444 mia. kr. i samlede udgifter', 'Budgetsaldo: +80 mia. kr. forventet overskud', 'Offentlig sektor beskæftiger 830.000 personer'] },
  { id: 'statsgaeld',  label: 'Statsgæld',    icon: 'bank',          x: 372, y: 148, cluster: 'okonomi',
    stat: 'Statsgæld: 30,4% af BNP — EU-krav max 60%',
    details: ['Statsgæld: 30,4% af BNP (EU krav: max 60%)', 'Danmark har AAA-kreditvurdering fra Moody\'s, Fitch og S&P', 'Renteudgifter: ca. 15 mia. kr./år'] },
  { id: 'erhverv',     label: 'Erhverv',      icon: 'buildings',     x: 530, y: 148, cluster: 'okonomi',
    stat: 'BNP-vækst: +2,3% i 2024 — over EU-gennemsnittet',
    details: ['BNP-vækst: +2,3% i 2024 — over EU-gennemsnittet', 'Eksport udgør 65% af BNP', '270.000 aktive virksomheder i Danmark'] },
  { id: 'inflation',   label: 'Inflation',    icon: 'trend-up',      x: 428, y: 290, cluster: 'okonomi',
    stat: 'KPI-inflation: 2,1% år/år (marts 2025)',
    details: ['KPI-inflation: 2,1% år/år (marts 2025)', 'Nationalbankens rente: 3,35% (maj 2026)', 'Fødevarepriserne steget ca. 8% siden 2020'] },
  { id: 'demografi',   label: 'Demografi',    icon: 'users',         x: 108, y: 308, cluster: 'samfund',
    stat: '5,97 mio. indbyggere — gennemsnitsalder 42,3 år',
    details: ['5,97 mio. indbyggere (1. januar 2025)', 'Gennemsnitsalder: 42,3 år — og stigende', 'Befolkningsvækst: +0,6% om året, primært immigration'] },
  { id: 'indkomst',    label: 'Indkomst',     icon: 'currency-eur',  x: 178, y: 385, cluster: 'samfund',
    stat: 'Gini-koefficient: 29,2 (EU-gennemsnit: 30,3)',
    details: ['Gini-koefficient: 29,2 (EU-gennemsnit: 30,3)', 'Medianindkomst efter skat: 342.000 kr./år', 'Top-10% tjener 7,8× mere end bund-10%'] },
  { id: 'boligmarked', label: 'Boligmarked',  icon: 'house-line',    x: 105, y: 455, cluster: 'samfund',
    stat: 'Medianpris for enfamiliehus: 2,35 mio. kr.',
    details: ['Medianpris for enfamiliehus: 2,35 mio. kr.', 'Boligpriser steget 85% i reale termer siden 2010', '53% af danskere bor i ejerbolig'] },
  { id: 'folkeskolen', label: 'Folkeskolen',  icon: 'student',       x: 312, y: 460, cluster: 'uddannelse',
    stat: '1 af 4 forlader folkeskolen uden gode læsefærdigheder',
    details: ['560.000 elever fordelt på 1.400 folkeskoler', '1 af 4 forlader folkeskolen uden tilstrækkelige læsefærdigheder', 'Danmark bruger 7,1% af BNP på uddannelse'] },
  { id: 'integration', label: 'Integration',  icon: 'globe',         x: 516, y: 460, cluster: 'uddannelse',
    stat: '15,2% af befolkning er indvandrere eller efterkommere',
    details: ['15,2% af befolkning er indvandrere eller efterkommere', 'Beskæftigelsesgrad: 59% (mod 77% for etniske danskere)', '183 nationaliteter er bosat i Danmark'] },
  { id: 'ledighed',    label: 'Ledighed',     icon: 'trend-down',    x: 415, y: 375, cluster: 'uddannelse',
    stat: 'Ledighed: 4,8% — ca. 140.000 personer',
    details: ['Ledighed: 4,8% — ca. 140.000 personer', 'Ungledighed (15-29 år): 11,4%', 'Dagpengeret: maks 2 år inden for 3 år'] },
  { id: 'forsvar',     label: 'Forsvar',      icon: 'shield',        x: 795, y: 305, cluster: 'sikkerhed',
    stat: 'Forsvarsbudget: 1,65% af BNP — NATO-mål: 3%',
    details: ['Forsvarsbudget 2024: 1,65% af BNP', 'NATO-mål: 3% af BNP inden 2030 (mangler 40+ mia. kr.)', 'Totalforsvaret styrkes med 20.000 soldater'] },
  { id: 'kriminalitet',label: 'Kriminalitet', icon: 'siren',         x: 825, y: 395, cluster: 'sikkerhed',
    stat: 'Kriminalitet faldet 31% siden 2005',
    details: ['Kriminalitet faldet 31% siden 2005', '20.000 varetægtsfængslede og indsatte i DK', 'Recidivrate: 54% inden for 2 år efter løsladelse'] },
];

/* ── Edges ────────────────────────────────────────────────────────────── */
VG.maskinen.EDGES = [
  ['sundhed',     'psykiatri'],
  ['sundhed',     'ventetider'],
  ['sundhed',     'aeldrepleje'],
  ['psykiatri',   'folkeskolen'],
  ['psykiatri',   'ledighed'],
  ['aeldrepleje', 'demografi'],
  ['co2',         'energi'],
  ['co2',         'landbrug'],
  ['naturvand',   'landbrug'],
  ['overview',    'statsgaeld'],
  ['overview',    'erhverv'],
  ['overview',    'inflation'],
  ['erhverv',     'ledighed'],
  ['erhverv',     'inflation'],
  ['inflation',   'indkomst'],
  ['indkomst',    'boligmarked'],
  ['demografi',   'aeldrepleje'],
  ['demografi',   'ledighed'],
  ['folkeskolen', 'integration'],
  ['folkeskolen', 'ledighed'],
  ['integration', 'ledighed'],
  ['integration', 'kriminalitet'],
  ['forsvar',     'statsgaeld'],
];

/* ── Connection lookup ───────────────────────────────────────────────── */
VG.maskinen._connMap = {};
VG.maskinen.EDGES.forEach(([a, b]) => {
  (VG.maskinen._connMap[a] = VG.maskinen._connMap[a] || []).push(b);
  (VG.maskinen._connMap[b] = VG.maskinen._connMap[b] || []).push(a);
});

/* ── Tab → Group reverse lookup ─────────────────────────────────────── */
VG.maskinen.TAB_GROUP = {
  borger:'personligt', bolig:'personligt', pension:'personligt', elpris:'personligt',
  overview:'samfund', demographics:'samfund', kommuner:'samfund', sundhed:'samfund',
  forbrug:'samfund', energi:'samfund', ledighed:'samfund', ventetider:'samfund',
  dsb:'samfund', aeldrepleje:'samfund', boligmarked:'samfund', indkomst:'samfund',
  co2:'samfund', kriminalitet:'samfund', uddannelse:'samfund', inflation:'samfund',
  udenrigshandel:'samfund', landbrug:'samfund', folkesundhed:'samfund', ligestilling:'samfund',
  velfaerdsstat:'samfund', generationsregnskab:'samfund', arbejdsmiljoe:'samfund',
  medietillid:'samfund', groenomstilling:'samfund', boligkrise:'samfund',
  psykiatri:'samfund', folkeskolen:'samfund', naturvand:'samfund', integration:'samfund',
  forsvar:'samfund',
  platform:'politik', party:'politik', partier:'politik', regering:'politik',
  folketing:'politik', mandater:'politik', valgkort:'politik', meningsmaalinger:'politik',
  rygter:'oekonomi', policy:'oekonomi', spending:'oekonomi', revenue:'oekonomi',
  projection:'oekonomi', historik:'oekonomi', scenarios:'oekonomi',
  statsgaeld:'oekonomi', erhverv:'oekonomi', innovation:'oekonomi',
};

/* ── Navigate to a panel from anywhere ───────────────────────────────── */
window.__mkClick = function(tabId) {
  const group = VG.maskinen.TAB_GROUP[tabId] || 'samfund';
  if (window.__switchGroup) window.__switchGroup(group);
  setTimeout(() => {
    const btn = document.querySelector(`.sub-tab[data-tab="${tabId}"]`);
    if (btn) btn.click();
  }, 20);
};

/* ── Exploration tracking (localStorage) ────────────────────────────── */
VG.maskinen._getVisited = function() {
  try { return new Set(JSON.parse(localStorage.getItem('mk_visited') || '[]')); }
  catch { return new Set(); }
};

VG.maskinen._markVisited = function(id) {
  const v = VG.maskinen._getVisited();
  if (v.has(id)) return false;
  v.add(id);
  try { localStorage.setItem('mk_visited', JSON.stringify([...v])); } catch {}
  return true;
};

/* ── Render diagram: HTML nodes + SVG edge overlay ───────────────────── */
VG.maskinen.renderDiagram = function() {
  const W = 900, H = 520;
  const nodeMap = {};
  VG.maskinen.NODES.forEach(n => { nodeMap[n.id] = n; });
  const visited = VG.maskinen._getVisited();
  const total = VG.maskinen.NODES.length;
  const vCount = visited.size;
  const fill = +(vCount / total * 100).toFixed(1);

  const edgePaths = VG.maskinen.EDGES.map(([a, b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    if (!na || !nb) return '';
    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2 - 22;
    return `<path data-a="${a}" data-b="${b}" d="M${na.x},${na.y} Q${mx},${my} ${nb.x},${nb.y}" class="mk-edge"/>`;
  }).join('');

  const nodeHtml = VG.maskinen.NODES.map(n => {
    const xp = (n.x / W * 100).toFixed(3);
    const yp = (n.y / H * 100).toFixed(3);
    const cc = VG.maskinen.CLUSTER_COLORS[n.cluster];
    const isVisited = visited.has(n.id);
    return `<button class="mk-node-btn${isVisited ? ' mk-visited' : ''}" data-id="${n.id}" style="left:${xp}%;top:${yp}%;--cc:${cc}" title="${n.label}">
      <div class="mk-node-inner"><i class="ph-bold ph-${n.icon} mk-node-ph"></i></div>
      <span class="mk-node-lbl">${n.label}</span>
    </button>`;
  }).join('');

  return `<div class="mk-wrap">
    <div class="mk-header-row">
      <div class="mk-header-left">
        <h2 class="mk-title">Danmarksmaskinen</h2>
        <p class="mk-sub">Klik på et emne og opdage hvad der driver det — og hvad der hænger sammen.</p>
      </div>
      <div class="mk-explore-counter" title="${vCount} af ${total} emner udforsket">
        <div class="mk-explore-ring">
          <svg viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="14" stroke="var(--border)" stroke-width="2.5"/>
            <circle cx="18" cy="18" r="14" stroke="var(--accent)" stroke-width="2.5"
              stroke-dasharray="${fill} 100" stroke-linecap="round"
              transform="rotate(-90 18 18)" class="mk-ring-fill"/>
          </svg>
          <div class="mk-explore-inner">
            <span class="mk-explore-n">${vCount}</span><span class="mk-explore-d">/${total}</span>
          </div>
        </div>
        <div class="mk-explore-lbl">udforsket</div>
      </div>
    </div>
    <div class="mk-arena" id="mk-arena">
      <svg class="mk-edges-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${edgePaths}</svg>
      ${nodeHtml}
    </div>
    <p class="mk-hint">Hold musen over en node for at se forbindelserne — klik for at åbne data.</p>
  </div>`;
};

/* ── Slide-in detail panel ───────────────────────────────────────────── */
VG.maskinen.showNodeCard = function(id) {
  const nodeData = VG.maskinen.NODES.find(n => n.id === id);
  if (!nodeData) return;

  let panel = document.getElementById('mk-detail-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'mk-detail-panel';
    panel.className = 'mk-detail-panel';
    document.body.appendChild(panel);
    panel.onclick = function(ev) {
      if (ev.target.closest('[data-action="close"]')) { VG.maskinen.hideNodeCard(); return; }
      const navBtn = ev.target.closest('[data-navid]');
      if (!navBtn) return;
      const navId = navBtn.dataset.navid;
      if (navBtn.classList.contains('mk-detail-cta')) {
        window.__mkClick(navId);
        VG.maskinen.hideNodeCard();
      } else {
        VG.maskinen._markVisited(navId);
        VG.maskinen._updateExploreCounter();
        VG.maskinen.showNodeCard(navId);
      }
    };
  }

  const cc = VG.maskinen.CLUSTER_COLORS[nodeData.cluster];
  const clLabel = VG.maskinen.CLUSTER_LABELS[nodeData.cluster] || nodeData.cluster;

  const facts = (nodeData.details || []).map(f =>
    `<div class="mk-detail-fact"><span class="mk-detail-dot" style="background:${cc}"></span><span>${f}</span></div>`
  ).join('');

  const connIds = VG.maskinen._connMap[id] || [];
  const conns = connIds.map(cid => {
    const cn = VG.maskinen.NODES.find(n => n.id === cid);
    if (!cn) return '';
    const ccc = VG.maskinen.CLUSTER_COLORS[cn.cluster];
    return `<button class="mk-detail-chip" data-navid="${cid}" style="--cc:${ccc}">
      <i class="ph-bold ph-${cn.icon}"></i> ${cn.label}
    </button>`;
  }).filter(Boolean).join('');

  panel.innerHTML = `
    <div class="mk-detail-header" style="--cc:${cc}">
      <div class="mk-detail-hero">
        <div class="mk-detail-icon-wrap" style="background:color-mix(in srgb,${cc} 15%,var(--surface));border-color:${cc}">
          <i class="ph-bold ph-${nodeData.icon} mk-detail-ph-icon" style="color:${cc}"></i>
        </div>
        <div>
          <div class="mk-detail-title">${nodeData.label}</div>
          <div class="mk-detail-cluster" style="color:${cc}">${clLabel}</div>
        </div>
      </div>
      <button class="mk-detail-close" data-action="close" aria-label="Luk">
        <i class="ph-bold ph-x"></i>
      </button>
    </div>
    <div class="mk-detail-body">
      <div class="mk-detail-stat" style="border-color:${cc}">${nodeData.stat}</div>
      ${facts ? `<div class="mk-detail-section">
        <div class="mk-detail-slbl">Nøgletal</div>
        <div class="mk-detail-facts">${facts}</div>
      </div>` : ''}
      ${conns ? `<div class="mk-detail-section">
        <div class="mk-detail-slbl">Direkte forbindelser</div>
        <div class="mk-detail-chips">${conns}</div>
      </div>` : ''}
      <button class="mk-detail-cta" data-navid="${id}" style="background:${cc}">
        Udforsk fuld dataanalyse <i class="ph-bold ph-arrow-right"></i>
      </button>
    </div>`;

  panel.classList.add('open');

  document.querySelectorAll('.mk-node-btn').forEach(btn => {
    btn.classList.toggle('mk-panel-active', btn.dataset.id === id);
  });
};

VG.maskinen.hideNodeCard = function() {
  const panel = document.getElementById('mk-detail-panel');
  if (panel) panel.classList.remove('open');
  document.querySelectorAll('.mk-node-btn').forEach(n => n.classList.remove('mk-panel-active'));
};

/* ── Update exploration counter in the DOM ───────────────────────────── */
VG.maskinen._updateExploreCounter = function() {
  const v = VG.maskinen._getVisited();
  const total = VG.maskinen.NODES.length;
  const n = document.querySelector('.mk-explore-n');
  if (n) n.textContent = v.size;
  const fill = +(v.size / total * 100).toFixed(1);
  const ring = document.querySelector('.mk-ring-fill');
  if (ring) ring.setAttribute('stroke-dasharray', `${fill} 100`);
};

/* ── Init interactions (called once after arena is in DOM) ───────────── */
VG.maskinen.initDiagram = function() {
  const arena = document.getElementById('mk-arena');
  if (!arena || arena._mkInit) return;
  arena._mkInit = true;

  arena.addEventListener('click', function(ev) {
    const btn = ev.target.closest('.mk-node-btn');
    if (!btn) return;
    const id = btn.dataset.id;
    const isNew = VG.maskinen._markVisited(id);
    if (isNew) {
      btn.classList.add('mk-visited', 'mk-just-visited');
      btn.addEventListener('animationend', () => btn.classList.remove('mk-just-visited'), { once: true });
      VG.maskinen._updateExploreCounter();
    }
    VG.maskinen.showNodeCard(id);
  });

  let hoverTimer;
  arena.addEventListener('mouseover', function(ev) {
    const btn = ev.target.closest('.mk-node-btn');
    if (!btn) return;
    clearTimeout(hoverTimer);
    const id = btn.dataset.id;
    const conns = new Set(VG.maskinen._connMap[id] || []);
    arena.classList.add('mk-hovering');
    arena.querySelectorAll('.mk-node-btn').forEach(n => {
      if (n === btn) { n.classList.add('mk-hover'); return; }
      n.classList.toggle('mk-dim', !conns.has(n.dataset.id));
      n.classList.toggle('mk-connected', conns.has(n.dataset.id));
    });
    arena.querySelectorAll('.mk-edge').forEach(e => {
      const lit = e.dataset.a === id || e.dataset.b === id;
      e.classList.toggle('mk-edge-lit', lit);
      e.classList.toggle('mk-edge-dim', !lit);
    });
  });

  arena.addEventListener('mouseleave', function() {
    hoverTimer = setTimeout(() => {
      arena.classList.remove('mk-hovering');
      arena.querySelectorAll('.mk-node-btn').forEach(n =>
        n.classList.remove('mk-hover', 'mk-dim', 'mk-connected'));
      arena.querySelectorAll('.mk-edge').forEach(e =>
        e.classList.remove('mk-edge-lit', 'mk-edge-dim'));
    }, 80);
  });

  document.addEventListener('click', function(ev) {
    const panel = document.getElementById('mk-detail-panel');
    if (panel && panel.classList.contains('open')
        && !panel.contains(ev.target)
        && !ev.target.closest('.mk-node-btn')) {
      VG.maskinen.hideNodeCard();
    }
  }, { passive: true });

  document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape') VG.maskinen.hideNodeCard();
  }, { passive: true });
};

/* ── Highlight node for currently open panel ─────────────────────────── */
VG.maskinen.setActiveNode = function(tabId) {
  document.querySelectorAll('.mk-node-btn').forEach(n =>
    n.classList.toggle('mk-current', n.dataset.id === tabId && tabId !== 'overview'));
};

/* ── Health strip (6 live gauges) ────────────────────────────────────── */
VG.maskinen.renderHealth = function() {
  const el = document.getElementById('health-strip');
  if (!el) return;

  let balPct = 0, expRatio = 1, revRatio = 1;
  try {
    if (VG.state.current && VG.state.baseline) {
      const bal = VG.sumRev() - VG.sumExp();
      balPct = bal / VG.state.baseline.gdp * 100;
      expRatio = VG.sumExp() / (VG.baseExp() || 1);
      revRatio = VG.sumRev() / (VG.baseRev() || 1);
    }
  } catch(e) {}

  const oekoScore     = Math.max(5,  Math.min(98, 62 + balPct * 9));
  const velfaerdScore = Math.max(10, Math.min(95, 65 + (expRatio - 1) * 90));
  const klimaScore    = 52;
  const sikkerScore   = Math.max(10, Math.min(95, 54 + (expRatio - 1) * 60));
  const uddScore      = Math.max(10, Math.min(95, 62 + (expRatio - 1) * 70));
  const lighedScore   = Math.max(10, Math.min(95, 59 + (expRatio - 1) * 50 - (revRatio - 1) * 30));

  const dims = [
    { label: 'Økonomi',    icon: 'chart-bar',      score: oekoScore,     note: `${balPct >= 0 ? '+' : ''}${balPct.toFixed(1)}% BNP saldo`, tab: 'overview' },
    { label: 'Velfærd',    icon: 'heartbeat',       score: velfaerdScore, note: 'Sundhed & omsorg', tab: 'sundhed' },
    { label: 'Klima',      icon: 'leaf',            score: klimaScore,    note: '47% mod 70%-mål', tab: 'co2' },
    { label: 'Sikkerhed',  icon: 'shield',          score: sikkerScore,   note: '1,65% BNP forsvar', tab: 'forsvar' },
    { label: 'Uddannelse', icon: 'graduation-cap',  score: uddScore,      note: 'Folkeskole → uni', tab: 'folkeskolen' },
    { label: 'Lighed',     icon: 'scales',          score: lighedScore,   note: 'Gini & overførsler', tab: 'indkomst' },
  ];

  el.innerHTML = dims.map(d => {
    const sc  = Math.round(d.score);
    const col = sc >= 68 ? '#2d8a50' : sc >= 44 ? '#b87333' : '#9a4040';
    const deg = Math.round(sc * 3.6);
    return `<div class="hs-item" onclick="window.__mkClick('${d.tab}')" title="${d.note}">
      <div class="hs-gauge" style="--deg:${deg}deg;--col:${col}">
        <div class="hs-gauge-inner"><span class="hs-score" style="color:${col}">${sc}</span></div>
      </div>
      <div class="hs-body">
        <div class="hs-label"><i class="ph-bold ph-${d.icon} hs-ph-icon"></i>${d.label}</div>
        <div class="hs-note">${d.note}</div>
      </div>
    </div>`;
  }).join('');
};

/* ── Connection strip for individual panels ──────────────────────────── */
VG.maskinen.renderConnectionStrip = function(tabId) {
  const connected = VG.maskinen._connMap[tabId];
  if (!connected || !connected.length) return '';
  const nodeMap = {};
  VG.maskinen.NODES.forEach(n => { nodeMap[n.id] = n; });
  const chips = connected.map(id => {
    const n = nodeMap[id];
    if (!n) return '';
    return `<button class="mk-chip" onclick="window.__mkClick('${id}')"><i class="ph-bold ph-${n.icon}"></i> ${n.label}</button>`;
  }).filter(Boolean).join('');
  if (!chips) return '';
  return `<div class="mk-conn-strip"><span class="mk-conn-lbl">Hænger sammen med</span>${chips}</div>`;
};

/* ── Inject connection strip into active panel ───────────────────────── */
VG.maskinen.injectConnections = function(tabId) {
  const panel = document.getElementById('panel-' + tabId);
  if (!panel || panel.querySelector('.mk-conn-strip')) return;
  const html = VG.maskinen.renderConnectionStrip(tabId);
  if (html) panel.insertAdjacentHTML('beforeend', html);
};
