VG.render = {};

VG.render.summary = function() {
  const rev = VG.sumRev(), exp = VG.sumExp(), bal = rev - exp;
  const dRev = rev - VG.baseRev(), dExp = exp - VG.baseExp();
  const BNP = VG.state.baseline.gdp;

  document.getElementById('s-rev').textContent = VG.fmt(rev);
  document.getElementById('s-exp').textContent = VG.fmt(exp);
  document.getElementById('s-bal').textContent = VG.fmtSigned(bal);

  const dRevEl = document.getElementById('s-rev-d');
  const dExpEl = document.getElementById('s-exp-d');
  if (Math.abs(dRev) < 0.05) { dRevEl.textContent = 'basis'; dRevEl.className = 'stat-delta'; }
  else { dRevEl.textContent = VG.fmtSigned(dRev) + ' vs basis'; dRevEl.className = 'stat-delta ' + (dRev > 0 ? 'neg' : 'pos'); }
  if (Math.abs(dExp) < 0.05) { dExpEl.textContent = 'basis'; dExpEl.className = 'stat-delta'; }
  else { dExpEl.textContent = VG.fmtSigned(dExp) + ' vs basis'; dExpEl.className = 'stat-delta ' + (dExp > 0 ? 'pos' : 'neg'); }

  document.getElementById('s-bal-d').textContent = VG.ppct(bal / BNP * 100) + ' af BNP';
  document.getElementById('s-bal-card').classList.toggle('alert', bal < -BNP * 0.01);

  const debt2030 = VG.state.baseline.debtStartRatio - (bal * 4) / BNP;
  document.getElementById('s-debt').textContent = VG.ppct(Math.max(0, debt2030) * 100);
  document.getElementById('s-debt-card').classList.toggle('alert', debt2030 > 0.6);
};

VG.render.liveIndicators = function() {
  const live = VG.state.live;
  const container = document.getElementById('live-indicators');
  const items = [];
  if (live.population) {
    items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">Befolkning</span><span class="value">${live.population.value.toLocaleString('da-DK')}</span><span class="label">(${live.population.period})</span></div>`);
  }
  if (live.gdp) {
    items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">BNP, kvt</span><span class="value">${VG.fmt(live.gdp.value / 1000)}</span><span class="label">(${live.gdp.period})</span></div>`);
  }
  if (live.unemployment) {
    items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">Ledige</span><span class="value">${live.unemployment.value.toLocaleString('da-DK')}</span><span class="label">(${live.unemployment.period})</span></div>`);
  }

  // Economic live data enrichment
  const eco = (typeof VG.livedata !== 'undefined') ? VG.livedata.economic : null;
  if (eco) {
    if (eco.inflation) {
      const inf = eco.inflation;
      const infColor = inf.yoy > 4 ? 'style="color:var(--pos)"' : inf.yoy > 2 ? 'style="color:var(--warn)"' : 'style="color:var(--neg)"';
      const infVal = inf.yoy != null ? inf.yoy.toFixed(1).replace('.', ',') : inf.value.toFixed(1).replace('.', ',');
      items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">Inflation</span><span class="value" ${infColor}>${infVal}%</span><span class="label">(${inf.period})</span></div>`);
    }
    if (eco.housing) {
      const h = eco.housing;
      const sign = h.qoq >= 0 ? '+' : '';
      items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">Boligpriser</span><span class="value">${sign}${h.qoq.toFixed(1).replace('.', ',')}%</span><span class="label">(kvartal)</span></div>`);
    }
    if (eco.nbRate) {
      items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">NBR-rente</span><span class="value">${eco.nbRate.value.toFixed(2).replace('.', ',')}%</span></div>`);
    }
    if (eco.wageGrowth) {
      const w = eco.wageGrowth;
      const sign = w.yoy >= 0 ? '+' : '';
      items.push(`<div class="live-indicator"><span class="live-dot"></span><span class="label">Lønvækst</span><span class="value">${sign}${w.yoy.toFixed(1).replace('.', ',')}%</span></div>`);
    }
  }

  if (!items.length) {
    items.push('<div class="live-indicator"><span class="label">Live data fra DST henter...</span></div>');
  }
  container.innerHTML = items.join('');
};

VG.render.overview = function() {
  const exp = [...Object.entries(VG.state.current.expense)].sort((a, b) => b[1].val - a[1].val);
  const rev = [...Object.entries(VG.state.current.revenue)].sort((a, b) => b[1].val - a[1].val);
  const totalExp = VG.sumExp(), totalRev = VG.sumRev();

  const expRows = exp.map(([k, v]) => {
    const w = (v.val / totalExp * 100).toFixed(1);
    const d = v.val - VG.state.baseline.expense[k].val;
    const dHtml = Math.abs(d) > 0.1
      ? `<span style="color:${d > 0 ? 'var(--pos)' : 'var(--neg)'};font-size:11px;font-weight:400"> ${d > 0 ? '+' : ''}${d.toFixed(1)}</span>`
      : '';
    return `<div class="bar-container"><div class="bar-row"><span class="bar-name">${v.name}</span><span class="bar-val">${VG.fmt(v.val)}${dHtml}</span></div><div class="bar-track"><div class="bar-fill exp" style="width:${w}%"></div></div></div>`;
  }).join('');

  const revRows = rev.map(([k, v]) => {
    const w = (v.val / totalRev * 100).toFixed(1);
    const d = v.val - VG.state.baseline.revenue[k].val;
    const dHtml = Math.abs(d) > 0.1
      ? `<span style="color:${d > 0 ? 'var(--neg)' : 'var(--pos)'};font-size:11px;font-weight:400"> ${d > 0 ? '+' : ''}${d.toFixed(1)}</span>`
      : '';
    return `<div class="bar-container"><div class="bar-row"><span class="bar-name">${v.name}</span><span class="bar-val">${VG.fmt(v.val)}${dHtml}</span></div><div class="bar-track"><div class="bar-fill rev" style="width:${w}%"></div></div></div>`;
  }).join('');

  const bal = VG.sumRev() - VG.sumExp();
  const balPct = (bal / VG.state.baseline.gdp * 100).toFixed(1);
  const balColor = bal >= 0 ? 'var(--neg)' : 'var(--pos)';
  const balSign = bal >= 0 ? '+' : '';

  const hasChanges = VG.getChanges().length > 0;
  const introCard = hasChanges ? '' : `<div class="overview-welcome">
    <p class="ov-heading">Hvad vil du udforske?</p>
    <div class="ov-features">
      <button class="ov-feature" onclick="window.__switchGroup('parti')">
        <span class="ov-icon">⭐</span>
        <strong>Mit Parti</strong>
        <span>Tag stilling til 40 politiske spørgsmål og find dit kompas-placering.</span>
      </button>
      <button class="ov-feature" onclick="window.__switchGroup('budget')">
        <span class="ov-icon">💰</span>
        <strong>Økonomi &amp; Politik</strong>
        <span>Justér skatter og udgifter — se budgeteffekt og MAKRO-dynamik i realtid.</span>
      </button>
      <button class="ov-feature" onclick="window.__switchGroup('folketing')">
        <span class="ov-icon">🏛</span>
        <strong>Folketing</strong>
        <span>Byg koalitioner, beregn mandatfordeling og se valgkortet.</span>
      </button>
      <button class="ov-feature" onclick="window.__switchGroup('demokrati')">
        <span class="ov-icon">🇩🇰</span>
        <strong>Din stemme</strong>
        <span>Stem på politiske forslag, sundhedsdata og forbrugertrends.</span>
      </button>
    </div>
  </div>`;

  // Economic snapshot card (only if livedata.economic is available)
  const eco = (typeof VG.livedata !== 'undefined') ? VG.livedata.economic : null;
  let ecoCard = '';
  if (eco) {
    const inf = eco.inflation;
    const hou = eco.housing;
    const nbr = eco.nbRate;
    const wag = eco.wageGrowth;
    const ineq = (typeof VG.livedata !== 'undefined') ? VG.livedata.inequality : null;

    let infClass = 'eco-green';
    if (inf && inf.yoy > 4) infClass = 'eco-red';
    else if (inf && inf.yoy > 2) infClass = 'eco-yellow';

    const infVal  = inf  ? inf.yoy.toFixed(1).replace('.', ',') + '%'  : '—';
    const infSub  = inf  ? (inf.period + ' · ' + inf.source) : '';
    const houSign = (hou && hou.qoq >= 0) ? '+' : '';
    const houVal  = hou  ? houSign + hou.qoq.toFixed(1).replace('.', ',') + '%' : '—';
    const houSub  = hou  ? (hou.period + ' · kvartal-over-kvartal') : '';
    const nbrVal  = nbr  ? nbr.value.toFixed(2).replace('.', ',') + '%' : '3,35%';
    const wagSign = (wag && wag.yoy >= 0) ? '+' : '';
    const wagVal  = wag  ? wagSign + wag.yoy.toFixed(1).replace('.', ',') + '%' : '—';
    const wagSub  = wag  ? ((wag.period || '') + ' · ' + (wag.source || '')) : '';

    const giniNote = ineq
      ? `<div class="eco-gini-note">Gini-koefficient 2023: <strong>${ineq.gini_2023}</strong> — Danmark vs. EU-gennemsnit ${ineq.gini_eu_avg}. ${ineq.note}</div>`
      : '';

    ecoCard = `<div class="card" style="margin-top:16px">
  <h2>Aktuel Dansk Økonomi</h2>
  <p class="intro">Nøgletal fra Danmarks Statistik og Nationalbanken — opdateret automatisk.</p>
  <div class="eco-grid">
    <div class="eco-card">
      <div class="eco-icon">📈</div>
      <div class="eco-value ${infClass}">${infVal}</div>
      <div class="eco-label">Inflation (KPI)</div>
      <div class="eco-sub">${infSub}</div>
    </div>
    <div class="eco-card">
      <div class="eco-icon">🏠</div>
      <div class="eco-value">${houVal}</div>
      <div class="eco-label">Boligprisændring</div>
      <div class="eco-sub">${houSub}</div>
    </div>
    <div class="eco-card">
      <div class="eco-icon">🏦</div>
      <div class="eco-value">${nbrVal}</div>
      <div class="eco-label">Nationalbankens rente</div>
      <div class="eco-sub">maj 2026</div>
    </div>
    <div class="eco-card">
      <div class="eco-icon">💼</div>
      <div class="eco-value">${wagVal}</div>
      <div class="eco-label">Lønvækst (nominelt)</div>
      <div class="eco-sub">${wagSub}</div>
    </div>
  </div>
  ${giniNote}
</div>`;
  }

  const euCompCard = `<div class="card" style="margin-top:12px">
  <h2>Danmark i europæisk kontekst</h2>
  <p class="intro">Udvalgte nøgletal sammenlignet med EU-gennemsnit (Eurostat 2024–2025).</p>
  <div class="eu-comp-grid">
    <div class="eu-comp-row"><span class="eu-comp-label">Skattetryk</span><span class="eu-comp-dk">47,4%</span><span class="eu-comp-eu">EU: 41,3%</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:100%"></div></div></div>
    <div class="eu-comp-row"><span class="eu-comp-label">Offentlige udgifter / BNP</span><span class="eu-comp-dk">53,1%</span><span class="eu-comp-eu">EU: 49,8%</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:94%"></div></div></div>
    <div class="eu-comp-row"><span class="eu-comp-label">Beskæftigelsesgrad</span><span class="eu-comp-dk">75,8%</span><span class="eu-comp-eu">EU: 70,4%</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:100%"></div></div></div>
    <div class="eu-comp-row"><span class="eu-comp-label">Ledighed</span><span class="eu-comp-dk">4,8%</span><span class="eu-comp-eu">EU: 5,9%</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:81%"></div></div></div>
    <div class="eu-comp-row"><span class="eu-comp-label">Statsgæld / BNP</span><span class="eu-comp-dk">30,4%</span><span class="eu-comp-eu">EU: 81,7%</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:37%"></div></div></div>
    <div class="eu-comp-row"><span class="eu-comp-label">Gini-koefficient</span><span class="eu-comp-dk">28,9</span><span class="eu-comp-eu">EU: 30,3</span><div class="eu-comp-bar"><div class="eu-comp-fill" style="width:95%"></div></div></div>
  </div>
  <p style="font-size:10px;color:var(--text-3);margin-top:10px">Kilde: Eurostat 2024–2025 · OECD Revenue Statistics 2024</p>
</div>`;

  return `${introCard}<div class="grid-2">
    <div class="card"><h2>Hvor pengene bruges</h2><p class="intro">Statslige, regionale og kommunale udgifter — i alt ${VG.fmt(totalExp)} kr/år</p>${expRows}</div>
    <div class="card"><h2>Hvor pengene kommer fra</h2><p class="intro">Skatter, afgifter og andre offentlige indtægter — i alt ${VG.fmt(totalRev)} kr/år</p>${revRows}</div>
  </div>
  <div class="overview-balance-bar" style="border-left-color:${balColor}">
    Budgetsaldo: <strong style="color:${balColor}">${balSign}${VG.fmt(bal)} (${balSign}${balPct}% af BNP)</strong>
    — Gå til <em>Fremskrivning</em> for gælds-prognose og <strong>DREAM holdbarhedsindikator</strong>
  </div>
  ${ecoCard}
  ${euCompCard}`;
};

VG.render.sliders = function(bucketKey) {
  const bucket = VG.state.current[bucketKey];
  const items = Object.entries(bucket);
  const rows = items.map(([k, item]) => {
    const baseItem = VG.state.baseline[bucketKey][k];
    const base = baseItem.val;
    const d = item.val - base;
    const pctDiff = base > 0 ? (d / base * 100) : 0;
    const deltaClass = Math.abs(d) < 0.05 ? '' : (
      bucketKey === 'revenue' ? (d > 0 ? 'neg' : 'pos') : (d > 0 ? 'pos' : 'neg')
    );
    const deltaText = Math.abs(d) < 0.05 ? '—' : ((d > 0 ? '+' : '') + pctDiff.toFixed(0) + '%');
    const sourceHtml = baseItem.source ? `<div class="row-source">Kilde: ${baseItem.source}</div>` : '';
    return `<div class="row">
      <div><div class="row-name">${item.name}</div><div class="row-info">${item.info || ''}</div>${sourceHtml}</div>
      <input type="range" min="${item.min}" max="${item.max}" step="0.5" value="${item.val}" data-bucket="${bucketKey}" data-key="${k}" aria-label="${item.name}">
      <div class="row-val">${VG.fmt(item.val)}</div>
      <div class="row-delta ${deltaClass}">${deltaText}</div>
    </div>`;
  }).join('');
  const title = bucketKey === 'expense' ? 'Juster udgifter' : 'Juster indtægter';
  const intro = bucketKey === 'expense'
    ? 'Skub sliderne for at ændre, hvor meget der bruges på hver post. Røde tal = højere end FL2026.'
    : 'Skub sliderne for at ændre indtægterne. Grønne tal = højere provenu end FL2026.';
  return `<div class="card"><h2>${title}</h2><p class="intro">${intro}</p>${rows}</div>`;
};

