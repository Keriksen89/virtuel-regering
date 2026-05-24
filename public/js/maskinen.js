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
  { id: 'sundhed',      label: 'Sundhed',      emoji: '🏥', x: 130, y: 88,  cluster: 'velfaerd',   stat: 'Offentligt sundhedsvæsen' },
  { id: 'psykiatri',    label: 'Psykiatri',    emoji: '🧠', x: 65,  y: 178, cluster: 'velfaerd',   stat: '2,1 års ventetid' },
  { id: 'ventetider',   label: 'Ventetider',   emoji: '⏳', x: 200, y: 170, cluster: 'velfaerd',   stat: 'Hospitalsventetider' },
  { id: 'aeldrepleje',  label: 'Ældrepleje',   emoji: '👴', x: 262, y: 88,  cluster: 'velfaerd',   stat: '65.000 ansatte' },
  // Klima
  { id: 'co2',          label: 'CO₂ & Klima',  emoji: '🌿', x: 742, y: 88,  cluster: 'klima',      stat: '47% CO₂-reduktion' },
  { id: 'energi',       label: 'Energi',        emoji: '⚡', x: 828, y: 168, cluster: 'klima',      stat: '84% vedvarende el' },
  { id: 'naturvand',    label: 'Natur & Vand',  emoji: '🌊', x: 658, y: 168, cluster: 'klima',      stat: '39 mg/l nitrat' },
  { id: 'landbrug',     label: 'Landbrug',      emoji: '🌾', x: 802, y: 48,  cluster: 'klima',      stat: '14,8 mio. svin' },
  // Økonomi
  { id: 'overview',     label: 'Budget',        emoji: '📊', x: 450, y: 208, cluster: 'okonomi',    stat: 'Finanslov 2026' },
  { id: 'statsgaeld',   label: 'Statsgæld',     emoji: '🏦', x: 372, y: 148, cluster: 'okonomi',    stat: '28,1% af BNP' },
  { id: 'erhverv',      label: 'Erhverv',        emoji: '🏢', x: 530, y: 148, cluster: 'okonomi',    stat: 'BNP +2,3%' },
  { id: 'inflation',    label: 'Inflation',      emoji: '📈', x: 428, y: 284, cluster: 'okonomi',    stat: '2,1% år/år' },
  // Samfund
  { id: 'demografi',    label: 'Demografi',      emoji: '📊', x: 108, y: 302, cluster: 'samfund',    stat: '5,97 mio. indb.' },
  { id: 'indkomst',     label: 'Indkomst',       emoji: '💰', x: 175, y: 374, cluster: 'samfund',    stat: 'Gini: 29,2' },
  { id: 'boligmarked',  label: 'Boligmarked',    emoji: '🏗', x: 102, y: 438, cluster: 'samfund',    stat: 'Median 2,35 mio.' },
  // Uddannelse / Integration
  { id: 'folkeskolen',  label: 'Folkeskolen',    emoji: '🏫', x: 312, y: 448, cluster: 'uddannelse', stat: '1 af 4 forlader' },
  { id: 'integration',  label: 'Integration',    emoji: '🌍', x: 516, y: 448, cluster: 'uddannelse', stat: '15,2% af befolkning' },
  { id: 'ledighed',     label: 'Ledighed',       emoji: '📉', x: 412, y: 365, cluster: 'uddannelse', stat: '4,8%' },
  // Sikkerhed
  { id: 'forsvar',      label: 'Forsvar',        emoji: '🛡️', x: 795, y: 295, cluster: 'sikkerhed',  stat: '1,65% → 3% BNP' },
  { id: 'kriminalitet', label: 'Kriminalitet',   emoji: '🚨', x: 822, y: 382, cluster: 'sikkerhed',  stat: '▼ 31% siden 2005' },
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
    return `<g class="mk-node" data-id="${n.id}" onclick="window.__mkClick('${n.id}')">
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

    el.addEventListener('mouseleave', () => {
      svg.classList.remove('mk-hovering');
      el.classList.remove('mk-hover');
      nodeEls.forEach(n => n.classList.remove('mk-dim', 'mk-connected'));
      edgeEls.forEach(e => e.classList.remove('mk-edge-lit', 'mk-edge-dim'));
      tip.classList.remove('show');
    });
  });

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
