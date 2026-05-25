VG.dashboard = {};

// ── Widget catalog ────────────────────────────────────────────────────────────
// wide: true  → renders full-width below the metric grid via VG[id].renderInto(el)
const DASH_WIDGETS = [
  {
    id: 'budget',
    icon: '💰',
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
    icon: '📉',
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
    icon: '📈',
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
    icon: '🏦',
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
    icon: '🏠',
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
    icon: '💼',
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
    icon: '📊',
    title: 'Meningsmåling',
    panel: 'meningsmaalinger',
    render() {
      return { big: 'S 20%', sub: 'LA 13% · V 13% · se alle', arrow: null };
    },
  },
  {
    id: 'co2',
    icon: '🌿',
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
    icon: '👥',
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
    icon: '🏛',
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
    icon: '⚖️',
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
    icon: '🚂',
    title: 'DSB Rettidighed',
    panel: 'dsb',
    render() {
      return { big: '83%', sub: 'tog til tiden', status: 'warn', arrow: '→' };
    },
  },
  // ── Wide widgets ─────────────────────────────────────────────────────────────
  {
    id: 'xdeck',
    icon: '𝕏',
    title: 'Politisk Debat',
    wide: true,
    desc: 'Følg politikere, partier og kommentatorer på X — live feeds som kolonner.',
  },
];

const DASH_LS_KEY  = 'vg_dashboard_v2';
const DASH_DEFAULTS = ['budget', 'polls', 'ledighed', 'inflation', 'co2', 'rente'];

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

  // ── Metric cards
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

  // ── Wide widget sections (rendered after grid, each gets a placeholder div)
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
    <div class="dw-grid">
      ${metricCards}
      ${addCard}
    </div>
    ${wideSections}
    ${catalog}
  `;

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
