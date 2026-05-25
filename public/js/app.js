VG.toast = function(msg, duration = 2500) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(VG.toast._t);
  VG.toast._t = setTimeout(() => el.classList.remove('show'), duration);
};

VG.showModal = function(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-backdrop').classList.add('show');
};

VG.closeModal = function() {
  document.getElementById('modal-backdrop').classList.remove('show');
};

VG.actions = {};

VG.actions.showChanges = function() {
  const changes = VG.getChanges();
  const bal = VG.sumRev() - VG.sumExp();
  let html = '';
  if (!changes.length) {
    html = '<p>Du har ikke ændret noget endnu. Gå til "Politiske valg" eller "Udgifter/Indtægter" for at justere på budgettet.</p>';
  } else {
    html = `<p><strong>Resultat:</strong> Saldo ${VG.fmtSigned(bal)} kr/år (${VG.ppct(bal/VG.state.baseline.gdp*100)} af BNP).</p><div style="background:var(--surface-2);padding:12px 14px;border-radius:var(--radius);font-size:12px;margin-top:12px;max-height:280px;overflow-y:auto">`;
    changes.forEach(c => {
      html += `<div style="padding:4px 0">• <strong>${c.name}:</strong> ${c.from} → ${c.to}</div>`;
    });
    html += '</div>';
  }
  VG.showModal('Dine ændringer', html);
};

VG.actions.share = function() {
  const url = VG.share.getURL();
  const html = `<p>Kopier dette link for at dele dit budget. Modtageren ser præcis dine valg.</p>
    <input type="text" class="share-input" value="${url}" readonly id="share-url">
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" id="btn-copy-url">Kopier link</button>
      <button class="btn" id="btn-twitter">Del på X</button>
    </div>
    <p style="font-size:12px;color:var(--text-2);margin-top:14px">Linket indeholder kun dine ændringer fra basisbudgettet — ikke personlige data.</p>`;
  VG.showModal('Del dit budget', html);
  setTimeout(() => {
    document.getElementById('share-url').select();
    document.getElementById('btn-copy-url').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        VG.toast('Link kopieret');
      } catch {
        VG.toast('Kunne ikke kopiere. Marker og kopier manuelt.');
      }
    });
    document.getElementById('btn-twitter').addEventListener('click', () => {
      const text = encodeURIComponent('Jeg har lavet mit eget statsbudget for Danmark på Virtuel Regering:');
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
    });
  }, 50);
};

