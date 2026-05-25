VG.dashboard = {};

// ── Widget catalog ────────────────────────────────────────────────────────────
// wide: true  → renders full-width below the metric grid via VG[id].renderInto(el)
const DASH_WIDGETS = [
  {
    id: 'budget',
    icon: '<i class="ph ph-scales"></i>',
    title: 'Budgetsaldo',
    panel: 'laboratorium',
    render() {
      if (!VG.state || !VG.state.current) return { big: '—', sub: 'Indlæser…' };
      const bal = VG.sumRev() - VG.sumExp();
      const bnp = VG.state.baseline.gdp;
      const pct = (bal / bnp * 100);
      const sign = pct >= 0 ? '+' : '';
      return {
        big: sign + pct.toFixed(1).replace('.', ',') + '%',
        sub: 'af BNP · ' + (bal >= 0 ? '+' : '') + Math.round(bal * 10) / 10 + ' mia kr',
        status: bal >= 0 ? 'ok' : 'bad',
        arrow: bal >= 0 ? '↗' : '↘',
      };
    },
  },
  {
    id: 'ledighed',
    icon: '<i class="ph ph-trend-down"></i>',
    title: 'Ledighed',
    panel: 'ledighed',
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.unemployment && live.unemployment.value) {
        return { big: live.unemployment.value.toLocaleString('da-DK'), sub: 'ledige · ' + (live.unemployment.period || ''), arrow: null };
      }
      return { big: '~93.000', sub: 'ledige (seneste DST)', arrow: null };
    },
  },
  {
    id: 'inflation',
    icon: '<i class="ph ph-trend-up"></i>',
    title: 'Inflation',
    panel: 'inflation',
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.inflation) {
        const v = eco.inflation.yoy != null ? eco.inflation.yoy : eco.inflation.value;
        const status = v > 4 ? 'bad' : v > 2 ? 'warn' : 'ok';
        return { big: v.toFixed(1).replace('.', ',') + '%', sub: 'forbrugerprisindeks · ' + (eco.inflation.period || ''), status, arrow: v > 3 ? '↑' : '→' };
      }
      return { big: '~2,3%', sub: 'forbrugerprisindeks', status: 'ok', arrow: '→' };
    },
  },
  {
    id: 'rente',
    icon: '<i class="ph ph-bank"></i>',
    title: 'Nationalbankrente',
    panel: 'statsgaeld',
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.nbRate) {
        return { big: eco.nbRate.value.toFixed(2).replace('.', ',') + '%', sub: 'pengepolitisk rente', arrow: null };
      }
      return { big: '3,35%', sub: 'pengepolitisk rente', arrow: null };
    },
  },
  {
    id: 'boligpris',
    icon: '<i class="ph ph-house"></i>',
    title: 'Boligpriser',
    panel: 'boligmarked',
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.housing) {
        const v = eco.housing.qoq;
        const sign = v >= 0 ? '+' : '';
        return { big: sign + v.toFixed(1).replace('.', ',') + '%', sub: 'kvartal-over-kvartal', status: v > 0 ? 'ok' : 'bad', arrow: v > 0 ? '↑' : '↓' };
      }
      return { big: '+1,2%', sub: 'kvartal-over-kvartal', status: 'ok', arrow: '↑' };
    },
  },
  {
    id: 'loenvaekst',
    icon: '<i class="ph ph-briefcase"></i>',
    title: 'Lønvækst',
    panel: 'indkomst',
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.wageGrowth) {
        const v = eco.wageGrowth.yoy;
        const sign = v >= 0 ? '+' : '';
        return { big: sign + v.toFixed(1).replace('.', ',') + '%', sub: 'nominelt år/år', status: v > 0 ? 'ok' : 'bad', arrow: v > 0 ? '↗' : '↘' };
      }
      return { big: '+3,8%', sub: 'nominelt år/år', status: 'ok', arrow: '↗' };
    },
  },
  {
    id: 'polls',
    icon: '<i class="ph ph-chart-bar"></i>',
    title: 'Meningsmåling',
    panel: 'meningsmaalinger',
    render() {
      return { big: 'S 20%', sub: 'LA 13% · V 13% · se alle', arrow: null };
    },
  },
  {
    id: 'co2',
    icon: '<i class="ph ph-leaf"></i>',
    title: 'CO₂-mål 2030',
    panel: 'co2',
    render() {
      const cli = VG.livedata && VG.livedata.climate;
      if (cli && cli.co2) {
        const v = cli.co2.value;
        const goal = cli.co2.target2030;
        if (goal) {
          const pct = Math.round((1 - v / goal) * 100);
          return { big: pct + '%', sub: 'reduktion siden 1990 · mål 70%', status: pct >= 70 ? 'ok' : pct >= 50 ? 'warn' : 'bad', arrow: '↘' };
        }
        return { big: v.toFixed(0) + ' Mton', sub: 'CO₂-ækvivalenter', arrow: '↘' };
      }
      return { big: '~38 Mton', sub: 'CO₂-ækvivalenter 2024', status: 'warn', arrow: '↘' };
    },
  },
  {
    id: 'befolkning',
    icon: '<i class="ph ph-users"></i>',
    title: 'Befolkning',
    panel: 'demographics',
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.population && live.population.value) {
        return { big: live.population.value.toLocaleString('da-DK'), sub: live.population.period || '', arrow: null };
      }
      return { big: '5.973.000', sub: 'seneste opgørelse', arrow: null };
    },
  },
  {
    id: 'folketing',
    icon: '<i class="ph ph-buildings"></i>',
    title: 'Folketing',
    panel: 'folketing',
    render() {
      const live = VG.state && VG.state.live;
      const bills = live && live.activeBills ? live.activeBills.length : '—';
      return { big: String(bills), sub: 'aktive afstemninger', arrow: null };
    },
  },
  {
    id: 'gini',
    icon: '<i class="ph ph-scales"></i>',
    title: 'Ulighed',
    panel: 'ligestilling',
    render() {
      const ineq = VG.livedata && VG.livedata.inequality;
      if (ineq && ineq.gini) {
        return { big: ineq.gini.value.toFixed(3), sub: 'Gini-koefficient', arrow: null };
      }
      return { big: '0,292', sub: 'Gini-koefficient', arrow: null };
    },
  },
  {
    id: 'dsb',
    icon: '<i class="ph ph-train"></i>',
    title: 'DSB Rettidighed',
    panel: 'dsb',
    render() {
      return { big: '83%', sub: 'tog til tiden', status: 'warn', arrow: '→' };
    },
  },
  {
    id: 'reddit',
    icon: '<i class="ph ph-reddit-logo"></i>',
    title: 'Reddit Danmark',
    panel: 'reddit',
    render() {
      return { big: 'r/Denmark', sub: 'hot topics live', arrow: null };
    },
  },
  // ── Extra panel widgets ───────────────────────────────────────────────────────
  { id: 'demographics', icon: '<i class="ph ph-users"></i>', title: 'Demografi', panel: 'demographics', render() { return { big: '6,03 mio', sub: 'indbyggere i Danmark', arrow: null }; }},
  { id: 'sundhed',      icon: '<i class="ph ph-first-aid"></i>', title: 'Sundhed', panel: 'sundhed', render() { return { big: '184 mia', sub: 'sundhedsudgifter/år', arrow: null }; }},
  { id: 'ventetider',   icon: '<i class="ph ph-clock"></i>', title: 'Ventetider', panel: 'ventetider', render() { return { big: '18%', sub: 'venter over 2 mdr.', status: 'warn', arrow: null }; }},
  { id: 'aeldrepleje',  icon: '<i class="ph ph-heart"></i>', title: 'Ældrepleje', panel: 'aeldrepleje', render() { return { big: '135k', sub: 'modtagere af hjemmehjælp', arrow: null }; }},
  { id: 'psykiatri',    icon: '<i class="ph ph-brain"></i>', title: 'Psykiatri', panel: 'psykiatri', render() { return { big: '2,1 år', sub: 'ventetid børn & unge', status: 'bad', arrow: null }; }},
  { id: 'uddannelse',   icon: '<i class="ph ph-graduation-cap"></i>', title: 'Uddannelse', panel: 'uddannelse', render() { return { big: '560k', sub: 'folkeskoleelever', arrow: null }; }},
  { id: 'integration',  icon: '<i class="ph ph-globe"></i>', title: 'Integration', panel: 'integration', render() { return { big: '15,2%', sub: 'af befolkning er indvandrere/efterkommere', arrow: null }; }},
  { id: 'kriminalitet', icon: '<i class="ph ph-siren"></i>', title: 'Kriminalitet', panel: 'kriminalitet', render() { return { big: '↓31%', sub: 'siden 2005', status: 'ok', arrow: null }; }},
  { id: 'forsvar',      icon: '<i class="ph ph-shield"></i>', title: 'Forsvar', panel: 'forsvar', render() { return { big: '1,65%', sub: 'af BNP · NATO-mål 3%', status: 'warn', arrow: null }; }},
  { id: 'landbrug',     icon: '<i class="ph ph-plant"></i>', title: 'Landbrug', panel: 'landbrug', render() { return { big: '175 mia', sub: 'eksport om året', arrow: null }; }},
  { id: 'statsgaeld',   icon: '<i class="ph ph-bank"></i>', title: 'Statsgæld', panel: 'statsgaeld', render() { return { big: '29%', sub: 'af BNP', status: 'ok', arrow: null }; }},
  { id: 'erhverv',      icon: '<i class="ph ph-briefcase"></i>', title: 'Erhverv', panel: 'erhverv', render() { return { big: '+2,3%', sub: 'BNP-vækst', status: 'ok', arrow: null }; }},
  // ── Wide widgets ─────────────────────────────────────────────────────────────
  {
    id: 'xdeck',
    icon: '<i class="ph ph-x-logo"></i>',
    title: 'Politisk Debat',
    wide: true,
    desc: 'Følg politikere, partier og kommentatorer på X — live feeds som kolonner.',
  },
];

