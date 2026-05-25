import express from 'express';
const router = express.Router();

const BEARER = process.env.X_BEARER_TOKEN;
const X_BASE = 'https://api.twitter.com/2';
const CACHE  = new Map();
const TTL    = 5 * 60 * 1000; // 5 min

async function xGet(path, signal) {
  const r = await fetch(`${X_BASE}${path}`, {
    headers: { Authorization: `Bearer ${BEARER}` },
    signal,
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw Object.assign(new Error(`X API ${r.status}: ${body.slice(0,120)}`), { status: r.status });
  }
  return r.json();
}

function ageStr(iso) {
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)   return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm';
  if (sec < 86400)return Math.floor(sec / 3600) + 't';
  return Math.floor(sec / 86400) + 'd';
}

async function tweetsForHandle(handle, limit, signal) {
  const key = `${handle}:${limit}`;
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // Resolve handle → user id + profile
  const user = await xGet(
    `/users/by/username/${handle}?user.fields=name,username,description,public_metrics`,
    signal
  );
  const { id, name, username, description, public_metrics: um } = user.data;

  // Fetch recent tweets
  const tweets = await xGet(
    `/users/${id}/tweets` +
    `?max_results=${Math.min(Math.max(limit, 5), 100)}` +
    `&tweet.fields=created_at,public_metrics,entities,text` +
    `&exclude=retweets,replies`,
    signal
  );

  const items = (tweets.data || []).slice(0, limit).map(t => ({
    id: t.id,
    handle: username,
    name,
    av: name[0].toUpperCase(),
    text: t.text,
    age: t.created_at ? ageStr(t.created_at) : '',
    created_at: t.created_at || null,
    likes: t.public_metrics?.like_count ?? 0,
    retweets: t.public_metrics?.retweet_count ?? 0,
    url: `https://x.com/${username}/status/${t.id}`,
  }));

  CACHE.set(key, { at: Date.now(), data: { handle: username, name, description, followers: um?.followers_count, items } });
  return CACHE.get(key).data;
}

/* GET /api/xfeed?handles=a,b,c&limit=5 */
router.get('/', async (req, res, next) => {
  if (!BEARER) {
    return res.json({ configured: false, accounts: [] });
  }

  const handles = (req.query.handles || '').split(',').map(h => h.trim()).filter(Boolean).slice(0, 8);
  const limit   = Math.min(parseInt(req.query.limit) || 4, 10);

  if (!handles.length) return res.json({ configured: true, accounts: [] });

  const signal = AbortSignal.timeout(10_000);

  try {
    const results = await Promise.allSettled(handles.map(h => tweetsForHandle(h, limit, signal)));
    const accounts = results
      .map((r, i) => r.status === 'fulfilled' ? r.value : { handle: handles[i], name: handles[i], error: r.reason?.message, items: [] })
      .filter(a => a.items.length > 0 || a.error);

    res.json({ configured: true, accounts });
  } catch (err) {
    next(err);
  }
});

export default router;
