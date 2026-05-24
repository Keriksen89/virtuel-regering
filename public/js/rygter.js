VG.rygter = {};

VG.rygter._data = null;
VG.rygter._filter = 'Alle';
VG.rygter._sort = 'nyeste';

// Category color map (all using CSS vars — NO party colors)
VG.rygter.CAT_COLORS = {
  Skat:          'var(--warn)',
  Velfærd:       'var(--neg)',
  Klima:         '#2d8a50',
  Bolig:         '#6b5ea8',
  Forsvar:       '#8a5c2d',
  Uddannelse:    'var(--accent)',
  Sundhed:       '#c05858',
  Arbejdsmarked: '#4a7fa5',
  Immigration:   '#7a6b55',
  Pension:       '#5a8a7a',
  Øvrig:         'var(--text-3)',
};

VG.rygter.CONFIDENCE_LABELS = {
  rygte:        { label: 'Rygte', cls: 'conf-rygte' },
  forhandling:  { label: 'Forhandling', cls: 'conf-forhandling' },
  forslag:      { label: 'Forslag', cls: 'conf-forslag' },
  vedtaget:     { label: 'Vedtaget', cls: 'conf-vedtaget' },
};

const ALL_CATEGORIES = ['Alle', 'Skat', 'Velfærd', 'Klima', 'Bolig', 'Forsvar', 'Uddannelse', 'Sundhed', 'Arbejdsmarked', 'Immigration', 'Pension', 'Øvrig'];

VG.rygter.load = async function() {
  try {
    const data = await fetch('/api/rygter/feed').then(r => r.json());
    VG.rygter._data = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('[rygter] load failed', e);
    VG.rygter._data = [];
  }
};

VG.rygter.renderPanel = async function() {
  const panel = document.getElementById('panel-rygter');
  if (!panel) return;

  if (!VG.rygter._data) {
    panel.innerHTML = '<div class="panel-loading">Henter politiske nyheder og analyserer økonomi…</div>';
    await VG.rygter.load();
  }

  VG.rygter._renderContent(panel);
};

VG.rygter._renderContent = function(panel) {
  const data = VG.rygter._data || [];

  // Filter
  let filtered = data;
  if (VG.rygter._filter !== 'Alle') {
    filtered = data.filter(item => item.impact && item.impact.category === VG.rygter._filter);
  }

  // Sort
  if (VG.rygter._sort === 'fiscal') {
    filtered = [...filtered].sort((a, b) => {
      const aF = a.impact ? Math.abs(a.impact.fiscalBn || 0) : 0;
      const bF = b.impact ? Math.abs(b.impact.fiscalBn || 0) : 0;
      return bF - aF;
    });
  }

  // Build filter buttons
  const filterBtns = ALL_CATEGORIES.map(cat => {
    const active = VG.rygter._filter === cat ? ' active' : '';
    return `<button class="rygte-btn${active}" data-filter="${cat}">${cat}</button>`;
  }).join('');

  // Sort buttons
  const sortNewActive  = VG.rygter._sort === 'nyeste' ? ' active' : '';
  const sortFiscActive = VG.rygter._sort === 'fiscal' ? ' active' : '';

  // Card HTML
  const cards = filtered.length === 0
    ? '<div class="rygte-empty">Ingen nyheder i denne kategori.</div>'
    : filtered.map(item => VG.rygter._renderCard(item)).join('');

  panel.innerHTML = `
<div class="card">
  <h2>📰 Politiske rygter & nyheder</h2>
  <p class="intro">Seneste politiske nyheder fra DR og TV2, analyseret med DREAM/MAKRO-inspirerede parametre for at estimere den mulige samfundsøkonomiske effekt.</p>
  <div class="rygte-toolbar">
    <div class="rygte-filters" id="rygte-filters">${filterBtns}</div>
    <div class="rygte-sort-wrap">
      <span class="rygte-sort-label">Sorter:</span>
      <button class="rygte-btn${sortNewActive}" data-sort="nyeste">Nyeste</button>
      <button class="rygte-btn${sortFiscActive}" data-sort="fiscal">Størst impact</button>
    </div>
  </div>
  <div class="rygte-list" id="rygte-list">${cards}</div>
  <p class="rygte-global-disclaimer">DREAM/MAKRO-estimater er automatisk genererede og ikke officielle analyser. Kilde: DR Politik RSS + TV2 Nyheder RSS.</p>
</div>`;

  VG.rygter._bindEvents(panel);
};