const DASH_LS_KEY  = 'vg_dashboard_v2';
const DASH_DEFAULTS = ['budget', 'polls', 'ledighed', 'inflation', 'co2', 'rente'];

// ── Source badge colour map ───────────────────────────────────────────────────
const DASH_SRC_CLS = {
  DR: 'source-dr',
  TV2: 'source-tv2',
  JP: 'source-jp',
  Berlingske: 'source-berlingske',
  Politiken: 'source-politiken',
  Weekendavisen: 'source-weekendavisen',
};

VG.dashboard.getCatalog = () => DASH_WIDGETS;
VG.dashboard.getActive  = function() {
  try {
    const s = JSON.parse(localStorage.getItem(DASH_LS_KEY));
    return Array.isArray(s) && s.length ? s : [...DASH_DEFAULTS];
  } catch(e) { return [...DASH_DEFAULTS]; }
};
VG.dashboard.saveActive = ids => localStorage.setItem(DASH_LS_KEY, JSON.stringify(ids));

VG.dashboard.load = function() {
  const panel = document.getElementById('panel-dashboard');
  if (!panel) return;
  panel._dashEditMode = false;
  VG.dashboard.renderPanel();
};

VG.dashboard.renderPanel = function() {
  const panel = document.getElementById('panel-dashboard');
  if (!panel) return;

  const activeIds = VG.dashboard.getActive();
  const editing   = !!panel._dashEditMode;
  const byId      = Object.fromEntries(DASH_WIDGETS.map(w => [w.id, w]));
  const active    = activeIds.map(id => byId[id]).filter(Boolean);
  const inactive  = DASH_WIDGETS.filter(w => !activeIds.includes(w.id));

  const metricWidgets = active.filter(w => !w.wide);
  const wideWidgets   = active.filter(w =>  w.wide);

  const statusClass = { ok: 'dw-ok', warn: 'dw-warn', bad: 'dw-bad' };

  // ── Section 1 — Danmark i dag (news cards)
  const todaySection = `
    <section class="dash-today-section">
      <div class="dash-today-hd">
        <div>
          <h2 class="dash-today-title">Danmark i dag</h2>
          <p class="dash-today-sub">Aktuelle nyheder fra DR, TV2, JP, Berlingske, Politiken og Weekendavisen — klik for data bag historien</p>
        </div>
        <span class="dash-today-ts" id="dash-today-ts"></span>
      </div>
      <div class="dash-today-grid" id="dash-today-grid">
        <div class="dash-today-skeleton"></div>
        <div class="dash-today-skeleton"></div>
        <div class="dash-today-skeleton"></div>
        <div class="dash-today-skeleton"></div>
      </div>
    </section>`;

  // ── Section 2 — AI Insights strip
  let insightsHtml = '';
  if (VG.feed && VG.feed._generateInsights) {
    const insights = VG.feed._generateInsights().slice(0, 3);
    const tagCls = { alert: 'ft-alert', warn: 'ft-warn', ok: 'ft-ok', info: 'ft-info' };
    const cards = insights.map(item => {
      const tc = tagCls[item.tagType] || 'ft-info';
      const voteHtml = VG.votes ? VG.votes.renderBar(item.id, item.basePos, item.baseNeg) : '';
      return `
        <div class="dash-insight-card">
          <div class="dash-insight-title">
            <span class="feed-tag ${tc}" style="margin-right:6px">${item.tag}</span>
            ${item.headline}
          </div>
          <div class="dash-insight-body">${item.body}</div>
          <div class="dash-insight-foot">
            ${voteHtml}
            <button class="feed-explore" data-goto="${item.panel}" style="flex-shrink:0">Se data →</button>
          </div>
        </div>`;
    }).join('');
    insightsHtml = `
      <section class="dash-insights-section">
        <div class="dash-section-hd">
          <h3 class="dash-section-title"><i class="ph ph-sparkle"></i> AI Indsigter</h3>
          <button class="dash-section-more" data-goto="feed">Se alle →</button>
        </div>
        <div class="dash-insights-strip">${cards}</div>
      </section>`;
  }

  // ── Section 3 — Metric cards
  const metricCards = metricWidgets.map(w => {
    const d  = w.render();
    const sc = statusClass[d.status] || '';
    return `
      <div class="dw-card ${sc}" data-wid="${w.id}">
        ${editing ? `<button class="dw-remove" data-remove="${w.id}" title="Fjern">×</button>` : ''}
        <div class="dw-icon">${w.icon}</div>
        <div class="dw-big">${d.big}${d.arrow ? ` <span class="dw-arrow">${d.arrow}</span>` : ''}</div>
        <div class="dw-title">${w.title}</div>
        <div class="dw-sub">${d.sub}</div>
        ${!editing ? `<button class="dw-goto" data-goto="${w.panel}" title="Åbn ${w.title}">→</button>` : ''}
      </div>`;
  }).join('');

  const addCard = !editing ? `
    <div class="dw-add-card" id="dw-add-open">
      <span class="dw-add-plus">+</span>
      <span class="dw-add-lbl">Tilpas dashboard</span>
    </div>` : '';

  // ── Wide widget sections
  const wideSections = wideWidgets.map(w => `
    <div class="dw-wide-section" data-wide="${w.id}">
      <div class="dw-wide-hd">
        <span class="dw-wide-icon">${w.icon}</span>
        <span class="dw-wide-title">${w.title}</span>
        ${editing ? `<button class="dw-remove dw-wide-remove" data-remove="${w.id}" title="Fjern">× Fjern</button>` : ''}
      </div>
      <div class="dw-wide-body" id="dw-wide-body-${w.id}"></div>
    </div>`).join('');

  // ── Catalog (shown only in edit mode)
  const catalog = editing ? `
    <div class="dw-catalog-section">
      <div class="dw-catalog-hd">Tilgængelige widgets</div>
      <div class="dw-catalog-grid">
        ${inactive.map(w => `
          <button class="dw-catalog-item${w.wide ? ' dw-catalog-wide' : ''}" data-add="${w.id}">
            <span class="dw-cat-icon">${w.icon}</span>
            <div class="dw-cat-info">
              <span class="dw-cat-name">${w.title}</span>
              ${w.wide ? `<span class="dw-cat-badge">Bred widget</span>` : ''}
            </div>
            <span class="dw-cat-plus">+</span>
          </button>`).join('')}
        ${inactive.length === 0 ? '<p class="dw-catalog-empty">Alle widgets er allerede tilføjet.</p>' : ''}
      </div>
    </div>` : '';

  // ── Section 4 — Alle Emner hub grid
  const hubSection = VG.render && VG.render.hubGrid ? VG.render.hubGrid() : '';

  panel.innerHTML = `
    <div class="dash-toolbar">
      <div>
        <h2 class="dash-page-title">Mit Dashboard</h2>
        <p class="dash-page-sub">Din personlige oversigt — vælg de nøgletal og feeds du vil følge.</p>
      </div>
      <button class="dash-edit-btn${editing ? ' active' : ''}" id="dash-edit-btn">
        ${editing ? '✓ Gem' : '✎ Tilpas'}
      </button>
    </div>
    ${todaySection}
    ${insightsHtml}
    <div class="dw-grid">
      ${metricCards}
      ${addCard}
    </div>
    ${wideSections}
    ${catalog}
    ${hubSection}
  `;

  // ── Load news after HTML is injected
  VG.dashboard._loadNews();

  // ── Render wide widget bodies after HTML is injected
  wideWidgets.forEach(w => {
    const body = panel.querySelector(`#dw-wide-body-${w.id}`);
    if (!body) return;
    if (w.id === 'xdeck' && VG.xdeck) VG.xdeck.renderInto(body);
  });

  // ── Event bindings
  panel.querySelector('#dash-edit-btn').onclick = () => {
    panel._dashEditMode = !panel._dashEditMode;
    VG.dashboard.renderPanel();
  };
  const addBtn = panel.querySelector('#dw-add-open');
  if (addBtn) addBtn.onclick = () => { panel._dashEditMode = true; VG.dashboard.renderPanel(); };

  panel.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => {
    VG.dashboard.saveActive(VG.dashboard.getActive().filter(id => id !== btn.dataset.remove));
    VG.dashboard.renderPanel();
  });
  panel.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
    const ids = VG.dashboard.getActive();
    if (!ids.includes(btn.dataset.add)) {
      VG.dashboard.saveActive([...ids, btn.dataset.add]);
      VG.dashboard.renderPanel();
    }
  });
  panel.querySelectorAll('[data-goto]').forEach(btn => btn.onclick = () => {
    window.__mkClick && window.__mkClick(btn.dataset.goto);
  });
};

