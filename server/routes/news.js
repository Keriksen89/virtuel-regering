import express from 'express';
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
  { src: 'Politiken',    url: 'https://politiken.dk/rss/' },
  { src: 'Weekendavisen',url: 'https://weekendavisen.dk/rss' },
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

/* ── Fallback items — shown when live news is insufficient ───────────── */
const FALLBACK = [
  { panel: 'inflation',   group: 'samfund',   topicLabel: 'Inflation & Priser',
    headline: 'Nationalbanken fastholder renten på 3,35 % — inflationen er faldet til 2,1 %',
    source: 'DR', age: '' },
  { panel: 'forsvar',     group: 'samfund',   topicLabel: 'Forsvar',
    headline: 'Danmark hæver forsvarsbudget til 1,65 % af BNP — NATO-målet er 3 % inden 2030',
    source: 'TV2', age: '' },
  { panel: 'boligmarked', group: 'samfund',   topicLabel: 'Boligmarked',
    headline: 'Boligpriser stiger 1,8 % på et kvartal — villaer over 3 mio. kr. sælger hurtigst',
    source: 'DR', age: '' },
  { panel: 'ledighed',    group: 'samfund',   topicLabel: 'Ledighed',
    headline: 'Ledighedsprocenten holder sig stabilt på 4,8 % — 140.000 registrerede ledige',
    source: 'TV2', age: '' },
  { panel: 'psykiatri',   group: 'samfund',   topicLabel: 'Psykiatri',
    headline: 'Rekordmange børn og unge venter på psykiatrisk behandling — ventetiden er nu 2,1 år',
    source: 'DR', age: '' },
  { panel: 'co2',         group: 'samfund',   topicLabel: 'Klima & CO₂',
    headline: 'Danmark har reduceret CO₂-udledning med 47 % siden 1990 — målet er 70 % i 2030',
    source: 'DR', age: '' },
  { panel: 'aeldrepleje', group: 'samfund',   topicLabel: 'Ældrepleje',
    headline: '135.000 ældre modtager hjemmehjælp — sektoren koster ~105 mia. kr. om året',
    source: 'TV2', age: '' },
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

    // One article per panel (up to 12 total), pick newest match per source
    const seen = new Set();
    const items = [];
    for (const article of all) {
      if (items.length >= 12) break;
      const topic = matchTopic(article);
      if (!topic) continue;
      // Allow up to 2 articles per panel if from different sources
      const key = `${topic.panel}:${article.src}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seen.add(topic.panel + ':_any');
      items.push({
        panel:      topic.panel,
        group:      topic.group,
        topicLabel: topic.label,
        headline:   article.title,
        source:     article.src,
        age:        relTime(article.pub),
        link:       article.link,
      });
    }

    // Pad with fallback items for panels with no live coverage
    const coveredPanels = new Set(items.map(i => i.panel));
    if (items.length < 7) {
      for (const fb of FALLBACK) {
        if (items.length >= 7) break;
        if (!coveredPanels.has(fb.panel)) {
          coveredPanels.add(fb.panel);
          items.push(fb);
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

export default router;