VG.rygter._renderCard = function(item) {
  const impact = item.impact || {};
  const catColor = VG.rygter.CAT_COLORS[impact.category] || 'var(--text-3)';
  const conf = VG.rygter.CONFIDENCE_LABELS[impact.confidence] || VG.rygter.CONFIDENCE_LABELS.rygte;

  const dateStr = item.pubDate
    ? new Date(item.pubDate).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const sourceCls = item.source === 'DR' ? 'source-dr' : 'source-tv2';

  // Fiscal impact bar
  const fiscalHtml = impact.fiscalBn != null
    ? VG.rygter._renderFiscalBar(impact.fiscalBn)
    : '<span class="dream-na">Ikke estimeret</span>';

  // GDP arrow
  const gdpHtml = impact.gdpPct != null
    ? `<span class="dream-gdp ${impact.gdpPct >= 0 ? 'pos' : 'neg'}">${impact.gdpPct >= 0 ? '▲' : '▼'} ${Math.abs(impact.gdpPct).toFixed(2).replace('.', ',')}% BNP</span>`
    : '<span class="dream-na">—</span>';

  // Employment
  const empHtml = impact.employmentK != null && Math.abs(impact.employmentK) >= 0.5
    ? `<span class="dream-emp ${impact.employmentK >= 0 ? 'pos' : 'neg'}">${impact.employmentK >= 0 ? '+' : ''}${impact.employmentK.toFixed(0)}k job</span>`
    : '<span class="dream-na">—</span>';

  // Political compass
  const compassHtml = VG.rygter._renderCompass(impact.politicalScore || 0);

  const cardId = 'rygte-' + (item.guid || item.link || Math.random()).toString().replace(/[^a-z0-9]/gi, '').slice(0, 16);

  return `<div class="rygte-card" style="border-left-color:${catColor}">
  <div class="rygte-header">
    <span class="rygte-source-badge ${sourceCls}">${item.source}</span>
    <a href="${item.link || '#'}" target="_blank" rel="noopener" class="rygte-title">${item.title}</a>
    <span class="rygte-date">${dateStr}</span>
  </div>
  <p class="rygte-desc">${item.description || ''}</p>
  <div class="rygte-badges">
    <span class="rygte-cat-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}55">${impact.category || 'Øvrig'}</span>
    <span class="rygte-confidence ${conf.cls}">${conf.label}</span>
    <button class="rygte-expand-btn" data-target="${cardId}-dream" aria-expanded="false">DREAM analyse ▾</button>
  </div>
  <div class="dream-box" id="${cardId}-dream" style="display:none">
    <div class="dream-stats">
      <div class="dream-stat">
        <div class="dream-stat-label">Finanspolitisk effekt</div>
        <div class="dream-stat-val">${fiscalHtml}</div>
      </div>
      <div class="dream-stat">
        <div class="dream-stat-label">BNP-effekt</div>
        <div class="dream-stat-val">${gdpHtml}</div>
      </div>
      <div class="dream-stat">
        <div class="dream-stat-label">Beskæftigelse</div>
        <div class="dream-stat-val">${empHtml}</div>
      </div>
      <div class="dream-stat">
        <div class="dream-stat-label">Politisk placering</div>
        <div class="dream-stat-val dream-compass-wrap">${compassHtml}</div>
      </div>
    </div>
    <p class="dream-explanation">${impact.explanation || ''}</p>
    <p class="dream-disclaimer">Estimat baseret på DREAM/MAKRO-modelparametre. Ikke officiel analyse.</p>
  </div>
</div>`;
};

VG.rygter._renderFiscalBar = function(fiscalBn) {
  // Positive = cost (red), negative = saving (green)
  const maxBn = 15;
  const pct = Math.min(100, Math.abs(fiscalBn) / maxBn * 100).toFixed(1);
  const isCost = fiscalBn > 0;
  const color = isCost ? 'var(--pos)' : 'var(--neg)';
  const label = isCost
    ? `+${fiscalBn.toFixed(1).replace('.', ',')} mia. kr./år (udgift)`
    : `${fiscalBn.toFixed(1).replace('.', ',')} mia. kr./år (besparelse)`;
  return `<div class="dream-bar-wrap">
    <div class="dream-bar-track">
      <div class="dream-bar-fill" style="width:${pct}%;background:${color}"></div>
    </div>
    <span class="dream-bar-label" style="color:${color}">${label}</span>
  </div>`;
};

VG.rygter._renderCompass = function(score) {
  // score: -100 (very left) to +100 (very right)
  const pct = ((score + 100) / 200 * 100).toFixed(1);
  const markerLeft = Math.max(2, Math.min(98, parseFloat(pct)));
  return `<div class="dream-compass">
    <div class="dream-compass-labels"><span>Venstre</span><span>Højre</span></div>
    <div class="dream-compass-track">
      <div class="dream-compass-marker" style="left:${markerLeft}%"></div>
    </div>
  </div>`;
};

VG.rygter._bindEvents = function(panel) {
  if (panel._vgBound) return;
  panel._vgBound = true;

  panel.addEventListener('click', e => {
    // Filter buttons
    const filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      VG.rygter._filter = filterBtn.dataset.filter;
      VG.rygter._renderContent(panel);
      return;
    }

    // Sort buttons
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) {
      VG.rygter._sort = sortBtn.dataset.sort;
      VG.rygter._renderContent(panel);
      return;
    }

    // Expand DREAM box
    const expandBtn = e.target.closest('.rygte-expand-btn');
    if (expandBtn) {
      const targetId = expandBtn.dataset.target;
      const box = document.getElementById(targetId);
      if (box) {
        const isOpen = box.style.display !== 'none';
        box.style.display = isOpen ? 'none' : 'block';
        expandBtn.setAttribute('aria-expanded', !isOpen);
        expandBtn.textContent = isOpen ? 'DREAM analyse ▾' : 'DREAM analyse ▴';
      }
    }
  });
};
