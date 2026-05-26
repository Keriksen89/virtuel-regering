VG.demo = {};

VG.demo.data = null;

VG.demo.load = async function() {
  try {
    VG.demo.data = await VG.api.fetchJSON('/api/demographics/summary');
    if (VG.state.activeTab === 'demographics') VG.demo.renderPanel();
  } catch (err) {
    console.warn('[demo] Could not load demographics:', err.message);
  }
};

VG.demo.renderPanel = function() {
  const el = document.getElementById('panel-demographics');
  if (!el) return;
  if (!VG.demo.data) {
    el.innerHTML = '<div class="card"><h2>Demografi</h2><div class="loading">Henter demografiske data...</div></div>';
    return;
  }
  el.innerHTML = VG.demo.buildHTML();
  setTimeout(() => {
    VG.demo.drawPyramid('demo-pyramid');
    VG.demo.drawProjection('demo-projection');
    VG.demo.drawTFR('demo-tfr');
  }, 0);
};

VG.demo.buildHTML = function() {
  const d = VG.demo.data;
  const p = d.population;
  const v = d.vitals;
  const a = d.ageStructure;

  // ── Hero stats ────────────────────────────────────────────────────────────────
  const hero = `
  <div class="demo-hero">
    <div class="demo-hero-stat"><div class="demo-hero-num">${(p.total/1e6).toFixed(3).replace('.', ',')} mio</div><div class="demo-hero-label">Befolkning (jan. 2026)</div></div>
    <div class="demo-hero-stat"><div class="demo-hero-num">${p.medianAge}</div><div class="demo-hero-label">Medianalder (år)</div></div>
    <div class="demo-hero-stat"><div class="demo-hero-num">${v.fertilityRate.toFixed(2).replace('.', ',')}</div><div class="demo-hero-label">Fertilitetskv. (TFR)</div></div>
    <div class="demo-hero-stat"><div class="demo-hero-num">${v.lifeExpMale} / ${v.lifeExpFemale}</div><div class="demo-hero-label">Levetid m/k (år)</div></div>
    <div class="demo-hero-stat"><div class="demo-hero-num">${a.elderly.pct}%</div><div class="demo-hero-label">65+ andel</div></div>
    <div class="demo-hero-stat"><div class="demo-hero-num">+${(d.vitals.totalGrowth/1000).toFixed(1).replace('.', ',')}k</div><div class="demo-hero-label">Befolkningsvækst/år</div></div>
  </div>`;

  // ── Age structure pills ────────────────────────────────────────────────────────
  const structPills = `
  <div class="demo-struct-bar">
    <div class="demo-struct-seg seg-children" style="width:${a.children.pct}%" title="${a.children.label}: ${(a.children.count/1000).toFixed(0)}k">
      <span>${a.children.pct}%</span>
    </div>
    <div class="demo-struct-seg seg-working" style="width:${a.working.pct}%" title="${a.working.label}: ${(a.working.count/1000).toFixed(0)}k">
      <span>${a.working.pct}%</span>
    </div>
    <div class="demo-struct-seg seg-elderly" style="width:${a.elderly.pct}%" title="${a.elderly.label}: ${(a.elderly.count/1000).toFixed(0)}k">
      <span>${a.elderly.pct}%</span>
    </div>
  </div>
  <div class="demo-struct-legend">
    <span><span class="demo-dot seg-children-dot"></span>0–14 år: ${(a.children.count/1000).toFixed(0)}k (${a.children.pct}%)</span>
    <span><span class="demo-dot seg-working-dot"></span>15–64 år: ${(a.working.count/1e6).toFixed(2).replace('.',',')} mio (${a.working.pct}%)</span>
    <span><span class="demo-dot seg-elderly-dot"></span>65+ år: ${(a.elderly.count/1000).toFixed(0)}k (${a.elderly.pct}%)</span>
    <span><span class="demo-dot seg-very-elderly-dot"></span>80+ år: ${(a.veryElderly.count/1000).toFixed(0)}k (${a.veryElderly.pct}%)</span>
  </div>`;

  // ── Dependency ratios ──────────────────────────────────────────────────────────
  const dep = d.dependency;
  const depCards = `
  <div class="demo-dep-grid">
    <div class="demo-dep-card">
      <div class="demo-dep-val">${dep.youth.ratio}</div>
      <div class="demo-dep-label">Ungdomsquotient</div>
      <div class="demo-dep-desc">0–14 pr. 100 i arbejdsstyrken</div>
    </div>
    <div class="demo-dep-card">
      <div class="demo-dep-val" style="color:var(--warn)">${dep.oldAge.ratio}</div>
      <div class="demo-dep-label">Ældrequotient</div>
      <div class="demo-dep-desc">65+ pr. 100 i arbejdsstyrken</div>
    </div>
    <div class="demo-dep-card">
      <div class="demo-dep-val">${dep.total.ratio}</div>
      <div class="demo-dep-label">Samlet afhængighed</div>
      <div class="demo-dep-desc">Ikke-erhvervsaktive pr. 100 erhvervsaktive</div>
    </div>
  </div>`;

  // ── Pyramid ────────────────────────────────────────────────────────────────────
  const pyramid = `
  <div class="demo-chart-wrap">
    <h3>Befolkningsfordeling efter alder og køn</h3>
    <p class="intro">Antal i tusinder. Venstre = mænd, højre = kvinder. Kilde: DST FOLK1A, jan. 2026.</p>
    <div class="demo-pyramid-labels"><span style="color:#5B8DB8">▌ Mænd</span><span style="color:#C4788A">▌ Kvinder</span></div>
    <div style="position:relative;height:420px"><canvas id="demo-pyramid"></canvas></div>
  </div>`;

  // ── Projection chart ───────────────────────────────────────────────────────────
  const proj = `
  <div class="demo-chart-wrap">
    <h3>Befolkningsfremskrivning 2026–2070</h3>
    <p class="intro">DST medium-variant (FRDK117). Tusinder. — Blå: samlet, grøn: 15–64, orange: 65+.</p>
    <div style="position:relative;height:240px"><canvas id="demo-projection"></canvas></div>
  </div>`;

  // ── TFR chart ──────────────────────────────────────────────────────────────────
  const tfr = `
  <div class="demo-chart-wrap">
    <h3>Fertilitetskvotion (TFR) 2010–2026</h3>
    <p class="intro">Total fertilitetskvotion — antal børn pr. kvinde. Erstatningsniveau: 2,1. Kilde: DST FODSL.</p>
    <div style="position:relative;height:180px"><canvas id="demo-tfr"></canvas></div>
  </div>`;

  // ── Vital statistics ───────────────────────────────────────────────────────────
  const vitals = `
  <div class="demo-vitals-grid">
    ${VG.demo.vitalCard('Fødsler/år', v.births.toLocaleString('da-DK'), `${v.birthRate.toFixed(1)} pr. 1.000`)}
    ${VG.demo.vitalCard('Dødsfald/år', v.deaths.toLocaleString('da-DK'), `${v.deathRate.toFixed(1)} pr. 1.000`)}
    ${VG.demo.vitalCard('Nettomigration', '+' + v.netMigration.toLocaleString('da-DK'), 'pr. år')}
    ${VG.demo.vitalCard('Naturlig vækst', '+' + v.naturalGrowth.toLocaleString('da-DK'), 'pr. år')}
    ${VG.demo.vitalCard('Levetid mænd', v.lifeExpMale + ' år', `Sund: ${v.healthyLifeExpMale} år`)}
    ${VG.demo.vitalCard('Levetid kvinder', v.lifeExpFemale + ' år', `Sund: ${v.healthyLifeExpFemale} år`)}
    ${VG.demo.vitalCard('Spædbørnsdødelighed', v.infantMortality.toFixed(1), 'pr. 1.000 levendefødte')}
    ${VG.demo.vitalCard('Husholdninger', (p.households/1000).toFixed(0) + 'k', `Ø ${p.avgHouseholdSize} pers.`)}
  </div>`;

  // ── Regions ────────────────────────────────────────────────────────────────────
  const maxRegPop = Math.max(...d.regions.map(r => r.pop));
  const regions = d.regions.map(r => {
    const w = (r.pop / maxRegPop * 100).toFixed(1);
    const growthColor = r.growth2yr > 1.2 ? 'var(--neg)' : r.growth2yr < 0.5 ? 'var(--pos)' : 'var(--text-2)';
    return `<div class="demo-region-row">
      <div class="demo-region-name">${r.name}</div>
      <div class="demo-region-bar-wrap"><div class="demo-region-bar" style="width:${w}%"></div></div>
      <div class="demo-region-num">${(r.pop/1000).toFixed(0)}k</div>
      <div class="demo-region-density">${r.density} indb/km²</div>
      <div class="demo-region-growth" style="color:${growthColor}">+${r.growth2yr}% (2yr)</div>
    </div>`;
  }).join('');

  // ── Urban/rural ────────────────────────────────────────────────────────────────
  const urbanBars = d.urbanRural.map(u => {
    return `<div class="demo-urban-row">
      <div class="demo-urban-label">${u.label}</div>
      <div class="demo-region-bar-wrap"><div class="demo-urban-bar" style="width:${u.pct * 2}%"></div></div>
      <div class="demo-urban-num">${u.pct}% — ${(u.pop/1000).toFixed(0)}k</div>
    </div>`;
  }).join('');

  // ── Origin breakdown ────────────────────────────────────────────────────────────
  const total = d.population.total;
  const origins = d.origin.map(o => {
    const w = (o.pct / 12.6 * 100).toFixed(1); // scale to largest bar
    const isMajority = o.pct > 50;
    return `<div class="demo-origin-row">
      <div class="demo-origin-label">${o.label}</div>
      <div class="demo-region-bar-wrap"><div class="demo-origin-bar" style="width:${Math.min(100, o.pct / 72.4 * 100).toFixed(1)}%"></div></div>
      <div class="demo-origin-num">${(o.count/1000).toFixed(0)}k — ${o.pct}%</div>
    </div>`;
  }).join('');

  const topCountries = d.topOriginCountries.map((c, i) =>
    `<div class="demo-country-row"><span class="demo-country-rank">${i+1}</span><span>${c.country}</span><span class="demo-country-count">${(c.count/1000).toFixed(0)}k</span></div>`
  ).join('');

  // ── Employment ──────────────────────────────────────────────────────────────────
  const emp = d.employment;
  const maxSector = Math.max(...d.byIndustry.map(s => s.count));
  const sectors = d.byIndustry.map(s => {
    const w = (s.count / maxSector * 100).toFixed(1);
    return `<div class="demo-sector-row">
      <div class="demo-sector-name">${s.sector}</div>
      <div class="demo-region-bar-wrap"><div class="demo-sector-bar" style="width:${w}%"></div></div>
      <div class="demo-sector-num">${(s.count/1000).toFixed(0)}k (${s.pct}%)</div>
    </div>`;
  }).join('');

  // ── Education ───────────────────────────────────────────────────────────────────
  const edRows = d.education.map(e => {
    return `<div class="demo-ed-row">
      <div class="demo-ed-label">${e.level}</div>
      <div class="demo-region-bar-wrap"><div class="demo-ed-bar" style="width:${e.pct * 2.5}%"></div></div>
      <div class="demo-ed-pct">${e.pct}%</div>
    </div>`;
  }).join('');

  // ── Households ──────────────────────────────────────────────────────────────────
  const hhRows = d.households.map(h => {
    return `<div class="demo-hh-row">
      <div class="demo-hh-label">${h.type}</div>
      <div class="demo-region-bar-wrap"><div class="demo-hh-bar" style="width:${h.pct * 2}%"></div></div>
      <div class="demo-hh-num">${h.pct}% — ${(h.count/1000).toFixed(0)}k</div>
    </div>`;
  }).join('');

  // ── FAM122N: adults (16+) by household type ─────────────────────────────────────
  const fam = d.adultsByHousehold || [];
  const famMeta = d.adultsByHouseholdMeta || {};
  const famMax = Math.max(...fam.map(f => f.persons));
  const famRows = fam.map(f => {
    const barW = (f.persons / famMax * 100).toFixed(1);
    const menPct  = Math.round(f.men  / f.persons * 100);
    const womenPct= Math.round(f.women / f.persons * 100);
    const agePills = Object.entries(f.ageGroups || {}).map(([grp, pct]) =>
      `<span class="fam-age-pill">${grp}: ${pct}%</span>`
    ).join('');
    return `
    <div class="fam-row">
      <div class="fam-row-header">
        <div class="fam-row-name">${f.type}</div>
        <div class="fam-row-count">${(f.persons/1000).toFixed(0)}k · <strong>${f.pct}%</strong></div>
      </div>
      <div class="fam-row-desc">${f.desc}</div>
      <div class="fam-bar-wrap">
        <div class="fam-bar" style="width:${barW}%"></div>
      </div>
      <div class="fam-row-detail">
        <div class="fam-gender">
          <span class="fam-men" style="width:${menPct}%"></span><span class="fam-women" style="width:${womenPct}%"></span>
          <span class="fam-gender-label">♂ ${menPct}% mænd · ♀ ${womenPct}% kvinder</span>
        </div>
        <div class="fam-age-pills">${agePills}</div>
      </div>
    </div>`;
  }).join('');

  const famSection = fam.length ? `
  <div class="card" style="margin-bottom:20px">
    <h2>Voksne borgere fordelt på husholdningstype</h2>
    <p class="intro">
      ${(famMeta.total/1e6).toFixed(2).replace('.',',')} mio. voksne (16+) i alt · ${famMeta.year} · Kilde: ${famMeta.source}
    </p>
    <p class="intro" style="margin-top:4px">${famMeta.note || ''}</p>
    <div class="fam-legend">
      <span><span class="fam-dot fam-dot-main"></span>Andel af voksne</span>
      <span><span class="fam-dot fam-dot-men"></span>Mænd</span>
      <span><span class="fam-dot fam-dot-women"></span>Kvinder</span>
    </div>
    <div class="fam-grid">${famRows}</div>
    <div class="fam-highlights">
      <div class="fam-highlight-item">
        <div class="fam-hl-num">${fam[0]?.pct}%</div>
        <div class="fam-hl-label">bor alene — ${(fam[0]?.persons/1000).toFixed(0)}k voksne</div>
      </div>
      <div class="fam-highlight-item">
        <div class="fam-hl-num">${fam[2]?.pct}%</div>
        <div class="fam-hl-label">par uden børn — typisk 45+ år</div>
      </div>
      <div class="fam-highlight-item">
        <div class="fam-hl-num">${((fam[1]?.women||0)/(fam[1]?.persons||1)*100).toFixed(0)}%</div>
        <div class="fam-hl-label">af eneforsørgere er kvinder</div>
      </div>
      <div class="fam-highlight-item">
        <div class="fam-hl-num">${fam[3]?.pct}%</div>
        <div class="fam-hl-label">bor i par med børn</div>
      </div>
    </div>
  </div>` : '';

  // ── Fiscal implications ─────────────────────────────────────────────────────────
  const fp = d.fiscalPressure;
  const fiscal = `
  <div class="demo-fiscal-box">
    <h3>Demografiens budgetpres</h3>
    <p class="intro">Aldringen skaber strukturelle budgetudfordringer frem mod 2040.</p>
    <div class="demo-fiscal-grid">
      <div class="demo-fiscal-item">
        <strong>Ældrequotient 2040</strong>
        <div class="demo-fiscal-val">${d.projections.elderly65[3]} tk / ${d.projections.working[3]} tk arbejdende</div>
        <div class="demo-fiscal-sub">= ${(d.projections.elderly65[3]/d.projections.working[3]*100).toFixed(1)}% afhængighed (fra ${dep.oldAge.ratio}% i dag)</div>
      </div>
      <div class="demo-fiscal-item">
        <strong>Pensionsudgifter vs. 65+ vækst</strong>
        <div class="demo-fiscal-val">+${((d.projections.elderly65[3] - d.ageStructure.elderly.count/1000) / (d.ageStructure.elderly.count/1000) * 100).toFixed(0)}% flere 65+ i 2040</div>
        <div class="demo-fiscal-sub">Svarer til ca. +${Math.round((d.projections.elderly65[3] - d.ageStructure.elderly.count/1000) * d.fiscalPressure.pensionCostPerElderlyBn)} mia i pension + ældrepleje</div>
      </div>
      <div class="demo-fiscal-item">
        <strong>Finanspolitisk holdbarhed</strong>
        <div class="demo-fiscal-val">${fp.fiscalSustainabilityGap > 0 ? '+' : ''}${fp.fiscalSustainabilityGap}% af BNP</div>
        <div class="demo-fiscal-sub">Finansministeriets 2025-holdbarhedsanalyse. Positivt = holdbart.</div>
      </div>
      <div class="demo-fiscal-item">
        <strong>80+ population i 2050</strong>
        <div class="demo-fiscal-val">${d.projections.elderly80[5]} tk vs. ${d.ageStructure.veryElderly.count/1000}k i dag</div>
        <div class="demo-fiscal-sub">+${Math.round((d.projections.elderly80[5] - d.ageStructure.veryElderly.count/1000))}k behov for ældrepleje-kapacitet</div>
      </div>
    </div>
  </div>`;

  // ── Assembly ────────────────────────────────────────────────────────────────────
  return `
  ${hero}

  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">
      <h2>Aldersfordeling</h2>
      <p class="intro">Fordelingen af befolkningen på tre brede aldersgrupper. Ældrequotient stiger frem mod 2040.</p>
      ${structPills}
      <div style="margin-top:18px">${depCards}</div>
    </div>
    <div class="card">
      ${pyramid}
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">${proj}</div>
    <div class="card">${tfr}</div>
  </div>

  <div class="card" style="margin-bottom:20px">
    <h2>Vitalstatistik 2026</h2>
    <p class="intro">Fødsler, dødsfald, migration og levealder. Kilde: DST FODSL, DODE, Vital Statistics.</p>
    ${vitals}
  </div>

  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">
      <h2>Regionernes befolkning</h2>
      <p class="intro">Pr. jan. 2026. Tæthed = indb. pr. km². Vækst = seneste 2 år. Kilde: DST FOLK1A.</p>
      ${regions}
      <div style="margin-top:18px">
        <h3 style="font-size:13px;margin-bottom:10px">By- og landfordeling</h3>
        ${urbanBars}
      </div>
    </div>
    <div class="card">
      <h2>Oprindelse</h2>
      <p class="intro">Dansk oprindelse = begge forældre født i Danmark. Kilde: DST FOLK1A.</p>
      ${origins}
      <h3 style="font-size:13px;margin-top:18px;margin-bottom:10px">Top 10 indvandrerlande</h3>
      ${topCountries}
    </div>
  </div>

  <div class="grid-2" style="margin-bottom:20px">
    <div class="card">
      <h2>Beskæftigelse</h2>
      <p class="intro">${emp.total.toLocaleString('da-DK')} i alt beskæftigede. Beskæftigelsesgrad: ${emp.employmentRate}%. Kilde: DST RAS, AULAAR.</p>
      <div class="demo-emp-summary">
        ${VG.demo.vitalCard('Beskæftigede', emp.total.toLocaleString('da-DK'), `${emp.employmentRate}% af 15–64`)}
        ${VG.demo.vitalCard('Ledige (AKU)', emp.unemployed.toLocaleString('da-DK'), `${emp.unemploymentRate}% ledighedsgrad`)}
        ${VG.demo.vitalCard('Offentligt ansatte', emp.publicSector.toLocaleString('da-DK'), `${(emp.publicSector/emp.total*100).toFixed(0)}% af beskæftigede`)}
        ${VG.demo.vitalCard('Deltidsansatte', emp.partTime.toLocaleString('da-DK'), `${(emp.partTime/emp.total*100).toFixed(0)}% af beskæftigede`)}
      </div>
      <h3 style="font-size:13px;margin-top:18px;margin-bottom:10px">Branchefordeling</h3>
      ${sectors}
    </div>
    <div class="card">
      <h2>Uddannelsesniveau</h2>
      <p class="intro">25–64-årige. Kilde: DST HFUDD 2025.</p>
      ${edRows}
      <h3 style="font-size:13px;margin-top:20px;margin-bottom:10px">Husholdningstyper</h3>
      <p class="intro">${(p.households/1000).toFixed(0)}k husholdninger i alt. Kilde: DST FAMILIE.</p>
      ${hhRows}
    </div>
  </div>

  ${famSection}

  ${fiscal}

  <p class="demo-source-note">Kilde: Danmarks Statistik — FOLK1A, FRDK117, FODSL, DODE, RAS, HFUDD, FAMILIE, FAM122N · Data kalibreret jan. 2026. Se <a href="https://www.dst.dk" target="_blank" rel="noopener">dst.dk</a></p>`;
};

