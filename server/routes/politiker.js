import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const ODA_BASE = 'https://oda.ft.dk/api';

const PARTY_COLORS = {
  A: '#E32D1C', V: '#003F87', M: '#6B3FA0', I: '#00A0D6',
  D: '#1B3A6B', F: '#E84B3A', Ø: '#B22222', C: '#006B3C',
  B: '#9B1EAD', O: '#F4A82A', Å: '#00C165',
};

const MINISTER_X_HANDLES = {
  'Mette Frederiksen':    'mettefrederiksen',
  'Lars Løkke Rasmussen': 'larsloekke',
  'Nicolai Wammen':       'nicolaiwammen',
  'Magnus Heunicke':      'magnusheunicke',
  'Troels Lund Poulsen':  'troelslundp',
  'Sophie Løhde':         'sophieloehde',
  'Peter Hummelgaard':    'phummelgaard',
  'Mattias Tesfaye':      'mattias_tesfaye',
  'Jeppe Bruus':          'jeppebruus',
  'Christina Egelund':    'cegelund',
  'Kaare Dybvad Bek':     'kaarebek',
  'Lars Aagaard':         'lars_aagaard_dk',
  'Rasmus Stoklund':      'stoklundm',
};

// Current government ministers — persons with their electoral storkreds positions.
// Positions are constituency centers, not ministry building addresses.
const MINISTERS = [
  { id: 'frederiksen', navn: 'Mette Frederiksen',    title: 'Statsminister',                         parti: 'A', storkreds: 'Vestre Storkreds',                  pos: [12.501, 55.664] },
  { id: 'loekke',      navn: 'Lars Løkke Rasmussen', title: 'Udenrigsminister',                      parti: 'M', storkreds: 'Sjællands Storkreds',               pos: [11.718, 55.716] },
  { id: 'wammen',      navn: 'Nicolai Wammen',        title: 'Finansminister',                        parti: 'A', storkreds: 'Østjyllands Storkreds',             pos: [10.214, 56.153] },
  { id: 'heunicke',    navn: 'Magnus Heunicke',       title: 'Justitsminister',                       parti: 'A', storkreds: 'Østre Storkreds',                   pos: [12.554, 55.694] },
  { id: 'lund',        navn: 'Troels Lund Poulsen',   title: 'Forsvarsminister',                      parti: 'V', storkreds: 'Vestjyllands Storkreds',            pos: [9.023,  56.574] },
  { id: 'loehde',      navn: 'Sophie Løhde',          title: 'Sundhedsminister',                      parti: 'V', storkreds: 'Nordsjællands Storkreds',           pos: [12.296, 55.917] },
  { id: 'hummelgaard', navn: 'Peter Hummelgaard',     title: 'Beskæftigelsesminister',                parti: 'A', storkreds: 'Østre Storkreds',                   pos: [12.598, 55.706] },
  { id: 'tesfaye',     navn: 'Mattias Tesfaye',       title: 'Udlændinge- og undervisningsminister',  parti: 'A', storkreds: 'Østre Storkreds',                   pos: [12.613, 55.671] },
  { id: 'bruus',       navn: 'Jeppe Bruus',           title: 'Skatteminister',                        parti: 'A', storkreds: 'Midtjyllands Storkreds',            pos: [10.044, 56.462] },
  { id: 'egelund',     navn: 'Christina Egelund',     title: 'Uddannelses- og forskningsminister',    parti: 'M', storkreds: 'Frederiksberg Storkreds',           pos: [12.523, 55.679] },
  { id: 'dybvad',      navn: 'Kaare Dybvad Bek',      title: 'Indenrigs- og boligminister',           parti: 'A', storkreds: 'Østjyllands Storkreds',             pos: [10.183, 56.183] },
  { id: 'aagaard',     navn: 'Lars Aagaard',          title: 'Klima-, energi- og forsyningsminister', parti: 'M', storkreds: 'Frederiksberg Storkreds',           pos: [12.538, 55.673] },
  { id: 'stoklund',    navn: 'Rasmus Stoklund',        title: 'Transportminister',                     parti: 'A', storkreds: 'Syd- og Sønderjyllands Storkreds',  pos: [9.504,  55.303] },
];

// GET /ministers — current government ministers with constituency positions
router.get('/ministers', (req, res) => {
  const ministers = MINISTERS.map(m => ({
    ...m,
    x: MINISTER_X_HANDLES[m.navn] || null,
    color: PARTY_COLORS[m.parti] || '#888',
    type: 'minister',
  }));
  res.json({ ministers, source: 'Statsministeriet · offentlig', fetched: new Date().toISOString() });
});

// GET /social — known politician social media handles
router.get('/social', (req, res) => {
  const withColors = POLITICIAN_SOCIAL.map(p => ({ ...p, color: PARTY_COLORS[p.parti] || '#888' }));
  res.json({ politicians: withColors });
});

