VG.api = {};

VG.api.fetchJSON = async function(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Accept': 'application/json', ...(options && options.headers) }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text.slice(0, 100)}`);
  }
  return res.json();
};

VG.api.loadBaseline = async function() {
  return VG.api.fetchJSON('/api/budget/baseline');
};

VG.api.loadKeyFigures = async function() {
  try {
    return await VG.api.fetchJSON('/api/dst/keyfigures');
  } catch (err) {
    console.warn('Could not load DST key figures:', err.message);
    return null;
  }
};

VG.api.loadRecentVotes = async function() {
  try {
    return await VG.api.fetchJSON('/api/oda/recent-votes');
  } catch (err) {
    console.warn('Could not load ODA votes:', err.message);
    return null;
  }
};

VG.api.loadRecentBills = async function(topic) {
  try {
    const url = '/api/oda/recent-bills' + (topic ? '?topic=' + encodeURIComponent(topic) : '');
    return await VG.api.fetchJSON(url);
  } catch (err) {
    console.warn('Could not load ODA bills:', err.message);
    return null;
  }
};

VG.api.loadPartyProposals = async function() {
  try {
    return await VG.api.fetchJSON('/api/party/proposals');
  } catch (err) {
    console.warn('Could not load party proposals:', err.message);
    return null;
  }
};

VG.api.loadDemographics = async function() {
  try {
    return await VG.api.fetchJSON('/api/demographics/summary');
  } catch (err) {
    console.warn('Could not load demographics:', err.message);
    return null;
  }
};

VG.api.loadPartyPlatform = async function() {
  try {
    return await VG.api.fetchJSON('/api/party/platform');
  } catch (err) {
    console.warn('Could not load party platform:', err.message);
    return null;
  }
};

VG.api.loadGovernment = async function() {
  try { return await VG.api.fetchJSON('/api/government/data'); } catch(e) { console.warn('[api] government:', e.message); return null; }
};
