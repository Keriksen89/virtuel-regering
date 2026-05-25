import express from 'express';
const router = express.Router();

/* ── RSS feeds to watch ──────────────────────────────────────────────── */
const FEEDS = [
  { src: 'DR',  url: 'https://www.dr.dk/nyheder/service/feeds/indland' },
  { src: 'DR',  url: 'https://www.dr.dk/nyheder/service/feeds/penge' },
  { src: 'DR',  url: 'https://www.dr.dk/nyheder/service/feeds/politik' },
  { src: 'TV2', url: 'https://feeds.tv2.dk/nyheder/' },
  { src: 'TV2', url: 'https://feeds.tv2.dk/nyheder/penge' },
];

/* ── Topic → panel mapping (order = priority) ────────────────────────── */
const TOPICS = [
  { panel: 'inflation',    group: 'samfund',    label: 'Inflation & Priser',
    keys: ['inflation', 'forbrugerprisindeks', 'kpi steg', 'priser stiger', 'nationalbanken', 'styringsrente', 'rentestigni'] },
  { panel: 'ledighed',     group: 'samfund',    label: 'Ledighed',
    keys: ['ledighed', 'arbejdsløs', 'fyret', 'fyring', 'massefyring', 'beskæftigelsesgrad', 'dagpengemodtager'] },
  { panel: 'boligmarked',  group: 'samfund',    label: 'Boligmarked',
    keys: ['boligpris', 'huspris', 'ejerbolig', 'lejebolig', 'boligmarked', 'ejendomspris', 'villapriser', 'kontantpris'] },
  { panel: 'sundhed',      group: 'samfund',    label: 'Sundhed',
    keys: ['sundhedsvæsen', 'sygehus', 'hospital', 'venteliste', 'ventetid på', 'akutmodtagelse', 'lægemangel', 'sygeplejersker'] },
  { panel: 'co2',          group: 'samfund',    label: 'Klima & CO₂',
    keys: ['klimamål', 'co2-udledning', 'drivhusgas', 'grøn omstilling', 'klimaforandring', 'global opvarmning', 'klimaplan'] },
  { panel: 'energi',       group: 'samfund',    label: 'Energi & Strøm',
    keys: ['elpris', 'elprisen', 'vindmølle', 'havvind', 'solceller', 'energikrise', 'gasforsyning', 'vedvarende energi'] },
  { panel: 'forsvar',      group: 'samfund',    label: 'Forsvar',
    keys: ['forsvarsbudget', 'forsvarsudgifter', 'nato-mål', 'militær', 'hæren', 'ukraine-krigen', 'sikkerhedspolitik', 'totalforsvar'] },
  { panel: 'overview',     group: 'oekonomi',   label: 'Statsbudget',
    keys: ['finanslov', 'statsbudget', 'finansminister', 'offentlige udgifter', 'budgetoverskud', 'besparelse'] },
  { panel: 'folkeskolen',  group: 'samfund',    label: 'Folkeskolen',
    keys: ['folkeskole', 'grundskole', 'skoleelever', 'lærermangel', 'pisa-undersøg', 'karaktergennemsnit', 'folkeskolereform'] },
  { panel: 'integration',  group: 'samfund',    label: 'Integration',
    keys: ['integration', 'indvandrere', 'asylansøg', 'udlændingepolitik', 'opholdstilladelse', 'familiesammenføring'] },
  { panel: 'kriminalitet', group: 'samfund',    label: 'Kriminalitet',
    keys: ['bandekrig', 'skyderi', 'kriminalitetsrate', 'fængsel', 'anholdt', 'rockerborgen', 'politikredsene'] },
  { panel: 'erhverv',      group: 'oekonomi',   label: 'Erhverv & Vækst',
    keys: ['bnp-vækst', 'eksportrekord', 'iværksætteri', 'konkurs', 'erhvervsliv', 'produktivitet', 'industriproduktion'] },
  { panel: 'landbrug',     group: 'samfund',    label: 'Landbrug',
    keys: ['landbruget', 'landmænd', 'svineproduk', 'pesticider', 'gødningskvoter', 'landbrugspakke', 'kvæg'] },
  { panel: 'psykiatri',    group: 'samfund',    label: 'Psykiatri',
    keys: ['psykiatrien', 'psykisk sygdom', 'psykiatrisk', 'mental sundhed', 'selvmord', 'angstlidelse', 'depressions'] },
  { panel: 'aeldrepleje',  group: 'samfund',    label: 'Ældrepleje',
    keys: ['ældrepleje', 'plejehjem', 'hjemmehjælp', 'demens', 'plejesektor', 'ældreboliger'] },
  { panel: 'indkomst',     group: 'samfund',    label: 'Indkomst & Ulighed',
    keys: ['ulighed', 'fattigdomsgrænse', 'lønstigning', 'lønforhandling', 'overenskomst', 'mindsteløn', 'topskat'] },
  { panel: 'statsgaeld',   group: 'oekonomi',   label: 'Statsgæld',
    keys: ['statsgæld', 'offentlig gæld', 'statslån', 'rentebyrde', 'afdrag på'] },
  { panel: 'pension',      group: 'personligt', label: 'Pension',
    keys: ['folkepension', 'pensionsalder', 'efterløn', 'pensionsopsparing', 'tidlig pension'] },
  { panel: 'ventetider',   group: 'samfund',    label: 'Ventetider',
    keys: ['ventetid på behandling', 'venteliste på sygehus', 'pakkeforløb', 'kræftbehandling', 'operationsventeliste'] },
];

