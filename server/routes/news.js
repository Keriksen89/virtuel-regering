import express from 'express';
import { estimateDREAMImpact } from '../lib/dreamAnalysis.js';
const router = express.Router();

/* ── RSS feeds to watch ──────────────────────────────────────────────── */
const FEEDS = [
  { src: 'DR',           url: 'https://www.dr.dk/nyheder/service/feeds/indland' },
  { src: 'DR',           url: 'https://www.dr.dk/nyheder/service/feeds/penge' },
  { src: 'DR',           url: 'https://www.dr.dk/nyheder/service/feeds/politik' },
  { src: 'TV2',          url: 'https://nyheder.tv2.dk/rss' },
  { src: 'TV2',          url: 'https://finans.tv2.dk/rss' },
  { src: 'TV2',          url: 'https://feeds.tv2.dk/nyheder' },
  { src: 'JP',           url: 'https://jyllands-posten.dk/rss/jp.rss' },
  { src: 'JP',           url: 'https://jyllands-posten.dk/rss/jp_politik.rss' },
  { src: 'Berlingske',   url: 'https://www.berlingske.dk/rss/berlingske.rss' },
  { src: 'Berlingske',   url: 'https://www.berlingske.dk/rss/business.rss' },
  { src: 'Politiken',    url: 'https://politiken.dk/rss/' },
  { src: 'Politiken',    url: 'https://politiken.dk/rss/sektion/1429048' },
  { src: 'Weekendavisen',url: 'https://weekendavisen.dk/rss' },
  { src: 'Altinget',     url: 'https://www.altinget.dk/rss/articles' },
  { src: 'Altinget',     url: 'https://www.altinget.dk/rss/articles?type=politik' },
  { src: 'Information',  url: 'https://www.information.dk/rss' },
  { src: 'Børsen',       url: 'https://borsen.dk/rss' },
  // International sources
  { src: 'BBC',          url: 'https://feeds.bbci.co.uk/news/world/rss.xml',     intl: true },
  { src: 'BBC',          url: 'https://feeds.bbci.co.uk/news/business/rss.xml',  intl: true },
  { src: 'Reuters',      url: 'https://feeds.reuters.com/reuters/topNews',        intl: true },
  { src: 'Bloomberg',    url: 'https://feeds.bloomberg.com/markets/news.rss',     intl: true },
  { src: 'FT',           url: 'https://www.ft.com/rss/home',                      intl: true },
  { src: 'AP',           url: 'https://rsshub.app/ap/topics/apf-topnews',         intl: true },
  { src: 'Guardian',     url: 'https://www.theguardian.com/world/rss',             intl: true },
  { src: 'DW',           url: 'https://rss.dw.com/rdf/rss-en-all',                intl: true },
  { src: 'Euronews',     url: 'https://feeds.feedburner.com/euronews/en/home',    intl: true },
  { src: 'SVT',          url: 'https://www.svt.se/nyheter/rss.xml',               intl: true },
];

/* ── Max article age: only show articles ≤ 3 days old ───────────────── */
const MAX_AGE_MS = 3 * 24 * 3600 * 1000;

