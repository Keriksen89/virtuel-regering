VG.kommuner = {};

VG.kommuner._data = null;
VG.kommuner._filter = '';
VG.kommuner._sortCol = 'skat';
VG.kommuner._sortDir = 1;

VG.kommuner.load = async function() {
  try {
    const d = await fetch('/api/kommuner/list').then(r => r.json());
    VG.kommuner._data = d;
  } catch (e) {
    console.warn('[kommuner] load failed', e);
  }
};

VG.kommuner.renderPanel = async function() {
  const panel = document.getElementById('panel-kommuner');
  if (!panel) return;

  if (!VG.kommuner._data) {
    panel.innerHTML = '<div class="panel-loading">Henter kommunedata…</div>';
    await VG.kommuner.load();
  }

  const d = VG.kommuner._data;
  if (!d) {
    panel.innerHTML = '<p class="text-muted">Kommunedata midlertidigt utilgængelig.</p>';
    return;
  }

  const min = Math.min(...d.kommuner.map(k => k.skat));
  const max = Math.max(...d.kommuner.map(k => k.skat));
  const maxPop = Math.max(...d.kommuner.map(k => k.befolkning || 0));

  panel.innerHTML = `
    <div class="section-header">
      <h2>🏘 Kommunedata</h2>
      <p class="section-desc">Sammenlign kommuneskat og befolkning på tværs af alle 98 kommuner</p>
    </div>

    <div class="e-hero-grid">
      <div class="e-hero-card accent-card">
        <div class="e-hero-num">${d.avgSkat}%</div>
        <div class="e-hero-label">Gennemsnit kommuneskat</div>
        <div class="e-hero-sub">alle kommuner 2025</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${min}%</div>
        <div class="e-hero-label">Laveste</div>
        <div class="e-hero-sub">${d.kommuner.find(k => k.skat === min)?.navn}</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${max}%</div>
        <div class="e-hero-label">Højeste</div>
        <div class="e-hero-sub">${d.kommuner.find(k => k.skat === max)?.navn}</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${(max - min).toFixed(1)} pp</div>
        <div class="e-hero-label">Spænd</div>
        <div class="e-hero-sub">forskel lavest → højest</div>
      </div>
    </div>

    <div class="card">
      <div class="komm-controls">
        <input type="text" class="komm-search" id="komm-search" placeholder="Søg kommune…" value="${VG.kommuner._filter}">
        <div class="komm-sort-hint">Klik kolonneoverskrift for at sortere</div>
      </div>
      <div class="table-wrap">
        <table class="komm-table" id="komm-table">
          <thead>
            <tr>
              <th data-col="navn" class="sortable">Kommune</th>
              <th data-col="region" class="sortable">Region</th>
              <th data-col="skat" class="sortable ${VG.kommuner._sortCol === 'skat' ? 'sort-active' : ''}">Kommuneskat %</th>
              <th data-col="befolkning" class="sortable ${VG.kommuner._sortCol === 'befolkning' ? 'sort-active' : ''}">Befolkning</th>
            </tr>
          </thead>
          <tbody id="komm-tbody"></tbody>
        </table>
      </div>
      <div class="data-note">Kilde: ${d.source} · Kommuneskat 2025 inkl. kirkeskat</div>
    </div>

    <div class="card">
      <h3>Regional fordeling</h3>
      <div id="komm-region-chart" class="komm-region-bars"></div>
    </div>
  `;

  VG.kommuner._renderTable(d.kommuner, maxPop);
  VG.kommuner._renderRegionChart(d.kommuner);
  VG.kommuner._bindEvents(d.kommuner, maxPop);
};

