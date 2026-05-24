import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchWithTimeout } from '../lib/fetch.js';

const router = Router();

// ── RSS XML parser (no extra dependencies) ────────────────────────────────

function parseRSSItems(xml) {
  const items = [];
  const itemPattern = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemPattern.exec(xml)) !== null) {
    const block = match[1];
    const title       = extractTag(block, 'title');
    const description = extractTag(block, 'description');
    const link        = extractTag(block, 'link');
    const pubDate     = extractTag(block, 'pubDate');
    const guid        = extractTag(block, 'guid');
    items.push({ title, description, link, pubDate, guid });
  }
  return items;
}

function extractTag(block, tag) {
  // Handle CDATA and plain content
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const c = cdataRe.exec(block);
  if (c) return c[1].trim();
  const p = plainRe.exec(block);
  if (p) return p[1].trim();
  return '';
}

function cleanHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

// ── DREAM-inspired economic impact estimation ─────────────────────────────

const POLICY_KEYWORDS = [
  // Skat
  { cat: 'Skat', words: ['topskat','bundskat','indkomstskat','skattelettelse','skattestigning','personskat','kapitalbeskatning','aktieskat','formueskat','arveafgift'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Moms
  { cat: 'Skat', words: ['moms','afgift','energiafgift','tobaksafgift','sukkerskat','plastafgift'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Velfærd
  { cat: 'Velfærd', words: ['dagpenge','kontanthjælp','førtidspension','ydelse','overførselsindkomst','sociale ydelser','fattigdomsgrænse'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Pension
  { cat: 'Pension', words: ['pension','pensionsalder','folkepension','tilbagetrækningsalder','efterløn','pensionsopsparing'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Klima
  { cat: 'Klima', words: ['klima','co2','grøn','vedvarende energi','solcelle','vindmølle','elbil','klimaafgift','klimamål'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Bolig
  { cat: 'Bolig', words: ['bolig','husleje','ejendomsskat','grundskyld','lejelov','almene boliger','boligmarked','boligpris'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Forsvar
  { cat: 'Forsvar', words: ['forsvar','militær','nato','hæren','flyvevåbenet','marinen','forsvarsbudget','forsvarsudgifter'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Uddannelse
  { cat: 'Uddannelse', words: ['uddannelse','folkeskole','gymnasie','su','universitet','erhvervsuddannelse','studiestøtte','lærer'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Sundhed
  { cat: 'Sundhed', words: ['sundhed','hospital','sygehus','venteliste','læge','psykiatri','medicin','sygesikring'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Arbejdsmarked
  { cat: 'Arbejdsmarked', words: ['arbejdsmarked','løn','overenskomst','fagforening','arbejdsløshed','beskæftigelse','flexicurity','jobcenter','ledighed'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
  // Immigration
  { cat: 'Immigration', words: ['indvandring','integration','asyl','udlænding','flygtninge','opholdstilladelse','statsborgerskab','udvisning'], fiscalBn: 0, gdpPct: 0, employmentK: 0, giniDelta: 0, politicalScore: 0 },
];

// DREAM fiscal parameters for keyword-driven rules
const FISCAL_RULES = [
  // Topskat
  { pattern: /hæver? topskatten?|øger? topskatten?|forhøjer? topskatten?/i, fiscalBn: 4.5, gdpPct: -0.08, employmentK: 3, giniDelta: -0.3, politicalScore: 60 },
  { pattern: /sænker? topskatten?|reducerer? topskatten?|fjerner? topskatten?|afskaffe topskat/i, fiscalBn: -4.5, gdpPct: 0.08, employmentK: -3, giniDelta: 0.3, politicalScore: -60 },
  // Moms
  { pattern: /hæver? momsen?|øger? momsen?|forhøjer? momsen?/i, fiscalBn: 6.5, gdpPct: -0.1, employmentK: 0, giniDelta: 0.2, politicalScore: 30 },
  { pattern: /sænker? momsen?|reducerer? momsen?|halverer? momsen?/i, fiscalBn: -6.5, gdpPct: 0.1, employmentK: 0, giniDelta: -0.2, politicalScore: -30 },
  // Selskabsskat
  { pattern: /hæver? selskabsskatten?|øger? selskabsskat/i, fiscalBn: 3.0, gdpPct: -0.05, employmentK: 0, giniDelta: -0.1, politicalScore: 50 },
  { pattern: /sænker? selskabsskatten?|reducerer? selskabsskat/i, fiscalBn: -3.0, gdpPct: 0.05, employmentK: 0, giniDelta: 0.1, politicalScore: -50 },
  // Pensionsalder
  { pattern: /hæver? pensionsalderen?|øger? pensionsalderen?|udskyder? pensionsalder/i, fiscalBn: 7.0, gdpPct: 0.4, employmentK: 15, giniDelta: 0.1, politicalScore: -30 },
  { pattern: /sænker? pensionsalderen?|reducerer? pensionsalderen?|tidligere pension/i, fiscalBn: -7.0, gdpPct: -0.4, employmentK: -15, giniDelta: -0.1, politicalScore: 30 },
  // Kontanthjælp
  { pattern: /stramme?r? kontanthjælp|skære?r? kontanthjælp|reducere?r? kontanthjælp/i, fiscalBn: 2.0, gdpPct: -0.05, employmentK: 3, giniDelta: 0.4, politicalScore: -40 },
  { pattern: /øge?r? kontanthjælp|hæve?r? kontanthjælp|forbedre?r? kontanthjælp/i, fiscalBn: -2.0, gdpPct: 0.03, employmentK: -1, giniDelta: -0.3, politicalScore: 50 },
  // Dagpenge
  { pattern: /stramme?r? dagpenge|forkorte?r? dagpengeperiode|reducere?r? dagpenge/i, fiscalBn: 2.5, gdpPct: 0.05, employmentK: 5, giniDelta: 0.3, politicalScore: -35 },
  { pattern: /øge?r? dagpenge|forlænge?r? dagpengeperiode|forbedre?r? dagpenge/i, fiscalBn: -2.5, gdpPct: -0.02, employmentK: -2, giniDelta: -0.3, politicalScore: 45 },
  // Forsvarsbudget
  { pattern: /øger? forsvarsbudget|løfter? forsvarsudgifter|investerer? i forsvar|forhøjer? forsvar/i, fiscalBn: -10.0, gdpPct: 0.2, employmentK: 8, giniDelta: 0.0, politicalScore: -20 },
  { pattern: /skære?r? forsvar|reducerer? forsvarsudgifter|sænker? forsvarsbudget/i, fiscalBn: 5.0, gdpPct: -0.1, employmentK: -4, giniDelta: 0.0, politicalScore: 20 },
  // SU
  { pattern: /øger? su|forbedrer? su|hæver? su/i, fiscalBn: -1.5, gdpPct: 0.05, employmentK: 0, giniDelta: -0.2, politicalScore: 40 },
  { pattern: /stramme?r? su|reducerer? su|skære?r? su/i, fiscalBn: 1.5, gdpPct: -0.03, employmentK: 0, giniDelta: 0.2, politicalScore: -35 },
  // Grøn investering
  { pattern: /grøn investering|klimainvestering|grøn omstilling|vedvarende energi investering/i, fiscalBn: -5.0, gdpPct: 0.15, employmentK: 10, giniDelta: -0.1, politicalScore: 30 },
  // Boligskatter
  { pattern: /hæver? grundskyld|øger? grundskyld|forhøjer? grundskyld/i, fiscalBn: 3.0, gdpPct: -0.05, employmentK: 0, giniDelta: -0.2, politicalScore: 40 },
  { pattern: /sænker? grundskyld|reducerer? grundskyld|afskaffe grundskyld/i, fiscalBn: -3.0, gdpPct: 0.03, employmentK: 0, giniDelta: 0.2, politicalScore: -35 },
  // Folkeskole
  { pattern: /investerer? i folkeskole|løfter? folkeskole|styrker? folkeskole/i, fiscalBn: -2.0, gdpPct: 0.08, employmentK: 5, giniDelta: -0.2, politicalScore: 35 },
  // Sundhed
  { pattern: /investerer? i sundhed|løfter? sygehus|styrker? psykiatri/i, fiscalBn: -3.0, gdpPct: 0.1, employmentK: 8, giniDelta: -0.2, politicalScore: 30 },
  // Immigration
  { pattern: /stramme?r? indvandring|begrænser? asyl|reducerer? integration/i, fiscalBn: 1.5, gdpPct: -0.1, employmentK: -5, giniDelta: 0.1, politicalScore: -50 },
  { pattern: /åbner? for indvandring|lempelse?r? asyl|letter? integration/i, fiscalBn: -1.0, gdpPct: 0.1, employmentK: 8, giniDelta: 0.0, politicalScore: 40 },
];

function detectConfidence(text) {
  const t = text.toLowerCase();
  if (/vedtaget|godkendt|aftale indgået|loven er|er vedtaget/.test(t)) return 'vedtaget';
  if (/forslag|vil foreslå|har fremsat|udspil|planer om/.test(t)) return 'forslag';
  if (/forhandler|drøfter|taler om|overvejer|er ved at/.test(t)) return 'forhandling';
  return 'rygte';
}

function detectCategory(text) {
  const t = text.toLowerCase();
  for (const rule of POLICY_KEYWORDS) {
    if (rule.words.some(w => t.includes(w))) return rule.cat;
  }
  return 'Øvrig';
}

function estimateDREAMImpact(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  // Try fiscal rules first (quantitative)
  for (const rule of FISCAL_RULES) {
    if (rule.pattern.test(text)) {
      const category = detectCategory(text);
      const confidence = detectConfidence(text);
      return buildImpact(rule, category, confidence, title);
    }
  }

  // Fall back to category-based heuristics
  const category = detectCategory(text);
  const confidence = detectConfidence(text);

  const heuristics = {
    Skat:           { fiscalBn: null, gdpPct: null, employmentK: null, giniDelta: null, politicalScore: 0 },
    Velfærd:        { fiscalBn: -2.0, gdpPct: 0.03, employmentK: -1, giniDelta: -0.3, politicalScore: 45 },
    Klima:          { fiscalBn: -3.0, gdpPct: 0.1, employmentK: 6, giniDelta: -0.1, politicalScore: 25 },
    Bolig:          { fiscalBn: -1.5, gdpPct: 0.05, employmentK: 2, giniDelta: -0.1, politicalScore: 20 },
    Forsvar:        { fiscalBn: -8.0, gdpPct: 0.15, employmentK: 6, giniDelta: 0.0, politicalScore: -15 },
    Uddannelse:     { fiscalBn: -2.0, gdpPct: 0.08, employmentK: 5, giniDelta: -0.2, politicalScore: 30 },
    Sundhed:        { fiscalBn: -3.0, gdpPct: 0.1, employmentK: 8, giniDelta: -0.2, politicalScore: 25 },
    Arbejdsmarked:  { fiscalBn: 0.5,  gdpPct: 0.05, employmentK: 4, giniDelta: 0.05, politicalScore: -10 },
    Immigration:    { fiscalBn: 1.5,  gdpPct: -0.05, employmentK: -3, giniDelta: 0.1, politicalScore: -40 },
    Pension:        { fiscalBn: 3.0,  gdpPct: 0.2, employmentK: 8, giniDelta: 0.05, politicalScore: -20 },
    Øvrig:          { fiscalBn: null, gdpPct: null, employmentK: null, giniDelta: null, politicalScore: 0 },
  };

  const h = heuristics[category] || heuristics['Øvrig'];
  return buildImpact(h, category, confidence, title);
}

function buildImpact(rule, category, confidence, title) {
  const explanation = generateExplanation(category, rule, title);
  return {
    fiscalBn:       rule.fiscalBn,
    gdpPct:         rule.gdpPct,
    employmentK:    rule.employmentK,
    giniDelta:      rule.giniDelta,
    politicalScore: rule.politicalScore,
    category,
    confidence,
    explanation,
  };
}

function generateExplanation(category, rule, title) {
  const { fiscalBn, gdpPct, employmentK } = rule;

  const fiscalText = fiscalBn == null ? null :
    fiscalBn > 0
      ? `Ifølge DREAM-parametre estimeres tiltaget at koste staten ca. ${Math.abs(fiscalBn).toFixed(1).replace('.', ',')} mia. kr. om året.`
      : `Tiltaget forventes at spare ca. ${Math.abs(fiscalBn).toFixed(1).replace('.', ',')} mia. kr. om året på de offentlige finanser.`;

  const employText = employmentK == null ? null :
    Math.abs(employmentK) < 0.5 ? null :
    employmentK > 0
      ? `Beskæftigelseseffekten vurderes positiv med op til ${Math.abs(employmentK).toFixed(0)} tusinde ekstra job.`
      : `Beskæftigelsen kan falde med op til ${Math.abs(employmentK).toFixed(0)} tusinde over en årrække.`;

  const parts = [fiscalText, employText].filter(Boolean);

  if (parts.length === 0) {
    return getCategoryDefault(category);
  }
  return parts.join(' ');
}

function getCategoryDefault(cat) {
  const defaults = {
    Skat:           'Skatteændringer påvirker direkte de offentlige finanser og arbejdsudbuddet — de præcise beløb afhænger af udformningen.',
    Velfærd:        'Velfærdsreformer har komplekse effekter: direkte udgiftsændringer samt sekundære effekter på arbejdsudbud og sociale indikatorer.',
    Klima:          'Klimainvesteringer er typisk dyre på kort sigt men giver positive langsigtede effekter via grøn omstilling og nye jobs.',
    Bolig:          'Boligpolitik påvirker markedspriser og ulighed — effekterne afhænger af balance mellem udbud og efterspørgsel.',
    Forsvar:        'Forsvarsudgifter har en direkte multiplikatoreffekt i dansk økonomi, men fortrænger private investeringer.',
    Uddannelse:     'Uddannelsesinvesteringer er langsigtede — kortfristet udgift, men positiv BNP-effekt over 10-20 år via højere produktivitet.',
    Sundhed:        'Sundhedsinvesteringer forbedrer folkesundheden og arbejdsudbuddet — men kræver finansiering på kort sigt.',
    Arbejdsmarked:  'Arbejdsmarkedsreformer påvirker beskæftigelse og lønudvikling — effekter varierer med konjunkturerne.',
    Immigration:    'Indvandringspolitik påvirker arbejdsudbud, offentlige udgifter og samfundsøkonomisk integration.',
    Pension:        'Pensionsreformer har store langsigtede finanspolitiske effekter via ændret tilbagetrækningsadfærd.',
    Øvrig:          'Tiltaget analyseres i henhold til generelle DREAM/MAKRO-parametre for dansk økonomi.',
  };
  return defaults[cat] || defaults['Øvrig'];
}

// ── RSS fetchers ───────────────────────────────────────────────────────────

const POLITIK_KEYWORDS = /politi[ck]|finanslov|budge|skat|regering|folketing|minister|parti|reform|valg|venstref|socialdem|liberal|konservativ|dansk folkeparti|radikale|SF|enhedslisten/i;

async function fetchDR() {
  const url = 'https://www.dr.dk/nyheder/service/feeds/politik';
  const res = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/rss+xml, text/xml, application/xml', 'User-Agent': 'VirtuelRegering/1.0' }
  }, 10000);
  const xml = await res.text();
  const items = parseRSSItems(xml);
  return items.map(item => ({
    title:       cleanHtml(item.title),
    description: cleanHtml(item.description).slice(0, 300),
    link:        item.link,
    pubDate:     item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    source:      'DR',
    guid:        item.guid || item.link,
  }));
}

async function fetchTV2() {
  const url = 'https://feeds.tv2.dk/nyheder/rss';
  const res = await fetchWithTimeout(url, {
    headers: { 'Accept': 'application/rss+xml, text/xml, application/xml', 'User-Agent': 'VirtuelRegering/1.0' }
  }, 10000);
  const xml = await res.text();
  const allItems = parseRSSItems(xml);
  // Filter for politics-relevant items
  return allItems
    .filter(item => POLITIK_KEYWORDS.test(item.title + ' ' + item.description))
    .map(item => ({
      title:       cleanHtml(item.title),
      description: cleanHtml(item.description).slice(0, 300),
      link:        item.link,
      pubDate:     item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      source:      'TV2',
      guid:        item.guid || item.link,
    }));
}

// ── Route ─────────────────────────────────────────────────────────────────

router.get('/feed', async (req, res) => {
  const cacheKey = 'rygter:feed';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  let drItems = [], tv2Items = [];

  const [drResult, tv2Result] = await Promise.allSettled([
    fetchDR().catch(e => { console.warn('[rygter] DR fetch failed:', e.message); return []; }),
    fetchTV2().catch(e => { console.warn('[rygter] TV2 fetch failed:', e.message); return []; }),
  ]);

  if (drResult.status === 'fulfilled')  drItems  = drResult.value  || [];
  if (tv2Result.status === 'fulfilled') tv2Items = tv2Result.value || [];

  // Merge and deduplicate by title similarity
  const all = [...drItems, ...tv2Items];
  const seen = new Set();
  const unique = all.filter(item => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by date descending
  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Apply DREAM analysis to each item
  const analyzed = unique.map(item => {
    const impact = estimateDREAMImpact(item.title, item.description);
    return { ...item, impact };
  });

  // If both feeds failed, provide mock data for demo
  const result = analyzed.length > 0 ? analyzed : getMockRygter();

  cache.set(cacheKey, result, 30 * 60); // 30 minutes
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
});

// ── Mock data if both feeds fail ───────────────────────────────────────────

function getMockRygter() {
  const items = [
    {
      title: 'Regeringen overvejer reform af dagpengesystemet',
      description: 'Ifølge kilder tæt på forhandlingerne overvejer regeringen at stramme dagpengereglerne for at øge arbejdsudbuddet.',
      link: 'https://www.dr.dk/nyheder/politik',
      source: 'DR',
      pubDate: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    },
    {
      title: 'Ny forsvarsaftale kan koste 10 milliarder ekstra',
      description: 'En ny forsvarsaftale er under forhandling. Partierne er enige om at øge forsvarsbudgettet til 2% af BNP hurtigere end planlagt.',
      link: 'https://www.dr.dk/nyheder/politik',
      source: 'DR',
      pubDate: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      title: 'Mulig topskattelettelse på vej',
      description: 'Kilder siger at blå blok drøfter en reduktion af topskatten som led i en kommende skatteaftale.',
      link: 'https://nyheder.tv2.dk/politik',
      source: 'TV2',
      pubDate: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      title: 'SF foreslår at hæve kontanthjælpen',
      description: 'SF har fremsat forslag om at løfte kontanthjælpen til 15.000 kr. om måneden for at bekæmpe fattigdom.',
      link: 'https://nyheder.tv2.dk/politik',
      source: 'TV2',
      pubDate: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    },
    {
      title: 'Klimaforlig kan udløse 20 mia. i grønne investeringer',
      description: 'En bred kreds af partier forhandler om et klimaforlig der vil udløse massive investeringer i vedvarende energi og grøn omstilling.',
      link: 'https://www.dr.dk/nyheder/politik',
      source: 'DR',
      pubDate: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
    {
      title: 'Folkeskolereform: Regeringen vil investere i læreruddannelsen',
      description: 'Regeringen planlægger at styrke folkeskolen med nye midler til læreruddannelse og efteruddannelse.',
      link: 'https://www.dr.dk/nyheder/politik',
      source: 'DR',
      pubDate: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
  ];

  return items.map(item => ({
    ...item,
    guid: item.link + item.title.slice(0, 20),
    impact: estimateDREAMImpact(item.title, item.description),
  }));
}

export default router;