VG.render.policy = function() {
  const items = Object.entries(VG.state.current.policy);
  const html = items.map(([pk, p]) => {
    const b = VG.state.baseline.policy[pk];
    const diff = p.val - b.val;
    const impact = diff * p.elasticity;
    let impactStr, impactClass = '';
    if (Math.abs(impact) < 0.05) {
      impactStr = 'Ingen ændring';
    } else {
      const direction = p.direction === 'revenue' ? 'indtægter' : 'udgifter';
      impactStr = `${impact > 0 ? '+' : ''}${impact.toFixed(1)} mia til ${direction}`;
      impactClass = p.direction === 'revenue' ? (impact > 0 ? 'neg' : 'pos') : (impact > 0 ? 'pos' : 'neg');
    }

    // SMILE distribution badge (shown on all changed policies)
    let smileHtml = '';
    if (p.smile && Math.abs(diff) > 0) {
      const isRaised = diff > 0;
      let effectiveType = p.smile.type;
      // For regressive policies, raising makes things more unequal; lowering more equal
      if (p.direction === 'expense') {
        // Expense reduction: flip the distributional direction
        if (diff < 0) effectiveType = effectiveType === 'progressive' ? 'regressive' : effectiveType === 'regressive' ? 'progressive' : 'neutral';
      } else {
        // Revenue reduction: flip
        if (diff < 0) effectiveType = effectiveType === 'progressive' ? 'regressive' : effectiveType === 'regressive' ? 'progressive' : 'neutral';
      }
      const icons = { progressive: '↑ Progressiv', regressive: '↓ Regressiv', neutral: '→ Neutral' };
      smileHtml = `<div class="smile-badge smile-${effectiveType}" title="${p.smile.note}">
        <span class="smile-icon">${icons[effectiveType]}</span>
        <span class="smile-note">${p.smile.note}</span>
      </div>`;
    }

    // MAKRO dynamic effects box (only shown when slider is moved and makro data exists)
    let makroHtml = '';
    if (p.makro && Math.abs(diff) > 0) {
      // Normalise to "budget balance improvement" (+= better for budget)
      const staticBudget = p.direction === 'revenue' ? impact : -impact;
      const dynamicAdj   = staticBudget * (-p.makro.sfr);
      const netBudget    = staticBudget + dynamicAdj;
      const fmt = v => `${v >= 0 ? '+' : ''}${Math.abs(v) < 0.05 ? '0,0' : v.toFixed(1)} mia`;
      const dynClass = dynamicAdj >= 0 ? 'makro-positive' : 'makro-negative';
      const sfrPct = Math.round(Math.abs(p.makro.sfr) * 100);
      const sfrLabel = p.makro.sfr > 0 ? 'selvfinansieringsgrad' : 'forstærkningseffekt';
      makroHtml = `<div class="makro-impact">
        <div class="makro-header">⚡ MAKRO-dynamiske effekter</div>
        <div class="makro-rows">
          <div class="makro-row"><span>Statisk (1. orden)</span><span class="makro-num">${fmt(staticBudget)} budgetforbedring</span></div>
          <div class="makro-row ${dynClass}"><span>Adfærd/dynamik</span><span class="makro-num">${fmt(dynamicAdj)} (${sfrPct}% ${sfrLabel})</span></div>
          <div class="makro-row makro-net"><span>≈ Netto</span><span class="makro-num">${fmt(netBudget)}</span></div>
        </div>
        <p class="makro-note">${p.makro.note}</p>
        <p class="makro-source">Kilde: <a href="https://github.com/DREAM-DK/MAKRO" target="_blank" rel="noopener">DREAM MAKRO-modellen</a> · ${p.makro.source}</p>
      </div>`;
    }

    const step = p.unit === 'pers' ? 100 : 0.1;
    return `<div class="policy-card">
      <div class="policy-head">
        <span class="policy-name">${p.name}</span>
        <span class="policy-val">${p.val.toLocaleString('da-DK')} ${p.unit}</span>
      </div>
      <p class="policy-desc">${p.info}</p>
      <div class="policy-row">
        <input type="range" min="${p.min}" max="${p.max}" step="${step}" value="${p.val}" data-policy="${pk}" aria-label="${p.name}">
        <div class="policy-impact ${impactClass}">${impactStr}</div>
      </div>
      ${smileHtml}
      ${makroHtml}
    </div>`;
  }).join('');

  return `<div>
    <div class="makro-banner">
      <span class="makro-banner-icon">⚡</span>
      <div><strong>MAKRO-kalibreret</strong> — Elasticiteterne er kalibreret mod
        <a href="https://github.com/DREAM-DK/MAKRO" target="_blank" rel="noopener">DREAM's åbne MAKRO-model</a>.
        Flyt en slider for at se statiske og dynamiske adfærdseffekter side om side.
      </div>
    </div>
    <p class="intro" style="color:var(--text-2);font-size:13px;margin-bottom:16px">Træk sliderne for at ændre politiske parametre. Modellen viser både første-ordensestimater og MAKRO-baserede dynamiske effekter.</p>
    ${html}
  </div>`;
};

VG.render.projection = function() {
  const bal = VG.sumRev() - VG.sumExp();
  const BNP = VG.state.baseline.gdp;
  let debt = BNP * VG.state.baseline.debtStartRatio, gdpY = BNP;
  const pts = [{ y: 2026, ratio: debt / gdpY * 100 }];
  for (let y = 2027; y <= 2034; y++) {
    debt -= bal;
    gdpY *= 1.02;
    pts.push({ y, ratio: Math.max(0, debt / gdpY * 100) });
  }
  const years = [2027, 2030, 2034];
  const yearStats = years.map(y => {
    const p = pts.find(pt => pt.y === y);
    return `<div class="year-stat"><div class="year-stat-y">${y}</div><div class="year-stat-v">${p.ratio.toFixed(1)}%</div></div>`;
  }).join('');
  const balPct = bal / BNP * 100;
  const okSaldo = balPct >= -3;
  const okStrukt = balPct >= -1;
  const pills = `<span class="pill ${okSaldo ? 'ok' : 'fail'}">${okSaldo ? '✓' : '✗'} Saldo > -3% (EU Stabilitetspagt)</span><span class="pill ${okStrukt ? 'ok' : 'fail'}">${okStrukt ? '✓' : '✗'} Strukturel saldo > -1% (Budgetlov)</span>`;

  const hist = VG.state.baseline.historical;
  const histRows = hist.years.map((y, i) => {
    const surplusClass = hist.deficitRatio[i] >= 0 ? 'neg' : 'pos';
    return `<tr>
      <td>${y}</td>
      <td>${hist.totalRevenue[i]} mia</td>
      <td>${hist.totalExpense[i]} mia</td>
      <td class="${surplusClass}">${hist.deficitRatio[i] > 0 ? '+' : ''}${hist.deficitRatio[i].toFixed(1)}%</td>
      <td>${hist.debtRatio[i].toFixed(1)}%</td>
      <td>${hist.gdpGrowth[i].toFixed(1)}%</td>
    </tr>`;
  }).join('');

  // DREAM OLG-inspired fiscal sustainability (holdbarhed)
  // Required: structural surplus > demographic pressure (~2.5% of GDP by 2040 from aging)
  const demographicPressure = 2.5; // % of GDP (DREAM's published estimate for DK aging pressure)
  const adjustedGap = balPct - demographicPressure;
  let holdClass, holdIcon, holdLabel, holdDesc;
  if (adjustedGap > 0.5) {
    holdClass = 'hold-ok'; holdIcon = '✓';
    holdLabel = 'Holdbar';
    holdDesc = `Med et strukturelt overskud på ${VG.ppct(balPct)} af BNP og en aldringsudgift på ca. ${demographicPressure}% af BNP frem mod 2040, er den samlede finanspolitik holdbar på lang sigt.`;
  } else if (adjustedGap > -0.5) {
    holdClass = 'hold-warn'; holdIcon = '⚠';
    holdLabel = 'På grænsen';
    holdDesc = `Den demografiske udgiftspres (~${demographicPressure}% af BNP) overstiger næsten det strukturelle overskud (${VG.ppct(balPct)}). Marginen er lille — selv moderate ændringer kan gøre finanspolitikken uholdbar.`;
  } else {
    holdClass = 'hold-fail'; holdIcon = '✗';
    holdLabel = 'Ikke holdbar';
    holdDesc = `Det strukturelle overskud (${VG.ppct(balPct)}) er ikke tilstrækkeligt til at absorbere aldringspresset (~${demographicPressure}% af BNP). Ifølge DREAM's OLG-model vil gælden stige uholdbart uden politikjusteringer.`;
  }

  return `<div class="card">
    <h2>Statsgæld 2026–2034</h2>
    <p class="intro">Hvis dit nuværende budget fastholdes hvert år. Starter på 30% af BNP. BNP-vækst 2%/år.</p>
    <div class="chart-container"><canvas id="debt-chart"></canvas></div>
    <div class="year-grid">${yearStats}</div>
    <h2 style="margin-top:24px">EU-budgetregler</h2>
    <p class="intro">Danmark er bundet af både EU's Stabilitetspagt og den danske Budgetlov.</p>
    <div class="eu-pills">${pills}</div>
    <div class="holdbarhed-box ${holdClass}">
      <div class="holdbarhed-head">
        <span class="holdbarhed-icon">${holdIcon}</span>
        <div>
          <strong>DREAM Holdbarhedsindikator: ${holdLabel}</strong>
          <p class="holdbarhed-desc">${holdDesc}</p>
        </div>
      </div>
      <div class="holdbarhed-grid">
        <div class="holdbarhed-item"><span>Strukturel saldo</span><strong>${VG.ppct(balPct)} af BNP</strong></div>
        <div class="holdbarhed-item"><span>Aldringspres 2040</span><strong>−${demographicPressure}% af BNP</strong></div>
        <div class="holdbarhed-item"><span>Justeret holdbarhed</span><strong class="${adjustedGap > 0 ? 'neg' : 'pos'}">${VG.ppct(adjustedGap)} af BNP</strong></div>
      </div>
      <p class="holdbarhed-source">Metode: DREAM's OLG-model (overlappende generationer). Aldringspres baseret på DREAMs fremskrivning af alders-relaterede udgifter 2026–2045. <a href="https://dreamgruppen.dk/modeller-og-metoder/makro" target="_blank" rel="noopener">dreamgruppen.dk</a></p>
    </div>
    ${(function() {
      const c = (typeof VG.livedata !== 'undefined' && VG.livedata.climate) ? VG.livedata.climate : null;
      const baseline = c ? c.baseline_1990         : 69.6;
      const cur      = c ? c.current_mt            : 42.1;
      const tgt      = c ? c.target_2030_mt        : 20.9;
      const curPct   = c ? c.current_pct_reduction : 39.5;
      const gap      = c ? c.gap_mt                : 21.2;
      const req      = c ? c.required_annual_reduction_pct : 8.5;
      const curYear  = c ? c.current_year          : 2023;
      const progressPct = Math.min(100, (curPct / 70 * 100)).toFixed(1);
      return `<h2 style="margin-top:28px">🌱 Klimastatus — vejen mod 2030</h2>
<p class="intro">Danmarks CO2-reduktion mod det lovbundne mål om 70% reduktion i 2030 ift. 1990.</p>
<div class="climate-status-box">
  <div class="climate-col">
    <div class="climate-year">1990</div>
    <div class="climate-mt">${baseline.toFixed(1).replace('.', ',')} Mt</div>
    <div class="climate-lbl">Basisår</div>
  </div>
  <div class="climate-col climate-col--current">
    <div class="climate-year">${curYear}</div>
    <div class="climate-mt">${cur.toFixed(1).replace('.', ',')} Mt</div>
    <div class="climate-lbl">Nu (−${curPct.toFixed(1).replace('.', ',')}%)</div>
  </div>
  <div class="climate-col climate-col--target">
    <div class="climate-year">2030</div>
    <div class="climate-mt">${tgt.toFixed(1).replace('.', ',')} Mt</div>
    <div class="climate-lbl">Mål (−70%)</div>
  </div>
</div>
<div class="climate-progress-wrap">
  <div class="climate-progress-labels">
    <span>0%</span><span>Nået: ${curPct.toFixed(1).replace('.', ',')}%</span><span>Mål: 70%</span>
  </div>
  <div class="climate-progress-track">
    <div class="climate-progress-done" style="width:${progressPct}%"></div>
  </div>
  <p class="climate-gap-note">⚠ Mangler yderligere ${gap.toFixed(1).replace('.', ',')} Mt reduktion inden 2030 — kræver ~${req.toFixed(1).replace('.', ',')}% reduktion pr. år fra nu. Kilde: Klimarådet 2024.</p>
</div>`;
    })()}
    <h2 style="margin-top:28px">Historisk oversigt 2022–2026</h2>
    <p class="intro">Faktiske og estimerede tal. Saldo > 0 betyder overskud (grøn).</p>
    <div style="overflow-x:auto">
    <table class="hist-table">
      <thead><tr><th>År</th><th>Indtægter</th><th>Udgifter</th><th>Saldo % BNP</th><th>Gæld % BNP</th><th>BNP-vækst</th></tr></thead>
      <tbody>${histRows}</tbody>
    </table>
    </div>
  </div>`;
};

VG.render.scenarios = function() {
  const scenarios = VG.state.baseline.scenarios;
  const cards = Object.entries(scenarios).map(([k, s]) =>
    `<div class="scenario" data-scenario="${k}"><div class="scenario-title">${s.title}</div><div class="scenario-desc">${s.desc}</div></div>`
  ).join('');
  return `<div class="card"><h2>Færdige politiske scenarier</h2><p class="intro">Klik for at indlæse et færdigt scenarie. Du kan herefter justere videre på det.</p><div class="scenarios">${cards}</div></div>`;
};