VG.kommuner._renderTable = function(kommuner, maxPop) {
  const tbody = document.getElementById('komm-tbody');
  if (!tbody) return;

  const filter = VG.kommuner._filter.toLowerCase();
  const col = VG.kommuner._sortCol;
  const dir = VG.kommuner._sortDir;

  let rows = kommuner.filter(k =>
    !filter || k.navn.toLowerCase().includes(filter) || k.region.toLowerCase().includes(filter)
  ).sort((a, b) => {
    const av = a[col] ?? 0, bv = b[col] ?? 0;
    if (typeof av === 'string') return av.localeCompare(bv) * dir;
    return (av - bv) * dir;
  });

  const minSkat = Math.min(...kommuner.map(k => k.skat));
  const maxSkat = Math.max(...kommuner.map(k => k.skat));

  tbody.innerHTML = rows.map(k => {
    const skatNorm = (k.skat - minSkat) / (maxSkat - minSkat);
    // Interpolate from teal (low) to warn (high)
    const r = Math.round(skatNorm * 220);
    const g = Math.round(110 - skatNorm * 50);
    const b = Math.round(120 - skatNorm * 100);
    const popBar = k.befolkning ? Math.round((k.befolkning / maxPop) * 80) : 0;
    const popFmt = k.befolkning ? k.befolkning.toLocaleString('da') : '—';
    return `<tr>
      <td><strong>${k.navn}</strong></td>
      <td><span class="region-tag region-${k.region.replace(/[^a-z]/gi,'').toLowerCase()}">${k.region}</span></td>
      <td>
        <div class="skat-cell">
          <div class="skat-bar" style="width:${Math.round(skatNorm*80)+10}%;background:rgb(${r},${g},${b})"></div>
          <span>${k.skat}%</span>
        </div>
      </td>
      <td>
        <div class="pop-cell">
          <div class="pop-bar" style="width:${popBar}%"></div>
          <span>${popFmt}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
};

VG.kommuner._renderRegionChart = function(kommuner) {
  const el = document.getElementById('komm-region-chart');
  if (!el) return;

  const regions = {};
  for (const k of kommuner) {
    if (!regions[k.region]) regions[k.region] = { sum: 0, count: 0 };
    regions[k.region].sum += k.skat;
    regions[k.region].count++;
  }

  const rows = Object.entries(regions).map(([name, r]) => ({
    name, avg: (r.sum / r.count).toFixed(1), count: r.count
  })).sort((a, b) => b.avg - a.avg);

  const maxAvg = Math.max(...rows.map(r => parseFloat(r.avg)));

  el.innerHTML = rows.map(r => `
    <div class="e-bar-row">
      <div class="e-bar-label">${r.name} <span style="color:var(--text-2);font-size:11px">(${r.count} komm.)</span></div>
      <div class="e-bar-track">
        <div class="e-bar-fill" style="width:${(parseFloat(r.avg)/maxAvg*100).toFixed(0)}%;background:var(--accent)"></div>
      </div>
      <div class="e-bar-val">${r.avg}%</div>
    </div>
  `).join('');
};

VG.kommuner._bindEvents = function(kommuner, maxPop) {
  const search = document.getElementById('komm-search');
  if (search && !search._vgBound) {
    search._vgBound = true;
    search.addEventListener('input', e => {
      VG.kommuner._filter = e.target.value;
      VG.kommuner._renderTable(kommuner, maxPop);
    });
  }

  const table = document.getElementById('komm-table');
  if (table && !table._vgBound) {
    table._vgBound = true;
    table.querySelector('thead').addEventListener('click', e => {
      const th = e.target.closest('th[data-col]');
      if (!th) return;
      const col = th.dataset.col;
      if (VG.kommuner._sortCol === col) {
        VG.kommuner._sortDir *= -1;
      } else {
        VG.kommuner._sortCol = col;
        VG.kommuner._sortDir = col === 'skat' || col === 'befolkning' ? -1 : 1;
      }
      table.querySelectorAll('th').forEach(h => h.classList.remove('sort-active'));
      th.classList.add('sort-active');
      VG.kommuner._renderTable(kommuner, maxPop);
    });
  }
};
