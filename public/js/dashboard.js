VG.dashboard = {};

// ── Widget definitions ────────────────────────────────────────────────────────
// gs-w / gs-h: default grid size (grid is 12 columns, each cell ~80px tall)
const DASH_WIDGETS = [
  // ── KPI metric widgets (small, 3×2) ──
  {
    id: 'budget', icon: '<i class="ph ph-scales"></i>', title: 'Budgetsaldo',
    panel: 'laboratorium', w: 3, h: 3,
    render() {
      if (!VG.state || !VG.state.current) return { big: '—', sub: 'Indlæser…' };
      const bal = VG.sumRev() - VG.sumExp();
      const pct = (bal / VG.state.baseline.gdp * 100);
      const sign = pct >= 0 ? '+' : '';
      return { big: sign + pct.toFixed(1).replace('.', ',') + '%', sub: 'af BNP', status: bal >= 0 ? 'ok' : 'bad' };
    },
  },
  {
    id: 'ledighed', icon: '<i class="ph ph-hard-hat"></i>', title: 'Ledighed',
    panel: 'ledighed', w: 3, h: 3,
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.unemployment && live.unemployment.value)
        return { big: live.unemployment.value.toLocaleString('da-DK'), sub: 'ledige · ' + (live.unemployment.period || '') };
      return { big: '~93.000', sub: 'ledige (seneste DST)' };
    },
  },
  {
    id: 'inflation', icon: '<i class="ph ph-trend-up"></i>', title: 'Inflation',
    panel: 'inflation', w: 3, h: 3,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.inflation) {
        const v = eco.inflation.yoy != null ? eco.inflation.yoy : eco.inflation.value;
        return { big: v.toFixed(1).replace('.', ',') + '%', sub: eco.inflation.period || '', status: v > 4 ? 'bad' : v > 2 ? 'warn' : 'ok' };
      }
      return { big: '~2,3%', sub: 'forbrugerprisindeks', status: 'ok' };
    },
  },
  {
    id: 'rente', icon: '<i class="ph ph-bank"></i>', title: 'Nationalbankrente',
    panel: 'statsgaeld', w: 3, h: 3,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.nbRate) return { big: eco.nbRate.value.toFixed(2).replace('.', ',') + '%', sub: 'pengepolitisk rente' };
      return { big: '3,35%', sub: 'pengepolitisk rente' };
    },
  },
  {
    id: 'boligpris', icon: '<i class="ph ph-house"></i>', title: 'Boligpriser',
    panel: 'boligmarked', w: 3, h: 3,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.housing) {
        const v = eco.housing.qoq;
        return { big: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%', sub: 'kvartal/kvartal', status: v > 0 ? 'ok' : 'bad' };
      }
      return { big: '+1,2%', sub: 'kvartal/kvartal', status: 'ok' };
    },
  },
  {
    id: 'co2', icon: '<i class="ph ph-leaf"></i>', title: 'CO₂-mål 2030',
    panel: 'co2', w: 3, h: 3,
    render() {
      const cli = VG.livedata && VG.livedata.climate;
      if (cli && cli.co2 && cli.co2.target2030) {
        const pct = Math.round((1 - cli.co2.value / cli.co2.target2030) * 100);
        return { big: pct + '%', sub: 'reduktion siden 1990', status: pct >= 70 ? 'ok' : pct >= 50 ? 'warn' : 'bad' };
      }
      return { big: '~38 Mton', sub: 'CO₂-ækvivalenter 2024', status: 'warn' };
    },
  },
  {
    id: 'polls', icon: '<i class="ph ph-chart-bar"></i>', title: 'Meningsmåling',
    panel: 'meningsmaalinger', w: 3, h: 3,
    render() { return { big: 'S 20%', sub: 'LA 13% · V 13%' }; },
  },
  {
    id: 'loenvaekst', icon: '<i class="ph ph-briefcase"></i>', title: 'Lønvækst',
    panel: 'indkomst', w: 3, h: 3,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.wageGrowth) {
        const v = eco.wageGrowth.yoy;
        return { big: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%', sub: 'nominelt år/år', status: v > 0 ? 'ok' : 'bad' };
      }
      return { big: '+3,8%', sub: 'nominelt år/år', status: 'ok' };
    },
  },
  {
    id: 'befolkning', icon: '<i class="ph ph-users"></i>', title: 'Befolkning',
    panel: 'demographics', w: 3, h: 3,
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.population && live.population.value)
        return { big: live.population.value.toLocaleString('da-DK'), sub: live.population.period || '' };
      return { big: '6.031.247', sub: '2026K2' };
    },
  },
  {
    id: 'folketing', icon: '<i class="ph ph-buildings"></i>', title: 'Folketing',
    panel: 'folketing', w: 3, h: 3,
    render() {
      const bills = VG.state && VG.state.live && VG.state.live.activeBills ? VG.state.live.activeBills.length : '—';
      return { big: String(bills), sub: 'aktive afstemninger' };
    },
  },
  {
    id: 'gini', icon: '<i class="ph ph-scales"></i>', title: 'Ulighed',
    panel: 'ligestilling', w: 3, h: 3,
    render() {
      const ineq = VG.livedata && VG.livedata.inequality;
      if (ineq && ineq.gini) return { big: ineq.gini.value.toFixed(3), sub: 'Gini-koefficient' };
      return { big: '0,292', sub: 'Gini-koefficient' };
    },
  },
  {
    id: 'dsb', icon: '<i class="ph ph-train"></i>', title: 'DSB Rettidighed',
    panel: 'dsb', w: 3, h: 3,
    render() { return { big: '83%', sub: 'tog til tiden', status: 'warn' }; },
  },
  {
    id: 'sundhed', icon: '<i class="ph ph-first-aid"></i>', title: 'Sundhed', panel: 'sundhed', w: 3, h: 3, render() { return { big: '184 mia', sub: 'sundhedsudgifter/år' }; } },
  { id: 'ventetider', icon: '<i class="ph ph-clock"></i>', title: 'Ventetider', panel: 'ventetider', w: 3, h: 3, render() { return { big: '18%', sub: 'venter over 2 mdr.', status: 'warn' }; } },
  { id: 'aeldrepleje', icon: '<i class="ph ph-heart"></i>', title: 'Ældrepleje', panel: 'aeldrepleje', w: 3, h: 3, render() { return { big: '135k', sub: 'modtagere af hjemmehjælp' }; } },
  { id: 'psykiatri', icon: '<i class="ph ph-brain"></i>', title: 'Psykiatri', panel: 'psykiatri', w: 3, h: 3, render() { return { big: '2,1 år', sub: 'ventetid børn & unge', status: 'bad' }; } },
  { id: 'uddannelse', icon: '<i class="ph ph-graduation-cap"></i>', title: 'Uddannelse', panel: 'uddannelse', w: 3, h: 3, render() { return { big: '560k', sub: 'folkeskoleelever' }; } },
  { id: 'forsvar', icon: '<i class="ph ph-shield"></i>', title: 'Forsvar', panel: 'forsvar', w: 3, h: 3, render() { return { big: '1,65%', sub: 'af BNP · NATO-mål 3%', status: 'warn' }; } },
  { id: 'statsgaeld', icon: '<i class="ph ph-bank"></i>', title: 'Statsgæld', panel: 'statsgaeld', w: 3, h: 3, render() { return { big: '29%', sub: 'af BNP', status: 'ok' }; } },
  { id: 'erhverv', icon: '<i class="ph ph-briefcase"></i>', title: 'Erhverv', panel: 'erhverv', w: 3, h: 3, render() { return { big: '+2,3%', sub: 'BNP-vækst', status: 'ok' }; } },

  // ── Content widgets (larger) ──
  {
    id: 'danmarkidag',
    icon: '<i class="ph ph-newspaper"></i>',
    title: 'Danmark i dag',
    panel: 'rygter',
    w: 6, h: 5,
    content: 'news',
  },
  {
    id: 'aiinsights',
    icon: '<i class="ph ph-sparkle"></i>',
    title: 'AI Indsigter',
    panel: 'feed',
    w: 6, h: 5,
    content: 'insights',
  },
  {
    id: 'reddit',
    icon: '<i class="ph ph-reddit-logo"></i>',
    title: 'Reddit Danmark',
    panel: 'reddit',
    w: 6, h: 6,
    content: 'reddit',
  },
  {
    id: 'xdeck',
    icon: '<i class="ph ph-x-logo"></i>',
    title: 'X feed',
    panel: null,
    w: 6, h: 8,
    content: 'xdeck',
  },
];

