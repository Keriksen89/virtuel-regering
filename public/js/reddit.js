// ── Reddit r/Denmark feed with Hot / New / Rising tabs ───────────────────────
VG.reddit = {};

VG.reddit.load = function() {
  const panel = document.getElementById('panel-reddit');
  if (!panel) return;
  if (!panel._tab) panel._tab = 'hot';
  if (!panel._cache) panel._cache = {};
  VG.reddit._fetch(panel, panel._tab);
};

VG.reddit._fetch = function(panel, tab) {
  if (panel._cache[tab]) {
    VG.reddit.renderPanel(panel, panel._cache[tab], tab);
    return;
  }

  panel.innerHTML = `
    <div class="feed-page-header">
      <div>
        <h2 class="feed-page-title"><i class="ph ph-reddit-logo"></i> Reddit Danmark</h2>
        <p class="feed-page-sub">Henter ${tab} posts fra r/Denmark…</p>
      </div>
    </div>`;

  fetch(`https://www.reddit.com/r/denmark/${tab}.json?limit=25&raw_json=1`)
    .then(r => r.json())
    .then(data => {
      const posts = (data.data.children || []).map(c => c.data).filter(p => !p.stickied);
      panel._cache[tab] = posts;
      VG.reddit.renderPanel(panel, posts, tab);
    })
    .catch(() => {
      panel.innerHTML = `
        <div class="feed-page-header">
          <div>
            <h2 class="feed-page-title"><i class="ph ph-reddit-logo"></i> Reddit Danmark</h2>
            <p class="feed-page-sub" style="color:var(--pos)">Kunne ikke hente data fra Reddit. Prøv igen senere.</p>
          </div>
        </div>`;
    });
};

VG.reddit._age = function(utc) {
  const sec = Math.floor(Date.now() / 1000) - utc;
  if (sec < 3600)  return Math.floor(sec / 60) + ' min';
  if (sec < 86400) return Math.floor(sec / 3600) + ' t';
  return Math.floor(sec / 86400) + ' d';
};

VG.reddit.renderPanel = function(panel, posts, tab) {
  tab = tab || panel._tab || 'hot';

  const tabs = ['hot', 'new', 'rising'];
  const tabLabels = { hot: '🔥 Hot', new: '🆕 New', rising: '📈 Rising' };

  const tabsHtml = tabs.map(t =>
    `<button class="feed-filter-btn${t === tab ? ' active' : ''}" data-rtab="${t}">${tabLabels[t]}</button>`
  ).join('');

  const itemsHtml = posts.slice(0, 20).map(p => {
    const id       = 'reddit-' + p.id;
    const score    = p.score || 0;
    const comments = p.num_comments || 0;
    const domain   = p.domain || '';
    const flair    = p.link_flair_text ? `<span class="feed-tag ft-info">${p.link_flair_text}</span>` : '';
    const age      = p.created_utc ? VG.reddit._age(p.created_utc) : '';
    const voteHtml = VG.votes ? VG.votes.renderBar(id, Math.round(score / 10), Math.max(1, Math.round(score / 40))) : '';
    const isText   = p.is_self;
    const excerpt  = p.selftext && p.selftext.length > 10
      ? `<p class="feed-card-body">${p.selftext.slice(0, 280).replace(/</g, '&lt;')}${p.selftext.length > 280 ? '…' : ''}</p>`
      : (domain && !isText ? `<p class="feed-card-body" style="color:var(--text-3);font-size:12px">${domain}</p>` : '');
    return `
      <article class="feed-card" data-rid="${p.id}">
        <div class="feed-card-meta">
          <span class="feed-cat-label"><i class="ph ph-reddit-logo"></i> r/Denmark</span>
          ${flair}
          <span class="feed-time">${score.toLocaleString('da-DK')} point · ${comments} kommentarer${age ? ' · ' + age : ''}</span>
        </div>
        <h3 class="feed-card-headline">${p.title}</h3>
        ${excerpt}
        <div class="feed-card-footer">
          ${voteHtml}
          <a class="feed-explore" href="https://reddit.com${p.permalink}" target="_blank" rel="noopener">Åbn på Reddit →</a>
        </div>
      </article>`;
  }).join('') || '<p class="feed-empty">Ingen posts fundet.</p>';

  panel.innerHTML = `
    <div class="feed-page-header">
      <div>
        <h2 class="feed-page-title"><i class="ph ph-reddit-logo"></i> Reddit Danmark</h2>
        <p class="feed-page-sub">Aktuelle posts fra r/Denmark — realtime fra Reddit API.</p>
      </div>
      <button class="feed-filter-btn" id="reddit-refresh" style="flex-shrink:0">↺ Opdater</button>
    </div>
    <div class="feed-filters">${tabsHtml}</div>
    <div class="feed-list">${itemsHtml}</div>`;

  panel.querySelectorAll('[data-rtab]').forEach(btn => {
    btn.onclick = () => {
      panel._tab = btn.dataset.rtab;
      VG.reddit._fetch(panel, panel._tab);
    };
  });

  panel.querySelector('#reddit-refresh')?.addEventListener('click', () => {
    panel._cache = {};
    VG.reddit._fetch(panel, panel._tab || 'hot');
  });
};