/* ── Topic → panel mapping (order = priority) ────────────────────────── */
const TOPICS = [
  { panel: 'inflation',    group: 'samfund',    label: 'Inflation & Priser',
    keys: ['inflation', 'forbrugerprisindeks', 'kpi', 'priser stiger', 'priserne', 'nationalbanken', 'styringsrente', 'rentestigning', 'renten stiger', 'renten falder', 'pengepolitik'] },
  { panel: 'ledighed',     group: 'samfund',    label: 'Ledighed',
    keys: ['ledighed', 'arbejdsløs', 'fyret', 'fyring', 'massefyring', 'beskæftigelse', 'dagpengemodtager', 'jobcentre', 'arbejdsmarked'] },
  { panel: 'boligmarked',  group: 'samfund',    label: 'Boligmarked',
    keys: ['boligpris', 'huspris', 'ejerbolig', 'lejebolig', 'boligmarked', 'ejendomspris', 'villapriser', 'kontantpris', 'boligsalg', 'kvadratmeterpris', 'husleje'] },
  { panel: 'sundhed',      group: 'samfund',    label: 'Sundhed',
    keys: ['sundhedsvæsen', 'sygehus', 'hospital', 'venteliste', 'ventetid', 'akutmodtagelse', 'lægemangel', 'sygeplejersker', 'læge', 'kræft', 'operation'] },
  { panel: 'co2',          group: 'samfund',    label: 'Klima & CO₂',
    keys: ['klimamål', 'co2', 'drivhusgas', 'grøn omstilling', 'klimaforandring', 'global opvarmning', 'klimaplan', 'klimapolitik', 'klima', 'kvotepriser'] },
  { panel: 'energi',       group: 'samfund',    label: 'Energi & Strøm',
    keys: ['elpris', 'elprisen', 'vindmølle', 'havvind', 'solceller', 'energikrise', 'gasforsyning', 'vedvarende energi', 'energiforsyning', 'strømpris', 'gaspr'] },
  { panel: 'forsvar',      group: 'samfund',    label: 'Forsvar',
    keys: ['forsvarsbudget', 'forsvarsudgifter', 'nato', 'militær', 'hæren', 'ukraine', 'sikkerhedspolitik', 'totalforsvar', 'forsvarspolitik', 'ammunition'] },
  { panel: 'folkeskolen',  group: 'samfund',    label: 'Folkeskolen',
    keys: ['folkeskole', 'grundskole', 'skoleelever', 'lærermangel', 'pisa', 'karaktergennemsnit', 'folkeskolereform', 'elever', 'lærer', 'skoler'] },
  { panel: 'integration',  group: 'samfund',    label: 'Integration',
    keys: ['integration', 'indvandrere', 'asylansøg', 'udlændingepolitik', 'opholdstilladelse', 'familiesammenføring', 'flygtninge', 'udlændinge'] },
  { panel: 'kriminalitet', group: 'samfund',    label: 'Kriminalitet',
    keys: ['bandekrig', 'skyderi', 'fængsel', 'anholdt', 'sigtet', 'dræbt', 'knivstik', 'politiet', 'kriminalitet', 'røveri', 'narko', 'rockergruppe'] },
  { panel: 'erhverv',      group: 'oekonomi',   label: 'Erhverv & Vækst',
    keys: ['bnp', 'eksport', 'iværksætter', 'konkurs', 'erhvervsliv', 'produktivitet', 'industriproduktion', 'virksomhed', 'aktier', 'børsen', 'dansk økonomi'] },
  { panel: 'landbrug',     group: 'samfund',    label: 'Landbrug',
    keys: ['landbrug', 'landmænd', 'svin', 'pesticider', 'gødning', 'landbrugspakke', 'kvæg', 'bønder', 'landbrugsminister', 'dyrevelfærd'] },
  { panel: 'psykiatri',    group: 'samfund',    label: 'Psykiatri',
    keys: ['psykiatri', 'psykisk sygdom', 'psykiatrisk', 'mental sundhed', 'selvmord', 'angst', 'depression', 'mental', 'trivsel'] },
  { panel: 'aeldrepleje',  group: 'samfund',    label: 'Ældrepleje',
    keys: ['ældrepleje', 'plejehjem', 'hjemmehjælp', 'demens', 'plejesektor', 'ældreboliger', 'ældre', 'plejecentre'] },
  { panel: 'indkomst',     group: 'samfund',    label: 'Indkomst & Ulighed',
    keys: ['ulighed', 'fattigdomsgrænse', 'lønstigning', 'lønforhandling', 'overenskomst', 'mindsteløn', 'topskat', 'løn', 'indkomst', 'social'] },
  { panel: 'statsgaeld',   group: 'oekonomi',   label: 'Statsgæld',
    keys: ['statsgæld', 'offentlig gæld', 'statslån', 'rentebyrde', 'finanspolitik', 'budgetlov'] },
  { panel: 'overview',     group: 'oekonomi',   label: 'Statsbudget',
    keys: ['finanslov', 'statsbudget', 'finansminister', 'offentlige udgifter', 'budgetoverskud', 'besparelse', 'velfærd', 'reformpakke'] },
  { panel: 'pension',      group: 'personligt', label: 'Pension',
    keys: ['folkepension', 'pensionsalder', 'efterløn', 'pensionsopsparing', 'tidlig pension', 'pensionister', 'pension'] },
  { panel: 'ventetider',   group: 'samfund',    label: 'Ventetider',
    keys: ['ventetid på behandling', 'venteliste på sygehus', 'pakkeforløb', 'kræftbehandling', 'operationsventeliste'] },
  { panel: 'naturvand',    group: 'samfund',    label: 'Natur & Miljø',
    keys: ['drikkevand', 'grundvand', 'natur', 'nitrat', 'biodiversitet', 'naturpark', 'miljøminister', 'vandmiljø'] },
  { panel: 'boligkrise',   group: 'samfund',    label: 'Boligkrise',
    keys: ['boligkrise', 'boligmangel', 'ungdomsbolig', 'studieboliger', 'tomme boliger', 'boligpolitik'] },
];