const DASH_LS_KEY      = 'vg_dashboard_v4';
const DASH_LAYOUT_KEY  = 'vg_dashboard_layout_v4';
const DASH_DEFAULTS    = ['budget', 'ledighed', 'inflation', 'rente', 'co2', 'polls', 'danmarkidag', 'aiinsights', 'xdeck'];

const STATUS_CLS = { ok: 'dw-ok', warn: 'dw-warn', bad: 'dw-bad' };
const SRC_CLS    = { DR: 'source-dr', TV2: 'source-tv2', JP: 'source-jp', Berlingske: 'source-berlingske', Politiken: 'source-politiken', Weekendavisen: 'source-weekendavisen' };

VG.dashboard.getCatalog = () => DASH_WIDGETS;

VG.dashboard.getActive = function() {
  try {
    const s = JSON.parse(localStorage.getItem(DASH_LS_KEY));
    return Array.isArray(s) && s.length ? s : [...DASH_DEFAULTS];
  } catch(e) { return [...DASH_DEFAULTS]; }
};
VG.dashboard.saveActive = ids => localStorage.setItem(DASH_LS_KEY, JSON.stringify(ids));

VG.dashboard.getLayout = function() {
  try { return JSON.parse(localStorage.getItem(DASH_LAYOUT_KEY)) || {}; } catch(e) { return {}; }
};
VG.dashboard.saveLayout = function(items) {
  const layout = {};
  items.forEach(item => {
    if (item.id) layout[item.id] = { x: item.x, y: item.y, w: item.w, h: item.h };
  });
  localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout));
};

