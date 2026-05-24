VG.energi = {};

VG.energi._data = null;
VG.energi._spotData = null;

VG.energi.load = async function() {
  try {
    const [cur, daily] = await Promise.all([
      fetch('/api/energi/current').then(r => r.json()),
      fetch('/api/energi/daily').then(r => r.json())
    ]);
    VG.energi._data = cur;
    VG.energi._spotData = daily;
  } catch (e) {
    console.warn('[energi] load failed', e);
  }
};

VG.energi.renderPanel = async function() {
  const panel = document.getElementById('panel-energi');
  if (!panel) return;

  if (!VG.energi._data) {
    panel.innerHTML = '<div class="panel-loading">Henter energidata…</div>';
    await VG.energi.load();
  }

  const d = VG.energi._data;
  if (!d) {
    panel.innerHTML = '<p class="text-muted">Energidata midlertidigt utilgængelig.</p>';
    return;
  }

  const windTotal = d.wind_onshore + d.wind_offshore;
  const total = d.total || 1;

  const segments = [
    { label: 'Vindkraft offshore', val: d.wind_offshore, color: '#0a6e78' },
    { label: 'Vindkraft onshore', val: d.wind_onshore,  color: '#22c5d4' },
    { label: 'Solkraft',          val: d.solar,          color: '#f0b429' },
    { label: 'Kraftvarme',        val: d.central + d.decentral, color: '#8b8b8b' }
  ];

  const bars = segments.map(s => {
    const pct = Math.round(s.val / total * 100);
    return `<div class="e-bar-row">
      <div class="e-bar-label">${s.label}</div>
      <div class="e-bar-track">
        <div class="e-bar-fill" style="width:${pct}%;background:${s.color}"></div>
      </div>
      <div class="e-bar-val">${pct}% · ${(s.val/1000).toFixed(1)} GW</div>
    </div>`;
  }).join('');

  const exchangeDir = d.exchange < 0 ? 'Export' : 'Import';
  const exchangeAbs = Math.abs(d.exchange);

  const fallbackNote = d.isFallback
    ? '<div class="data-note">⚠ Viser estimerede tal — Energidata.dk utilgængelig</div>'
    : `<div class="data-note">Kilde: ${d.source} · Opdateret: ${d.period ? d.period.replace('T', ' ').slice(0, 16) : 'netop nu'}</div>`;

  const spotHtml = VG.energi._buildSpotChart();

  panel.innerHTML = `
    <div class="section-header">
      <h2>⚡ Energiproduktion</h2>
      <p class="section-desc">Danmarks aktuelle elproduktion og energimix — data fra Energidata.dk</p>
    </div>

    <div class="e-hero-grid">
      <div class="e-hero-card accent-card">
        <div class="e-hero-num">${d.renewablePct}%</div>
        <div class="e-hero-label">Vedvarende energi</div>
        <div class="e-hero-sub">af aktuel produktion</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${(total/1000).toFixed(1)} GW</div>
        <div class="e-hero-label">Total produktion</div>
        <div class="e-hero-sub">alle kilder</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${(windTotal/1000).toFixed(1)} GW</div>
        <div class="e-hero-label">Vindkraft</div>
        <div class="e-hero-sub">${Math.round(windTotal/total*100)}% af mix</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${exchangeDir}: ${(exchangeAbs/1000).toFixed(1)} GW</div>
        <div class="e-hero-label">Udveksling</div>
        <div class="e-hero-sub">med nabolande</div>
      </div>
    </div>

    <div class="card">
      <h3>Produktionsmix nu</h3>
      <div class="e-bars">${bars}</div>
    </div>

    ${spotHtml}

    <div class="card">
      <h3>Klimamål for energi</h3>
      <div class="e-targets-grid">
        <div class="e-target">
          <div class="e-target-num">70%</div>
          <div class="e-target-label">VE-andel 2030</div>
          <div class="e-target-prog">
            <div class="e-target-bar" style="width:${Math.min(d.renewablePct, 100)}%"></div>
          </div>
          <div class="e-target-sub">${d.renewablePct}% nu → 70% mål</div>
        </div>
        <div class="e-target">
          <div class="e-target-num">100%</div>
          <div class="e-target-label">VE-andel 2035</div>
          <div class="e-target-prog">
            <div class="e-target-bar" style="width:${Math.min(d.renewablePct, 100)}%"></div>
          </div>
          <div class="e-target-sub">Målsætning fra Klimaaftale 2022</div>
        </div>
        <div class="e-target">
          <div class="e-target-num">6 GW</div>
          <div class="e-target-label">Havvind 2030</div>
          <div class="e-target-prog">
            <div class="e-target-bar" style="width:${Math.min((d.wind_offshore/6000)*100, 100).toFixed(0)}%"></div>
          </div>
          <div class="e-target-sub">${(d.wind_offshore/1000).toFixed(1)} GW installeret nu</div>
        </div>
      </div>
    </div>

    ${fallbackNote}
  `;

  VG.energi._drawDonut('energi-donut', segments, total);
};

VG.energi._buildSpotChart = function() {
  const d = VG.energi._spotData;
  if (!d || !d.spotPrices || !d.spotPrices.length) return '';

  const prices = d.spotPrices;
  const max = Math.max(...prices.map(p => p.price || 0));
  const min = Math.min(...prices.map(p => p.price || 0));
  const range = max - min || 1;

  const bars = prices.map(p => {
    const h = Math.round(((p.price - min) / range) * 80) + 10;
    const color = p.price < 0 ? '#e55' : p.price > 2 ? '#f0b429' : '#0a6e78';
    return `<div class="spot-col" title="${p.hour}:00 · ${p.price != null ? p.price.toFixed(2) + ' kr/kWh' : 'n/a'}">
      <div class="spot-bar" style="height:${h}%;background:${color}"></div>
      <div class="spot-label">${p.hour}</div>
    </div>`;
  }).join('');

  return `<div class="card">
    <h3>Spotpriser i dag (DKK/kWh)</h3>
    <div class="spot-chart">${bars}</div>
    <div class="data-note">Kilde: ${d.source}</div>
  </div>`;
};

VG.energi._drawDonut = function(id, segments, total) {
  // Simple canvas donut
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const r = Math.min(cx, cy) - 10;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let angle = -Math.PI / 2;
  for (const seg of segments) {
    if (!seg.val) continue;
    const sweep = (seg.val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    angle += sweep;
  }

  // Inner circle cutout
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.55, 0, 2 * Math.PI);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--surface-1').trim() || '#fff';
  ctx.fill();
};

VG.energi.refresh = async function() {
  VG.energi._data = null;
  await VG.energi.renderPanel();
};