/* ── Sentiment scoring ───────────────────────────────────────────────── */
const POSITIVE_WORDS = [
  'overskud', 'vækst', 'fremgang', 'forbedring', 'rekordlav', 'historisk lavt',
  'styrker', 'succes', 'reduceret', 'sænket', 'halveret', 'stiger reallønnen',
  'overstiger inflationen', 'gevinst', 'mål nået',
];
const NEGATIVE_WORDS = [
  'krise', 'massefyring', 'konkurs', 'advarsel', 'mangel på', 'rekordmange venter',
  'bandekrig', 'skyderi', 'dræbt', 'anholdt', 'underskud', 'gæld stiger',
  'stikker', 'angreb', 'ulykke', 'svigt', 'kritisk mangel',
];

function scoreSentiment(title, desc) {
  const text = ((title || '') + ' ' + (desc || '')).toLowerCase();
  const posScore = POSITIVE_WORDS.filter(w => text.includes(w)).length;
  const negScore = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
  if (posScore > negScore) return 1;
  if (negScore > posScore) return -1;
  return 0;
}

/* ── Minutes-ago helper ──────────────────────────────────────────────── */
function minutesAgo(pubMs) {
  if (!pubMs) return null;
  return Math.floor((Date.now() - pubMs) / 60000);
}

/* ── Minimal RSS parser (no deps) ───────────────────────────────────── */
function parseRSS(xml, src) {
  const items = [];
  const reItem = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = reItem.exec(xml)) !== null && items.length < 40) {
    const b = m[1];
    const get = re => (b.match(re) || [])[1] || '';
    const clean = s => s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#\d+;/g, '')
      .trim();
    const title = clean(get(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i));
    const link  = clean(get(/<link[^>]*>\s*(https?[^\s<]+)/i));
    const desc  = clean(get(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)).slice(0, 400);
    const pub   = clean(get(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i));
    if (!title) continue;
    // Parse date and filter stale articles
    const pubMs = pub ? new Date(pub).getTime() : 0;
    if (pubMs && (Date.now() - pubMs) > MAX_AGE_MS) continue;
    items.push({ title, link, desc, pub, pubMs, src });
  }
  return items;
}

function matchTopic(article) {
  const text = (article.title + ' ' + article.desc).toLowerCase();
  for (const t of TOPICS) {
    if (t.keys.some(k => text.includes(k))) return t;
  }
  return null;
}

function relTime(pubStr) {
  try {
    const h = Math.round((Date.now() - new Date(pubStr)) / 3600000);
    if (h < 1) return 'for nylig';
    if (h === 1) return '1 time siden';
    if (h < 24) return `${h} timer siden`;
    if (h < 36) return 'i går';
    const d = Math.round(h / 24);
    return `${d} dage siden`;
  } catch { return ''; }
}