VG.dashboard.load = function() {
  const panel = document.getElementById('panel-dashboard');
  if (!panel) return;
  panel._dashEditMode = false;
  VG.dashboard.renderPanel();
};

VG.dashboard._grid = null;

VG.dashboard.renderPanel = function() {
  const panel   = document.getElementById('panel-dashboard');
  if (!panel) return;
  const editing  = !!panel._dashEditMode;
  const activeIds = VG.dashboard.getActive();
  const byId     = Object.fromEntries(DASH_WIDGETS.map(w => [w.id, w]));
  const active   = activeIds.map(id => byId[id]).filter(Boolean);
  const inactive = DASH_WIDGETS.filter(w => !activeIds.includes(w.id));
  const savedLayout = VG.dashboard.getLayout();

  // Destroy old grid instance
  if (VG.dashboard._grid) {
    try { VG.dashboard._grid.destroy(false); } catch(e) {}
    VG.dashboard._grid = null;
  }

  // ── Build catalog (shown in edit mode)
  const catalogHtml = editing ? `
    <div class="dw-catalog-section">
      <div class="dw-catalog-hd">Tilgængelige widgets — klik for at tilføje</div>
      <div class="dw-catalog-grid">
        ${inactive.map(w => `
          <button class="dw-catalog-item" data-add="${w.id}">
            <span class="dw-cat-icon">${w.icon}</span>
            <div class="dw-cat-info">
              <span class="dw-cat-name">${w.title}</span>
            </div>
            <span class="dw-cat-plus">+</span>
          </button>`).join('')}
        ${inactive.length === 0 ? '<p class="dw-catalog-empty">Alle widgets er tilføjet.</p>' : ''}
      </div>
    </div>` : '';

  panel.innerHTML = `
    <div class="dw-toolbar">
      <div class="dw-toolbar-left">
        <h2 class="dw-toolbar-title">Dashboard</h2>
        <p class="dw-toolbar-sub">${editing ? 'Træk for at flytte · Træk i hjørnet for at ændre størrelse' : 'Klik Tilpas for at redigere layoutet'}</p>
      </div>
      <div class="dw-toolbar-right">
        ${editing ? '<button class="dw-edit-btn active" id="dw-edit-btn"><i class="ph ph-check"></i> Gem layout</button>' : '<button class="dw-edit-btn" id="dw-edit-btn"><i class="ph ph-sliders-horizontal"></i> Tilpas</button>'}
      </div>
    </div>
    ${catalogHtml}
    <div class="grid-stack dw-gridstack" id="dw-gridstack"></div>`;

  // ── Init GridStack
  const gs = GridStack.init({
    cellHeight: 80,
    margin: 8,
    column: 12,
    animate: true,
    draggable: { handle: '.dw-card-header' },
    resizable: { handles: 'se' },
    disableDrag: !editing,
    disableResize: !editing,
  }, '#dw-gridstack');
  VG.dashboard._grid = gs;

  // ── Add widgets
  active.forEach(w => {
    const saved = savedLayout[w.id];
    const x = saved ? saved.x : undefined;
    const y = saved ? saved.y : undefined;
    const ww = saved ? saved.w : w.w;
    const hh = saved ? saved.h : w.h;

    const sc = w.render ? (STATUS_CLS[w.render().status] || '') : '';
    const removeBtn = editing ? `<button class="dw-card-remove" data-remove="${w.id}" title="Fjern"><i class="ph ph-x"></i></button>` : '';
    const gotoBtn = w.panel && !editing ? `<button class="dw-card-goto" data-goto="${w.panel}" title="Åbn panel"><i class="ph ph-arrow-square-out"></i></button>` : '';

    let body = '';
    if (w.content === 'news') {
      body = `<div class="dw-news-body" id="dw-news-body">
        <div class="dw-skeleton"></div><div class="dw-skeleton"></div><div class="dw-skeleton"></div>
      </div>`;
    } else if (w.content === 'insights') {
      body = `<div class="dw-insights-body" id="dw-insights-body"></div>`;
    } else if (w.content === 'xdeck') {
      body = `<div class="dw-xdeck-body" id="dw-xdeck-body"></div>`;
    } else if (w.content === 'reddit') {
      body = `<div class="dw-reddit-body" id="dw-reddit-body"><p class="dw-loading">Henter Reddit…</p></div>`;
    } else if (w.render) {
      const d = w.render();
      body = `
        <div class="dw-kpi-big ${sc}">${d.big}</div>
        <div class="dw-kpi-sub">${d.sub || ''}</div>`;
    }

    const el = document.createElement('div');
    el.className = `grid-stack-item${editing ? '' : ' dw-static'}`;
    el.setAttribute('gs-w', ww); el.setAttribute('gs-h', hh);
    if (x !== undefined) el.setAttribute('gs-x', x);
    if (y !== undefined) el.setAttribute('gs-y', y);
    el.setAttribute('gs-id', w.id);
    el.innerHTML = `
      <div class="grid-stack-item-content">
        <div class="dw-card-inner ${sc}">
          <div class="dw-card-header">
            <span class="dw-card-icon">${w.icon}</span>
            <span class="dw-card-title">${w.title}</span>
            <div class="dw-card-actions">${gotoBtn}${removeBtn}</div>
          </div>
          <div class="dw-card-body">${body}</div>
        </div>
      </div>`;
    gs.makeWidget(el);
    document.getElementById('dw-gridstack').appendChild(el);
  });

  // ── Save layout on change
  gs.on('change', (e, items) => VG.dashboard.saveLayout(gs.save(false)));

  // ── Fill content widgets
  VG.dashboard._fillNews();
  VG.dashboard._fillInsights();
  VG.dashboard._fillXdeck();
  VG.dashboard._fillReddit();

  // ── Edit mode toggle
  document.getElementById('dw-edit-btn').onclick = () => {
    panel._dashEditMode = !panel._dashEditMode;
    if (!panel._dashEditMode) VG.dashboard.saveLayout(gs.save(false));
    VG.dashboard.renderPanel();
  };

  // ── Add / Remove
  panel.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
    const ids = VG.dashboard.getActive();
    if (!ids.includes(btn.dataset.add)) { VG.dashboard.saveActive([...ids, btn.dataset.add]); VG.dashboard.renderPanel(); }
  });
  panel.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => {
    VG.dashboard.saveActive(VG.dashboard.getActive().filter(id => id !== btn.dataset.remove));
    VG.dashboard.renderPanel();
  });
  panel.querySelectorAll('[data-goto]').forEach(btn => btn.onclick = () => {
    window.__mkClick && window.__mkClick(btn.dataset.goto);
  });
};

