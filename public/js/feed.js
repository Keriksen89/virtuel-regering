// ── AI Insights & News Feed ───────────────────────────────────────────────────
// Rule-based insights derived from live DST / Nationalbank / climate data.
// Each insight has a unique `id` so vote bars persist across visits.

VG.feed = {};

VG.feed._generateInsights = function() {
  const insights = [];
  const eco  = VG.livedata  && VG.livedata.economic;
  const cli  = VG.livedata  && VG.livedata.climate;
  const live = VG.state     && VG.state.live;

  // ── Inflation ──────────────────────────────────────────────────────────────
  if (eco && eco.inflation) {
    const v   = eco.inflation.yoy != null ? eco.inflation.yoy : eco.inflation.value;
    const bad = v > 4, warn = v > 2;
    insights.push({
      id: 'inf-' + (eco.inflation.period || 'now').replace(/\s/g, '-'),
      category: 'Økonomi', icon: '<i class="ph ph-trend-up"></i>',
      tag: bad ? 'Høj inflation' : warn ? 'Over 2%-mål' : v < 1 ? 'Under mål' : 'Stabil',
      tagType: bad ? 'alert' : warn ? 'warn' : 'ok',
      headline: `Inflation ${v.toFixed(1).replace('.', ',')}% — ${bad ? 'pres på ECB-mål' : warn ? 'over ECB\'s 2%-målsætning' : 'tæt på det optimale niveau'}`,
      body: `Den aktuelle inflation på ${v.toFixed(1).replace('.', ',')}% (${eco.inflation.period || 'seneste'}). ECB's mål er 2%. ${bad ? 'Et vedvarende niveau over 4% vil typisk udløse rentestigninger, som rammer boliglån og erhvervsfinansiering.' : warn ? 'Nationalbanken følger udviklingen tæt — renteforhøjelser kan komme på tale.' : 'Inflationen er på et sundt niveau og understøtter stabil vækst.'}`,
      panel: 'inflation', time: eco.inflation.period || 'Aktuel',
      basePos: 14, baseNeg: 4,
    });
  }

  // ── Budget ─────────────────────────────────────────────────────────────────
  if (VG.state && VG.state.current && VG.state.baseline) {
    try {
      const bal  = VG.sumRev() - VG.sumExp();
      const bnp  = VG.state.baseline.gdp;
      const pct  = bal / bnp * 100;
      const sign = pct >= 0 ? '+' : '';
      insights.push({
        id: 'budget-fl2026',
        category: 'Økonomi', icon: '<i class="ph ph-scales"></i>',
        tag: pct < -3 ? 'EU-grænse' : pct < -0.5 ? 'Underskud' : 'Overskud',
        tagType: pct < -3 ? 'alert' : pct < -0.5 ? 'warn' : 'ok',
        headline: `Finanslov 2026: ${sign}${pct.toFixed(1).replace('.', ',')}% af BNP`,
        body: pct < -3
          ? `Underskuddet på ${Math.abs(pct).toFixed(1).replace('.', ',')}% af BNP overskrider EU's Stabilitets- og Vækstpagts grænse på 3%. Det kan udløse en procedure mod Danmark og tvinge budgetstramninger.`
          : pct < 0
          ? `Budgettet viser et underskud på ${Math.abs(pct).toFixed(1).replace('.', ',')}% af BNP. Inden for EU's 3%-grænse, men der er begrænset råderum til nye udgifter.`
          : `Et overskud på ${pct.toFixed(1).replace('.', ',')}% af BNP styrker den finansielle stødpude og giver mulighed for at investere i fremtiden eller sænke gælden.`,
        panel: 'laboratorium', time: 'FL 2026',
        basePos: 19, baseNeg: 8,
      });
    } catch(e) {}
  }

  // ── CO₂ ───────────────────────────────────────────────────────────────────
  if (cli && cli.co2 && cli.co2.value && cli.co2.target2030) {
    const v   = cli.co2.value;
    const g   = cli.co2.target2030;
    const red = Math.round((1 - v / g) * 100);
    const rem = 70 - red;
    insights.push({
      id: 'co2-' + (cli.co2.year || 2024),
      category: 'Klima', icon: '<i class="ph ph-leaf"></i>',
      tag: red >= 70 ? 'Mål nået!' : red >= 60 ? 'Tæt på' : 'Bagud',
      tagType: red >= 70 ? 'ok' : red >= 55 ? 'warn' : 'alert',
      headline: `CO₂ reduceret ${red}% siden 1990${rem > 0 ? ` — ${rem}pp mangler til 2030-målet` : ' — klimamål nået!'}`,
      body: `Danmarks 2030-klimamål er 70% CO₂-reduktion fra 1990-niveauet. Vi er nået ${red}%. ${rem > 0 ? `Der mangler ${rem} procentpoint på ${2030 - (cli.co2.year || 2024)} år. Det kræver markante tiltag inden for energi, transport og landbrug.` : 'En historisk bedrift — Danmark er et af få lande i verden der har nået et sådant mål.'}`,
      panel: 'co2', time: String(cli.co2.year || 2024),
      basePos: 28, baseNeg: 5,
    });
  }

  // ── Boligpriser ───────────────────────────────────────────────────────────
  if (eco && eco.housing) {
    const v = eco.housing.qoq;
    insights.push({
      id: 'housing-' + (eco.housing.period || 'q').replace(/\s/g, '-'),
      category: 'Bolig', icon: '<i class="ph ph-house"></i>',
      tag: v > 3 ? 'Kraftig stigning' : v > 1 ? 'Stigning' : v < -2 ? 'Prisfald' : 'Stabilt',
      tagType: v > 3 ? 'alert' : v > 1 ? 'warn' : v < -2 ? 'alert' : 'ok',
      headline: `Boligpriser ${v >= 0 ? 'steg' : 'faldt'} ${Math.abs(v).toFixed(1).replace('.', ',')}% (${eco.housing.period || 'kvartal'})`,
      body: `${v > 2 ? 'Den kraftige prisstigning øger presset på førstegangskøbere og kan kræve politisk indgreb mod spekulation.' : v < -2 ? 'Prisfaldene skaber usikkerhed hos boligejere med høj belåning og kan ramme bankernes sikkerhedsstillelse.' : 'Boligpriserne er relativt stabile. Renteudviklingen er den vigtigste faktor fremadrettet.'}`,
      panel: 'boligmarked', time: eco.housing.period || 'Kvartal',
      basePos: 11, baseNeg: 13,
    });
  }

  // ── Nationalbankrente ─────────────────────────────────────────────────────
  if (eco && eco.nbRate) {
    const v = eco.nbRate.value;
    insights.push({
      id: 'nbrate-' + v.toFixed(2),
      category: 'Økonomi', icon: '<i class="ph ph-bank"></i>',
      tag: v > 4 ? 'Høj rente' : v > 2 ? 'Forhøjet' : v < 0.5 ? 'Historisk lav' : 'Normal',
      tagType: v > 4 ? 'alert' : v > 2.5 ? 'warn' : 'ok',
      headline: `Nationalbanken: pengepolitisk rente på ${v.toFixed(2).replace('.', ',')}%`,
      body: `${v > 3 ? 'Den høje rente dæmper inflationen, men øger udgifterne til boliglån og erhvervsfinansiering. Boligmarkedet mærker presset direkte.' : v < 1 ? 'Den historisk lave rente stimulerer forbrug og investeringer, men kan blæse bobler op på aktie- og boligmarkedet.' : 'Renten er på et niveau der søger balance mellem at bekæmpe inflation og understøtte vækst.'}`,
      panel: 'statsgaeld', time: 'Aktuel',
      basePos: 9, baseNeg: 6,
    });
  }

  // ── Ledighed ──────────────────────────────────────────────────────────────
  if (live && live.unemployment && live.unemployment.value) {
    const val  = live.unemployment.value;
    const rate = (val / 2_850_000 * 100);
    insights.push({
      id: 'unemp-' + (live.unemployment.period || 'now').replace(/\s/g, '-'),
      category: 'Arbejdsmarked', icon: '<i class="ph ph-hard-hat"></i>',
      tag: rate > 6 ? 'Høj ledighed' : rate < 3 ? 'Historisk lav' : 'Normal',
      tagType: rate > 6 ? 'alert' : rate > 5 ? 'warn' : 'ok',
      headline: `${val.toLocaleString('da-DK')} ledige (${rate.toFixed(1).replace('.', ',')}%) — ${rate < 4 ? 'rekordlav ledighed' : 'stabil arbejdsmarked'}`,
      body: `${val.toLocaleString('da-DK')} ledige per ${live.unemployment.period || 'seneste opgørelse'}. ${rate < 4 ? 'Lav ledighed er godt for statsfinanserne, men kan skabe lønpres og inflatonsrisiko — og gøre det svært at finde arbejdskraft.' : 'Ledigheden er på niveau med den strukturelle ledighed i Danmark.'}`,
      panel: 'ledighed', time: live.unemployment.period || 'Aktuel',
      basePos: 17, baseNeg: 3,
    });
  }

  // ── Meningsmålinger ───────────────────────────────────────────────────────
  insights.push({
    id: 'polls-maj-2026',
    category: 'Politik', icon: '<i class="ph ph-chart-bar"></i>',
    tag: 'Ny måling',
    tagType: 'info',
    headline: 'S fører med 20% — LA og V i tæt kamp om andenpladsen',
    body: 'Socialdemokraterne fører meningsmålingerne med 20,1%. Liberal Alliance (13,2%) og Venstre (12,8%) kæmper om andenpladsen. Danmarksdemokraterne er i fremgang (+0,6pp). Alternativet er over 3,5%-spærregrænsen. Blå blok har ikke opnåeligt flertal alene.',
    panel: 'meningsmaalinger', time: 'Maj 2026',
    basePos: 22, baseNeg: 10,
  });

  // ── Forsvar & NATO ────────────────────────────────────────────────────────
  insights.push({
    id: 'forsvar-nato-2026',
    category: 'Forsvar', icon: '<i class="ph ph-shield-checkered"></i>',
    tag: 'NATO-krav',
    tagType: 'alert',
    headline: 'Danmark øger forsvar til 3% af BNP — historisk udgiftsniveau',
    body: 'Regeringen har forpligtet sig til 3% af BNP i forsvarsudgifter inden 2030, svarende til ~75 mia. kr. pr. år — mere end en fordobling fra det nuværende niveau på ~33 mia. Det vil kræve enten markante nedskæringer andetsteds, ny gæld eller skatteforhøjelser. DREAM vurderer multiplikatoren til ~0,7 mod ~1,2 for civil investering.',
    panel: 'forsvar', time: 'Maj 2026',
    basePos: 14, baseNeg: 18,
  });

  // ── Boligkrise ────────────────────────────────────────────────────────────
  insights.push({
    id: 'boligkrise-2026',
    category: 'Bolig', icon: '<i class="ph ph-house"></i>',
    tag: 'Krise',
    tagType: 'alert',
    headline: 'Boligbyggeri på laveste niveau i 10 år — mens priserne stiger',
    body: 'Antallet af nye boliger i byggetilladelse faldt til 31.000 i 2025 — det laveste siden 2015. Samtidig stiger priserne i Storkøbenhavn med 3,2% kvartalsvis. Gab mellem udbud og efterspørgsel vokser. Realkreditinstitutterne advarer om, at den kombinerede effekt af høje renter, materialeprisstigning og faldende byggeaktivitet kan skabe strukturel boligmangel i 2027-2030.',
    panel: 'boligmarked', time: 'Maj 2026',
    basePos: 8, baseNeg: 20,
  });

  // ── Statsgæld ─────────────────────────────────────────────────────────────
  insights.push({
    id: 'gaeld-forsvar-2026',
    category: 'Økonomi', icon: '<i class="ph ph-bank"></i>',
    tag: 'Advarsel',
    tagType: 'warn',
    headline: 'Forsvarsopbygning kan bringe statsgæld over 40% af BNP i 2030',
    body: 'Den nuværende statsgæld på ~29% af BNP er solid. Men forsvarsforligets +40 mia./år kombineret med demografisk pres (flere ældre, færre i arbejde) kan drive gælden til 40-45% BNP inden 2030 uden finansieringsplan. Det er fortsat under Maastricht-grænsen på 60%, men råderummet til nye velfærdsinvesteringer indsnævres markant.',
    panel: 'statsgaeld', time: 'Maj 2026',
    basePos: 9, baseNeg: 12,
  });

  // ── Pesticider i drikkevand ───────────────────────────────────────────────
  insights.push({
    id: 'pesticider-2026',
    category: 'Samfund', icon: '<i class="ph ph-drop"></i>',
    tag: 'Miljø',
    tagType: 'alert',
    headline: '30% af danske vandboringer har pesticidfund — PFAS-krise accelererer',
    body: '30% af alle overvågede vandboringer viser pesticidfund over grænseværdien. PFAS ("evighedskemikalier") er nu fundet i 45% af boringer. Miljøstyrelsen har lukket 118 vandværker siden 2020. Oprydning estimeres til 12-18 mia. kr. De ansvarlige industrier har i mange tilfælde ikke betalt for oprydningen.',
    panel: 'naturvand', time: 'Maj 2026',
    basePos: 5, baseNeg: 28,
  });

  // ── Folketing ─────────────────────────────────────────────────────────────
  if (live && live.activeBills && live.activeBills.length) {
    insights.push({
      id: 'ft-bills-' + live.activeBills.length,
      category: 'Politik', icon: '<i class="ph ph-buildings"></i>',
      tag: 'Aktiv lovgivning',
      tagType: 'info',
      headline: `${live.activeBills.length} lovforslag til afstemning i Folketing`,
      body: `Folketinget behandler pt. ${live.activeBills.length} aktive lovforslag. Følg afstemningerne i realtid via Folketing-panelet, der henter data direkte fra Folketingets åbne API.`,
      panel: 'folketing', time: 'Live',
      basePos: 8, baseNeg: 2,
    });
  }

  return insights;
};

