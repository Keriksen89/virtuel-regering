import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const ODA_BASE = 'https://oda.ft.dk/api';
const CACHE_TTL = 3 * 3600;

router.get('/recent-votes', async (req, res) => {
  const cacheKey = 'oda:recent-votes';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const url = `${ODA_BASE}/Afstemning?$top=20&$orderby=opdateringsdato%20desc&$expand=Sagstrin/Sag&$select=id,nummer,konklusion,vedtaget,opdateringsdato,kommentar,Sagstrin/Sag/titel`;
    const data = await fetchJSON(url);

    const votes = (data.value || []).map(v => ({
      id: v.id,
      nummer: v.nummer,
      vedtaget: v.vedtaget,
      konklusion: (v.konklusion || '').slice(0, 200),
      dato: v.opdateringsdato,
      sagTitel: v.Sagstrin && v.Sagstrin.Sag ? v.Sagstrin.Sag.titel : null
    }));

    const result = {
      votes,
      fetched: new Date().toISOString(),
      source: 'Folketingets ODA-API'
    };

    cache.set(cacheKey, result, CACHE_TTL);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[oda] recent-votes failed:', err.message);
    res.json({ votes: [], fetched: new Date().toISOString(), source: 'Folketingets ODA-API', error: 'temporarily unavailable' });
  }
});

router.get('/parties', async (req, res) => {
  const cacheKey = 'oda:parties';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const url = `${ODA_BASE}/Aktør?$filter=typeid%20eq%205&$select=id,navn,gruppenavnkort,opdateringsdato&$top=50`;
    const data = await fetchJSON(url);

    const parties = (data.value || []).map(p => ({
      id: p.id,
      navn: p.navn,
      forkortelse: p.gruppenavnkort
    }));

    const result = {
      parties,
      fetched: new Date().toISOString(),
      source: 'Folketingets ODA-API'
    };

    cache.set(cacheKey, result, 24 * 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[oda] parties failed:', err.message);
    res.json({ parties: [], fetched: new Date().toISOString(), source: 'Folketingets ODA-API', error: 'temporarily unavailable' });
  }
});

router.get('/recent-bills', async (req, res) => {
  const topic = req.query.topic || '';
  const cacheKey = `oda:recent-bills:${topic}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    let filter = "typeid%20eq%203";
    if (topic) {
      const safeTopic = topic.replace(/[^a-zæøåA-ZÆØÅ0-9\s-]/g, '').slice(0, 50);
      if (safeTopic) {
        filter += `%20and%20substringof('${encodeURIComponent(safeTopic)}',titel)`;
      }
    }

    const url = `${ODA_BASE}/Sag?$filter=${filter}&$top=10&$orderby=opdateringsdato%20desc&$select=id,nummer,titel,statusid,opdateringsdato`;
    const data = await fetchJSON(url);

    const bills = (data.value || []).map(s => ({
      id: s.id,
      nummer: s.nummer,
      titel: s.titel,
      opdateret: s.opdateringsdato,
      url: `https://www.ft.dk/samling/sag/${s.id}`
    }));

    const result = {
      bills,
      topic,
      fetched: new Date().toISOString(),
      source: 'Folketingets ODA-API'
    };

    cache.set(cacheKey, result, CACHE_TTL);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[oda] recent-bills failed:', err.message);
    res.json({ bills: [], topic, fetched: new Date().toISOString(), source: 'Folketingets ODA-API', error: 'temporarily unavailable' });
  }
});