// ── Load live news into #dash-today-grid ─────────────────────────────────────
VG.dashboard._loadNews = function() {
  const grid = document.getElementById('dash-today-grid');
  const ts   = document.getElementById('dash-today-ts');
  if (!grid) return;

  fetch('/api/news')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ items, fetchedAt }) => {
      if (!items || !items.length) {
        grid.innerHTML = '<p class="today-empty">Ingen aktuelle nyheder fundet — prøv igen om lidt.</p>';
        return;
      }
      const stat = VG.render && VG.render._todayStats ? VG.render._todayStats : {};
      grid.innerHTML = items.map(n => {
        const srcClass = DASH_SRC_CLS[n.source] || 'source-dr';
        const ageBadge = n.age ? `<span class="dash-news-age">${n.age}</span>` : '';
        const voteHtml = VG.votes ? VG.votes.renderBar('dash-news-' + (n.id || n.panel), 10, 3) : '';
        const topicStat = stat[n.panel] || '';
        return `
          <div class="dash-news-card" onclick="window.__mkClick && window.__mkClick('${n.panel}')">
            <div class="dash-news-meta">
              <span class="rygte-source-badge ${srcClass}">${n.source}</span>
              ${ageBadge}
            </div>
            <div class="dash-news-headline">${n.headline}</div>
            ${topicStat ? `<div class="dash-news-topic">${n.topicLabel}</div><div class="dash-news-cta">${topicStat}</div>` : `<div class="dash-news-topic">${n.topicLabel}</div><div class="dash-news-cta">Se data og statistik</div>`}
            <div class="dash-news-card-foot">
              ${voteHtml}
            </div>
          </div>`;
      }).join('');
      if (ts && fetchedAt) {
        const t = new Date(fetchedAt);
        ts.textContent = `Opdateret ${t.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
      }
    })
    .catch(() => {
      if (grid) grid.innerHTML = '<p class="today-empty">Nyheder utilgængelige — brug menuen til at navigere.</p>';
    });
};