// GET /activity — recent Folketing activity: latest speeches + votes + bills, merged
router.get('/activity', async (req, res) => {
  const cacheKey = 'politiker:activity';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  try {
    const [votesData, speechData, billData] = await Promise.allSettled([
      fetchJSON(`${ODA_BASE}/Afstemning?$top=8&$orderby=opdateringsdato%20desc&$expand=Sagstrin/Sag&$select=id,vedtaget,konklusion,opdateringsdato,Sagstrin/Sag/titel`),
      fetchJSON(`${ODA_BASE}/Tale?$top=8&$orderby=opdateringsdato%20desc&$expand=Aktør($select=id,navn,gruppenavnkort)&$select=id,opdateringsdato,Aktør/navn,Aktør/gruppenavnkort`),
      fetchJSON(`${ODA_BASE}/Sag?$filter=typeid%20eq%203%20and%20statusid%20le%204&$top=6&$orderby=opdateringsdato%20desc&$select=id,nummer,titel,statusid,opdateringsdato`)
    ]);

    const STATUS = { 1: 'Ubehandlet', 2: 'Fremsat', 3: 'Under behandling', 4: 'Vedtaget', 5: 'Forkastet' };

    const votes = (votesData.status === 'fulfilled' ? votesData.value?.value || [] : []).map(v => ({
      id: v.id, vedtaget: v.vedtaget,
      titel: v.Sagstrin?.Sag?.titel || v.konklusion?.slice(0, 80) || '—',
      dato: v.opdateringsdato,
    }));

    const speeches = (speechData.status === 'fulfilled' ? speechData.value?.value || [] : []).map(t => ({
      id: t.id,
      taler: t.Aktør?.navn || '—',
      parti: t.Aktør?.gruppenavnkort || null,
      dato: t.opdateringsdato,
    }));

    const bills = (billData.status === 'fulfilled' ? billData.value?.value || [] : []).map(s => ({
      id: s.id, nummer: s.nummer, titel: s.titel,
      status: STATUS[s.statusid] || 'Ukendt',
      dato: s.opdateringsdato,
    }));

    const result = { votes, speeches, bills, fetched: new Date().toISOString(), source: 'Folketingets ODA-API' };
    cache.set(cacheKey, result, 10 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[politiker] activity failed:', err.message);
    res.json({ votes: [], speeches: [], bills: [], fetched: new Date().toISOString(), error: err.message });
  }
});

// GET /news — news mentions of Danish politicians (proxies to /api/news with politik filter)
// Returns recent news items mentioning known politicians by name
router.get('/news', async (req, res) => {
  const cacheKey = 'politiker:news';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  const POLITICIAN_NAMES = [
    'Mette Frederiksen', 'Lars Løkke', 'Løkke Rasmussen', 'Nicolai Wammen',
    'Peter Hummelgaard', 'Magnus Heunicke', 'Sophie Løhde', 'Troels Lund',
    'Mattias Tesfaye', 'Jeppe Bruus', 'Christina Egelund', 'Kaare Dybvad',
    'Pia Olsen Dyhr', 'Alex Vanopslagh', 'Inger Støjberg', 'Mai Villadsen',
    'Martin Lidegaard', 'Morten Messerschmidt', 'Torsten Gejl',
    'regeringsdannelse', 'koalitionsforhandlinger', 'statsminister',
    'udenrigsminister', 'finansminister', 'forsvarsminister',
  ];

  try {
    // Fetch aggregated news from the news endpoint
    const newsData = await fetchJSON('http://localhost:' + (process.env.PORT || 3000) + '/api/news?limit=100');
    const items = newsData?.items || newsData || [];

    const politikItems = items
      .filter(item => {
        const text = ((item.title || '') + ' ' + (item.description || '')).toLowerCase();
        return POLITICIAN_NAMES.some(name => text.includes(name.toLowerCase()));
      })
      .slice(0, 20)
      .map(item => ({
        title: item.title,
        description: item.description,
        source: item.source || item.src,
        url: item.url || item.link,
        published: item.published || item.pubDate,
      }));

    const result = { items: politikItems, fetched: new Date().toISOString(), source: 'Dansk presse' };
    cache.set(cacheKey, result, 15 * 60);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[politiker] news failed:', err.message);
    res.json({ items: [], fetched: new Date().toISOString(), error: err.message });
  }
});

// GET /network — committee co-memberships for network graph
router.get('/network', async (req, res) => {
  const cacheKey = 'politiker:network';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  try {
    // Get committee memberships - shows who works with who on committees
    const url = `${ODA_BASE}/AktørAktør?$filter=rolleid%20eq%201%20and%20inaktiv%20eq%20false&$expand=fraAktør($select=id,navn),tilAktør($select=id,navn,typeid)&$top=300&$select=fraAktørid,tilAktørid`;
    const data = await fetchJSON(url);

    // Group actors by their "til" group (committee/party)
    const groups = {};
    for (const rel of (data?.value || [])) {
      const grp = rel.tilAktørid;
      if (!groups[grp]) groups[grp] = { name: rel.tilAktør?.navn || `Gruppe ${grp}`, members: [] };
      if (rel.fraAktør) groups[grp].members.push({ id: rel.fraAktørid, navn: rel.fraAktør.navn });
    }

    // Build co-occurrence edges: two people who share the same group have a connection
    const edges = {};
    for (const grp of Object.values(groups)) {
      for (let i = 0; i < grp.members.length; i++) {
        for (let j = i + 1; j < grp.members.length; j++) {
          const a = grp.members[i].id, b = grp.members[j].id;
          const key = a < b ? `${a}-${b}` : `${b}-${a}`;
          edges[key] = (edges[key] || 0) + 1;
        }
      }
    }

    // Return top connections (sorted by strength)
    const topEdges = Object.entries(edges)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([key, weight]) => { const [a, b] = key.split('-'); return { a: +a, b: +b, weight }; });

    const result = { edges: topEdges, groups: Object.keys(groups).length, fetched: new Date().toISOString() };
    cache.set(cacheKey, result, 12 * 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[politiker] network failed:', err.message);
    res.json({ edges: [], groups: 0, fetched: new Date().toISOString(), error: err.message });
  }
});

export default router;