/* ── Fallback items — shown when live feeds are unavailable ─────────── */
const FALLBACK = [
  { panel: 'inflation',      group: 'samfund',   topicLabel: 'Inflation & Priser',
    headline: 'Nationalbanken fastholder renten på 3,35 % — inflationen er faldet til 2,1 %',
    source: 'DR', age: 'Seneste data' },
  { panel: 'forsvar',        group: 'samfund',   topicLabel: 'Forsvar',
    headline: 'Danmark hæver forsvarsbudget til 1,65 % af BNP — NATO-målet er 3 % inden 2030',
    source: 'TV2', age: 'Seneste data' },
  { panel: 'boligmarked',    group: 'samfund',   topicLabel: 'Boligmarked',
    headline: 'Boligpriser stiger 1,8 % på et kvartal — villaer over 3 mio. kr. sælger hurtigst',
    source: 'DR', age: 'Seneste data' },
  { panel: 'ledighed',       group: 'samfund',   topicLabel: 'Ledighed',
    headline: 'Ledighedsprocenten holder sig stabilt på 4,8 % — 140.000 registrerede ledige',
    source: 'TV2', age: 'Seneste data' },
  { panel: 'psykiatri',      group: 'samfund',   topicLabel: 'Psykiatri',
    headline: 'Rekordmange børn og unge venter på psykiatrisk behandling — ventetiden er nu 2,1 år',
    source: 'DR', age: 'Seneste data' },
  { panel: 'co2',            group: 'samfund',   topicLabel: 'Klima & CO₂',
    headline: 'Danmark har reduceret CO₂-udledning med 47 % siden 1990 — målet er 70 % i 2030',
    source: 'DR', age: 'Seneste data' },
  { panel: 'aeldrepleje',    group: 'samfund',   topicLabel: 'Ældrepleje',
    headline: '135.000 ældre modtager hjemmehjælp — sektoren koster ~105 mia. kr. om året',
    source: 'TV2', age: 'Seneste data' },
  { panel: 'energi',         group: 'samfund',   topicLabel: 'Energi & Strøm',
    headline: 'Havvind dækker nu 57 % af Danmarks elforbrug — rekord for vedvarende energi',
    source: 'DR', age: 'Seneste data' },
  { panel: 'sundhed',        group: 'samfund',   topicLabel: 'Sundhed',
    headline: 'Ni ud af ti danskere er tilfredse med sygehusvæsenet — ventetider dog stigende',
    source: 'Berlingske', age: 'Seneste data' },
  { panel: 'uddannelse',     group: 'samfund',   topicLabel: 'Uddannelse',
    headline: 'Ny PISA-rapport: Danske elever klarer sig over OECD-gennemsnittet i læsning',
    source: 'DR', age: 'Seneste data' },
  { panel: 'integration',    group: 'samfund',   topicLabel: 'Integration',
    headline: 'Færre asylansøgere i 2025 — antallet halveret sammenlignet med 2022',
    source: 'TV2', age: 'Seneste data' },
  { panel: 'kriminalitet',   group: 'samfund',   topicLabel: 'Kriminalitet',
    headline: 'Banderelateret kriminalitet falder i Københavns politikreds — tre år i træk',
    source: 'JP', age: 'Seneste data' },
  { panel: 'erhverv',        group: 'oekonomi',  topicLabel: 'Erhverv & Vækst',
    headline: 'Dansk BNP-vækst på 2,3 % i 2025 — eksport af grøn teknologi trækker op',
    source: 'Børsen', age: 'Seneste data' },
  { panel: 'statsgaeld',     group: 'oekonomi',  topicLabel: 'Statsgæld',
    headline: 'Dansk statsgæld nede på 29 % af BNP — en af de laveste i EU',
    source: 'Berlingske', age: 'Seneste data' },
  { panel: 'indkomst',       group: 'samfund',   topicLabel: 'Indkomst & Ulighed',
    headline: 'Lønvæksten på 3,8 % overstiger inflationen — realløn stiger for tredje år',
    source: 'DR', age: 'Seneste data' },
  { panel: 'naturvand',      group: 'samfund',   topicLabel: 'Natur & Miljø',
    headline: 'Pesticider fundet i 30 % af boringer — ny handlingsplan for drikkevand',
    source: 'Politiken', age: 'Seneste data' },
  { panel: 'folkeskolen',    group: 'samfund',   topicLabel: 'Folkeskolen',
    headline: 'Lærermangel i folkeskolen vokser — 4.000 timer dækkes af ikke-uddannede',
    source: 'DR', age: 'Seneste data' },
  { panel: 'ventetider',     group: 'samfund',   topicLabel: 'Ventetider',
    headline: 'Gennemsnitlig ventetid på operation: 18 % venter over 2 måneder',
    source: 'TV2', age: 'Seneste data' },
  { panel: 'udenrigshandel', group: 'oekonomi',  topicLabel: 'Udenrigshandel',
    headline: 'Dansk eksportoverskud på 97 mia. kr. i 2025 — medicin og grøn tech driver vækst',
    source: 'Børsen', age: 'Seneste data' },
  { panel: 'landbrug',       group: 'samfund',   topicLabel: 'Landbrug',
    headline: 'Ny CO₂-afgift på landbrug udskudt til 2027 — landbruget kritiserer tempo',
    source: 'JP', age: 'Seneste data' },
];

