VG.maskinen = {};

/* ── Cluster definitions ─────────────────────────────────────────────── */
VG.maskinen.CLUSTER_COLORS = {
  velfaerd:   '#1e7eb4',
  klima:      '#2d8a50',
  okonomi:    '#0a7a8a',
  samfund:    '#6b5ea8',
  uddannelse: '#b87333',
  sikkerhed:  '#9a4040',
};

/* ── Node definitions (id, label, emoji, SVG x/y, cluster, key stat) ── */
VG.maskinen.NODES = [
  // Velfærd
  { id: 'sundhed',      label: 'Sundhed',      emoji: '🏥', x: 130, y: 88,  cluster: 'velfaerd',   stat: 'Offentligt sundhedsvæsen',
    details: ['184 mia. kr. i offentlige sundhedsudgifter', '13.500 sygehussenge fordelt på 40 sygehuse', 'Median ventetid på elektiv kirurgi: 32 dage'] },
  { id: 'psykiatri',    label: 'Psykiatri',    emoji: '🧠', x: 65,  y: 178, cluster: 'velfaerd',   stat: '2,1 års ventetid',
    details: ['250.000 danskere i aktiv psykiatrisk behandling', 'Børnepsykiatri: 2,1 år gennemsnitlig ventetid', 'Investeringsplan: 10 mia. kr. over 10 år (2022–2030)'] },
  { id: 'ventetider',   label: 'Ventetider',   emoji: '⏳', x: 200, y: 170, cluster: 'velfaerd',   stat: 'Hospitalsventetider',
    details: ['18% af elektive patienter venter over 2 måneder', 'Kræftpakker: 84% behandlet inden for standardforløb', 'Ortopædi har de længste ventetider i systemet'] },
  { id: 'aeldrepleje',  label: 'Ældrepleje',   emoji: '👴', x: 262, y: 88,  cluster: 'velfaerd',   stat: '65.000 ansatte',
    details: ['135.000 modtager hjemmehjælp i Danmark', '1 af 4 plejehjemsboliger leveres af privat leverandør', 'Udgifter: ~105 mia. kr./år til ældre og handicap'] },
  // Klima
  { id: 'co2',          label: 'CO₂ & Klima',  emoji: '🌿', x: 742, y: 88,  cluster: 'klima',      stat: '47% CO₂-reduktion',
    details: ['47% CO₂-reduktion siden 1990 (mål: 70% i 2030)', 'Danmark eksporterer grøn teknologi for 110 mia. kr./år', 'Landbruget tegner sig for 24% af Danmarks emissioner'] },
  { id: 'energi',       label: 'Energi',        emoji: '⚡', x: 828, y: 168, cluster: 'klima',      stat: '84% vedvarende el',
    details: ['84% af elforbruget dækkes af vedvarende energi', 'Havvind: 2.300 MW kapacitet — tredobles inden 2030', 'El-eksport: Danmark er netto-eksportør'] },
  { id: 'naturvand',    label: 'Natur & Vand',  emoji: '🌊', x: 658, y: 168, cluster: 'klima',      stat: '39 mg/l nitrat',
    details: ['39 mg/l gennemsnitlig nitrat i grundvand (grænse: 50)', '62% af danske søer har god eller høj vandkvalitet', '900.000 ha. beskyttet natur — 22% af landets areal'] },
  { id: 'landbrug',     label: 'Landbrug',      emoji: '🌾', x: 802, y: 48,  cluster: 'klima',      stat: '14,8 mio. svin',
    details: ['14,8 mio. svin svarende til 2,5 per dansker', '62% af Danmarks areal er landbrugsjord', 'Landbrugseksport: 175 mia. kr./år'] },
  // Økonomi
  { id: 'overview',     label: 'Budget',        emoji: '📊', x: 450, y: 208, cluster: 'okonomi',    stat: 'Finanslov 2026',
    details: ['Finanslov 2026: 1.444 mia. kr. i samlede udgifter', 'Budgetsaldo: +80 mia. kr. forventet overskud', 'Offentlig sektor beskæftiger 830.000 personer'] },
  { id: 'statsgaeld',   label: 'Statsgæld',     emoji: '🏦', x: 372, y: 148, cluster: 'okonomi',    stat: '28,1% af BNP',
    details: ['Statsgæld: 30,4% af BNP (EU krav: max 60%)', 'Danmark har AAA-kreditvurdering fra Moody\'s, Fitch og S&P', 'Renteudgifter: ca. 15 mia. kr./år'] },
  { id: 'erhverv',      label: 'Erhverv',        emoji: '🏢', x: 530, y: 148, cluster: 'okonomi',    stat: 'BNP +2,3%',
    details: ['BNP-vækst: +2,3% i 2024 — over EU-gennemsnittet', 'Eksport udgør 65% af BNP', '270.000 aktive virksomheder i Danmark'] },
  { id: 'inflation',    label: 'Inflation',      emoji: '📈', x: 428, y: 284, cluster: 'okonomi',    stat: '2,1% år/år',
    details: ['KPI-inflation: 2,1% år/år (marts 2025)', 'Nationalbankens rente: 3,35% (maj 2026)', 'Fødevarepriserne steget ca. 8% siden 2020'] },
  // Samfund
  { id: 'demografi',    label: 'Demografi',      emoji: '📊', x: 108, y: 302, cluster: 'samfund',    stat: '5,97 mio. indb.',
    details: ['5,97 mio. indbyggere (1. januar 2025)', 'Gennemsnitsalder: 42,3 år — og stigende', 'Befolkningsvækst: +0,6% om året, primært immigration'] },
  { id: 'indkomst',     label: 'Indkomst',       emoji: '💰', x: 175, y: 374, cluster: 'samfund',    stat: 'Gini: 29,2',
    details: ['Gini-koefficient: 29,2 (EU-gennemsnit: 30,3)', 'Medianindkomst efter skat: 342.000 kr./år', 'Top-10% tjener 7,8× mere end bund-10%'] },
  { id: 'boligmarked',  label: 'Boligmarked',    emoji: '🏗', x: 102, y: 438, cluster: 'samfund',    stat: 'Median 2,35 mio.',
    details: ['Medianpris for enfamiliehus: 2,35 mio. kr.', 'Boligpriser steget 85% i reale termer siden 2010', '53% af danskere bor i ejerbolig'] },
  // Uddannelse / Integration
  { id: 'folkeskolen',  label: 'Folkeskolen',    emoji: '🏫', x: 312, y: 448, cluster: 'uddannelse', stat: '1 af 4 forlader',
    details: ['560.000 elever fordelt på 1.400 folkeskoler', '1 af 4 forlader folkeskolen uden tilstrækkelige læsefærdigheder', 'Danmark bruger 7,1% af BNP på uddannelse'] },
  { id: 'integration',  label: 'Integration',    emoji: '🌍', x: 516, y: 448, cluster: 'uddannelse', stat: '15,2% af befolkning',
    details: ['15,2% af befolkning er indvandrere eller efterkommere', 'Beskæftigelsesgrad: 59% (mod 77% for etniske danskere)', '183 nationaliteter er bosat i Danmark'] },
  { id: 'ledighed',     label: 'Ledighed',       emoji: '📉', x: 412, y: 365, cluster: 'uddannelse', stat: '4,8%',
    details: ['Ledighed: 4,8% — ca. 140.000 personer', 'Ungledighed (15-29 år): 11,4%', 'Dagpengeret: maks 2 år inden for 3 år'] },
  // Sikkerhed
  { id: 'forsvar',      label: 'Forsvar',        emoji: '🛡️', x: 795, y: 295, cluster: 'sikkerhed',  stat: '1,65% → 3% BNP',
    details: ['Forsvarsbudget 2024: 1,65% af BNP', 'NATO-mål: 3% af BNP inden 2030 (mangler 40+ mia. kr.)', 'Totalforsvaret skal styrkes med 20.000 soldater'] },
  { id: 'kriminalitet', label: 'Kriminalitet',   emoji: '🚨', x: 822, y: 382, cluster: 'sikkerhed',  stat: '▼ 31% siden 2005',
    details: ['Kriminalitet faldet 31% siden 2005', '20.000 varetægtsfængslede og indsatte i DK', 'Recidivrate: 54% inden for 2 år efter løsladelse'] },
];