// ── Topic colour map ──────────────────────────────────────────────────────────
VG.feed._TOPIC_COLORS = {
  'Inflation & Priser':  '#e67e22',
  'Ledighed':            '#3498db',
  'Boligmarked':         '#9b59b6',
  'Sundhed':             '#e74c3c',
  'Klima & CO₂':         '#27ae60',
  'Energi & Strøm':      '#f1c40f',
  'Forsvar':             '#2c3e50',
  'Folkeskolen':         '#16a085',
  'Integration':         '#d35400',
  'Kriminalitet':        '#c0392b',
  'Erhverv & Vækst':     '#2980b9',
  'Landbrug':            '#6d9b3a',
  'Psykiatri':           '#8e44ad',
  'Ældrepleje':          '#1abc9c',
  'Indkomst & Ulighed':  '#e91e63',
  'Statsgæld':           '#795548',
  'Statsbudget':         '#607d8b',
  'Pension':             '#ff7043',
  'Ventetider':          '#00bcd4',
  'Natur & Miljø':       '#4caf50',
  'Boligkrise':          '#ab47bc',
  'Uddannelse':          '#26c6da',
  'Udenrigshandel':      '#5c6bc0',
};

VG.feed._topicColor = function(label) {
  return VG.feed._TOPIC_COLORS[label] || '#888';
};