// ── Content fillers ──────────────────────────────────────────────────────────
VG.dashboard._fillNews = function() {
  const el = document.getElementById('dw-news-body');
  if (!el) return;
  fetch('/api/news')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ items }) => {
      if (!items || !items.length) { el.innerHTML = '<p class="dw-empty">Ingen nyheder</p>'; return; }
      el.innerHTML = items.slice(0, 6).map(n => {
        const sc = SRC_CLS[n.source] || 'source-dr';
        return `<div class="dw-news-item" onclick="window.__mkClick && window.__mkClick('${n.panel}')">
          <div class="dw-news-meta"><span class="rygte-source-badge ${sc}">${n.source}</span><span class="dw-news-age">${n.age || ''}</span></div>
          <div class="dw-news-hl">${n.headline}</div>
          <div class="dw-news-topic">${n.topicLabel}</div>
        </div>`;
      }).join('');
    })
    .catch(() => { if (el) el.innerHTML = '<p class="dw-empty">Nyheder utilgængelige</p>'; });
};

VG.dashboard._fillInsights = function() {
  const el = document.getElementById('dw-insights-body');
  if (!el || !VG.feed || !VG.feed._generateInsights) return;
  const insights = VG.feed._generateInsights().slice(0, 4);
  if (!insights.length) { el.innerHTML = '<p class="dw-empty">Ingen indsigter</p>'; return; }
  el.innerHTML = insights.map(item => {
    const voteHtml = VG.votes ? VG.votes.renderBar(item.id, item.basePos, item.baseNeg) : '';
    return `<div class="dw-insight-item" onclick="window.__mkClick && window.__mkClick('${item.panel}')">
      <div class="dw-insight-hl">${item.headline}</div>
      ${voteHtml}
    </div>`;
  }).join('');
};

VG.dashboard._fillXdeck = function() {
  const el = document.getElementById('dw-xdeck-body');
  if (!el || !VG.xdeck) return;
  VG.xdeck.renderInto(el);
};

VG.dashboard._fillReddit = function() {
  const el = document.getElementById('dw-reddit-body');
  if (!el || !VG.reddit) return;
  // Inline mini-render: just show top 5 posts
  fetch('https://www.reddit.com/r/denmark/hot.json?limit=8&raw_json=1')
    .then(r => r.json())
    .then(data => {
      const posts = (data.data.children || []).map(c => c.data).filter(p => !p.stickied).slice(0, 6);
      el.innerHTML = posts.map(p => `
        <a class="dw-reddit-item" href="https://reddit.com${p.permalink}" target="_blank" rel="noopener">
          <div class="dw-reddit-hl">${p.title}</div>
          <div class="dw-reddit-meta">${(p.score || 0).toLocaleString('da-DK')} point · ${p.num_comments || 0} kommentarer</div>
        </a>`).join('');
    })
    .catch(() => { el.innerHTML = '<p class="dw-empty">Reddit utilgængeligt</p>'; });
};
