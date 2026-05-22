import { Router } from 'express';
import * as cache from '../lib/cache.js';
import { fetchJSON } from '../lib/fetch.js';

const router = Router();
const BASE = 'https://www.borgerforslag.dk/api/proposals';

function daysLeft(deadlineStr) {
  if (!deadlineStr) return null;
  const ms = new Date(deadlineStr) - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

async function fetchProposals(filter, batchSize) {
  const url = `${BASE}/listing?batchSize=${batchSize}&startIndex=0&filter=${filter}&sortOrder=signaturesDesc`;
  const data = await fetchJSON(url, {
    headers: { Accept: 'application/json' }
  });
  return (data.proposals || []).map(p => ({
    id:          p.id,
    title:       p.title || p.titel || '',
    description: (p.description || p.beskrivelse || '').slice(0, 220),
    signatures:  p.signatures ?? p.numberOfSignatures ?? 0,
    required:    p.requiredSignatures ?? 50000,
    deadline:    p.deadline ?? p.expiryDate ?? null,
    daysLeft:    daysLeft(p.deadline ?? p.expiryDate),
    status:      p.status ?? filter,
    url:         p.url ?? p.proposalUrl ?? `https://www.borgerforslag.dk/se-og-stoet-forslag/?Id=${p.id}`
  }));
}

// GET /api/borgerforslag/active   — open proposals, sorted by signature count
router.get('/active', async (req, res) => {
  const key = 'borgerforslag:active';
  const hit = cache.get(key);
  if (hit) { res.setHeader('X-Cache', 'HIT'); return res.json(hit); }

  try {
    const proposals = await fetchProposals('active', 12);
    const result = { proposals, fetched: new Date().toISOString() };
    cache.set(key, result, 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Borgerforslag API unavailable', detail: err.message });
  }
});

// GET /api/borgerforslag/accepted — proposals that reached 50k signatures
router.get('/accepted', async (req, res) => {
  const key = 'borgerforslag:accepted';
  const hit = cache.get(key);
  if (hit) { res.setHeader('X-Cache', 'HIT'); return res.json(hit); }

  try {
    const proposals = await fetchProposals('accepted', 8);
    const result = { proposals, fetched: new Date().toISOString() };
    cache.set(key, result, 6 * 3600);
    res.setHeader('X-Cache', 'MISS');
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Borgerforslag API unavailable', detail: err.message });
  }
});

export default router;
