import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const ODA_BASE = 'https://oda.ft.dk/api';

// Copenhagen ministry building locations (geocoded from official addresses)
const MINISTRY_BUILDINGS = [
  { id: 'stm',  name: 'Statsministeriet',                    address: 'Prins Jørgens Gård 11, 1218 København K',  pos: [12.5796, 55.6755], minister: 'Mette Frederiksen', party: 'A' },
  { id: 'um',   name: 'Udenrigsministeriet',                 address: 'Asiatisk Plads 2, 1448 København K',        pos: [12.5938, 55.6712], minister: 'Lars Løkke Rasmussen', party: 'M' },
  { id: 'fm',   name: 'Finansministeriet',                   address: 'Christiansborg Slotsplads 1, 1218 Kbh K',  pos: [12.5784, 55.6748], minister: 'Nicolai Wammen', party: 'A' },
  { id: 'jm',   name: 'Justitsministeriet',                  address: 'Slotsholmsgade 10, 1216 København K',       pos: [12.5792, 55.6742], minister: 'Magnus Heunicke', party: 'A' },
  { id: 'fmst', name: 'Forsvarsministeriet',                 address: 'Holmens Kanal 42, 1060 København K',        pos: [12.5908, 55.6773], minister: 'Troels Lund Poulsen', party: 'V' },
  { id: 'sst',  name: 'Sundhedsministeriet',                 address: 'Bredgade 34, 1260 København K',             pos: [12.5871, 55.6848], minister: 'Sophie Løhde', party: 'V' },
  { id: 'bm',   name: 'Beskæftigelsesministeriet',           address: 'Ved Stranden 8, 1061 København K',          pos: [12.5861, 55.6752], minister: 'Peter Hummelgaard', party: 'A' },
  { id: 'em',   name: 'Erhvervsministeriet',                 address: 'Slotsholmsgade 10-12, 1216 København K',    pos: [12.5800, 55.6740], minister: 'Morten Bødskov', party: 'A' },
  { id: 'skm',  name: 'Skatteministeriet',                   address: 'Nicolai Eigtveds Gade 28, 1402 Kbh K',     pos: [12.5991, 55.6726], minister: 'Jeppe Bruus', party: 'A' },
  { id: 'trm',  name: 'Transportministeriet',                address: 'Frederiksholms Kanal 27F, 1220 Kbh K',     pos: [12.5744, 55.6736], minister: 'Thomas Danielsen', party: 'V' },
  { id: 'uim',  name: 'Udlændinge- og Integrationsmin.',     address: 'Slotsholmsgade 10, 1216 København K',       pos: [12.5792, 55.6738], minister: 'Mattias Tesfaye', party: 'A' },
  { id: 'ufm',  name: 'Uddannelses- og Forskningsmin.',      address: 'Styrelsen for Forskning, Kbh',              pos: [12.5720, 55.6810], minister: 'Christina Egelund', party: 'M' },
  { id: 'kefm', name: 'Klima-, Energi- og Forsyningsmin.',   address: 'Holmens Kanal 20, 1060 København K',        pos: [12.5898, 55.6762], minister: 'Lars Aagaard', party: 'M' },
  { id: 'ibm',  name: 'Indenrigs- og Boligministeriet',      address: 'Christiansborg Slotsplads 1, 1218 Kbh K',  pos: [12.5780, 55.6752], minister: 'Kaare Dybvad Bek', party: 'A' },
  { id: 'uvm',  name: 'Undervisningsministeriet',            address: 'Frederiksholms Kanal 21, 1220 Kbh K',      pos: [12.5754, 55.6734], minister: 'Mattias Tesfaye', party: 'A' },
  { id: 'ft',   name: 'Christiansborg (Folketing)',          address: 'Christiansborg Slotsplads, 1218 Kbh K',    pos: [12.5779, 55.6753], minister: null, party: null, type: 'parliament' },
];

// Public social media handles for Danish politicians (from their official profiles)
const POLITICIAN_SOCIAL = [
  { navn: 'Mette Frederiksen',      parti: 'A', x: 'mettefrederiksen', title: 'Statsminister' },
  { navn: 'Lars Løkke Rasmussen',   parti: 'M', x: 'larsloekke',       title: 'Udenrigsminister' },
  { navn: 'Nicolai Wammen',         parti: 'A', x: 'nicolaiwammen',    title: 'Finansminister' },
  { navn: 'Peter Hummelgaard',      parti: 'A', x: 'phummelgaard',     title: 'Beskæftigelsesminister' },
  { navn: 'Magnus Heunicke',        parti: 'A', x: 'magnusheunicke',   title: 'Justitsminister' },
  { navn: 'Sophie Løhde',           parti: 'V', x: 'sophieloehde',     title: 'Sundhedsminister' },
  { navn: 'Troels Lund Poulsen',    parti: 'V', x: 'troelslundp',      title: 'Forsvarsminister' },
  { navn: 'Mattias Tesfaye',        parti: 'A', x: 'mattias_tesfaye',  title: 'Udlændinge- og integrationsminister' },
  { navn: 'Jeppe Bruus',            parti: 'A', x: 'jeppebruus',       title: 'Skatteminister' },
  { navn: 'Christina Egelund',      parti: 'M', x: 'cegelund',         title: 'Uddannelsesminister' },
  { navn: 'Kaare Dybvad Bek',       parti: 'A', x: 'kaarebek',         title: 'Indenrigsminister' },
  { navn: 'Pia Olsen Dyhr',         parti: 'F', x: 'piaolsendyhr',     title: 'Formand SF' },
  { navn: 'Alex Vanopslagh',        parti: 'I', x: 'vanopslagh',       title: 'Formand Liberal Alliance' },
  { navn: 'Inger Støjberg',         parti: 'D', x: 'ingerstojberg',    title: 'Formand Danmarksdemokraterne' },
  { navn: 'Mai Villadsen',          parti: 'Ø', x: 'maivilladsen',     title: 'Formand Enhedslisten' },
  { navn: 'Martin Lidegaard',       parti: 'B', x: 'mlidegaard',       title: 'Formand Radikale Venstre' },
  { navn: 'Morten Messerschmidt',   parti: 'O', x: 'messerschmidt_m',  title: 'Formand Dansk Folkeparti' },
  { navn: 'Torsten Gejl',           parti: 'Å', x: 'torstengejl',      title: 'Formand Alternativet' },
  { navn: 'Rasmus Stoklund',        parti: 'A', x: 'stoklundm',        title: 'Transportminister' },
];

const PARTY_COLORS = {
  A: '#E32D1C', V: '#003F87', M: '#6B3FA0', I: '#00A0D6',
  D: '#1B3A6B', F: '#E84B3A', Ø: '#B22222', C: '#006B3C',
  B: '#9B1EAD', O: '#F4A82A', Å: '#00C165',
};

// GET /ministries — ministry building locations for globe
router.get('/ministries', (req, res) => {
  res.json({ buildings: MINISTRY_BUILDINGS, source: 'Statsministeriet · offentlig' });
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