VG.actions.analyze = function() {
  const changes = VG.getChanges();
  const rev = VG.sumRev(), exp = VG.sumExp(), bal = rev - exp;
  const BNP = VG.state.baseline.gdp;

  let html = '';
  if (!changes.length) {
    html = `<p>Du har ikke ændret budgettet endnu. Her er en kort intro:</p>
      <ul>
        <li><strong>Oversigt:</strong> Se den nuværende fordeling af udgifter og indtægter.</li>
        <li><strong>Politiske valg:</strong> Den mest interessante fane — ændr politiske parametre (pensionsalder, skattesatser, antal asylansøgere) og se hvilken budgeteffekt det har.</li>
        <li><strong>Udgifter/Indtægter:</strong> Direkte slidere for hver post.</li>
        <li><strong>Scenarier:</strong> Indlæs et politisk scenarie og se hvad det betyder.</li>
        <li><strong>Folketinget:</strong> Live data om de seneste afstemninger.</li>
      </ul>`;
  } else {
    html = `<p>Du har lavet <strong>${changes.length}</strong> ændringer i forhold til Finanslov 2026:</p><ul>`;
    changes.slice(0, 10).forEach(c => {
      html += `<li><strong>${c.name}:</strong> ${c.from} → ${c.to}</li>`;
    });
    if (changes.length > 10) html += `<li>... og ${changes.length - 10} flere</li>`;
    html += '</ul>';

    html += `<p style="margin-top:16px"><strong>Budgetresultat:</strong></p><ul>
      <li>Indtægter: ${VG.fmt(rev)} (${VG.fmtSigned(rev - VG.baseRev())} vs basis)</li>
      <li>Udgifter: ${VG.fmt(exp)} (${VG.fmtSigned(exp - VG.baseExp())} vs basis)</li>
      <li>Saldo: ${VG.fmtSigned(bal)} (${VG.ppct(bal/BNP*100)} af BNP)</li>
    </ul>`;

    const balPct = bal / BNP * 100;
    const violations = [];
    if (balPct < -3) violations.push("EU's Stabilitetspagt (saldo under -3%)");
    if (balPct < -1) violations.push("Den danske Budgetlov (strukturel saldo under -1%)");

    html += '<p style="margin-top:16px"><strong>Hvad ville faktisk ske?</strong></p>';
    if (violations.length) {
      html += `<p style="color:var(--pos)">⚠ Dit budget bryder: ${violations.join(", ")}. EU-kommissionen ville sende advarsel, og Finansministeriet skulle fremlægge en plan for genopretning.</p>`;
    }
    if (bal > 50) {
      html += '<p>Du genererer et stort overskud. I praksis ville det blive brugt til at nedbringe statsgælden yderligere, eller blive omsat til skattelettelser eller velfærdsudvidelser.</p>';
    } else if (bal < -50) {
      html += '<p>Du genererer et stort underskud. Det ville kræve øget statsgældssalg, og over tid ville rentebyrden begynde at sluge en stigende del af budgettet.</p>';
    }

    const policyChanges = changes.filter(c => c.type === 'policy');
    if (policyChanges.length) {
      html += '<p style="margin-top:14px"><strong>Realisme-tjek på dine politiske valg:</strong></p><ul>';
      const topTax = VG.state.current.policy.topTax.val;
      const retireAge = VG.state.current.policy.retireAge.val;
      const asylum = VG.state.current.policy.asylumCap.val;
      const vat = VG.state.current.policy.vatRate.val;
      const corp = VG.state.current.policy.corpTax.val;

      if (topTax < 3) html += '<li>Meget lav topskat: Skatteborgerne ville se markante lønstigninger efter skat, men dynamiske effekter (lønudvikling, fastholdelse af højtuddannede) er ikke modelleret. Finansministeriets selvfinansieringsgrad er ca. 25-30%.</li>';
      if (topTax > 15) html += '<li>Høj topskat: Risiko for at højtlønnede flytter (Sverige tog deres "værneskat" væk i 2007 efter kapital-udflytning). Reelt provenu kan være lavere end modellens lineære fremskrivning.</li>';
      if (retireAge < 65) html += '<li>Lav pensionsalder: Stort velfærdshul. Vedtaget pensionsalder er 70 år fra 2040 — at sænke den vil kræve omfattende reformer.</li>';
      if (retireAge > 69) html += '<li>Høj pensionsalder: Politisk kontroversielt, men budgetmæssigt holdbart. Allerede vedtaget for 2040.</li>';
      if (asylum < 1000) html += '<li>Meget få asylansøgere: Forudsætter strenge grænsekontroller eller udvandring fra EU-konventioner. Politisk og folkeretligt komplekst.</li>';
      if (asylum > 10000) html += '<li>Mange asylansøgere: Højere integrationsomkostninger på kort sigt, men positiv effekt på arbejdsstyrken på længere sigt (ikke i modellen).</li>';
      if (vat < 20) html += '<li>Lav moms: Direkte effekt på forbrugerpriser. Stort provenutab. Grænsehandel fra Tyskland/Sverige vender.</li>';
      if (corp < 18) html += '<li>Lav selskabsskat: Risiko for at minde om "race to the bottom". EU\'s 15% minimumssats lægger en bund.</li>';
      html += '</ul>';
    }

    html += '<p style="margin-top:16px;font-size:12px;color:var(--text-2)"><em>Bemærk: Modellen er statisk og lineær. I virkeligheden påvirker dine valg arbejdsudbud, vækst, inflation og adfærd — effekter som kræver makroøkonomisk model (DREAM, MAKRO) for at fange.</em></p>';
  }

  const adopted = VG.party.state.proposals.filter(p => {
    const v = p.votes || { ja: 0, nej: 0 };
    return v.ja + v.nej > 0 && v.ja > v.nej;
  });
  if (adopted.length > 0) {
    const partyImpact = adopted.reduce((s, p) => s + p.budgetImpact.value, 0);
    html += `<p style="margin-top:16px"><strong>VirtuelPartiet's nuværende platform:</strong></p>
      <p style="font-size:13px;color:var(--text-2)">Borgerne har vedtaget ${adopted.length} forslag med en samlet budgeteffekt på ${partyImpact > 0 ? '+' : ''}${partyImpact} mia kr/år.
      Vedtagne: ${adopted.slice(0, 5).map(p => p.title).join(', ')}${adopted.length > 5 ? ' m.fl.' : ''}.</p>`;
  }

  VG.showModal('Analyse af dit budget', html);
};