VG.demo.vitalCard = function(label, value, sub) {
  return `<div class="demo-vital-card"><div class="demo-vital-val">${value}</div><div class="demo-vital-label">${label}</div><div class="demo-vital-sub">${sub}</div></div>`;
};

// ── Canvas: Population pyramid ──────────────────────────────────────────────────
VG.demo.drawPyramid = function(id) {
  const canvas = document.getElementById(id);
  if (!canvas || !VG.demo.data) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const groups = VG.demo.data.byAge;
  const n = groups.length;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const textColor = isDark ? '#b4b2a9' : '#5f5e5a';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const maleColor  = isDark ? '#5B9BD5' : '#4A7FB5';
  const femaleColor= isDark ? '#D46E82' : '#B85168';

  const labelW = 40;
  const pad = { top: 8, bottom: 22, left: 4, right: 4 };
  const chartW = w - pad.left - pad.right - labelW * 2;
  const chartH = h - pad.top - pad.bottom;
  const rowH = chartH / n;
  const maxVal = Math.max(...groups.map(g => Math.max(g.male, g.female)));
  const scale = (chartW / 2) / (maxVal * 1.05);

  const cx = pad.left + labelW + chartW / 2; // center x

  ctx.clearRect(0, 0, w, h);
  ctx.font = `10px -apple-system, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  // Grid lines
  const tickVals = [0, 50, 100, 150, 200];
  tickVals.forEach(t => {
    const rx = cx + t * scale;
    const lx = cx - t * scale;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(rx, pad.top); ctx.lineTo(rx, h - pad.bottom); ctx.stroke();
    if (t > 0) { ctx.beginPath(); ctx.moveTo(lx, pad.top); ctx.lineTo(lx, h - pad.bottom); ctx.stroke(); }
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    if (t > 0) {
      ctx.fillText(t + 'k', rx, h - pad.bottom + 12);
      ctx.fillText(t + 'k', lx, h - pad.bottom + 12);
    } else {
      ctx.fillText('0', cx, h - pad.bottom + 12);
    }
  });

  // Center line
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, h - pad.bottom); ctx.stroke();

  // Bars + labels
  groups.forEach((g, i) => {
    const y = pad.top + i * rowH;
    const barH = rowH * 0.72;
    const barY = y + (rowH - barH) / 2;

    // Male bar (left)
    const mW = g.male * scale;
    ctx.fillStyle = maleColor;
    ctx.beginPath();
    ctx.roundRect(cx - mW - 1, barY, mW, barH, 2);
    ctx.fill();

    // Female bar (right)
    const fW = g.female * scale;
    ctx.fillStyle = femaleColor;
    ctx.beginPath();
    ctx.roundRect(cx + 1, barY, fW, barH, 2);
    ctx.fill();

    // Age label center
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(g.group, cx, y + rowH / 2);
  });
};

// ── Canvas: Population projection ──────────────────────────────────────────────
VG.demo.drawProjection = function(id) {
  const canvas = document.getElementById(id);
  if (!canvas || !VG.demo.data) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const proj = VG.demo.data.projections;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const textColor = isDark ? '#b4b2a9' : '#5f5e5a';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const pad = { top: 12, bottom: 28, left: 46, right: 12 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const allVals = [...proj.total, ...proj.working, ...proj.elderly65];
  const minY = Math.floor(Math.min(...allVals) / 500) * 500;
  const maxY = Math.ceil(Math.max(...allVals) / 500) * 500;
  const years = proj.years;
  const xScale = cw / (years[years.length - 1] - years[0]);
  const yScale = ch / (maxY - minY);

  const xPt = y => pad.left + (y - years[0]) * xScale;
  const yPt = v => pad.top + ch - (v - minY) * yScale;

  ctx.clearRect(0, 0, w, h);
  ctx.font = `10px -apple-system, system-ui, sans-serif`;

  // Grid
  [4000, 5000, 6000, 7000].filter(v => v >= minY && v <= maxY).forEach(v => {
    const y = yPt(v);
    ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText((v/1000).toFixed(0) + 'M', pad.left - 4, y);
  });

  // Year labels
  years.forEach(yr => {
    ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(yr, xPt(yr), h - pad.bottom + 4);
  });

  const drawLine = (data, color, dash = []) => {
    ctx.beginPath();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.setLineDash(dash);
    data.forEach((v, i) => {
      const x = xPt(years[i]), y = yPt(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    data.forEach((v, i) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(xPt(years[i]), yPt(v), 3, 0, Math.PI * 2); ctx.fill();
    });
  };

  drawLine(proj.total,    isDark ? '#85B7EB' : '#185fa5');
  drawLine(proj.working,  isDark ? '#5DCAA5' : '#0F6E56', [5, 3]);
  drawLine(proj.elderly65,isDark ? '#EF9F27' : '#BA7517', [3, 3]);
};

// ── Canvas: TFR trend ───────────────────────────────────────────────────────────
VG.demo.drawTFR = function(id) {
  const canvas = document.getElementById(id);
  if (!canvas || !VG.demo.data) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const hist = VG.demo.data.historical;
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const textColor = isDark ? '#b4b2a9' : '#5f5e5a';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const pad = { top: 10, bottom: 24, left: 36, right: 10 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;
  const years = hist.years;
  const vals = hist.tfr;
  const minY = 1.3, maxY = 2.2;
  const xScale = cw / (years[years.length - 1] - years[0]);
  const yScale = ch / (maxY - minY);
  const xPt = y => pad.left + (y - years[0]) * xScale;
  const yPt = v => pad.top + ch - (v - minY) * yScale;

  ctx.clearRect(0, 0, w, h);
  ctx.font = `10px -apple-system, system-ui, sans-serif`;

  // Replacement line at 2.1
  ctx.strokeStyle = isDark ? 'rgba(239,159,39,0.4)' : 'rgba(186,117,23,0.4)';
  ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(pad.left, yPt(2.1)); ctx.lineTo(w - pad.right, yPt(2.1)); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = isDark ? '#EF9F27' : '#BA7517'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('Erstatning 2,1', pad.left + 2, yPt(2.1) - 2);

  // Grid
  [1.4, 1.6, 1.8, 2.0].forEach(v => {
    ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(pad.left, yPt(v)); ctx.lineTo(w - pad.right, yPt(v)); ctx.stroke();
    ctx.fillStyle = textColor; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(v.toFixed(1), pad.left - 4, yPt(v));
  });

  years.forEach((yr, i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(yr, xPt(yr), h - pad.bottom + 4);
    }
  });

  // Area fill
  ctx.beginPath();
  vals.forEach((v, i) => { i === 0 ? ctx.moveTo(xPt(years[i]), yPt(v)) : ctx.lineTo(xPt(years[i]), yPt(v)); });
  ctx.lineTo(xPt(years[years.length-1]), yPt(minY)); ctx.lineTo(xPt(years[0]), yPt(minY)); ctx.closePath();
  ctx.fillStyle = isDark ? 'rgba(91,155,213,0.12)' : 'rgba(24,95,165,0.08)';
  ctx.fill();

  // Line
  ctx.beginPath(); ctx.strokeStyle = isDark ? '#85B7EB' : '#185fa5'; ctx.lineWidth = 2;
  vals.forEach((v, i) => { i === 0 ? ctx.moveTo(xPt(years[i]), yPt(v)) : ctx.lineTo(xPt(years[i]), yPt(v)); });
  ctx.stroke();

  // Dots
  vals.forEach((v, i) => {
    ctx.fillStyle = isDark ? '#85B7EB' : '#185fa5';
    ctx.beginPath(); ctx.arc(xPt(years[i]), yPt(v), 3, 0, Math.PI*2); ctx.fill();
  });
};