router.get('/active-bills', async (req, res) => {
  const cacheKey = 'oda:active-bills';
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  const STATUS_LABELS = {
    1: 'Ubehandlet',
    2: 'Fremsat',
    3: 'Under behandling',
    4: 'Vedtaget',
    5: 'Forkastet',
    6: 'Bortfaldet'
  };

  try {
    const billsUrl = `${ODA_BASE}/Sag?$filter=typeid%20eq%203%20and%20statusid%20le%205&$top=20&$orderby=opdateringsdato%20desc&$select=id,nummer,titel,statusid,opdateringsdato,kategoriid`;
    const catUrl   = `${ODA_BASE}/SagKategori?$select=id,beskrivelse`;

    const [billsData, catData] = await Promise.allSettled([
      fetchJSON(billsUrl),
      fetchJSON(catUrl)
    ]);

    // Build category map
    const catMap = {};
    if (catData.status === 'fulfilled' && catData.value && catData.value.value) {
      for (const c of catData.value.value) {
        catMap[c.id] = c.beskrivelse;
      }
    }

    const rawBills = (billsData.status === 'fulfilled' && billsData.value && billsData.value.value) ? billsData.value.value : [];

    const bills = rawBills.map(s => ({
      id: s.id,
      nummer: s.nummer,
      titel: s.titel,
      statusid: s.statusid,
      statusLabel: STATUS_LABELS[s.statusid] || 'Ukendt',
      opdateret: s.opdateringsdato,
      kategori: catMap[s.kategoriid] || null,
      url: `https://www.ft.dk/samling/sag/${s.id}`
    }));

    const result = {
      bills,
      fetched: new Date().toISOString(),
      source: 'Folketingets ODA-API'
    };

    cache.set(cacheKey, result, 3 * 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[oda] active-bills failed:', err.message);
    res.json({ bills: [], fetched: new Date().toISOString(), source: 'Folketingets ODA-API', error: 'temporarily unavailable' });
  }
});

// GET /members — all Folketing members (type 5 = party, type 6 = MP/actor)
router.get('/members', async (req, res) => {
  const cacheKey = 'oda:members';
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  try {
    // typeid 5 = parlamentarisk gruppe (partigruppe), typeid 6 = person/MF
    const url = `${ODA_BASE}/Aktør?$filter=typeid%20eq%205&$select=id,navn,gruppenavnkort,opdateringsdato&$top=20`;
    const membersUrl = `${ODA_BASE}/AktørAktør?$filter=rolleid%20eq%201%20and%20inaktiv%20eq%20false&$expand=fraAktør($select=id,navn,biografi)&$top=200`;

    const [groupData, memberData] = await Promise.allSettled([
      fetchJSON(url),
      fetchJSON(membersUrl)
    ]);

    const groups = {};
    if (groupData.status === 'fulfilled') {
      for (const g of (groupData.value?.value || [])) {
        groups[g.id] = { navn: g.navn, forkortelse: g.gruppenavnkort };
      }
    }

    const members = [];
    if (memberData.status === 'fulfilled') {
      for (const rel of (memberData.value?.value || [])) {
        if (rel.fraAktør) {
          members.push({
            id: rel.fraAktør.id,
            navn: rel.fraAktør.navn,
            partiId: rel.tilAktørid,
            parti: groups[rel.tilAktørid]?.forkortelse || null,
            partiNavn: groups[rel.tilAktørid]?.navn || null,
          });
        }
      }
    }

    const result = { members, groups: Object.values(groups), fetched: new Date().toISOString(), source: 'Folketingets ODA-API' };
    cache.set(cacheKey, result, 6 * 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    console.warn('[oda] members failed:', err.message);
    res.json({ members: [], groups: [], fetched: new Date().toISOString(), source: 'Folketingets ODA-API', error: 'temporarily unavailable' });
  }
});

// GET /member-activity/:id — recent Folketing activity for a specific member
router.get('/member-activity/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Invalid id' });

  const cacheKey = `oda:member-activity:${id}`;
  const cached = cache.get(cacheKey);
  if (cached) { res.setHeader('X-Cache', 'HIT'); return res.json(cached); }

  try {
    const speechUrl = `${ODA_BASE}/Tale?$filter=aktørid%20eq%20${id}&$top=5&$orderby=opdateringsdato%20desc&$select=id,opdateringsdato,møde`;
    const data = await fetchJSON(speechUrl);
    const speeches = (data?.value || []).map(t => ({
      id: t.id,
      dato: t.opdateringsdato,
    }));
    const result = { id, speeches, fetched: new Date().toISOString() };
    cache.set(cacheKey, result, 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    res.json({ id, speeches: [], fetched: new Date().toISOString(), error: err.message });
  }
});

export default router;
