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
    politik:  ['platform', 'party', 'partier', 'regering', 'folketing', 'meningsmaalinger'],
    oekonomi: ['laboratorium', 'policy', 'spending', 'revenue', 'projection', 'rygter'],
  };

  let activeGroup = null;

  function buildPinnedSecondary(secondary, group, pinned) {
    const pinnedSet  = new Set(pinned);
    const pinnedTabs = group.tabs.filter(t => pinnedSet.has(t.id));
    const extraTabs  = group.tabs.filter(t => !pinnedSet.has(t.id));
    secondary.innerHTML = pinnedTabs.map((t, i) =>
      `<button class="sub-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`
    ).join('') + (extraTabs.length ? `
      <div class="nav-alle-wrap">
        <button class="nav-alle-btn">Alle ▾</button>
        <div class="nav-alle-drop">
          ${group.tabs.map(t => `<button class="nav-alle-item" data-tab="${t.id}">${t.label}</button>`).join('')}
        </div>
      </div>` : '');
    const alleBtn  = secondary.querySelector('.nav-alle-btn');
    const alleDrop = secondary.querySelector('.nav-alle-drop');
    if (alleBtn && alleDrop) {
      alleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = alleDrop.classList.toggle('open');
        alleBtn.textContent = open ? 'Alle ▴' : 'Alle ▾';
      });
      alleDrop.addEventListener('click', e => {
        const item = e.target.closest('.nav-alle-item');
        if (!item) return;
        alleDrop.classList.remove('open');
        alleBtn.textContent = 'Alle ▾';
        secondary.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
        alleBtn.classList.add('nav-alle-active');
        switchTab(item.dataset.tab);
      });
    }
  }

  function switchTab(tabId) {
    VG.state.activeTab = tabId;
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tabId));
    document.querySelectorAll('.sub-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    // Samfund hub mode: show breadcrumb back button when inside a sub-panel
    if (activeGroup === 'samfund') {
      const secondary = document.getElementById('nav-secondary');
      secondary.innerHTML = tabId === 'overview' ? '' :
        `<button class="sub-tab sub-tab-back" data-tab="overview">← Oversigt</button>`;
    }
    if (tabId === 'party') VG.party.load();
    VG.render.fast();
  }

  function switchGroup(groupKey) {
    activeGroup = groupKey;
    const group = GROUPS[groupKey];
    if (!group) return;
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.group === groupKey);
    });
    // Budget summary only visible in Økonomi section
    const summaryEl = document.getElementById('summary');
    if (summaryEl) summaryEl.classList.toggle('summary-visible', groupKey === 'oekonomi');
    const secondary = document.getElementById('nav-secondary');
    if (groupKey === 'samfund') {
      // Hub mode: no sub-tab bar — navigation happens via the hub grid
      secondary.innerHTML = '';
      switchTab('overview');
    } else if (PINNED_TABS[groupKey]) {
      buildPinnedSecondary(secondary, group, PINNED_TABS[groupKey]);
      switchTab(PINNED_TABS[groupKey][0]);
    } else {
      // Personligt — small enough to show all tabs
      secondary.innerHTML = group.tabs.map((t, i) =>
        `<button class="sub-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`
      ).join('');
      switchTab(group.tabs[0].id);
    }
  }

  // Wire up primary nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchGroup(btn.dataset.group));
  });

  // Wire up secondary nav (sub-tabs + back button) via event delegation
  document.getElementById('nav-secondary').addEventListener('click', e => {
    const btn = e.target.closest('.sub-tab');
    if (!btn) return;
    document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
    const alleBtn = document.querySelector('.nav-alle-btn');
    if (alleBtn) alleBtn.classList.remove('nav-alle-active');
    btn.classList.add('active');
    switchTab(btn.dataset.tab);
  });

  // Close "Alle" dropdown on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-alle-drop.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.nav-alle-btn').forEach(b => {
      if (b.textContent.includes('▴')) b.textContent = 'Alle ▾';
    });
  });

  // Initialise: show samfund hub
  switchGroup('samfund');
  window.__switchGroup = switchGroup;
  window.__switchTab = switchTab;
  window.__goHome = function() { switchGroup('samfund'); };

  // Navigate directly to a panel by ID — used by news cards and hub grid
  window.__mkClick = function(panelId) {
    let targetGroup = 'samfund';
    for (const [gk, g] of Object.entries(GROUPS)) {
      if (g.tabs.some(t => t.id === panelId)) { targetGroup = gk; break; }
    }
    if (targetGroup === 'samfund') {
      // Hub mode: update primary nav highlight then switch tab directly
      activeGroup = 'samfund';
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.group === 'samfund');
      });
      switchTab(panelId);
    } else {
      switchGroup(targetGroup);
      if (panelId !== GROUPS[targetGroup].tabs[0].id) {
        setTimeout(() => {
          const btn = document.querySelector(`.sub-tab[data-tab="${panelId}"]`);
          if (btn) btn.click();
          else {
            // Panel is in the "Alle" overflow — navigate directly
            const alleBtn = document.querySelector('.nav-alle-btn');
            if (alleBtn) alleBtn.classList.add('nav-alle-active');
            switchTab(panelId);
          }
        }, 30);
      }
    }
  };

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