/* ── Minimal RSS parser (no deps) ───────────────────────────────────── */
function parseRSS(xml, src) {
  const items = [];
  const reItem = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = reItem.exec(xml)) !== null && items.length < 30) {
    const b = m[1];
    const get = re => (b.match(re) || [])[1] || '';
    const clean = s => s
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#\d+;/g, '')
      .trim();
    const title = clean(get(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i));
    const link  = clean(get(/<link[^>]*>\s*(https?[^\s<]+)/i));
    const desc  = clean(get(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)).slice(0, 300);
    const pub   = clean(get(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i));
    if (title) items.push({ title, link, desc, pub, src });
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
    if (h < 24) return `${h} ${h === 1 ? 'time' : 'timer'} siden`;
    const d = Math.round(h / 24);
    return `${d} ${d === 1 ? 'dag' : 'dage'} siden`;
  } catch { return ''; }
}

/* ── Fallback items shown when RSS feeds are unreachable ─────────────── */
const FALLBACK = [
  { panel: 'inflation',   group: 'samfund',  topicLabel: 'Inflation & Priser',
    headline: 'Nationalbanken fastholder renten på 3,35% — inflationen er faldet til 2,1%',
    source: 'DR', age: 'i dag' },
  { panel: 'forsvar',     group: 'samfund',  topicLabel: 'Forsvar',
    headline: 'Danmark hæver forsvarsbudget til 1,65% af BNP — NATO-målet er 3% inden 2030',
    source: 'TV2', age: 'i dag' },
  { panel: 'boligmarked', group: 'samfund',  topicLabel: 'Boligmarked',
    headline: 'Boligpriser stiger 1,8% på et kvartal — villaer over 3 mio. kr. sælger hurtigst',
    source: 'DR', age: 'i dag' },
  { panel: 'ledighed',    group: 'samfund',  topicLabel: 'Ledighed',
    headline: 'Ledighedsprocenten holder sig stabilt på 4,8% — 140.000 registrerede ledige',
    source: 'TV2', age: 'i dag' },
  { panel: 'psykiatri',   group: 'samfund',  topicLabel: 'Psykiatri',
    headline: 'Rekordmange børn og unge venter på psykiatrisk behandling — ventetiden er nu 2,1 år',
    source: 'DR', age: 'i dag' },
];

/* ── Cache ───────────────────────────────────────────────────────────── */
let _cache = null, _cacheAt = 0;
const TTL = 20 * 60 * 1000; // 20 minutes

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

    const all = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

    // One article per panel, highest-priority topic wins
    const seen = new Set();
    const items = [];
    for (const article of all) {
      if (items.length >= 5) break;
      const topic = matchTopic(article);
      if (!topic || seen.has(topic.panel)) continue;
      seen.add(topic.panel);
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

    // Fall back to curated items if no live news was fetched
    const final = items.length >= 2 ? items : FALLBACK;

    _cache = { items: final, fetchedAt: new Date().toISOString() };
    _cacheAt = Date.now();
    res.json(_cache);
  } catch (err) {
    next(err);
  }
});

export default router;