// ── News cache ────────────────────────────────────────────────────────────────
VG.feed._news   = null;
VG.feed._newsAt = 0;
const _NEWS_TTL = 3 * 60 * 1000; // 3 minutes

VG.feed._fetchNews = async function() {
  if (VG.feed._news && (Date.now() - VG.feed._newsAt) < _NEWS_TTL) {
    return VG.feed._news;
  }
  const resp = await fetch('/api/news?limit=30');
  if (!resp.ok) throw new Error('News fetch failed: ' + resp.status);
  const data = await resp.json();
  VG.feed._news   = data;
  VG.feed._newsAt = Date.now();
  return data;
};

// ── Entry point ───────────────────────────────────────────────────────────────
VG.feed.load = function() {
  const panel = document.getElementById('panel-feed');
  if (!panel) return;
  VG.feed.renderPanel(panel);
};

// ── Main render (async) ───────────────────────────────────────────────────────
VG.feed.renderPanel = async function(panel) {
  if (!panel) return;

  // Preserve tab/filter state across re-renders
  const activeTab    = panel._feedTab    || 'news';
  const activeFilter = panel._feedFilter || 'all';

  const sentiment = VG.votes ? VG.votes.renderSentimentBadge() : '';

  // ── Paint skeleton immediately ────────────────────────────────────────────
  panel.innerHTML = `
    <div class="feed-page-header">
      <div>
        <h2 class="feed-page-title">Nyheder &amp; Indsigter</h2>
        <p class="feed-page-sub">Live nyheder fra danske medier og AI-genererede indsigter fra DST-, Nationalbank- og klimadata.</p>
      </div>
      ${sentiment ? `<div class="feed-sentiment-wrap">Platform-stemning ${sentiment}</div>` : ''}
    </div>
    <div id="feed-radar-wrap" class="feed-radar-wrap">
      <div class="feed-radar-skeleton"></div>
    </div>
    <div id="feed-pills-wrap" class="feed-filters">
      <button class="feed-filter-btn active" data-fcat="all">Alle</button>
    </div>
    <div class="feed-tab-bar">
      <button class="feed-tab-btn${activeTab === 'news' ? ' active' : ''}" data-tab="news">&#128240; Live Nyheder</button>
      <button class="feed-tab-btn${activeTab === 'insights' ? ' active' : ''}" data-tab="insights">&#10022; AI Indsigter</button>
    </div>
    <div id="feed-content" class="feed-list">
      <div class="feed-skeleton-card"></div>
      <div class="feed-skeleton-card"></div>
      <div class="feed-skeleton-card"></div>
    </div>`;

  // Wire up tab buttons immediately
  panel.querySelectorAll('.feed-tab-btn').forEach(btn => {
    btn.onclick = () => {
      panel._feedTab = btn.dataset.tab;
      VG.feed.renderPanel(panel);
    };
  });

  // ── Fetch news ────────────────────────────────────────────────────────────
  let newsData = null;
  try {
    newsData = await VG.feed._fetchNews();
  } catch (e) {
    newsData = null;
  }

  const items = (newsData && newsData.items) ? newsData.items : [];

  // ── Build topic list from live news (up to 12 unique topics) ─────────────
  const topicCounts = {};
  items.forEach(item => {
    if (item.topicLabel) {
      topicCounts[item.topicLabel] = (topicCounts[item.topicLabel] || 0) + 1;
    }
  });
  const allTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label, count]) => ({ label, count }));

  // ── Radar: horizontal bar chart ───────────────────────────────────────────
  const radarWrap = panel.querySelector('#feed-radar-wrap');
  if (radarWrap) {
    if (allTopics.length === 0) {
      radarWrap.innerHTML = '';
    } else {
      const maxCount = allTopics[0].count || 1;
      const barsHtml = allTopics.map(({ label, count }) => {
        const pct   = Math.max(6, Math.round(count / maxCount * 100));
        const color = VG.feed._topicColor(label);
        const isActive = activeFilter === label;
        return `
          <div class="feed-radar-row${isActive ? ' active' : ''}" data-rtopic="${_esc(label)}" title="${_esc(label)}: ${count} artikler">
            <span class="feed-radar-label">${_esc(label)}</span>
            <div class="feed-radar-bar-track">
              <div class="feed-radar-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="feed-radar-count">${count}</span>
          </div>`;
      }).join('');
      radarWrap.innerHTML = `
        <div class="feed-radar-header">
          <span class="feed-radar-title">Nyhedsradar</span>
          <span class="feed-radar-sub">Artikler per emne — klik for at filtrere</span>
        </div>
        <div class="feed-radar-bars">${barsHtml}</div>`;

      radarWrap.querySelectorAll('[data-rtopic]').forEach(row => {
        row.onclick = () => {
          const topic = row.dataset.rtopic;
          panel._feedFilter = (panel._feedFilter === topic) ? 'all' : topic;
          VG.feed.renderPanel(panel);
        };
      });
    }
  }

  // ── Filter pills ──────────────────────────────────────────────────────────
  const pillsWrap = panel.querySelector('#feed-pills-wrap');
  if (pillsWrap) {
    const pillsHtml = [
      `<button class="feed-filter-btn${activeFilter === 'all' ? ' active' : ''}" data-fcat="all">Alle</button>`,
      ...allTopics.map(({ label }) => {
        const color  = VG.feed._topicColor(label);
        const isAct  = activeFilter === label;
        const dotStyle = `display:inline-block;width:7px;height:7px;border-radius:50%;background:${color};margin-right:5px;vertical-align:middle;`;
        return `<button class="feed-filter-btn${isAct ? ' active' : ''}" data-fcat="${_esc(label)}"><span style="${dotStyle}"></span>${_esc(label)}</button>`;
      }),
    ].join('');
    pillsWrap.innerHTML = pillsHtml;
    pillsWrap.querySelectorAll('[data-fcat]').forEach(btn => {
      btn.onclick = () => {
        panel._feedFilter = btn.dataset.fcat;
        VG.feed.renderPanel(panel);
      };
    });
  }

  // ── Content area ──────────────────────────────────────────────────────────
  const contentEl = panel.querySelector('#feed-content');
  if (!contentEl) return;

  const currentTab    = panel._feedTab    || 'news';
  const currentFilter = panel._feedFilter || 'all';

  if (currentTab === 'news') {
    _renderNewsTab(contentEl, items, currentFilter);
  } else {
    _renderInsightsTab(contentEl, currentFilter);
  }

  // Wire explore buttons
  panel.querySelectorAll('[data-goto]').forEach(btn => {
    btn.onclick = () => window.__mkClick && window.__mkClick(btn.dataset.goto);
  });
};