VG.render.folketing = function() {
  const votes = VG.state.live.votes;
  const activeBills = VG.state.live.activeBills || [];

  // Active bills section
  let billsSection = '';
  if (!activeBills.length) {
    billsSection = `<div class="card" style="margin-bottom:16px">
  <h2>Aktuelle lovforslag i behandling</h2>
  <p class="intro">Lovforslag der aktuelt behandles i Folketing eller udvalgene. Kilde: Folketingets ODA-API.</p>
  <div class="loading">Henter aktuelle lovforslag...</div>
</div>`;
  } else {
    const billCards = activeBills.slice(0, 8).map(b => {
      const dotClass = (b.statusid === 2) ? 'status-new' : (b.statusid === 3) ? 'status-active' : '';
      const dateStr  = b.opdateret ? new Date(b.opdateret).toLocaleDateString('da-DK') : '';
      const metaParts = [];
      if (b.nummer) metaParts.push('L ' + b.nummer);
      if (b.statusLabel) metaParts.push(b.statusLabel);
      if (dateStr) metaParts.push('opdateret: ' + dateStr);
      return `<div class="bill-card">
  <div class="bill-status-dot ${dotClass}"></div>
  <div class="bill-body">
    <div class="bill-title">${b.titel || '(ingen titel)'}</div>
    <div class="bill-meta">${metaParts.join(' · ')}</div>
  </div>
  <a href="${b.url}" target="_blank" rel="noopener" class="bill-link">↗</a>
</div>`;
    }).join('');
    billsSection = `<div class="card" style="margin-bottom:16px">
  <h2>Aktuelle lovforslag i behandling</h2>
  <p class="intro">Lovforslag der aktuelt behandles i Folketing eller udvalgene. Kilde: Folketingets ODA-API.</p>
  <div class="bills-list">${billCards}</div>
</div>`;
  }

  if (!votes || !votes.length) {
    const loaded = VG.state.live.votesLoaded;
    const msg = loaded
      ? 'Live data fra Folketinget er midlertidigt utilgængeligt. Prøv at genindlæse om et øjeblik.'
      : 'Henter live data fra Folketingets ODA-API...';
    return `${billsSection}<div class="card"><h2>Folketinget — seneste afstemninger</h2><div class="loading">${msg}</div></div>`;
  }
  const html = votes.slice(0, 15).map(v => {
    const status = v.vedtaget ? 'passed' : 'failed';
    const label = v.vedtaget ? 'Vedtaget' : 'Forkastet';
    const title = v.sagTitel || v.konklusion || 'Afstemning #' + v.nummer;
    const date = v.dato ? new Date(v.dato).toLocaleDateString('da-DK') : '';
    return `<div class="vote-card">
      <div class="vote-head">
        <div class="vote-title">${title}</div>
        <span class="vote-status ${status}">${label}</span>
      </div>
      <div class="vote-meta">Afstemning #${v.nummer} · ${date}</div>
    </div>`;
  }).join('');
  return `${billsSection}<div class="card">
    <h2>Folketinget — seneste afstemninger</h2>
    <p class="intro">Live data fra <a href="https://oda.ft.dk/" target="_blank" rel="noopener">Folketingets ODA-API</a>. Viser de 15 seneste afstemninger i Folketingssalen.</p>
    ${html}
  </div>`;
};

VG.render.safePanel = function(id, fn) {
  try {
    document.getElementById(id).innerHTML = fn();
  } catch (e) {
    console.error('[render] ' + id + ':', e);
    document.getElementById(id).innerHTML = '<div class="card"><p style="color:var(--pos)">Fejl ved rendering af dette panel. Se konsollen for detaljer.</p></div>';
  }
};

// Re-render only the currently active panel (fast path for slider updates)
VG.render.fast = function() {
  VG.applyPolicy();
  try { VG.render.summary(); } catch (e) { console.error('[render] summary:', e); }

  const tab = VG.state.activeTab;
  const simple = {
    overview:   () => VG.render.safePanel('panel-overview',   () => VG.render.overview()),
    spending:   () => VG.render.safePanel('panel-spending',   () => VG.render.sliders('expense')),
    revenue:    () => VG.render.safePanel('panel-revenue',    () => VG.render.sliders('revenue')),
    policy:     () => VG.render.safePanel('panel-policy',     () => VG.render.policy()),
    projection: () => { VG.render.safePanel('panel-projection', () => VG.render.projection()); setTimeout(() => VG.chart.drawDebt(), 0); },
    scenarios:  () => VG.render.safePanel('panel-scenarios',  () => VG.render.scenarios()),
    folketing:  () => VG.render.safePanel('panel-folketing',  () => VG.render.folketing()),
    historik:   () => VG.render.historik(),
  };
  if (simple[tab]) {
    simple[tab]();
  } else {
    try {
      if (tab === 'party')        VG.party.renderPanel();
      if (tab === 'demographics') VG.demo.renderPanel();
      if (tab === 'platform')     VG.platform.renderPanel();
      if (tab === 'regering')     VG.regering.renderPanel();
      if (tab === 'partier')      VG.partier.renderPanel();
      if (tab === 'borger')       VG.borger.renderPanel();
      if (tab === 'mandater')     VG.mandater.renderPanel();
      if (tab === 'valgkort')     VG.valgkort.renderPanel();
      if (tab === 'energi')       VG.energi.renderPanel();
      if (tab === 'kommuner')     VG.kommuner.renderPanel();
      if (tab === 'sundhed')      VG.render.sundhed();
      if (tab === 'forbrug')      VG.render.forbrug();
      if (tab === 'rygter')       VG.rygter.renderPanel();
      if (tab === 'bolig')        VG.bolig.renderPanel();
      if (tab === 'pension')      VG.pension.renderPanel();
      if (tab === 'ventetider')   VG.render.ventetider();
      if (tab === 'dsb')          VG.render.dsb();
      if (tab === 'aeldrepleje')  VG.render.aeldrepleje();
      if (tab === 'elpris')            VG.render.elpris();
      if (tab === 'ledighed')          VG.render.ledighed();
      if (tab === 'meningsmaalinger')  VG.meningsmaalinger.renderPanel();
      if (tab === 'boligmarked')    VG.render.boligmarked();
      if (tab === 'indkomst')       VG.render.indkomst();
      if (tab === 'co2')            VG.render.co2();
      if (tab === 'kriminalitet')   VG.render.kriminalitet();
      if (tab === 'uddannelse')     VG.render.uddannelse();
      if (tab === 'inflation')      VG.render.inflation();
      if (tab === 'udenrigshandel') VG.render.udenrigshandel();
      if (tab === 'landbrug')       VG.render.landbrug();
      if (tab === 'statsgaeld')     VG.render.statsgaeld();
      if (tab === 'erhverv')        VG.render.erhverv();
      if (tab === 'innovation')     VG.render.innovation();
    } catch (e) { console.error('[render] tab panel:', e); }
  }
  VG.bindControls();
};

VG.render.all = function() {
  VG.applyPolicy();
  try { VG.render.summary(); } catch (e) { console.error('[render] summary:', e); }
  try { VG.render.liveIndicators(); } catch (e) { console.error('[render] liveIndicators:', e); }

  VG.render.safePanel('panel-overview',    () => VG.render.overview());
  VG.render.safePanel('panel-spending',    () => VG.render.sliders('expense'));
  VG.render.safePanel('panel-revenue',     () => VG.render.sliders('revenue'));
  VG.render.safePanel('panel-policy',      () => VG.render.policy());
  VG.render.safePanel('panel-projection',  () => VG.render.projection());
  VG.render.safePanel('panel-scenarios',   () => VG.render.scenarios());
  VG.render.safePanel('panel-folketing',   () => VG.render.folketing());
  try { VG.render.historik(); } catch (e) { console.error('[render] historik:', e); }

  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + VG.state.activeTab));

  if (VG.state.activeTab === 'projection') {
    setTimeout(() => VG.chart.drawDebt(), 0);
  }

  try {
    if (VG.state.activeTab === 'party')        VG.party.renderPanel();
    if (VG.state.activeTab === 'demographics') VG.demo.renderPanel();
    if (VG.state.activeTab === 'platform')     VG.platform.renderPanel();
    if (VG.state.activeTab === 'regering')     VG.regering.renderPanel();
    if (VG.state.activeTab === 'partier')      VG.partier.renderPanel();
    if (VG.state.activeTab === 'borger')       VG.borger.renderPanel();
  } catch (e) { console.error('[render] tab panel:', e); }

  VG.bindControls();
};

VG.bindControls = function() {
  document.querySelectorAll('input[type=range][data-bucket]').forEach(inp => {
    if (inp._vgBound) return;
    inp._vgBound = true;
    inp.addEventListener('input', e => {
      const b = e.target.dataset.bucket, k = e.target.dataset.key;
      VG.state.manualAdj[b][k] = parseFloat(e.target.value);
      VG.render.fast();
    });
  });
  document.querySelectorAll('input[type=range][data-policy]').forEach(inp => {
    if (inp._vgBound) return;
    inp._vgBound = true;
    inp.addEventListener('input', e => {
      VG.state.current.policy[e.target.dataset.policy].val = parseFloat(e.target.value);
      VG.render.fast();
    });
  });
  document.querySelectorAll('.scenario').forEach(el => {
    if (el._vgBound) return;
    el._vgBound = true;
    el.addEventListener('click', () => VG.loadScenario(el.dataset.scenario));
  });
};

VG.render.historik = function() {
  const el = document.getElementById('panel-historik');
  if (!el) return;
  el.innerHTML = VG.render.buildHistorikHTML();
  requestAnimationFrame(() => {
    VG.render.drawHistorikChart('hist-debt-canvas',   VG.render.HIST_DATA.debt,   'Statsgæld (% af BNP)', '#0a6e78');
    VG.render.drawHistorikChart('hist-growth-canvas', VG.render.HIST_DATA.growth, 'BNP-vækst (%)',        '#3b9e6e');
    VG.render.drawHistorikChart('hist-unemp-canvas',  VG.render.HIST_DATA.unemp,  'Ledighed (%)',         '#e06b3a');
  });
};

VG.render.HIST_DATA = {
  years: [2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024],
  debt:   [52.4,49.6,49.5,47.2,45.1,37.8,32.1,27.3,33.4,40.4,42.9,46.4,45.4,44.7,44.3,39.5,37.9,35.9,34.1,33.3,42.2,36.7,29.8,29.3,28.5],
  growth: [ 3.7, 0.7, 0.5, 0.4, 2.3, 2.4, 3.9, 1.6,-0.5,-4.9, 1.9, 1.3,-0.1,-0.5, 1.6, 2.3, 3.2, 2.8, 2.0,-0.8,-2.0, 4.9, 3.8, 1.8, 2.1],
  unemp:  [ 4.3, 4.5, 4.6, 5.4, 5.4, 4.8, 3.9, 3.8, 3.5, 6.0, 7.5, 7.6, 7.5, 7.0, 6.6, 6.2, 6.2, 5.7, 5.0, 5.0, 5.6, 5.1, 5.0, 5.1, 5.0]
};

VG.render.buildHistorikHTML = function() {
  return `<div class="card">
  <h2>📈 Historisk økonomi 2000–2024</h2>
  <p style="font-size:13px;color:var(--text-2);margin-top:4px">Nøgletal for den danske økonomi over de seneste 25 år. Kilde: Danmarks Statistik / OECD.</p>

  <div class="hist-grid">
    <div class="hist-chart-block">
      <div class="hist-chart-label">Statsgæld (% af BNP)</div>
      <canvas id="hist-debt-canvas" class="hist-canvas"></canvas>
      <div class="hist-chart-note">EU-grænse: 60%</div>
    </div>
    <div class="hist-chart-block">
      <div class="hist-chart-label">BNP-vækst (%)</div>
      <canvas id="hist-growth-canvas" class="hist-canvas"></canvas>
      <div class="hist-chart-note">Finanskrise 2009: −4,9%</div>
    </div>
    <div class="hist-chart-block">
      <div class="hist-chart-label">Ledighed (%)</div>
      <canvas id="hist-unemp-canvas" class="hist-canvas"></canvas>
      <div class="hist-chart-note">Strukturel: ~5%</div>
    </div>
  </div>

  <div class="hist-highlights">
    <div class="hist-hl-card">
      <div class="hist-hl-num">28,5%</div>
      <div class="hist-hl-label">Statsgæld 2024 — DK er et af EU's mindst gældssatte lande</div>
    </div>
    <div class="hist-hl-card">
      <div class="hist-hl-num">−4,9%</div>
      <div class="hist-hl-label">Laveste BNP-vækst (finanskrise 2009)</div>
    </div>
    <div class="hist-hl-card">
      <div class="hist-hl-num">7,6%</div>
      <div class="hist-hl-label">Højeste ledighed (2011, efter finanskrise)</div>
    </div>
  </div>
</div>`;
};