/* ── Edges (undirected connections between node IDs) ─────────────────── */
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

/* ── Connection lookup: panelId → [connected panelIds] ─────────────────*/
VG.maskinen._connMap = {};
VG.maskinen.EDGES.forEach(([a, b]) => {
  (VG.maskinen._connMap[a] = VG.maskinen._connMap[a] || []).push(b);
  (VG.maskinen._connMap[b] = VG.maskinen._connMap[b] || []).push(a);
});

/* ── Tab → Group reverse lookup ──────────────────────────────────────── */
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

/* Navigate to a panel from anywhere ─────────────────────────────────── */
window.__mkClick = function(tabId) {
  const group = VG.maskinen.TAB_GROUP[tabId] || 'samfund';
  if (window.__switchGroup) window.__switchGroup(group);
  setTimeout(() => {
    const btn = document.querySelector(`.sub-tab[data-tab="${tabId}"]`);
    if (btn) btn.click();
  }, 20);
};

/* ── Render systems diagram (returns HTML string) ────────────────────── */
VG.maskinen.renderDiagram = function() {
  const W = 900, H = 510;
  const nodeMap = {};
  VG.maskinen.NODES.forEach(n => { nodeMap[n.id] = n; });
  const CC = VG.maskinen.CLUSTER_COLORS;

  const defs = `<defs>
    ${Object.entries(CC).map(([k, c]) => `
      <radialGradient id="mkgrad-${k}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${c}" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="${c}" stop-opacity="0.08"/>
      </radialGradient>`).join('')}
  </defs>`;

  const edges = VG.maskinen.EDGES.map(([a, b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    if (!na || !nb) return '';
    const mx = (na.x + nb.x) / 2;
    const my = (na.y + nb.y) / 2 - 20;
    return `<path data-a="${a}" data-b="${b}" d="M${na.x},${na.y} Q${mx},${my} ${nb.x},${nb.y}" class="mk-edge"/>`;
  }).join('');

  const nodes = VG.maskinen.NODES.map(n => {
    const c = CC[n.cluster];
    return `<g class="mk-node" data-id="${n.id}">
      <circle cx="${n.x}" cy="${n.y}" r="44" class="mk-halo" fill="${c}"/>
      <circle cx="${n.x}" cy="${n.y}" r="30" fill="url(#mkgrad-${n.cluster})" stroke="${c}" stroke-width="1.8" class="mk-ring"/>
      <text x="${n.x}" y="${n.y - 5}" text-anchor="middle" dominant-baseline="middle" class="mk-emoji">${n.emoji}</text>
      <text x="${n.x}" y="${n.y + 20}" text-anchor="middle" class="mk-label">${n.label}</text>
    </g>`;
  }).join('');

  const clusterTags = [
    { t: 'VELFÆRD',    x: 163, y: 20,  c: CC.velfaerd },
    { t: 'KLIMA',      x: 742, y: 20,  c: CC.klima },
    { t: 'ØKONOMI',    x: 450, y: 110, c: CC.okonomi },
    { t: 'SAMFUND',    x: 185, y: 258, c: CC.samfund },
    { t: 'UDDANNELSE', x: 412, y: 415, c: CC.uddannelse },
    { t: 'SIKKERHED',  x: 820, y: 258, c: CC.sikkerhed },
  ].map(t => `<text x="${t.x}" y="${t.y}" text-anchor="middle" class="mk-cluster-tag" fill="${t.c}">${t.t}</text>`).join('');

  return `<div class="mk-wrap">
  <div class="mk-header">
    <h2>🇩🇰 Danmarksmaskinen</h2>
    <p class="mk-sub">Hold musen over et emne — se hvad det hænger sammen med. Klik for at udforske data.</p>
  </div>
  <svg class="mk-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    ${clusterTags}
    <g class="mk-edges">${edges}</g>
    <g class="mk-nodes">${nodes}</g>
  </svg>
  <p class="mk-hint">💡 Ændr budgettet i Økonomi-fanen — sundhedsmålerne øverst opdateres i realtid</p>
</div>`;
};

/* ── Node detail card popup ──────────────────────────────────────────── */
VG.maskinen.showNodeCard = function(id, event) {
  const nodeData = VG.maskinen.NODES.find(n => n.id === id);
  if (!nodeData) return;

  let card = document.getElementById('mk-node-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'mk-node-card';
    card.className = 'mk-node-card';
    document.body.appendChild(card);
  }

  const cc = VG.maskinen.CLUSTER_COLORS[nodeData.cluster];
  const clusterLabel = {
    velfaerd: 'Velfærd', klima: 'Klima', okonomi: 'Økonomi',
    samfund: 'Samfund', uddannelse: 'Uddannelse / Integration', sikkerhed: 'Sikkerhed'
  }[nodeData.cluster] || nodeData.cluster;

  // Build fact rows with subtle left-bar indicator
  const facts = (nodeData.details || []).map((f, i) => {
    const icons = ['📌','📎','📐'];
    return `<div class="mk-card-fact"><span class="mk-fact-dot" style="background:${cc}"></span>${f}</div>`;
  }).join('');

  // Connected node chips — wired to JS click via delegation
  const connIds = VG.maskinen._connMap[id] || [];
  const conns = connIds.map(cid => {
    const cn = VG.maskinen.NODES.find(n => n.id === cid);
    if (!cn) return '';
    return `<button class="mk-cc-chip" data-navid="${cid}">${cn.emoji} ${cn.label}</button>`;
  }).filter(Boolean).join('');

  card.innerHTML = `
    <div class="mk-card-banner" style="background:linear-gradient(135deg,${cc}22,${cc}08)">
      <span class="mk-card-big-emoji">${nodeData.emoji}</span>
      <div class="mk-card-head-text">
        <div class="mk-card-title">${nodeData.label}</div>
        <div class="mk-card-cluster" style="color:${cc}">${clusterLabel}</div>
      </div>
      <button class="mk-card-close" data-action="close" title="Luk">×</button>
    </div>
    <div class="mk-card-body">
      <div class="mk-card-kpi" style="border-left:3px solid ${cc}">${nodeData.stat}</div>
      ${facts ? `<div class="mk-card-facts">${facts}</div>` : ''}
      ${conns ? `<div class="mk-card-conns">
        <div class="mk-card-conn-lbl">🔗 Hænger direkte sammen med</div>
        <div class="mk-card-conn-row">${conns}</div>
      </div>` : ''}
      <button class="mk-card-cta" data-navid="${id}" style="--cc:${cc}">
        Udforsk fuld dataanalyse →
      </button>
    </div>
  `;

  // Wire up all buttons via delegation (no inline onclick, CSP-safe)
  card.addEventListener('click', function handler(ev) {
    const closeBtn = ev.target.closest('[data-action="close"]');
    if (closeBtn) { VG.maskinen.hideNodeCard(); return; }
    const navBtn = ev.target.closest('[data-navid]');
    if (navBtn) {
      const navId = navBtn.dataset.navid;
      const isCta = navBtn.classList.contains('mk-card-cta');
      if (isCta) {
        window.__mkClick(navId);
        VG.maskinen.hideNodeCard();
      } else {
        VG.maskinen.showNodeCard(navId, ev);
      }
    }
  });

  card.classList.remove('show');
  void card.offsetWidth;
  card.classList.add('show');
  card._currentId = id;
  VG.maskinen._positionCard(card, event);
};

VG.maskinen._positionCard = function(card, event) {
  const vw = window.innerWidth, vh = window.innerHeight;
  card.style.maxWidth = '300px';
  const cw = 300;
  let x = event.clientX + 20;
  let y = event.clientY - 30;
  if (x + cw > vw - 10) x = event.clientX - cw - 20;
  if (x < 10) x = 10;
  if (y + 380 > vh - 10) y = Math.max(60, vh - 390);
  card.style.left = x + 'px';
  card.style.top = y + 'px';
};

VG.maskinen.hideNodeCard = function() {
  const card = document.getElementById('mk-node-card');
  if (card) card.classList.remove('show');
};

/* ── Init interactive hover behaviour (called once after SVG is in DOM) ─*/
VG.maskinen.initDiagram = function() {
  const svg = document.querySelector('.mk-svg');
  if (!svg || svg._mkInit) return;
  svg._mkInit = true;

  // Create floating tooltip
  let tip = document.getElementById('mk-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'mk-tooltip';
    tip.className = 'mk-tooltip';
    document.body.appendChild(tip);
  }

  const nodeEls = Array.from(svg.querySelectorAll('.mk-node'));
  const edgeEls = Array.from(svg.querySelectorAll('.mk-edge'));
  const connMap = VG.maskinen._connMap;

  nodeEls.forEach(el => {
    const id = el.dataset.id;
    const conns = new Set(connMap[id] || []);
    const nodeData = VG.maskinen.NODES.find(n => n.id === id);
    const clusterColor = nodeData ? VG.maskinen.CLUSTER_COLORS[nodeData.cluster] : '#888';

    el.addEventListener('mouseenter', ev => {
      svg.classList.add('mk-hovering');
      el.classList.add('mk-hover');
      nodeEls.forEach(other => {
        if (other === el) return;
        other.classList.toggle('mk-dim', !conns.has(other.dataset.id));
        other.classList.toggle('mk-connected', conns.has(other.dataset.id));
      });
      edgeEls.forEach(edge => {
        const lit = edge.dataset.a === id || edge.dataset.b === id;
        edge.classList.toggle('mk-edge-lit', lit);
        edge.classList.toggle('mk-edge-dim', !lit);
      });
      if (nodeData) {
        tip.innerHTML = `<span class="mk-tip-row"><span class="mk-tip-emoji">${nodeData.emoji}</span><strong>${nodeData.label}</strong></span><span class="mk-tip-stat">${nodeData.stat}</span><span class="mk-tip-cta">Klik for at se data →</span>`;
        tip.style.setProperty('--tc', clusterColor);
        tip.classList.add('show');
      }
      positionTip(ev);
    });

    el.addEventListener('mousemove', positionTip);

    el.addEventListener('click', ev => {
      ev.stopPropagation();
      tip.classList.remove('show');
      VG.maskinen.showNodeCard(id, ev);
    });

    el.addEventListener('mouseleave', () => {
      svg.classList.remove('mk-hovering');
      el.classList.remove('mk-hover');
      nodeEls.forEach(n => n.classList.remove('mk-dim', 'mk-connected'));
      edgeEls.forEach(e => e.classList.remove('mk-edge-lit', 'mk-edge-dim'));
      tip.classList.remove('show');
    });
  });

  // Click outside to close card
  document.addEventListener('click', function(ev) {
    const card = document.getElementById('mk-node-card');
    if (card && card.classList.contains('show') && !card.contains(ev.target) && !ev.target.closest('.mk-node')) {
      VG.maskinen.hideNodeCard();
    }
  }, { passive: true, capture: false });

  // ESC key to close card
  document.addEventListener('keydown', function(ev) {
    if (ev.key === 'Escape') VG.maskinen.hideNodeCard();
  }, { passive: true });

  function positionTip(ev) {
    const vw = window.innerWidth;
    const x = ev.clientX + 18;
    tip.style.left = (x + 210 > vw ? ev.clientX - 228 : x) + 'px';
    tip.style.top  = (ev.clientY - 12) + 'px';
  }
};

/* ── Highlight the node for the currently open panel ─────────────────── */
VG.maskinen.setActiveNode = function(tabId) {
  const svg = document.querySelector('.mk-svg');
  if (!svg) return;
  svg.querySelectorAll('.mk-node').forEach(n => n.classList.remove('mk-current'));
  if (tabId && tabId !== 'overview') {
    const node = svg.querySelector(`.mk-node[data-id="${tabId}"]`);
    if (node) node.classList.add('mk-current');
  }
};

/* ── Health strip (6 live indicators with circular gauges) ───────────── */
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
    { label: 'Økonomi',    emoji: '💰', score: oekoScore,     note: `${balPct >= 0 ? '+' : ''}${balPct.toFixed(1)}% BNP saldo`, tab: 'overview' },
    { label: 'Velfærd',    emoji: '🏥', score: velfaerdScore, note: 'Sundhed & omsorg', tab: 'sundhed' },
    { label: 'Klima',      emoji: '🌱', score: klimaScore,    note: '47% mod 70%-mål', tab: 'co2' },
    { label: 'Sikkerhed',  emoji: '🛡️', score: sikkerScore,   note: '1,65% BNP forsvar', tab: 'forsvar' },
    { label: 'Uddannelse', emoji: '🎓', score: uddScore,      note: 'Folkeskole → uni', tab: 'folkeskolen' },
    { label: 'Lighed',     emoji: '⚖️', score: lighedScore,   note: 'Gini & overførsler', tab: 'indkomst' },
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
        <div class="hs-label"><span class="hs-emoji">${d.emoji}</span>${d.label}</div>
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
    return `<button class="mk-chip" onclick="window.__mkClick('${id}')">${n.emoji} ${n.label}</button>`;
  }).filter(Boolean).join('');
  if (!chips) return '';
  return `<div class="mk-conn-strip"><span class="mk-conn-lbl">Hænger sammen med</span>${chips}</div>`;
};

/* ── Inject connection strip into active panel (called from fast()) ──── */
VG.maskinen.injectConnections = function(tabId) {
  const panel = document.getElementById('panel-' + tabId);
  if (!panel || panel.querySelector('.mk-conn-strip')) return;
  const html = VG.maskinen.renderConnectionStrip(tabId);
  if (html) panel.insertAdjacentHTML('beforeend', html);
};