// ── HTML escape helper ────────────────────────────────────────────────────────
function _esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── News tab renderer ─────────────────────────────────────────────────────────
function _renderNewsTab(container, items, filter) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="feed-empty">Ingen live nyheder tilgængelige — prøv igen om lidt.</p>';
    return;
  }

  const filtered = filter === 'all'
    ? items
    : items.filter(item => item.topicLabel === filter);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="feed-empty">Ingen nyheder i dette emne.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => {
    const color      = VG.feed._topicColor(item.topicLabel || '');
    const isBreaking = item.minutesAgo != null && item.minutesAgo < 120;
    const desc       = item.description
      ? (item.description.length > 180 ? item.description.slice(0, 180) + '…' : item.description)
      : '';

    // Sentiment indicator
    let sentIcon = '<span class="feed-sent-neutral" title="Neutral">&#9679;</span>';
    if (item.sentiment === 1)  sentIcon = '<span class="feed-sent-pos" title="Positiv nyhed">&#9650;</span>';
    if (item.sentiment === -1) sentIcon = '<span class="feed-sent-neg" title="Negativ nyhed">&#9660;</span>';

    // DREAM tag
    let dreamTag = '';
    if (item.dream && item.dream.fiscalDKK != null) {
      const sign = item.dream.fiscalDKK >= 0 ? '+' : '';
      dreamTag = `<span class="feed-dream-tag" title="DREAM fiskal effekt">${sign}${(item.dream.fiscalDKK / 1e9).toFixed(1).replace('.', ',')} mia.</span>`;
    }

    const dotStyle = `display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px;`;

    return `
      <article class="feed-card feed-news-card">
        <div class="feed-card-meta">
          ${isBreaking ? '<span class="feed-breaking">BREAKING</span>' : ''}
          <span style="${dotStyle}"></span>
          <span class="feed-cat-label">${_esc(item.topicLabel || 'Nyheder')}</span>
          <span class="feed-source-badge">${_esc(item.source || '')}</span>
          <span class="feed-time">${_esc(item.age || '')}</span>
        </div>
        <h3 class="feed-card-headline">${_esc(item.headline || '')}</h3>
        ${desc ? `<p class="feed-card-body">${_esc(desc)}</p>` : ''}
        <div class="feed-card-footer">
          <div class="feed-news-bottom-left">
            ${sentIcon}
            ${dreamTag}
          </div>
          <div class="feed-news-bottom-right">
            ${item.link ? `<a class="feed-read-link" href="${_esc(item.link)}" target="_blank" rel="noopener">L&aelig;s &rarr;</a>` : ''}
            ${item.panel ? `<button class="feed-explore" data-goto="${_esc(item.panel)}">Se data &rarr;</button>` : ''}
          </div>
        </div>
      </article>`;
  }).join('');
}