VG.render.drawHistorikChart = function(canvasId, data, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600;
  canvas.height = 90 * window.devicePixelRatio || 90;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const PAD = { l: 4, r: 4, t: 8, b: 4 };
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const toX = (i) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const toY = (v) => PAD.t + (1 - (v - minVal) / range) * (H - PAD.t - PAD.b);

  // Zero line if data crosses zero
  if (minVal < 0 && maxVal > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(128,128,128,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const y0 = toY(0);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
    ctx.restore();
  }

  // Fill under curve
  ctx.beginPath();
  ctx.moveTo(toX(0), H);
  data.forEach((v, i) => { if (i === 0) ctx.lineTo(toX(i), toY(v)); else ctx.lineTo(toX(i), toY(v)); });
  ctx.lineTo(toX(data.length - 1), H);
  ctx.closePath();
  ctx.fillStyle = color + '22';
  ctx.fill();

  // Line
  ctx.beginPath();
  data.forEach((v, i) => { if (i === 0) ctx.moveTo(toX(i), toY(v)); else ctx.lineTo(toX(i), toY(v)); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dots at min and max
  [{ val: minVal, idx: data.indexOf(minVal) }, { val: maxVal, idx: data.indexOf(maxVal) }].forEach(({ val, idx }) => {
    ctx.beginPath();
    ctx.arc(toX(idx), toY(val), 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
};

VG.render.sundhed = async function() {
  const panel = document.getElementById('panel-sundhed');
  if (!panel) return;

  let d;
  try {
    d = await fetch('/api/livedata/sundhed').then(r => r.json());
  } catch (e) {
    panel.innerHTML = '<p class="text-muted">Sundhedsdata midlertidigt utilgængelig.</p>';
    return;
  }

  const smokeTrend = d.smoking.trend.map(t => `<span style="color:var(--text-2)">${t.year}:</span> ${t.val}%`).join(' → ');
  const lifeExp = d.lifeExpectancy;

  const lifeExpRows = lifeExp.trend.map(t =>
    `<div class="hist-point"><span>${t.year}</span><strong>${t.val}</strong></div>`
  ).join('');

  const sickTrend = d.sickDays.trend.map(t =>
    `<div class="hist-point"><span>${t.year}</span><strong>${t.val}</strong></div>`
  ).join('');

  panel.innerHTML = `
    <div class="section-header">
      <h2>🏥 Sundhed</h2>
      <p class="section-desc">Danskernes sundhedstilstand — levealder, sygefravær, livsstil og sundhedsudgifter</p>
    </div>

    <div class="e-hero-grid">
      <div class="e-hero-card accent-card">
        <div class="e-hero-num">${lifeExp.total}</div>
        <div class="e-hero-label">Levealder (år)</div>
        <div class="e-hero-sub">M: ${lifeExp.men} · K: ${lifeExp.women}</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.sickDays.avgPerEmployee}</div>
        <div class="e-hero-label">Sygefraværsdage/år</div>
        <div class="e-hero-sub">pr. medarbejder</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.healthSpending.pctGDP}%</div>
        <div class="e-hero-label">Sundhedsudgifter</div>
        <div class="e-hero-sub">af BNP (EU-snit: ${d.healthSpending.euAvgPctGDP}%)</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.smoking.dailyPct}%</div>
        <div class="e-hero-label">Dagligrygere</div>
        <div class="e-hero-sub">mod 30% i år 2000</div>
      </div>
    </div>

    <div class="sundhed-grid">
      <div class="card">
        <h3>Levealder over tid</h3>
        <div class="hist-timeline">${lifeExpRows}</div>
        <p class="data-note">EU-snit: mænd ${lifeExp.euAvgMen} · kvinder ${lifeExp.euAvgWomen} · Kilde: ${lifeExp.source}</p>
      </div>
      <div class="card">
        <h3>Sygefravær over tid (dage/medarbejder)</h3>
        <div class="hist-timeline">${sickTrend}</div>
        <div class="e-bar-row">
          <div class="e-bar-label">Offentlig sektor</div>
          <div class="e-bar-track"><div class="e-bar-fill" style="width:${(d.sickDays.public/15*100).toFixed(0)}%;background:var(--accent)"></div></div>
          <div class="e-bar-val">${d.sickDays.public} dage</div>
        </div>
        <div class="e-bar-row">
          <div class="e-bar-label">Privat sektor</div>
          <div class="e-bar-track"><div class="e-bar-fill" style="width:${(d.sickDays.private/15*100).toFixed(0)}%;background:#22c5d4"></div></div>
          <div class="e-bar-val">${d.sickDays.private} dage</div>
        </div>
        <p class="data-note">Kilde: ${d.sickDays.source}</p>
      </div>
    </div>

    <div class="card">
      <h3>Mental sundhed</h3>
      <div class="e-hero-grid">
        <div class="e-hero-card">
          <div class="e-hero-num">${d.mentalHealth.stressPct}%</div>
          <div class="e-hero-label">Stress</div>
        </div>
        <div class="e-hero-card">
          <div class="e-hero-num">${d.mentalHealth.depressionPct}%</div>
          <div class="e-hero-label">Depression</div>
        </div>
        <div class="e-hero-card">
          <div class="e-hero-num">${d.mentalHealth.anxietyPct}%</div>
          <div class="e-hero-label">Angst</div>
        </div>
        <div class="e-hero-card">
          <div class="e-hero-num">${d.mentalHealth.burnoutPct}%</div>
          <div class="e-hero-label">Udbrændthed</div>
        </div>
      </div>
      <p class="data-note">Kilde: ${d.mentalHealth.source}</p>
    </div>

    <div class="card">
      <h3>Overvægt & rygning</h3>
      <div class="e-bar-row">
        <div class="e-bar-label">Overvægt (BMI > 30) — DK ${d.obesity.pct}% · EU ${d.obesity.euAvg}%</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.obesity.pct*3}%;background:var(--accent)"></div></div>
        <div class="e-bar-val">${d.obesity.pct}%</div>
      </div>
      <div class="e-bar-row">
        <div class="e-bar-label">Dagligrygere (2023)</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.smoking.dailyPct*3}%;background:#22c5d4"></div></div>
        <div class="e-bar-val">${d.smoking.dailyPct}%</div>
      </div>
      <p class="data-note">Rygning: ${smokeTrend}</p>
    </div>
  `;
};

VG.render.forbrug = async function() {
  const panel = document.getElementById('panel-forbrug');
  if (!panel) return;

  let d;
  try {
    d = await fetch('/api/livedata/forbrug').then(r => r.json());
  } catch (e) {
    panel.innerHTML = '<p class="text-muted">Forbrugsdata midlertidigt utilgængelig.</p>';
    return;
  }

  const evTrend = d.carRegistrations.trend.map(t =>
    `<div class="hist-point"><span>${t.month.replace('M','/').slice(2)}</span><strong>${t.ev}%</strong></div>`
  ).join('');

  const confTrend = d.consumerConfidence.trend.map(t => {
    const v = t.val;
    const color = v >= 0 ? 'var(--accent)' : '#c0392b';
    return `<div class="hist-point"><span>${t.month.replace('M','/').slice(2)}</span><strong style="color:${color}">${v > 0 ? '+' : ''}${v}</strong></div>`;
  }).join('');

  const retailTrend = d.retail.trend.map(t =>
    `<div class="hist-point"><span>${t.year}</span><strong>${t.idx}</strong></div>`
  ).join('');

  const confColor = d.consumerConfidence.index >= 0 ? 'var(--accent)' : '#c0392b';

  panel.innerHTML = `
    <div class="section-header">
      <h2>🛍 Forbrug</h2>
      <p class="section-desc">Dansk forbrug og forbrugertillid — bilsalg, detailhandel og opsparingsrate</p>
    </div>

    <div class="e-hero-grid">
      <div class="e-hero-card accent-card">
        <div class="e-hero-num">${d.consumerConfidence.index > 0 ? '+' : ''}${d.consumerConfidence.index}</div>
        <div class="e-hero-label">Forbrugertillid</div>
        <div class="e-hero-sub">Mod ${d.consumerConfidence.prev > 0 ? '+' : ''}${d.consumerConfidence.prev} sidst</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.carRegistrations.newCars.toLocaleString('da')}</div>
        <div class="e-hero-label">Nybilsalg/mdr</div>
        <div class="e-hero-sub">${d.carRegistrations.latestMonth.replace('M','/')}</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.carRegistrations.electricShare}%</div>
        <div class="e-hero-label">El-biler andel</div>
        <div class="e-hero-sub">af nybilsalg</div>
      </div>
      <div class="e-hero-card">
        <div class="e-hero-num">${d.savings.householdSavingsRate}%</div>
        <div class="e-hero-label">Husholdningsopsparing</div>
        <div class="e-hero-sub">Gæld/indkomst: ${d.savings.debtToIncomePct}%</div>
      </div>
    </div>

    <div class="sundhed-grid">
      <div class="card">
        <h3>Forbrugertillid over tid</h3>
        <div class="hist-timeline">${confTrend}</div>
        <p class="data-note">Positiv = optimisme. Kilde: ${d.consumerConfidence.source}</p>
      </div>
      <div class="card">
        <h3>El-bilers andel af nybilsalg</h3>
        <div class="hist-timeline">${evTrend}</div>
        <p class="data-note">Kilde: ${d.carRegistrations.source}</p>
      </div>
    </div>

    <div class="card">
      <h3>Detailhandelsindeks (2020 = 100)</h3>
      <div class="hist-timeline">${retailTrend}</div>
      <div class="e-bar-row">
        <div class="e-bar-label">Indeks 2025</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${Math.min(d.retail.indexLatest, 120)/120*100}%;background:var(--accent)"></div></div>
        <div class="e-bar-val">${d.retail.indexLatest} (${d.retail.yoy > 0 ? '+' : ''}${d.retail.yoy}% ÅoÅ)</div>
      </div>
      <p class="data-note">Kilde: ${d.retail.source}</p>
    </div>

    <div class="card">
      <h3>Husholdningsøkonomi</h3>
      <div class="e-bar-row">
        <div class="e-bar-label">Opsparingsrate</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.savings.householdSavingsRate*5}%;background:var(--accent)"></div></div>
        <div class="e-bar-val">${d.savings.householdSavingsRate}% af disponibel indkomst</div>
      </div>
      <div class="e-bar-row">
        <div class="e-bar-label">Gæld ift. indkomst</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${Math.min(d.savings.debtToIncomePct/300*100, 100)}%;background:#22c5d4"></div></div>
        <div class="e-bar-val">${d.savings.debtToIncomePct}% (høj internationalt)</div>
      </div>
      <p class="data-note">Kilde: ${d.savings.source}</p>
    </div>
  `;
};

// ── Ventetider ─────────────────────────────────────────────────────────────

VG.render.ventetider = async function() {
  const panel = document.getElementById('panel-ventetider');
  if (!panel) return;
  panel.innerHTML = '<div class="panel-loading">Henter ventetidsdata…</div>';

  let d;
  try {
    d = await fetch('/api/livedata/ventetider').then(r => r.json());
  } catch (e) {
    panel.innerHTML = '<p class="text-muted">Ventetidsdata midlertidigt utilgængelig.</p>';
    return;
  }

  const specialtyBars = d.specialties.map(sp => {
    const pct = Math.min(100, sp.avgDays / 200 * 100).toFixed(0);
    const color = sp.avgDays > 90 ? 'var(--pos)' : sp.avgDays > 45 ? 'var(--warn)' : 'var(--neg)';
    return `<div class="e-bar-row">
      <div class="e-bar-label" style="font-size:12px">${sp.name}</div>
      <div class="e-bar-track"><div class="e-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="e-bar-val" style="color:${color}">${sp.avgDays} dage</div>
    </div>`;
  }).join('');

  const regionRows = d.byRegion.map(r => {
    const trendIcon = r.trend === 'stigende' ? '↑' : r.trend === 'faldende' ? '↓' : '→';
    const trendColor = r.trend === 'stigende' ? 'var(--pos)' : r.trend === 'faldende' ? 'var(--neg)' : 'var(--text-3)';
    return `<tr><td>${r.region}</td><td>${r.avgDays} dage</td><td style="color:${trendColor}">${trendIcon} ${r.trend}</td></tr>`;
  }).join('');

  const trendPoints = d.trend.map(t =>
    `<div class="hist-point"><span>${t.year}</span><strong>${t.avgDays}</strong></div>`
  ).join('');

  const targetColor = d.target.pctWithinTarget >= 80 ? 'var(--neg)' : d.target.pctWithinTarget >= 60 ? 'var(--warn)' : 'var(--pos)';

  panel.innerHTML = `
<div class="section-header">
  <h2>⏳ Ventetider på sygehuse</h2>
  <p class="section-desc">Gennemsnitlige ventetider på planlagte behandlinger — opdateret Q1 2026</p>
</div>

<div class="e-hero-grid">
  <div class="e-hero-card accent-card">
    <div class="e-hero-num">${d.nationalAvgDays}</div>
    <div class="e-hero-label">Dages gns. ventetid</div>
    <div class="e-hero-sub">nationalt gennemsnit</div>
  </div>
  <div class="e-hero-card ${d.target.pctWithinTarget >= 80 ? 'accent-card' : ''}">
    <div class="e-hero-num" style="color:${targetColor}">${d.target.pctWithinTarget}%</div>
    <div class="e-hero-label">Inden for 30-dages garanti</div>
    <div class="e-hero-sub">mål: 100%</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--pos)">180</div>
    <div class="e-hero-label">Børnepsykiatri (dage)</div>
    <div class="e-hero-sub">op til 1 år ventetid</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--neg)">14</div>
    <div class="e-hero-label">Kræft (dage)</div>
    <div class="e-hero-sub">inden for pakkeforløb</div>
  </div>
</div>

<div class="card">
  <h3>Ventetid efter speciale</h3>
  <p class="intro">Gennemsnitlig ventetid for ikke-akutte behandlinger. Rød = over 90 dage, gul = 45–90, grøn = under 45 dage.</p>
  <div class="e-bars">${specialtyBars}</div>
  <p class="data-note">Kilde: Sundhedsdatastyrelsen 2025/2026</p>
</div>

<div class="sundhed-grid">
  <div class="card">
    <h3>Ventetid pr. region</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <thead><tr style="font-size:11px;color:var(--text-2)"><th style="text-align:left;padding:6px 0">Region</th><th style="text-align:left;padding:6px 0">Gns. ventetid</th><th style="text-align:left;padding:6px 0">Trend</th></tr></thead>
      <tbody>${regionRows}</tbody>
    </table>
  </div>
  <div class="card">
    <h3>Udvikling 2020–2025</h3>
    <div class="hist-timeline">${trendPoints}</div>
    <p class="data-note">${d.target.note}</p>
  </div>
</div>`;
};

// ── DSB / Transport ─────────────────────────────────────────────────────────

VG.render.dsb = async function() {
  const panel = document.getElementById('panel-dsb');
  if (!panel) return;
  panel.innerHTML = '<div class="panel-loading">Henter transportdata…</div>';

  let d;
  try {
    d = await fetch('/api/livedata/dsb').then(r => r.json());
  } catch (e) {
    panel.innerHTML = '<p class="text-muted">Transportdata midlertidigt utilgængelig.</p>';
    return;
  }

  const pctColor = d.punctuality.pct2025 >= d.punctuality.target
    ? 'var(--neg)' : d.punctuality.pct2025 >= 85 ? 'var(--warn)' : 'var(--pos)';

  const punctTrend = d.punctuality.trend.map(t => {
    const color = t.pct >= d.punctuality.target ? 'var(--neg)' : t.pct >= 85 ? 'var(--warn)' : 'var(--pos)';
    return `<div class="hist-point"><span>${t.year}</span><strong style="color:${color}">${t.pct}%</strong></div>`;
  }).join('');

  const causesBars = d.disruptions.topCauses.map(c => {
    const pct = c.pct;
    return `<div class="e-bar-row">
      <div class="e-bar-label" style="font-size:12px">${c.cause}</div>
      <div class="e-bar-track"><div class="e-bar-fill" style="width:${pct*2}%;background:var(--accent)"></div></div>
      <div class="e-bar-val">${pct}%</div>
    </div>`;
  }).join('');

  const investGapPct = (d.infrastructure.investmentAllocatedBn / d.infrastructure.investmentNeededBn * 100).toFixed(0);

  panel.innerHTML = `
<div class="section-header">
  <h2>🚂 Transport & DSB</h2>
  <p class="section-desc">DSB rettidighed, infrastrukturefterslæb og togstatistik 2025</p>
</div>

<div class="e-hero-grid">
  <div class="e-hero-card accent-card">
    <div class="e-hero-num" style="color:${pctColor}">${d.punctuality.pct2025}%</div>
    <div class="e-hero-label">Rettidighed 2025</div>
    <div class="e-hero-sub">Mål: ${d.punctuality.target}% · 2024: ${d.punctuality.pct2024}%</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--pos)">${d.infrastructure.signalAgeAvgYears}</div>
    <div class="e-hero-label">Gns. alder signalsystem (år)</div>
    <div class="e-hero-sub">${d.infrastructure.pctOver30Years}% er over 30 år gammelt</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--pos)">${d.infrastructure.investmentGapBn.toFixed(1).replace('.', ',')} mia.</div>
    <div class="e-hero-label">Investeringsefterslæb</div>
    <div class="e-hero-sub">${d.infrastructure.investmentAllocatedBn} mia. bevilget / ${d.infrastructure.investmentNeededBn} mia. behov</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--warn)">${d.satisfaction.trustpilotScore}</div>
    <div class="e-hero-label">Trustpilot-score</div>
    <div class="e-hero-sub">Tilfredshed: ${d.satisfaction.customerSatisfactionIndex}/100</div>
  </div>
</div>

<div class="sundhed-grid">
  <div class="card">
    <h3>Rettidighed over tid</h3>
    <div class="hist-timeline">${punctTrend}</div>
    <div style="margin-top:12px">
      <div class="e-bar-row">
        <div class="e-bar-label">Rettidighed 2025</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.punctuality.pct2025}%;background:${pctColor}"></div></div>
        <div class="e-bar-val" style="color:${pctColor}">${d.punctuality.pct2025}%</div>
      </div>
      <div class="e-bar-row">
        <div class="e-bar-label">Mål</div>
        <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.punctuality.target}%;background:var(--border-strong)"></div></div>
        <div class="e-bar-val">${d.punctuality.target}%</div>
      </div>
    </div>
    <p class="data-note">${d.punctuality.note}</p>
  </div>
  <div class="card">
    <h3>Årsager til forsinkelser 2024</h3>
    <div class="e-bars">${causesBars}</div>
    <p class="data-note">Større forstyrrelser: ${d.disruptions.majorEvents2025} i 2025 (mod ${d.disruptions.majorEvents2024} i 2024)</p>
  </div>
</div>

<div class="card">
  <h3>Infrastruktur & Elektrificering</h3>
  <div class="e-bar-row">
    <div class="e-bar-label">Bevilget investering</div>
    <div class="e-bar-track"><div class="e-bar-fill" style="width:${investGapPct}%;background:var(--accent)"></div></div>
    <div class="e-bar-val">${d.infrastructure.investmentAllocatedBn} mia. kr.</div>
  </div>
  <div class="e-bar-row">
    <div class="e-bar-label">Samlet behov</div>
    <div class="e-bar-track"><div class="e-bar-fill" style="width:100%;background:var(--surface-3)"></div></div>
    <div class="e-bar-val">${d.infrastructure.investmentNeededBn} mia. kr.</div>
  </div>
  <div class="e-bar-row">
    <div class="e-bar-label">Elektrificeret bane</div>
    <div class="e-bar-track"><div class="e-bar-fill" style="width:${d.electrificationPct}%;background:#22c5d4"></div></div>
    <div class="e-bar-val">${d.electrificationPct}% (mål 2030: ${d.electrificationTarget2030Pct}%)</div>
  </div>
  <p class="data-note">${d.infrastructure.note}</p>
</div>`;
};

// ── Ældrepleje ──────────────────────────────────────────────────────────────

VG.render.aeldrepleje = async function() {
  const panel = document.getElementById('panel-aeldrepleje');
  if (!panel) return;
  panel.innerHTML = '<div class="panel-loading">Henter ældreplejedata…</div>';

  let d;
  try {
    d = await fetch('/api/livedata/aeldrepleje').then(r => r.json());
  } catch (e) {
    panel.innerHTML = '<p class="text-muted">Ældreplejedata midlertidigt utilgængelig.</p>';
    return;
  }

  const regionRows = d.quality.byRegion.map(r => {
    const scoreColor = r.score >= 75 ? 'var(--neg)' : r.score >= 70 ? 'var(--warn)' : 'var(--pos)';
    return `<tr>
      <td>${r.region}</td>
      <td><span style="color:${scoreColor};font-weight:700">${r.score}</span>/100</td>
      <td>${r.staffRatio.toFixed(2)} per beboer</td>
    </tr>`;
  }).join('');

  const costTrend = d.costs.trend.map(t =>
    `<div class="hist-point"><span>${t.year}</span><strong>${(t.costDKK/1000).toFixed(0)}k</strong></div>`
  ).join('');

  const demogRows = [
    { label: 'Over 65 år (2025)', val: d.demographics.over65pct2025 + '%' },
    { label: 'Over 65 år (2035)', val: d.demographics.over65pct2035 + '%' },
    { label: 'Over 80 år (2025)', val: d.demographics.over80pct2025 + '%' },
    { label: 'Over 80 år (2035)', val: d.demographics.over80pct2035 + '%' },
  ].map(r => `<tr><td>${r.label}</td><td><strong>${r.val}</strong></td></tr>`).join('');

  const staffRatioBarWidth = (d.staffToResidentRatio.national / d.staffToResidentRatio.euAvg * 100).toFixed(0);

  panel.innerHTML = `
<div class="section-header">
  <h2>👴 Ældrepleje</h2>
  <p class="section-desc">Kvalitet, bemanding og økonomi i den danske ældrepleje — 2025-data</p>
</div>

<div class="e-hero-grid">
  <div class="e-hero-card accent-card">
    <div class="e-hero-num" style="color:var(--pos)">${d.workforce.shortfall2035.toLocaleString('da-DK')}</div>
    <div class="e-hero-label">Mangel på medarbejdere 2035</div>
    <div class="e-hero-sub">${d.workforce.shortfallPctOfWorkforce}% af SOSU-arbejdsstyrken</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num">${d.quality.nationalScore}</div>
    <div class="e-hero-label">Nationalt kvalitetsscore</div>
    <div class="e-hero-sub">ud af 100 (tilsynsrapporter)</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num">${(d.costs.avgCostPerCitizenDKK/1000).toFixed(0)}k</div>
    <div class="e-hero-label">Udgift pr. borger (kr./år)</div>
    <div class="e-hero-sub">plejecenter, 2025</div>
  </div>
  <div class="e-hero-card">
    <div class="e-hero-num" style="color:var(--warn)">${d.workforce.turnoverRatePct}%</div>
    <div class="e-hero-label">Personaleudskiftning</div>
    <div class="e-hero-sub">${d.workforce.vacancyRatePct}% ledige stillinger</div>
  </div>
</div>

<div class="card">
  <h3>Kvalitetsscore & bemanding pr. region</h3>
  <table style="width:100%;font-size:13px;border-collapse:collapse">
    <thead><tr style="font-size:11px;color:var(--text-2)"><th style="text-align:left;padding:6px 0">Region</th><th style="text-align:left;padding:6px 0">Kvalitet</th><th style="text-align:left;padding:6px 0">Personale/beboer</th></tr></thead>
    <tbody>${regionRows}</tbody>
  </table>
  <p class="data-note">${d.quality.note}</p>
</div>

<div class="sundhed-grid">
  <div class="card">
    <h3>Udgift pr. borger (kr./år)</h3>
    <div class="hist-timeline">${costTrend}</div>
    <p class="data-note">Total budget: ${d.costs.totalBudgetBn.toFixed(1)} mia. kr. Kilde: ${d.costs.note}</p>
  </div>
  <div class="card">
    <h3>Aldersudvikling 2025–2035</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tbody>${demogRows}</tbody>
    </table>
    <p class="data-note">${d.demographics.note}</p>
  </div>
</div>

<div class="card">
  <h3>Bemanding: Danmark vs. EU</h3>
  <div class="e-bar-row">
    <div class="e-bar-label">Danmark</div>
    <div class="e-bar-track"><div class="e-bar-fill" style="width:${staffRatioBarWidth}%;background:var(--accent)"></div></div>
    <div class="e-bar-val">${d.staffToResidentRatio.national} per beboer</div>
  </div>
  <div class="e-bar-row">
    <div class="e-bar-label">EU-gennemsnit</div>
    <div class="e-bar-track"><div class="e-bar-fill" style="width:100%;background:var(--surface-3)"></div></div>
    <div class="e-bar-val">${d.staffToResidentRatio.euAvg} per beboer</div>
  </div>
  <p class="data-note">${d.staffToResidentRatio.note}</p>
  <p class="data-note" style="margin-top:8px">${d.workforce.note}</p>
</div>`;
};

VG.render.ledighed = async function() {
  const panel = document.getElementById('panel-ledighed');
  if (!panel) return;
  if (panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter ledighedsdata…</div>';

  let d;
  try { d = await fetch('/api/livedata/ledighed').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxTrend = Math.max(...d.trend12m.map(t => t.pct));
  const trendBars = d.trend12m.map(t => {
    const h = Math.round(t.pct / (maxTrend + 1) * 80);
    return `<div class="led-bar-col">
      <div class="led-bar-fill" style="height:${h}px" title="${t.pct}%"></div>
      <div class="led-bar-month">${t.month.slice(0,3)}</div>
    </div>`;
  }).join('');

  const regionRows = d.byRegion.map(r => `
    <div class="led-region-row">
      <span class="led-region-name">${r.name}</span>
      <div class="led-region-bar-track">
        <div class="led-region-bar" style="width:${(r.pct/8*100).toFixed(0)}%"></div>
      </div>
      <span class="led-region-pct">${r.pct.toFixed(1)}%</span>
    </div>`).join('');

  const sectorRows = d.bySector.map(s => `
    <div class="led-sector-row">
      <span>${s.name}</span>
      <strong>${s.pct.toFixed(1)}%</strong>
    </div>`).join('');

  panel.innerHTML = `<div class="card">
  <h2>📉 Ledighed i Danmark</h2>
  <p class="intro">Bruttoledighed — registrerede ledige og aktiverede. ${d.liveSource ? 'Live data fra Danmarks Statistik.' : 'Estimat baseret på DST-data.'}</p>

  <div class="led-hero-grid">
    <div class="led-hero-stat">
      <div class="stat-label">National ledighed</div>
      <div class="stat-num">${d.national.toFixed(1)}%</div>
      <div class="stat-delta">af arbejdsstyrken</div>
    </div>
    <div class="led-hero-stat">
      <div class="stat-label">Ungdomsledighed (15–29 år)</div>
      <div class="stat-num">${d.youth.toFixed(1)}%</div>
      <div class="stat-delta">dobbelt så høj som gennemsnit</div>
    </div>
    <div class="led-hero-stat">
      <div class="stat-label">EU-gennemsnit</div>
      <div class="stat-num">${d.context.euAvg.toFixed(1)}%</div>
      <div class="stat-delta">Danmark under EU-snit</div>
    </div>
    <div class="led-hero-stat">
      <div class="stat-label">Historisk lavpunkt</div>
      <div class="stat-num">${d.context.low2022.toFixed(1)}%</div>
      <div class="stat-delta">nået i 2022</div>
    </div>
  </div>

  <h3>12-måneders trend</h3>
  <div class="led-bar-chart">${trendBars}</div>

  <div class="led-two-col">
    <div>
      <h3>Ledighed pr. region</h3>
      <div class="led-regions">${regionRows}</div>
    </div>
    <div>
      <h3>Ledighed pr. sektor</h3>
      <div class="led-sectors">${sectorRows}</div>
    </div>
  </div>

  <p class="data-note">Kilde: Danmarks Statistik — AULBM02. Opdateret månedligt. EU-tal fra Eurostat.</p>
</div>`;
};

VG.render.elpris = async function() {
  const panel = document.getElementById('panel-elpris');
  if (!panel) return;
  if (panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter el-priser…</div>';

  let d;
  try { d = await fetch('/api/livedata/elpris').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente el-prisdata.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const compBars = d.components.map(c => `
    <div class="elpris-comp-row">
      <span class="elpris-comp-name">${c.name}</span>
      <div class="elpris-comp-track">
        <div class="elpris-comp-fill" style="width:${c.pct}%"></div>
      </div>
      <span class="elpris-comp-val">${c.kr.toFixed(2)} kr./kWh (${c.pct}%)</span>
    </div>`).join('');

  const maxEu = Math.max(...d.euComparison.map(e => e.kr));
  const euRows = d.euComparison.map(e => `
    <div class="elpris-eu-row${e.country === 'Danmark' ? ' elpris-eu-highlight' : ''}">
      <span class="elpris-eu-country">${e.country}</span>
      <div class="elpris-eu-track">
        <div class="elpris-eu-fill" style="width:${(e.kr/maxEu*100).toFixed(0)}%"></div>
      </div>
      <span class="elpris-eu-val">${e.kr.toFixed(2)} kr./kWh</span>
    </div>`).join('');

  panel.innerHTML = `<div class="card">
  <h2>⚡ El-priser for husstande</h2>
  <p class="intro">Hvad koster strømmen for en gennemsnitlig dansk husstand? ${d.liveSpot ? 'Spotpris er live fra Energidata.dk.' : 'Estimeret spotpris.'}</p>

  <div class="elpris-hero-grid">
    <div class="elpris-hero-stat">
      <div class="stat-label">Samlet pris inkl. alt</div>
      <div class="stat-num">${d.totalKwh.toFixed(2)} kr.</div>
      <div class="stat-delta">pr. kWh</div>
    </div>
    <div class="elpris-hero-stat">
      <div class="stat-label">Spotpris (marked)</div>
      <div class="stat-num">${d.spotKwh.toFixed(2)} kr.</div>
      <div class="stat-delta">pr. kWh${d.liveSpot ? ' · live' : ''}</div>
    </div>
    <div class="elpris-hero-stat">
      <div class="stat-label">Månedlig regning</div>
      <div class="stat-num">${d.monthlyHousehold} kr.</div>
      <div class="stat-delta">ca. 350 kWh/mdr.</div>
    </div>
    <div class="elpris-hero-stat">
      <div class="stat-label">Årsomkostning</div>
      <div class="stat-num">${(d.annualHousehold/1000).toFixed(1)}k kr.</div>
      <div class="stat-delta">ca. 4.200 kWh/år</div>
    </div>
  </div>

  <h3>Hvad betaler du for?</h3>
  <div class="elpris-comps">${compBars}</div>

  <h3>Sammenligning med nabolande</h3>
  <div class="elpris-eu">${euRows}</div>

  <p class="data-note">Kilde: Energidata.dk (spotpris DK2) og Forsyningstilsynet (nettarif og afgifter). Priserne er inklusive moms og alle afgifter.</p>
</div>`;
};

VG.render.boligmarked = async function() {
  const panel = document.getElementById('panel-boligmarked');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter boligmarkedsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/boligmarked').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxIdx = Math.max(...d.priceIndexTrend.map(t => t.idx));
  const trendBars = d.priceIndexTrend.map(t => {
    const h = Math.round(t.idx / (maxIdx + 10) * 80);
    const isTarget = t.target;
    return `<div class="bm-bar-col">
      <div class="bm-bar-fill" style="height:${h}px;background:${isTarget ? 'var(--warn)' : 'var(--accent)'}" title="${t.year}: ${t.idx}"></div>
      <div class="bm-bar-year">${t.year.slice(2)}</div>
    </div>`;
  }).join('');

  const regionRows = d.byRegion.map(r => {
    const chgColor = r.yoyChange >= 0 ? 'var(--pos)' : 'var(--neg)';
    const chgSign  = r.yoyChange >= 0 ? '+' : '';
    return `<div class="bm-region-row">
      <span class="bm-region-name">${r.name}</span>
      <span class="bm-region-price">${(r.medianM2/1000).toFixed(0)}k kr/m²</span>
      <span class="bm-region-chg" style="color:${chgColor}">${chgSign}${r.yoyChange.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const typeRows = d.byType.map(t => {
    const chgColor = t.yoyChange >= 0 ? 'var(--pos)' : 'var(--neg)';
    const chgSign  = t.yoyChange >= 0 ? '+' : '';
    return `<div class="bm-type-row">
      <span>${t.type}</span>
      <span>${(t.medianPrice/1000000).toFixed(2)} mio.</span>
      <span style="color:${chgColor};font-weight:600">${chgSign}${t.yoyChange.toFixed(1)}%</span>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>🏗 Boligmarkedet</h2>
  <p class="intro">Nationale boligpriser, regionale forskelle og markedsudvikling. ${d.liveSource ? 'Live data fra DST.' : 'Baseret på DST og Boligsiden-estimater 2025.'}</p>
  <div class="bm-hero-grid">
    <div class="bm-hero-stat">
      <div class="stat-label">Median salgspris (hus)</div>
      <div class="stat-num">${(d.nationalMedianPrice/1000000).toFixed(2)} mio.</div>
      <div class="stat-delta" style="color:var(--neg)">${d.priceChangeYoy.toFixed(1)}% år/år</div>
    </div>
    <div class="bm-hero-stat">
      <div class="stat-label">Prisindeks (2015=100)</div>
      <div class="stat-num">${d.priceIndexCurrent}</div>
      <div class="stat-delta">${d.priceChangePeak.toFixed(1)}% fra top (${d.peakYear})</div>
    </div>
    <div class="bm-hero-stat">
      <div class="stat-label">Gns. realkreditrente</div>
      <div class="stat-num">${d.avgMortgageRate.toFixed(2)}%</div>
      <div class="stat-delta">20-årig fastforrentet</div>
    </div>
    <div class="bm-hero-stat">
      <div class="stat-label">Nye boliger (2025)</div>
      <div class="stat-num">${(d.newCompletions2025/1000).toFixed(1)}k</div>
      <div class="stat-delta">færdiggjorte enheder</div>
    </div>
  </div>
  <h3>Prisindeks 2015–2025</h3>
  <div class="bm-bar-chart">${trendBars}</div>
  <div class="bm-two-col">
    <div>
      <h3>Priser pr. region (m²)</h3>
      <div class="bm-regions">${regionRows}</div>
    </div>
    <div>
      <h3>Pristype</h3>
      <div class="bm-types">${typeRows}</div>
    </div>
  </div>
  <div class="bm-rental-row">
    <div class="bm-rental-stat"><span>Gns. husleje KBH</span><strong>${d.rentalMarket.avgRentCph.toLocaleString('da-DK')} kr/mdr</strong></div>
    <div class="bm-rental-stat"><span>Gns. husleje DK</span><strong>${d.rentalMarket.avgRentDK.toLocaleString('da-DK')} kr/mdr</strong></div>
    <div class="bm-rental-stat"><span>Huslejevækst</span><strong style="color:var(--pos)">+${d.rentalMarket.rentChangeYoy.toFixed(1)}%</strong></div>
    <div class="bm-rental-stat"><span>Venteliste almen bolig</span><strong>${d.rentalMarket.waitlistYears.toFixed(1)} år</strong></div>
  </div>
  <p class="data-note">Kilde: Danmarks Statistik (EJEN6), Boligsiden, Nationalbanken. Prisindeks 2015=100.</p>
</div>`;
};

VG.render.indkomst = async function() {
  const panel = document.getElementById('panel-indkomst');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter indkomstdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/indkomst').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxDecile = Math.max(...d.deciles.map(dc => dc.gross));
  const decileBars = d.deciles.map((dc, i) => {
    const pct = Math.round(dc.gross / maxDecile * 100);
    return `<div class="inc-decile-row">
      <span class="inc-decile-label">${dc.d}</span>
      <div class="inc-decile-track">
        <div class="inc-decile-bar" style="width:${pct}%"></div>
      </div>
      <span class="inc-decile-val">${(dc.gross/1000).toFixed(0)}k</span>
      <span class="inc-decile-net">(${(dc.disposable/1000).toFixed(0)}k netto)</span>
    </div>`;
  }).join('');

  const nordicRows = d.nordicComparison.map(c => {
    const w = Math.round(c.gini / 45 * 100);
    return `<div class="inc-nordic-row">
      <span class="inc-nordic-country">${c.country}</span>
      <div class="inc-nordic-track">
        <div class="inc-nordic-bar" style="width:${w}%;background:${c.country==='Danmark'?'var(--accent)':'var(--surface-3)'}"></div>
      </div>
      <span class="inc-nordic-val">${c.gini.toFixed(1)}</span>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>💰 Indkomst & Ulighed</h2>
  <p class="intro">Indkomstfordeling, Gini-koefficient og sammenligning med Norden. ${d.liveSource ? 'Gini fra DST.' : 'Estimat baseret på DST IFOR41.'}</p>
  <div class="inc-hero-grid">
    <div class="inc-hero-stat">
      <div class="stat-label">Gini-koefficient</div>
      <div class="stat-num">${d.gini.toFixed(1)}</div>
      <div class="stat-delta">Lav ulighed (0=fuld lighed)</div>
    </div>
    <div class="inc-hero-stat">
      <div class="stat-label">Median husstandsindkomst</div>
      <div class="stat-num">${(d.medianHouseholdIncome/1000).toFixed(0)}k</div>
      <div class="stat-delta">kr./år brutto</div>
    </div>
    <div class="inc-hero-stat">
      <div class="stat-label">Fattigdomsrate</div>
      <div class="stat-num">${d.povertyRate.toFixed(1)}%</div>
      <div class="stat-delta">&lt;50% af median</div>
    </div>
    <div class="inc-hero-stat">
      <div class="stat-label">Top 10%'s andel</div>
      <div class="stat-num">${d.topTenPercentShare.toFixed(1)}%</div>
      <div class="stat-delta">af samlet indkomst</div>
    </div>
  </div>
  <h3>Indkomst pr. decil (brutto / netto)</h3>
  <div class="inc-deciles">${decileBars}</div>
  <h3>Gini: Nordisk sammenligning</h3>
  <div class="inc-nordic">${nordicRows}</div>
  <div class="inc-transfers-grid">
    <div class="inc-transfer-card"><div class="stat-label">Dagpenge (max)</div><div class="stat-num">${d.transfers.dagpenge.toLocaleString('da-DK')} kr/mdr</div></div>
    <div class="inc-transfer-card"><div class="stat-label">Kontanthjælp</div><div class="stat-num">${d.transfers.kontanthjælp.toLocaleString('da-DK')} kr/mdr</div></div>
    <div class="inc-transfer-card"><div class="stat-label">Folkepension</div><div class="stat-num">${d.transfers.folkepension.toLocaleString('da-DK')} kr/mdr</div></div>
    <div class="inc-transfer-card"><div class="stat-label">Median månedsløn</div><div class="stat-num">${d.transfers.medianWage.toLocaleString('da-DK')} kr/mdr</div></div>
  </div>
  <p class="data-note">Kilde: Danmarks Statistik IFOR41, INDKP101. Indkomst i 2024-priser.</p>
</div>`;
};

VG.render.co2 = async function() {
  const panel = document.getElementById('panel-co2');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter klimadata…</div>';
  let d;
  try { d = await fetch('/api/livedata/co2').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxMt = Math.max(...d.emissionTrend.filter(t => !t.target).map(t => t.mt));
  const trendBars = d.emissionTrend.map(t => {
    const h = Math.round(t.mt / (maxMt + 5) * 80);
    const isTarget = t.target;
    const color = isTarget ? 'var(--neg)' : t.mt > 60 ? 'var(--pos)' : t.mt > 47 ? 'var(--warn)' : 'var(--accent)';
    return `<div class="co2-bar-col">
      <div class="co2-bar-fill" style="height:${h}px;background:${color};${isTarget?'border:2px dashed var(--neg);height:'.concat(h,'px'):''}"></div>
      <div class="co2-bar-year">${t.year.slice(2)}</div>
    </div>`;
  }).join('');

  const sectorBars = d.bySector.map(s => {
    const pct = s.pct;
    const trendIcon = s.trend === 'down' ? '↓' : s.trend === 'up' ? '↑' : '→';
    const trendColor = s.trend === 'down' ? 'var(--neg)' : s.trend === 'up' ? 'var(--pos)' : 'var(--text-3)';
    return `<div class="co2-sector-row">
      <span class="co2-sector-name">${s.name}</span>
      <div class="co2-sector-track">
        <div class="co2-sector-fill" style="width:${pct}%"></div>
      </div>
      <span class="co2-sector-mt">${s.mt.toFixed(1)} mt</span>
      <span class="co2-sector-trend" style="color:${trendColor}">${trendIcon}</span>
    </div>`;
  }).join('');

  const progressPct = Math.round(d.reductionSoFar / 70 * 100);

  const nordicRows = d.nordicComparison.map(c => {
    const w = Math.round(c.tPerCap / 10 * 100);
    return `<div class="co2-nordic-row">
      <span class="co2-nordic-country">${c.country}</span>
      <div class="co2-nordic-track">
        <div class="co2-nordic-bar" style="width:${w}%;background:${c.country==='Danmark'?'var(--warn)':'var(--surface-3)'}"></div>
      </div>
      <span class="co2-nordic-val">${c.tPerCap.toFixed(1)} t</span>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>🌿 CO₂ & Klimamål</h2>
  <p class="intro">Danmarks udledninger, fremgang mod 2030-målet og sektorfordeling.${d.liveIntensity ? ` Live el-CO₂: ${d.liveIntensity} g/kWh.` : ''}</p>
  <div class="co2-hero-grid">
    <div class="co2-hero-stat">
      <div class="stat-label">Samlet udledning 2024</div>
      <div class="stat-num">${d.totalMtCo2_2024.toFixed(1)} mt</div>
      <div class="stat-delta">CO₂-ækvivalenter</div>
    </div>
    <div class="co2-hero-stat">
      <div class="stat-label">Per capita</div>
      <div class="stat-num">${d.perCapita.toFixed(1)} t</div>
      <div class="stat-delta">CO₂ pr. dansker</div>
    </div>
    <div class="co2-hero-stat">
      <div class="stat-label">Reduktion siden 1990</div>
      <div class="stat-num">${d.reductionSoFar.toFixed(0)}%</div>
      <div class="stat-delta" style="color:var(--neg)">Mål: 70% i 2030</div>
    </div>
    <div class="co2-hero-stat">
      <div class="stat-label">VE-andel af el</div>
      <div class="stat-num">${d.renewableShare2024.toFixed(1)}%</div>
      <div class="stat-delta">${d.windShareProduction.toFixed(1)}% fra vind</div>
    </div>
  </div>
  <div class="co2-progress-wrap">
    <div class="co2-progress-label">Fremgang mod 70%-mål (fra 1990): <strong>${d.reductionSoFar.toFixed(0)}% af 70% nået</strong> — <span style="color:var(--pos)">mangler ${d.reductionNeeded.toFixed(0)}% på 6 år</span></div>
    <div class="co2-progress-track">
      <div class="co2-progress-fill" style="width:${progressPct}%"></div>
      <div class="co2-progress-target"></div>
    </div>
  </div>
  <h3>Udledning 2000–2024 + mål 2030</h3>
  <div class="co2-bar-chart">${trendBars}</div>
  <h3>Udledning pr. sektor</h3>
  <div class="co2-sectors">${sectorBars}</div>
  <h3>Sammenligning pr. capita</h3>
  <div class="co2-nordic">${nordicRows}</div>
  <p class="data-note">Kilde: Energidata.dk (el-CO₂), Danmarks Statistik GAS2, IEA. Udledning i mt CO₂-ækvivalenter.</p>
</div>`;
};

VG.render.kriminalitet = async function() {
  const panel = document.getElementById('panel-kriminalitet');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter kriminalitetsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/kriminalitet').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const typeRows = d.byType.map(t => {
    const trendColor = t.trend > 0 ? 'var(--pos)' : 'var(--neg)';
    const trendSign  = t.trend > 0 ? '+' : '';
    return `<div class="krim-type-row">
      <span class="krim-type-icon">${t.icon}</span>
      <span class="krim-type-name">${t.type}</span>
      <span class="krim-type-val">${t.per100k.toLocaleString('da-DK')}/100k</span>
      <span class="krim-type-trend" style="color:${trendColor}">${trendSign}${t.trend.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const maxReg = Math.max(...d.byRegion.map(r => r.per100k));
  const regionRows = d.byRegion.map(r => `
    <div class="krim-region-row">
      <span class="krim-region-name">${r.name}</span>
      <div class="krim-region-track">
        <div class="krim-region-bar" style="width:${Math.round(r.per100k/maxReg*100)}%"></div>
      </div>
      <span class="krim-region-val">${r.per100k.toLocaleString('da-DK')}</span>
      <span class="krim-region-clear">${r.clearUp.toFixed(1)}% opklaret</span>
    </div>`).join('');

  const maxTrend = Math.max(...d.totalTrend.map(t => t.total));
  const trendBars = d.totalTrend.map(t => {
    const h = Math.round(t.total / maxTrend * 80);
    return `<div class="krim-bar-col">
      <div class="krim-bar-fill" style="height:${h}px"></div>
      <div class="krim-bar-year">${t.year.slice(2)}</div>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>🚨 Kriminalitet</h2>
  <p class="intro">Anmeldt kriminalitet, opklaringsprocent og regionale forskelle. Data fra Politiets årsstatistik.</p>
  <div class="krim-hero-grid">
    <div class="krim-hero-stat">
      <div class="stat-label">Anmeldt kriminalitet 2024</div>
      <div class="stat-num">${(d.totalReported2024/1000).toFixed(0)}k</div>
      <div class="stat-delta">forbrydelser</div>
    </div>
    <div class="krim-hero-stat">
      <div class="stat-label">Per 100.000 borgere</div>
      <div class="stat-num">${d.per100k.toLocaleString('da-DK')}</div>
      <div class="stat-delta">anmeldelser</div>
    </div>
    <div class="krim-hero-stat">
      <div class="stat-label">Opklaringsprocent</div>
      <div class="stat-num">${d.clearUpRate.toFixed(1)}%</div>
      <div class="stat-delta">af anmeldte sager</div>
    </div>
    <div class="krim-hero-stat">
      <div class="stat-label">Fængselspopulation</div>
      <div class="stat-num">${d.prisonPopulation.toLocaleString('da-DK')}</div>
      <div class="stat-delta">indsatte 2024</div>
    </div>
  </div>
  <h3>Trend 2018–2024</h3>
  <div class="krim-bar-chart">${trendBars}</div>
  <h3>Kriminalitetstyper</h3>
  <div class="krim-types">${typeRows}</div>
  <h3>Pr. politikreds</h3>
  <div class="krim-regions">${regionRows}</div>
  <p class="data-note">Kilde: Politiets årsstatistik, Danmarks Statistik STRAF20. Anmeldelser pr. 100.000 borgere.</p>
</div>`;
};

VG.render.uddannelse = async function() {
  const panel = document.getElementById('panel-uddannelse');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter uddannelsesdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/uddannelse').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const levelBars = d.byLevel.map(l => `
    <div class="udd-level-row">
      <span class="udd-level-name">${l.level}</span>
      <div class="udd-level-track">
        <div class="udd-level-bar" style="width:${l.pct / 0.28}%"></div>
      </div>
      <span class="udd-level-pct">${l.pct.toFixed(1)}%</span>
    </div>`).join('');

  const nordicRows = d.nordicComparison.map(c => `
    <div class="udd-nordic-row">
      <span class="udd-nordic-country">${c.country}</span>
      <div class="udd-nordic-bars">
        <div class="udd-nordic-bar-wrap">
          <div class="udd-nordic-bar" style="width:${c.higherEd}%;background:${c.country.includes('OECD')?'var(--surface-3)':c.country==='Danmark'?'var(--accent)':'var(--border-strong)'}"></div>
        </div>
        <span class="udd-nordic-val">${c.higherEd.toFixed(1)}% højere udd.</span>
        <span class="udd-nordic-pisa">PISA: ${c.pisa}</span>
      </div>
    </div>`).join('');

  const topFields = d.topFields.map(f => `
    <div class="udd-field-row">
      <span>${f.field}</span>
      <div class="udd-field-track"><div class="udd-field-bar" style="width:${f.pct/0.21}%"></div></div>
      <span>${f.pct.toFixed(1)}%</span>
    </div>`).join('');

  panel.innerHTML = `<div class="card">
  <h2>🎓 Uddannelse</h2>
  <p class="intro">Uddannelsesniveau, PISA-resultater, lærermangel og nordisk sammenligning.</p>
  <div class="udd-hero-grid">
    <div class="udd-hero-stat">
      <div class="stat-label">Med videregående uddannelse</div>
      <div class="stat-num">${d.higherEdRate25_64.toFixed(1)}%</div>
      <div class="stat-delta">aldersgruppe 25–64 år</div>
    </div>
    <div class="udd-hero-stat">
      <div class="stat-label">Frafald ungdomsuddannelse</div>
      <div class="stat-num">${d.youthDropoutRate.toFixed(1)}%</div>
      <div class="stat-delta">forlader uden afslutning</div>
    </div>
    <div class="udd-hero-stat">
      <div class="stat-label">PISA 2022 (læsning)</div>
      <div class="stat-num">${d.pisaReading2022}</div>
      <div class="stat-delta">OECD-snit: ${d.pisaOecdAvgRead}</div>
    </div>
    <div class="udd-hero-stat">
      <div class="stat-label">Lærermangel</div>
      <div class="stat-num">${(d.teacherShortage/1000).toFixed(1)}k</div>
      <div class="stat-delta">ubesatte stillinger</div>
    </div>
  </div>
  <h3>Uddannelsesniveau (25–64 år)</h3>
  <div class="udd-levels">${levelBars}</div>
  <div class="udd-two-col">
    <div>
      <h3>Nordisk sammenligning</h3>
      <div class="udd-nordic">${nordicRows}</div>
    </div>
    <div>
      <h3>Populæreste uddannelsesretninger</h3>
      <div class="udd-fields">${topFields}</div>
    </div>
  </div>
  <div class="udd-extra-grid">
    <div class="udd-extra-stat"><div class="stat-label">Uddannelsesudgifter</div><div class="stat-num">${d.educationSpendingPct.toFixed(1)}% BNP</div></div>
    <div class="udd-extra-stat"><div class="stat-label">Elev/lærer-ratio</div><div class="stat-num">${d.studentTeacherRatio.toFixed(1)}:1</div></div>
    <div class="udd-extra-stat"><div class="stat-label">Gns. SU-gæld</div><div class="stat-num">${(d.avgStudyDebt/1000).toFixed(0)}k kr.</div></div>
    <div class="udd-extra-stat"><div class="stat-label">PISA matematik</div><div class="stat-num">${d.pisaMath2022}</div></div>
  </div>
  <p class="data-note">Kilde: Danmarks Statistik UDDAN, OECD Education at a Glance 2024, PISA 2022.</p>
</div>`;
};

VG.loadScenario = function(key) {
  const s = VG.state.baseline.scenarios[key];
  if (!s) return;
  for (const k in VG.state.baseline.policy) {
    VG.state.current.policy[k].val = VG.state.baseline.policy[k].val;
  }
  for (const k in s.changes) {
    if (VG.state.current.policy[k]) {
      VG.state.current.policy[k].val = s.changes[k];
    }
  }
  VG.state.activeTab = 'overview';
  // Switch back to the Oversigt group in the two-tier nav
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.group === 'oversigt'));
  document.getElementById('nav-secondary').innerHTML = '';
  VG.render.all();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

VG.render.inflation = async function() {
  const panel = document.getElementById('panel-inflation');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter prisdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/inflation').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const trendBars = d.trend.map((t, i) => {
    const h = Math.round(Math.max(0, t.yoy) / 12 * 80);
    const color = t.yoy > 4 ? 'var(--pos)' : t.yoy > 2.5 ? 'var(--warn)' : 'var(--accent)';
    return `<div class="infl-bar-col">
      <div class="infl-bar-fill" style="height:${h}px;background:${color}" title="${t.month}: ${t.yoy}%"></div>
      <div class="infl-bar-label">${t.month.slice(0,3)}</div>
    </div>`;
  }).join('');

  const catRows = d.categories.map(c => {
    const color = c.yoy > 3 ? 'var(--pos)' : c.yoy < 0 ? 'var(--neg)' : 'var(--text)';
    const sign = c.yoy >= 0 ? '+' : '';
    const barW = Math.min(100, Math.abs(c.yoy) / 8 * 100).toFixed(1);
    return `<div class="infl-cat-row">
      <span class="infl-cat-name">${c.name}</span>
      <div class="infl-cat-track"><div class="infl-cat-bar" style="width:${barW}%;background:${color}"></div></div>
      <span class="infl-cat-val" style="color:${color};font-weight:700">${sign}${c.yoy.toFixed(1)}%</span>
      <span class="infl-cat-weight">${c.weight.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const nordicRows = d.nordic.map(n => {
    const isdk = n.country === 'Danmark';
    return `<div class="infl-nordic-row${isdk ? ' highlight' : ''}">
      <span>${n.flag} ${n.country}</span>
      <div class="infl-nordic-track"><div class="infl-nordic-bar" style="width:${(n.inflation/6*100).toFixed(1)}%;background:${isdk ? 'var(--accent)' : 'var(--text-3)'}"></div></div>
      <span style="font-weight:700">${n.inflation.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const hi = d.householdImpact;
  panel.innerHTML = `<div class="card">
  <h2>📈 Inflation & Priser</h2>
  <p class="intro">Forbrugerprisudvikling i Danmark. ${d.liveSource ? 'Live data fra DST.' : 'Baseret på DST PRIS6 og Nationalbanken, 2025.'}</p>
  <div class="infl-hero-grid">
    <div class="infl-hero-stat">
      <div class="stat-label">Inflation (år/år)</div>
      <div class="stat-num">${d.inflationYoy.toFixed(1)}%</div>
      <div class="stat-delta">Forbrugerprisindeks</div>
    </div>
    <div class="infl-hero-stat">
      <div class="stat-label">Kerninflation</div>
      <div class="stat-num">${d.coreCPI.toFixed(1)}%</div>
      <div class="stat-delta">eks. energi & føde</div>
    </div>
    <div class="infl-hero-stat">
      <div class="stat-label">Topm. inflationspik</div>
      <div class="stat-num">${d.peakInflation.toFixed(1)}%</div>
      <div class="stat-delta">${d.peakYear}</div>
    </div>
    <div class="infl-hero-stat">
      <div class="stat-label">CPI-indeks</div>
      <div class="stat-num">${d.currentCPI.toFixed(1)}</div>
      <div class="stat-delta">2015 = 100</div>
    </div>
  </div>
  <h3>Månedlig inflation (år/år) — seneste 14 måneder</h3>
  <div class="infl-bar-chart">${trendBars}</div>
  <h3>Bidrag pr. kategori</h3>
  <div class="infl-cats">${catRows}</div>
  <div class="infl-two-col">
    <div>
      <h3>Nordisk sammenligning</h3>
      <div class="infl-nordic">${nordicRows}</div>
    </div>
    <div>
      <h3>Husholdningseffekt pr. mdr.</h3>
      <div class="infl-impact-grid">
        <div class="infl-impact-card">
          <div class="infl-impact-label">Lav indkomst</div>
          <div class="infl-impact-val">+${hi.lowIncome.extraCostMonth.toLocaleString('da-DK')} kr/mdr</div>
          <div class="infl-impact-pct">${hi.lowIncome.pctIncome.toFixed(1)}% af indkomst</div>
        </div>
        <div class="infl-impact-card">
          <div class="infl-impact-label">Middel indkomst</div>
          <div class="infl-impact-val">+${hi.middleIncome.extraCostMonth.toLocaleString('da-DK')} kr/mdr</div>
          <div class="infl-impact-pct">${hi.middleIncome.pctIncome.toFixed(1)}% af indkomst</div>
        </div>
        <div class="infl-impact-card">
          <div class="infl-impact-label">Høj indkomst</div>
          <div class="infl-impact-val">+${hi.highIncome.extraCostMonth.toLocaleString('da-DK')} kr/mdr</div>
          <div class="infl-impact-pct">${hi.highIncome.pctIncome.toFixed(1)}% af indkomst</div>
        </div>
      </div>
    </div>
  </div>
</div>`;
};

VG.render.udenrigshandel = async function() {
  const panel = document.getElementById('panel-udenrigshandel');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter handelsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/udenrigshandel').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const partnerRows = d.topPartners.map(p => {
    const balColor = p.balance >= 0 ? 'var(--neg)' : 'var(--pos)';
    const balSign  = p.balance >= 0 ? '+' : '';
    return `<div class="uh-partner-row">
      <span class="uh-partner-flag">${p.flag}</span>
      <span class="uh-partner-name">${p.country}</span>
      <span class="uh-partner-exp">${p.exportBn} mia.</span>
      <span class="uh-partner-imp">${p.importBn} mia.</span>
      <span class="uh-partner-bal" style="color:${balColor}">${balSign}${p.balance} mia.</span>
    </div>`;
  }).join('');

  const maxCat = Math.max(...d.exportCategories.map(c => c.bn));
  const catBars = d.exportCategories.map(c => {
    const w = (c.bn / maxCat * 100).toFixed(1);
    return `<div class="uh-cat-row">
      <span class="uh-cat-name">${c.name}</span>
      <div class="uh-cat-track"><div class="uh-cat-bar" style="width:${w}%"></div></div>
      <span class="uh-cat-val">${c.bn} mia.</span>
      <span class="uh-cat-pct">${c.pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const maxY = Math.max(...d.yearlyTrend.map(y => y.exports));
  const trendBars = d.yearlyTrend.map(y => {
    const eh = Math.round(y.exports / (maxY + 50) * 80);
    const ih = Math.round(y.imports / (maxY + 50) * 80);
    return `<div class="uh-year-col">
      <div class="uh-year-bars">
        <div class="uh-year-bar exp" style="height:${eh}px" title="Eksport ${y.year}: ${y.exports} mia."></div>
        <div class="uh-year-bar imp" style="height:${ih}px" title="Import ${y.year}: ${y.imports} mia."></div>
      </div>
      <div class="uh-year-label">${y.year}</div>
    </div>`;
  }).join('');

  const balSign = d.tradeBalanceBn >= 0 ? '+' : '';
  const caSign  = d.currentAccountBn >= 0 ? '+' : '';
  panel.innerHTML = `<div class="card">
  <h2>🌐 Udenrigshandel</h2>
  <p class="intro">Danmarks eksport, import og handelsbalance. ${d.liveSource ? 'Live fra DST.' : 'DST Udenrigshandelsstatistik 2024.'}</p>
  <div class="uh-hero-grid">
    <div class="uh-hero-stat">
      <div class="stat-label">Eksport</div>
      <div class="stat-num">${d.exportsBn.toLocaleString('da-DK')} mia.</div>
      <div class="stat-delta" style="color:var(--neg)">+${d.exportGrowthYoy}% år/år</div>
    </div>
    <div class="uh-hero-stat">
      <div class="stat-label">Import</div>
      <div class="stat-num">${d.importsBn.toLocaleString('da-DK')} mia.</div>
      <div class="stat-delta">varer & services</div>
    </div>
    <div class="uh-hero-stat">
      <div class="stat-label">Handelsbalance</div>
      <div class="stat-num" style="color:var(--neg)">${balSign}${d.tradeBalanceBn} mia.</div>
      <div class="stat-delta">overskud</div>
    </div>
    <div class="uh-hero-stat">
      <div class="stat-label">Betalingsbalance</div>
      <div class="stat-num" style="color:var(--neg)">${caSign}${d.currentAccountBn} mia.</div>
      <div class="stat-delta">${d.currentAccountPctGDP}% af BNP</div>
    </div>
  </div>
  <h3>Eksport & import pr. år</h3>
  <div class="uh-trend">
    <div class="uh-trend-legend"><span class="uh-leg-exp">■ Eksport</span><span class="uh-leg-imp">■ Import</span></div>
    <div class="uh-trend-bars">${trendBars}</div>
  </div>
  <div class="uh-two-col">
    <div>
      <h3>Top handelspartnere</h3>
      <div class="uh-partner-header">
        <span></span><span></span><span>Eks.</span><span>Imp.</span><span>Balance</span>
      </div>
      <div class="uh-partners">${partnerRows}</div>
    </div>
    <div>
      <h3>Eksportkategorier</h3>
      <div class="uh-cats">${catBars}</div>
    </div>
  </div>
</div>`;
};

VG.render.landbrug = async function() {
  const panel = document.getElementById('panel-landbrug');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter landbrugsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/landbrug').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxExport = Math.max(...d.sectors.map(s => s.exportBn));
  const sectorRows = d.sectors.map(s => {
    const w = (s.exportBn / maxExport * 100).toFixed(1);
    const trendColor = s.trend >= 0 ? 'var(--neg)' : 'var(--pos)';
    const trendSign  = s.trend >= 0 ? '+' : '';
    return `<div class="la-sector-row">
      <span class="la-sector-name">${s.name}</span>
      <div class="la-sector-track"><div class="la-sector-bar" style="width:${w}%"></div></div>
      <span class="la-sector-val">${s.exportBn.toFixed(1)} mia.</span>
      <span class="la-sector-trend" style="color:${trendColor}">${trendSign}${s.trend.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const maxFarm = Math.max(...d.farmTrend.map(f => f.count));
  const farmBars = d.farmTrend.map(f => {
    const h = Math.round(f.count / maxFarm * 80);
    return `<div class="la-bar-col">
      <div class="la-bar-fill" style="height:${h}px"></div>
      <div class="la-bar-year">${f.year}</div>
    </div>`;
  }).join('');

  const mat = d.maturityProfile;
  panel.innerHTML = `<div class="card">
  <h2>🌾 Landbrug & Fødevarer</h2>
  <p class="intro">Danmarks landbrugssektor, eksport og bæredygtighedsudfordringer. Kilde: SEGES, DST og Fødevareministeriet 2024.</p>
  <div class="la-hero-grid">
    <div class="la-hero-stat">
      <div class="stat-label">Produktionsværdi</div>
      <div class="stat-num">${d.productionValueBn.toFixed(1)} mia.</div>
      <div class="stat-delta">kr. pr. år</div>
    </div>
    <div class="la-hero-stat">
      <div class="stat-label">Fødevareeksport</div>
      <div class="stat-num">${d.exportValueBn.toFixed(1)} mia.</div>
      <div class="stat-delta">kr. pr. år</div>
    </div>
    <div class="la-hero-stat">
      <div class="stat-label">Antal bedrifter</div>
      <div class="stat-num">${d.farmCount.toLocaleString('da-DK')}</div>
      <div class="stat-delta">gns. ${d.avgFarmHa} ha</div>
    </div>
    <div class="la-hero-stat">
      <div class="stat-label">Landbrugs-CO₂</div>
      <div class="stat-num">${d.co2MtPerYear.toFixed(1)} Mt</div>
      <div class="stat-delta">${(d.co2MtPerYear/49.8*100).toFixed(0)}% af DK's udl.</div>
    </div>
  </div>
  <div class="la-two-col">
    <div>
      <h3>Eksport pr. sektor</h3>
      <div class="la-sectors">${sectorRows}</div>
    </div>
    <div>
      <h3>Antal bedrifter — historik</h3>
      <div class="la-bar-chart">${farmBars}</div>
      <div class="la-sub-stats">
        <div class="la-sub-stat"><span>Landbrugsareal</span><strong>${d.agriculturalAreaMha.toFixed(2)} mio. ha</strong></div>
        <div class="la-sub-stat"><span>Beskæftigede</span><strong>${d.employedK.toFixed(1)}k</strong></div>
        <div class="la-sub-stat"><span>Økologisk andel</span><strong>${d.organicShare.toFixed(1)}%</strong></div>
        <div class="la-sub-stat"><span>EU-støtte</span><strong>${d.subsidies.euSubsidiesBn.toFixed(1)} mia. kr./år</strong></div>
      </div>
    </div>
  </div>
  <div class="la-water">
    <h3>Vandmiljø & reduktionsmål</h3>
    <div class="la-water-grid">
      <div class="la-water-stat"><span>Kvælstofudledning</span><strong>${d.waterQuality.nitrogenTonnes.toLocaleString('da-DK')} t/år</strong></div>
      <div class="la-water-stat"><span>Fosforudledning</span><strong>${d.waterQuality.phosphorusTonnes.toLocaleString('da-DK')} t/år</strong></div>
      <div class="la-water-stat"><span>Kvælstofreduktionsmål 2027</span><strong>${d.waterQuality.reductionTarget2027Pct}%</strong></div>
    </div>
  </div>
</div>`;
};

VG.render.statsgaeld = async function() {
  const panel = document.getElementById('panel-statsgaeld');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter gældsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/statsgaeld').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxTrend = Math.max(...d.debtTrend.map(t => t.grossPct));
  const trendBars = d.debtTrend.map(t => {
    const gh = Math.round(t.grossPct / (maxTrend + 10) * 80);
    const hasNet = t.netPct >= 0;
    const nh = hasNet ? Math.round(t.netPct / (maxTrend + 10) * 80) : 0;
    return `<div class="sg-bar-col">
      <div class="sg-bar-pair">
        <div class="sg-bar-gross" style="height:${gh}px" title="Bruttogæld ${t.year}: ${t.grossPct}% BNP"></div>
        ${hasNet ? `<div class="sg-bar-net" style="height:${nh}px" title="Nettogæld ${t.year}: ${t.netPct}% BNP"></div>` : ''}
      </div>
      <div class="sg-bar-year">${t.year}</div>
    </div>`;
  }).join('');

  const euRows = d.euComparison.map(c => {
    const isdk = c.country === 'Danmark';
    const maxEu = 150;
    const w = (c.pct / maxEu * 100).toFixed(1);
    const color = c.pct < 40 ? 'var(--neg)' : c.pct < 80 ? 'var(--warn)' : 'var(--pos)';
    return `<div class="sg-eu-row${isdk ? ' highlight' : ''}">
      <span>${c.flag} ${c.country}</span>
      <div class="sg-eu-track"><div class="sg-eu-bar" style="width:${w}%;background:${color}"></div></div>
      <span style="font-weight:700;color:${color}">${c.pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const matRows = d.maturityProfile.map(m => {
    const w = m.pct.toFixed(1);
    return `<div class="sg-mat-row">
      <span>${m.bucket}</span>
      <div class="sg-mat-track"><div class="sg-mat-bar" style="width:${w}%;background:var(--accent)"></div></div>
      <span>${m.pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>🏦 Statsgæld</h2>
  <p class="intro">Danmarks statsgæld og finansielle position — en af de sundeste i EU. Kilde: Nationalbanken & Finansministeriet 2024.</p>
  <div class="sg-hero-grid">
    <div class="sg-hero-stat">
      <div class="stat-label">Bruttogæld</div>
      <div class="stat-num">${d.grossDebtBn} mia.</div>
      <div class="stat-delta">${d.grossDebtPctGDP.toFixed(1)}% af BNP</div>
    </div>
    <div class="sg-hero-stat">
      <div class="stat-label">Nettostilling</div>
      <div class="stat-num" style="color:var(--neg)">+${Math.abs(d.netDebtBn)} mia.</div>
      <div class="stat-delta">netto aktiv (${Math.abs(d.netDebtPctGDP).toFixed(1)}% BNP)</div>
    </div>
    <div class="sg-hero-stat">
      <div class="stat-label">Renteudgifter</div>
      <div class="stat-num">${d.interestCostBn.toFixed(1)} mia.</div>
      <div class="stat-delta">${d.avgInterestRate.toFixed(2)}% gns. rente</div>
    </div>
    <div class="sg-hero-stat">
      <div class="stat-label">Kreditvurdering</div>
      <div class="stat-num" style="color:var(--neg)">AAA ✓</div>
      <div class="stat-delta">alle tre bureauer</div>
    </div>
  </div>
  <h3>Gældsudvikling 2000–2024</h3>
  <div class="sg-legend"><span class="sg-leg-gross">■ Bruttogæld</span><span class="sg-leg-net">■ Nettogæld</span><span style="color:var(--text-3);font-size:11px">(% BNP)</span></div>
  <div class="sg-bar-chart">${trendBars}</div>
  <div class="sg-two-col">
    <div>
      <h3>EU-sammenligning (% BNP)</h3>
      <div class="sg-eu">${euRows}</div>
      <p class="data-note" style="margin-top:8px">Maastricht-grænse: 60% BNP</p>
    </div>
    <div>
      <h3>Løbetidsprofil</h3>
      <div class="sg-mat">${matRows}</div>
      <div class="sg-extra-stat"><span>Stabilitetsfond</span><strong>${d.stabilityReserveBn} mia. kr.</strong></div>
    </div>
  </div>
</div>`;
};

VG.render.erhverv = async function() {
  const panel = document.getElementById('panel-erhverv');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter erhvervsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/erhverv').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxSector = Math.max(...d.sectors.map(s => s.employedK));
  const sectorRows = d.sectors.map(s => {
    const w = (s.employedK / maxSector * 100).toFixed(1);
    const gc = s.growthYoy >= 0 ? 'var(--neg)' : 'var(--pos)';
    const gs = s.growthYoy >= 0 ? '+' : '';
    return `<div class="erh-sector-row">
      <span class="erh-sector-name">${s.name}</span>
      <div class="erh-sector-track"><div class="erh-sector-bar" style="width:${w}%"></div></div>
      <span class="erh-sector-emp">${s.employedK}k</span>
      <span class="erh-sector-gdp">${s.gdpSharePct.toFixed(1)}% BNP</span>
      <span class="erh-sector-growth" style="color:${gc}">${gs}${s.growthYoy.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const empRows = d.largestEmployers.map(e => `<div class="erh-emp-row">
    <span class="erh-emp-name">${e.name}</span>
    <span class="erh-emp-sector">${e.sector}</span>
    <span class="erh-emp-count">${e.employees.toLocaleString('da-DK')} ansatte</span>
  </div>`).join('');

  panel.innerHTML = `<div class="card">
  <h2>🏢 Erhvervsliv</h2>
  <p class="intro">Dansk erhvervsstruktur, produktivitet og virksomhedsstatistik. ${d.liveSource ? 'Live BNP fra DST.' : 'DST Nationalregnskab & Erhvervsstyrelsen 2024.'}</p>
  <div class="erh-hero-grid">
    <div class="erh-hero-stat">
      <div class="stat-label">BNP</div>
      <div class="stat-num">${d.gdpBn.toLocaleString('da-DK')} mia.</div>
      <div class="stat-delta" style="color:var(--neg)">+${d.gdpGrowthYoy}% år/år</div>
    </div>
    <div class="erh-hero-stat">
      <div class="stat-label">Selskabsskat</div>
      <div class="stat-num">${d.corporateTaxRate.toFixed(0)}%</div>
      <div class="stat-delta">${d.corporateTaxRevenueBn.toFixed(1)} mia. kr. provenu</div>
    </div>
    <div class="erh-hero-stat">
      <div class="stat-label">Virksomheder</div>
      <div class="stat-num">${(d.firmCount/1000).toFixed(0)}k</div>
      <div class="stat-delta">${(d.startupsPrYear/1000).toFixed(1)}k nye/år</div>
    </div>
    <div class="erh-hero-stat">
      <div class="stat-label">Produktivitet</div>
      <div class="stat-num">${(d.productivity.gdpPerWorkerK/1000).toFixed(2)} mio.</div>
      <div class="stat-delta">BNP pr. beskæftiget</div>
    </div>
  </div>
  <h3>Sektorer — beskæftigelse & BNP-andel</h3>
  <div class="erh-sector-header"><span></span><span></span><span>Besk.</span><span>BNP</span><span>Vækst</span></div>
  <div class="erh-sectors">${sectorRows}</div>
  <div class="erh-two-col">
    <div>
      <h3>Største arbejdsgivere (DK)</h3>
      <div class="erh-employers">${empRows}</div>
    </div>
    <div>
      <h3>SMV-økonomi</h3>
      <div class="erh-sme-grid">
        <div class="erh-sme-stat"><span>Andel af virksomheder</span><strong>${d.sme.sharePct.toFixed(1)}%</strong></div>
        <div class="erh-sme-stat"><span>Andel af beskæftigede</span><strong>${d.sme.employedSharePct.toFixed(1)}%</strong></div>
        <div class="erh-sme-stat"><span>Andel af eksport</span><strong>${d.sme.exportSharePct.toFixed(1)}%</strong></div>
        <div class="erh-sme-stat"><span>Konkurser/år</span><strong>${d.bankruptciesPrYear.toLocaleString('da-DK')}</strong></div>
      </div>
    </div>
  </div>
</div>`;
};

VG.render.innovation = async function() {
  const panel = document.getElementById('panel-innovation');
  if (!panel || panel._loading) return;
  panel._loading = true;
  panel.innerHTML = '<div class="panel-loading">Henter innovationsdata…</div>';
  let d;
  try { d = await fetch('/api/livedata/innovation').then(r => r.json()); }
  catch(e) { panel.innerHTML = '<div class="card"><p class="data-note">Kunne ikke hente data.</p></div>'; panel._loading = false; return; }
  panel._loading = false;

  const maxRd = Math.max(...d.rdSectors.map(s => s.bn));
  const rdRows = d.rdSectors.map(s => {
    const w = (s.bn / maxRd * 100).toFixed(1);
    return `<div class="inn-rd-row">
      <span class="inn-rd-name">${s.name}</span>
      <div class="inn-rd-track"><div class="inn-rd-bar" style="width:${w}%"></div></div>
      <span class="inn-rd-bn">${s.bn.toFixed(1)} mia.</span>
      <span class="inn-rd-pct">${s.pct.toFixed(1)}%</span>
    </div>`;
  }).join('');

  const uniRows = d.topUniversities.map(u => `<div class="inn-uni-row">
    <span class="inn-uni-name">${u.name}</span>
    <span class="inn-uni-rank">#${u.ranking} QS</span>
    <span class="inn-uni-rd">${u.rdBn.toFixed(1)} mia. F&U</span>
  </div>`).join('');

  const maxTrend = Math.max(...d.rdTrend.map(t => t.pctGDP));
  const trendBars = d.rdTrend.map(t => {
    const h = Math.round(t.pctGDP / (maxTrend + 0.2) * 80);
    return `<div class="inn-trend-col">
      <div class="inn-trend-bar" style="height:${h}px" title="${t.year}: ${t.pctGDP}% BNP"></div>
      <div class="inn-trend-year">${t.year.slice(2)}</div>
    </div>`;
  }).join('');

  panel.innerHTML = `<div class="card">
  <h2>🔬 Innovation & Forskning</h2>
  <p class="intro">F&U-investeringer, patenter og digitalisering. Danmark er konsekvent i EU-toppen. Kilde: Danmarks Forsknings- og Innovationspolitiske Råd & OECD 2024.</p>
  <div class="inn-hero-grid">
    <div class="inn-hero-stat">
      <div class="stat-label">F&U-udgifter</div>
      <div class="stat-num">${d.rdSpendingBn.toFixed(1)} mia.</div>
      <div class="stat-delta">${d.rdPctGDP.toFixed(2)}% af BNP</div>
    </div>
    <div class="inn-hero-stat">
      <div class="stat-label">Patenter/mio. indb.</div>
      <div class="stat-num">${d.patentsPerMillion}</div>
      <div class="stat-delta">EU top-5</div>
    </div>
    <div class="inn-hero-stat">
      <div class="stat-label">Startup-investering</div>
      <div class="stat-num">${d.startupInvestmentBn.toFixed(1)} mia.</div>
      <div class="stat-delta">${d.unicorns} unicorns</div>
    </div>
    <div class="inn-hero-stat">
      <div class="stat-label">EU Digital Index</div>
      <div class="stat-num">#${d.digitalRanking.position}</div>
      <div class="stat-delta">af ${d.digitalRanking.total} lande (DESI)</div>
    </div>
  </div>
  <h3>F&U-udgifter som % af BNP</h3>
  <div class="inn-trend-chart">${trendBars}</div>
  <div class="inn-target">EU's Barcelona-mål: 3% BNP — Danmark er over med ${d.rdPctGDP.toFixed(2)}%</div>
  <div class="inn-two-col">
    <div>
      <h3>F&U pr. sektor</h3>
      <div class="inn-rd-sectors">${rdRows}</div>
    </div>
    <div>
      <h3>Top universiteter</h3>
      <div class="inn-unis">${uniRows}</div>
      <div class="inn-green">
        <div class="inn-green-label">🌿 Grøn innovation</div>
        <div class="inn-green-val">Global #${d.greenInnovation.globalRank} i grønne patenter</div>
        <div class="inn-green-val">${d.greenInnovation.patentSharePct}% af DK's patenter er grønne</div>
      </div>
    </div>
  </div>
</div>`;
};
