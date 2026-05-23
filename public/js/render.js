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
  const introCard = hasChanges ? '' : `<div class="onboarding-card">
    <div class="onboarding-steps">
      <div class="onboarding-step"><div class="step-num">1</div><div><strong>⭐ Mit Parti</strong><p>Tag stilling til 40 politiske spørgsmål og se dit partis placering på det politiske kompas.</p></div></div>
      <div class="onboarding-step"><div class="step-num">2</div><div><strong>Økonomi & Politik</strong><p>Justér skatter, pensionsalder og velfærdsniveau. Se øjeblikkelig budgeteffekt + MAKRO-dynamik.</p></div></div>
      <div class="onboarding-step"><div class="step-num">3</div><div><strong>🗳 Borgerstemmer</strong><p>Stem på fælles politikker og se hvad andre danskere mener i realtid.</p></div></div>
      <div class="onboarding-step"><div class="step-num">4</div><div><strong>Demografi</strong><p>Forstå befolkningsudviklingen og det demografiske pres på statsbudgettet frem mod 2070.</p></div></div>
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