// ── Insights tab renderer ─────────────────────────────────────────────────────
function _renderInsightsTab(container, filter) {
  const insights   = VG.feed._generateInsights();
  const tagCls     = { alert: 'ft-alert', warn: 'ft-warn', ok: 'ft-ok', info: 'ft-info' };

  const filtered = filter === 'all'
    ? insights
    : insights.filter(i => i.category === filter);

  if (filtered.length === 0) {
    container.innerHTML = '<p class="feed-empty">Ingen indsigter i denne kategori endnu.</p>';
    return;
  }

  container.innerHTML = filtered.map(item => {
    const tc       = tagCls[item.tagType] || 'ft-info';
    const voteHtml = VG.votes ? VG.votes.renderBar(item.id, item.basePos, item.baseNeg) : '';
    return `
      <article class="feed-card" data-fid="${_esc(item.id)}">
        <div class="feed-card-meta">
          <span class="feed-cat-label">${item.icon} ${_esc(item.category)}</span>
          <span class="feed-tag ${tc}">${_esc(item.tag)}</span>
          <span class="feed-time">${_esc(item.time)}</span>
          <span class="feed-ai-pill">&#10022; AI Indsigt</span>
        </div>
        <h3 class="feed-card-headline">${_esc(item.headline)}</h3>
        <p class="feed-card-body">${_esc(item.body)}</p>
        <div class="feed-card-footer">
          ${voteHtml}
          <button class="feed-explore" data-goto="${_esc(item.panel)}">Se data &rarr;</button>
        </div>
      </article>`;
  }).join('');
}