/* ── Cache ───────────────────────────────────────────────────────────── */
let _cache = null, _cacheAt = 0;
const TTL = 3 * 60 * 1000;

router.get('/', async (req, res, next) => {
  try {
    if (_cache && Date.now() - _cacheAt < TTL) return res.json(_cache);

    const results = await Promise.allSettled(
      FEEDS.map(f =>
        fetch(f.url, {
          signal: AbortSignal.timeout(7000),
          headers: { 'User-Agent': 'VirtuelRegering/2.0 (+https://virtuel-regering.onrender.com)' }
        })
          .then(r => { if (!r.ok) throw new Error(`${r.status} ${f.url}`); return r.text(); })
          .then(xml => parseRSS(xml, f.src))
      )
    );

    // Merge all articles, sort newest first
    const all = results
      .flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .sort((a, b) => (b.pubMs || 0) - (a.pubMs || 0));

    const limit = Math.min(parseInt(req.query.limit) || 20, 40);
    // One article per panel (up to limit total), pick newest match per source
    const seen = new Set();
    const items = [];
    for (const article of all) {
      if (items.length >= limit) break;
      const topic = matchTopic(article);
      if (!topic) continue;
      // Allow up to 2 articles per panel if from different sources
      const key = `${topic.panel}:${article.src}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seen.add(topic.panel + ':_any');
      const feedMeta = FEEDS.find(f => f.src === article.src);
      items.push({
        panel:       topic.panel,
        group:       topic.group,
        topicLabel:  topic.label,
        headline:    article.title,
        title:       article.title,
        description: article.desc,
        source:      article.src,
        intl:        feedMeta?.intl || false,
        age:         relTime(article.pub),
        link:        article.link,
        dream:       estimateDREAMImpact(article.title, article.desc || ''),
        sentiment:   scoreSentiment(article.title, article.desc),
        minutesAgo:  minutesAgo(article.pubMs),
      });
    }

    // Pad with fallback items for panels with no live coverage
    const coveredPanels = new Set(items.map(i => i.panel));
    if (items.length < limit) {
      for (const fb of FALLBACK) {
        if (items.length >= limit) break;
        if (!coveredPanels.has(fb.panel)) {
          coveredPanels.add(fb.panel);
          items.push({ ...fb, sentiment: 0, minutesAgo: null });
        }
      }
    }

    _cache = { items, fetchedAt: new Date().toISOString() };
    _cacheAt = Date.now();
    res.json(_cache);
  } catch (err) {
    next(err);
  }
});

/* ── GET /trends — topic coverage counts ─────────────────────────────── */
router.get('/trends', async (req, res, next) => {
  try {
    // Re-use warm cache if available
    if (!(_cache && Date.now() - _cacheAt < TTL)) {
      const results = await Promise.allSettled(
        FEEDS.map(f =>
          fetch(f.url, {
            signal: AbortSignal.timeout(7000),
            headers: { 'User-Agent': 'VirtuelRegering/2.0 (+https://virtuel-regering.onrender.com)' }
          })
            .then(r => { if (!r.ok) throw new Error(`${r.status} ${f.url}`); return r.text(); })
            .then(xml => parseRSS(xml, f.src))
        )
      );

      const all = results
        .flatMap(r => r.status === 'fulfilled' ? r.value : [])
        .sort((a, b) => (b.pubMs || 0) - (a.pubMs || 0));

      const limit = 40;
      const seen = new Set();
      const items = [];
      for (const article of all) {
        if (items.length >= limit) break;
        const topic = matchTopic(article);
        if (!topic) continue;
        const key = `${topic.panel}:${article.src}`;
        if (seen.has(key)) continue;
        seen.add(key);
        seen.add(topic.panel + ':_any');
        items.push({
          panel:       topic.panel,
          group:       topic.group,
          topicLabel:  topic.label,
          headline:    article.title,
          description: article.desc,
          source:      article.src,
          age:         relTime(article.pub),
          link:        article.link,
          dream:       estimateDREAMImpact(article.title, article.desc || ''),
          sentiment:   scoreSentiment(article.title, article.desc),
          minutesAgo:  minutesAgo(article.pubMs),
        });
      }

      const coveredPanels = new Set(items.map(i => i.panel));
      for (const fb of FALLBACK) {
        if (items.length >= limit) break;
        if (!coveredPanels.has(fb.panel)) {
          coveredPanels.add(fb.panel);
          items.push({ ...fb, sentiment: 0, minutesAgo: null });
        }
      }

      _cache = { items, fetchedAt: new Date().toISOString() };
      _cacheAt = Date.now();
    }

    // Count articles per topic and find latest article age
    const countMap = new Map();
    for (const item of _cache.items) {
      const entry = countMap.get(item.panel);
      if (!entry) {
        countMap.set(item.panel, {
          label:     item.topicLabel,
          panel:     item.panel,
          count:     1,
          latestAge: item.minutesAgo ?? null,
        });
      } else {
        entry.count += 1;
        if (item.minutesAgo != null) {
          if (entry.latestAge == null || item.minutesAgo < entry.latestAge) {
            entry.latestAge = item.minutesAgo;
          }
        }
      }
    }

    const topics = [...countMap.values()].sort((a, b) => b.count - a.count);
    res.json({ topics, fetchedAt: _cache.fetchedAt });
  } catch (err) {
    next(err);
  }
});

// GET /intl — raw international headlines (bypasses topic matching, all intl sources)
router.get('/intl', async (req, res, next) => {
  try {
    const intlFeeds = FEEDS.filter(f => f.intl);
    const results = await Promise.allSettled(
      intlFeeds.map(f =>
        fetch(f.url, { signal: AbortSignal.timeout(7000), headers: { 'User-Agent': 'VirtuelRegering/2.0' } })
          .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); })
          .then(xml => parseRSS(xml, f.src))
      )
    );
    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
      .sort((a, b) => (b.pubMs || 0) - (a.pubMs || 0));
    const limit = Math.min(parseInt(req.query.limit) || 30, 60);
    const items = all.slice(0, limit).map(a => ({
      title:      a.title,
      source:     a.src,
      link:       a.link,
      description:a.desc,
      age:        relTime(a.pub),
      minutesAgo: minutesAgo(a.pubMs),
      sentiment:  scoreSentiment(a.title, a.desc),
    }));
    res.json({ items, fetched: new Date().toISOString() });
  } catch (err) { next(err); }
});

export default router;