VG.theme = {};

VG.theme.apply = function(mode) {
  if (mode === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
  }
  try { localStorage.setItem('vg-theme', mode); } catch {}
};

VG.theme._isDark = function() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark')  return true;
  if (attr === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

VG.theme.toggle = function() {
  const next = VG.theme._isDark() ? 'light' : 'dark';
  VG.theme.apply(next);
  document.getElementById('theme-icon').textContent = next === 'dark' ? '☾' : '☀';
};

VG.theme.init = function() {
  let saved = null;
  try { saved = localStorage.getItem('vg-theme'); } catch {}
  if (saved && saved !== 'system') {
    VG.theme.apply(saved);
  }
  // Always sync icon to effective theme (handles system dark mode on first visit)
  document.getElementById('theme-icon').textContent = VG.theme._isDark() ? '☾' : '☀';
};

VG.bootstrap = async function() {
  try {
    const baseline = await VG.api.loadBaseline();
    VG.state.baseline = baseline;
    VG.state.current = VG.deepClone(baseline);

    VG.share.applyFromURL();

    VG.render.all();

    document.getElementById('data-status').textContent = `Finanslov ${baseline.fiscalYear} · v${baseline.version}`;
    document.getElementById('version-info').textContent = `Kalibreret ${baseline.lastCalibrated}`;

    VG.api.loadKeyFigures().then(data => {
      if (data) {
        VG.state.live.population = data.population;
        VG.state.live.gdp = data.gdp;
        VG.state.live.unemployment = data.unemployment;
        VG.render.liveIndicators();
      }
    });

    VG.api.loadRecentVotes().then(data => {
      VG.state.live.votesLoaded = true;
      if (data && data.votes) {
        VG.state.live.votes = data.votes;
      }
      if (VG.state.activeTab === 'folketing') {
        document.getElementById('panel-folketing').innerHTML = VG.render.folketing();
      }
    });

    VG.party.init();
    VG.party.load().then(() => {
      VG.party.startPolling();

      VG.livedata.load().then(() => {
        VG.render.liveIndicators();
        if (VG.state.activeTab === 'overview') {
          VG.render.safePanel('panel-overview', () => VG.render.overview());
          VG.render.loadToday();
        }
      });

      VG.api.fetchJSON('/api/oda/active-bills').then(data => {
        if (data && data.bills) {
          VG.state.live.activeBills = data.bills;
          if (VG.state.activeTab === 'folketing') {
            VG.render.safePanel('panel-folketing', () => VG.render.folketing());
          }
        }
      }).catch(() => {});
    });

    VG.demo.load();
    VG.platform.init();

    VG.api.loadGovernment().then(data => {
      if (data) {
        VG.regering.data = data;
        if (VG.state.activeTab === 'regering') VG.regering.renderPanel();
        if (VG.state.activeTab === 'partier')  VG.partier.renderPanel();
      }
    });
    VG.borger.init();
    VG.api.fetchJSON('/api/borgerforslag/active').then(data => {
      if (data && data.proposals) {
        VG.state.live.borgerforslag = data.proposals;
        if (VG.state.activeTab === 'borger') {
          VG.borger.renderPanel();
        }
      }
    }).catch(() => {});
  } catch (err) {
    console.error('Bootstrap error:', err);
    document.getElementById('data-status').textContent = 'Fejl ved indlæsning';
    document.getElementById('panel-overview').innerHTML = `<div class="card"><h2>Kunne ikke indlæse</h2><p>Der opstod en fejl ved indlæsning af data: ${err.message}. Prøv at genindlæse siden.</p></div>`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  VG.theme.init();
  VG.bootstrap();

  const GROUPS = {
    personligt: { label: '👤 Personligt', tabs: [
      { id: 'dashboard',        label: '📌 Mit Dashboard' },
      { id: 'borger',           label: '🧮 Skatteberegner' },
      { id: 'bolig',            label: '🏠 Boligberegner' },
      { id: 'pension',          label: '💼 Pensionsberegner' },
      { id: 'elpris',           label: '⚡ El-priser' },
    ]},
    samfund: { label: '🌍 Samfund', tabs: [
      { id: 'overview',         label: 'Oversigt' },
      { id: 'demographics',     label: '📊 Demografi' },
      { id: 'kommuner',         label: '🏘 Kommuner' },
      { id: 'sundhed',          label: '🏥 Sundhed' },
      { id: 'forbrug',          label: '🛍 Forbrug' },
      { id: 'energi',           label: '⚡ Energi' },
      { id: 'ledighed',         label: '📉 Ledighed' },
      { id: 'ventetider',       label: '⏳ Ventetider' },
      { id: 'dsb',              label: '🚂 Transport' },
      { id: 'aeldrepleje',      label: '👴 Ældrepleje' },
      { id: 'boligmarked',    label: '🏗 Boligmarked' },
      { id: 'indkomst',       label: '💰 Indkomst' },
      { id: 'co2',            label: '🌿 CO₂ & Klima' },
      { id: 'kriminalitet',   label: '🚨 Kriminalitet' },
      { id: 'uddannelse',     label: '🎓 Uddannelse' },
      { id: 'inflation',      label: '📈 Inflation' },
      { id: 'udenrigshandel', label: '🌐 Udenrigshandel' },
      { id: 'landbrug',       label: '🌾 Landbrug' },
      { id: 'folkesundhed',  label: '🏥 Folkesundhed' },
      { id: 'ligestilling',  label: '⚖️ Ligestilling' },
      { id: 'velfaerdsstat', label: '🌍 Velfærdsstat' },
      { id: 'generationsregnskab', label: '👶 Generationsregnskab' },
      { id: 'arbejdsmiljoe', label: '💼 Arbejdsmiljø' },
      { id: 'medietillid',   label: '📰 Medie & Tillid' },
      { id: 'groenomstilling', label: '🌱 Grøn Omstilling' },
      { id: 'boligkrise',    label: '🏘 Boligkrise' },
      { id: 'psykiatri',     label: '🧠 Psykiatri' },
      { id: 'folkeskolen',   label: '🏫 Folkeskolen' },
      { id: 'naturvand',     label: '🌊 Natur & Drikkevand' },
      { id: 'integration',   label: '🌍 Integration' },
      { id: 'forsvar',       label: '🛡️ Forsvar' },
    ]},
    politik: { label: '🏛 Politik', tabs: [
      { id: 'platform',         label: '⭐ Mit Parti' },
      { id: 'party',            label: '🗳 Borgerstemmer' },
      { id: 'partier',          label: '📊 Partier' },
      { id: 'regering',         label: '🏛 Regering' },
      { id: 'folketing',        label: 'Folketing' },
      { id: 'mandater',         label: '🧮 Mandater' },
      { id: 'valgkort',         label: '🗺 Valgkort' },
      { id: 'meningsmaalinger', label: '📊 Meningsmålinger' },
    ]},
    oekonomi: { label: '💰 Økonomi', tabs: [
      { id: 'laboratorium',     label: '🧪 Politisk Lab' },
      { id: 'rygter',           label: '📰 Nyheder & Analyse' },
      { id: 'policy',           label: 'Økonomi & Politik' },
      { id: 'spending',         label: 'Udgifter' },
      { id: 'revenue',          label: 'Indtægter' },
      { id: 'projection',       label: 'Fremskrivning' },
      { id: 'historik',         label: '📈 Historik' },
      { id: 'scenarios',        label: 'Scenarier' },
      { id: 'statsgaeld',       label: '🏦 Statsgæld' },
      { id: 'erhverv',          label: '🏢 Erhverv' },
      { id: 'innovation',       label: '🔬 Innovation' },
    ]},
  };

  // Pinned sub-tabs shown in the secondary bar (others go in "Alle ▾" dropdown)
  const PINNED_TABS = {
    personligt: ['dashboard', 'borger', 'bolig', 'pension', 'elpris'],
    samfund:    ['overview', 'demographics', 'sundhed', 'ledighed', 'co2', 'boligmarked', 'uddannelse'],
    politik:    ['platform', 'party', 'partier', 'regering', 'folketing', 'meningsmaalinger'],
    oekonomi:   ['laboratorium', 'policy', 'spending', 'revenue', 'projection', 'rygter'],
  };

  let activeGroup = null;

  // ── Sidebar navigation ──────────────────────────────────────────────────────

  function buildSidebar() {
    const nav = document.getElementById('sb-nav');
    if (!nav) return;

    let html = `
      <a class="sb-item" data-sb="dashboard">
        <span class="sb-item-icon">📌</span>
        <span class="sb-item-label">Dashboard</span>
      </a>
      <a class="sb-item" data-sb="feed">
        <span class="sb-item-icon">⚡</span>
        <span class="sb-item-label">Nyheder & Indsigter</span>
        <span class="sb-item-live"></span>
      </a>
      <div class="sb-section-label">Udforsk data</div>`;

    for (const [gk, group] of Object.entries(GROUPS)) {
      const parts = group.label.match(/^(\S+)\s+(.+)$/);
      const icon  = parts ? parts[1] : '●';
      const name  = parts ? parts[2] : group.label;
      html += `
        <div class="sb-group" data-sb-group="${gk}">
          <button class="sb-group-btn">
            <span class="sb-group-icon">${icon}</span>
            <span class="sb-group-name">${name}</span>
            <span class="sb-group-chevron">▾</span>
          </button>
          <div class="sb-group-items">
            ${group.tabs.map(t => `<a class="sb-sub-item" data-sb="${t.id}">${t.label}</a>`).join('')}
          </div>
        </div>`;
    }

    nav.innerHTML = html;

    nav.querySelectorAll('[data-sb]').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.sb); });
    });

    nav.querySelectorAll('.sb-group-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const grp    = btn.closest('.sb-group');
        const isOpen = grp.classList.toggle('open');
        if (isOpen) {
          nav.querySelectorAll('.sb-group.open').forEach(g => { if (g !== grp) g.classList.remove('open'); });
          const firstId = GROUPS[grp.dataset.sbGroup]?.tabs[0]?.id;
          if (firstId) navigateTo(firstId);
        }
      });
    });
  }

  function navigateTo(panelId) {
    // Lazy-load panel-specific modules
    if (panelId === 'party')     VG.party     && VG.party.load();
    if (panelId === 'dashboard') VG.dashboard && VG.dashboard.load();
    if (panelId === 'feed')      VG.feed      && VG.feed.load();

    // Determine owning group
    let owningGroup = null;
    for (const [gk, g] of Object.entries(GROUPS)) {
      if (g.tabs.some(t => t.id === panelId)) { owningGroup = gk; break; }
    }
    activeGroup = owningGroup;

    // Budget KPI bar only in Økonomi
    const summaryEl = document.getElementById('summary');
    if (summaryEl) summaryEl.classList.toggle('summary-visible', owningGroup === 'oekonomi');

    switchTab(panelId);
    _updateSidebarActive(panelId, owningGroup);
    _updateBreadcrumb(panelId, owningGroup);
    _closeMobileSidebar();
  }

  function switchTab(tabId) {
    VG.state.activeTab = tabId;
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabId));
    VG.render.fast();
  }

  // Keep switchGroup callable by external code (e.g. old hub links)
  function switchGroup(groupKey) {
    const g = GROUPS[groupKey];
    if (!g) return;
    navigateTo(g.tabs[0].id);
  }

  function _updateSidebarActive(panelId, owningGroup) {
    const nav = document.getElementById('sb-nav');
    if (!nav) return;
    nav.querySelectorAll('.sb-item, .sb-sub-item').forEach(el => {
      el.classList.toggle('active', el.dataset.sb === panelId);
    });
    // Open parent group, close others
    nav.querySelectorAll('.sb-group').forEach(grp => {
      const isOwner = grp.dataset.sbGroup === owningGroup;
      grp.classList.toggle('open', !!isOwner);
    });
  }

  function _updateBreadcrumb(panelId, owningGroup) {
    let section = '', page = panelId;
    if (panelId === 'dashboard') { page = 'Mit Dashboard'; }
    else if (panelId === 'feed') { page = 'Nyheder & Indsigter'; }
    else if (owningGroup && GROUPS[owningGroup]) {
      const g   = GROUPS[owningGroup];
      const tab = g.tabs.find(t => t.id === panelId);
      section = g.label.replace(/^\S+\s*/, '');
      page    = tab ? tab.label.replace(/^\S+\s*/, '') : panelId;
    }
    const secEl  = document.getElementById('topbar-bc-section');
    const sepEl  = document.getElementById('topbar-bc-sep');
    const pageEl = document.getElementById('topbar-bc-page');
    if (secEl)  secEl.textContent  = section;
    if (sepEl)  sepEl.textContent  = section ? '›' : '';
    if (pageEl) pageEl.textContent = page;
  }

  function _closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sb-overlay')?.classList.remove('active');
  }

  // Sidebar collapse (desktop)
  document.getElementById('sb-collapse')?.addEventListener('click', () => {
    const sb  = document.getElementById('sidebar');
    const btn = document.getElementById('sb-collapse');
    if (!sb) return;
    const collapsed = sb.classList.toggle('collapsed');
    if (btn) btn.textContent = collapsed ? '›' : '‹';
  });

  // Mobile hamburger
  document.getElementById('topbar-hamburger')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.add('mobile-open');
    document.getElementById('sb-overlay')?.classList.add('active');
  });
  document.getElementById('sb-overlay')?.addEventListener('click', _closeMobileSidebar);

  // Sidebar search filter
  document.getElementById('sb-search')?.addEventListener('input', e => {
    const q   = e.target.value.toLowerCase().trim();
    const nav = document.getElementById('sb-nav');
    if (!nav) return;
    if (!q) {
      nav.querySelectorAll('.sb-group, .sb-sub-item, .sb-item').forEach(el => el.style.display = '');
      return;
    }
    nav.querySelectorAll('.sb-group').forEach(grp => {
      let any = false;
      grp.querySelectorAll('.sb-sub-item').forEach(item => {
        const match = item.textContent.toLowerCase().includes(q);
        item.style.display = match ? '' : 'none';
        if (match) any = true;
      });
      grp.style.display = any ? '' : 'none';
      if (any) grp.classList.add('open');
    });
    nav.querySelectorAll('.sb-item').forEach(item => {
      item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // ── Init ────────────────────────────────────────────────────────────────────

  buildSidebar();
  navigateTo('dashboard');

  window.__switchGroup = switchGroup;
  window.__switchTab   = switchTab;
  window.__goHome      = () => navigateTo('dashboard');
  window.__mkClick     = navigateTo;

  document.getElementById('btn-reset').addEventListener('click', () => {
    VG.reset();
    history.replaceState(null, '', window.location.pathname);
    VG.render.all();
    VG.toast('Nulstillet til FL2026');
  });
  document.getElementById('btn-changes').addEventListener('click', VG.actions.showChanges);
  document.getElementById('btn-share').addEventListener('click', VG.actions.share);
  document.getElementById('btn-analyze').addEventListener('click', VG.actions.analyze);
  document.getElementById('theme-toggle').addEventListener('click', VG.theme.toggle);

  document.getElementById('modal-close').addEventListener('click', VG.closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') VG.closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') VG.closeModal();
  });

  window.addEventListener('resize', () => {
    if (VG.state.activeTab === 'projection') VG.chart.drawDebt();
  });
});
