VG.xdeck = {};

// ── Pre-curated Danish political accounts ────────────────────────────────────
const XDECK_ACCOUNTS = [
  // Politikere
  { handle: 'mfrederiksen',    name: 'Mette Frederiksen',       role: 'Statsminister (S)',              cat: 'Politikere' },
  { handle: 'larsloekke',      name: 'Lars Løkke Rasmussen',    role: 'Udenrigsminister (M)',           cat: 'Politikere' },
  { handle: 'piaolsendyhr',    name: 'Pia Olsen Dyhr',          role: 'Politisk leder (SF)',            cat: 'Politikere' },
  { handle: 'troelslundp',     name: 'Troels Lund Poulsen',     role: 'Forsvarsminister (V)',           cat: 'Politikere' },
  { handle: 'Alex_Vanopslagh', name: 'Alex Vanopslagh',         role: 'Leder (Liberal Alliance)',       cat: 'Politikere' },
  { handle: 'MartinLidegaard', name: 'Martin Lidegaard',        role: 'Politisk ordfører (RV)',         cat: 'Politikere' },
  { handle: 'inger_stoejberg', name: 'Inger Støjberg',          role: 'Leder (Danmarksdemokraterne)',   cat: 'Politikere' },
  { handle: 'JakobEJ',         name: 'Jakob Ellemann-Jensen',   role: 'Erhvervsminister (V)',           cat: 'Politikere' },
  // Partier
  { handle: 'Venstredk',       name: 'Venstre',                 role: 'Parti',                         cat: 'Partier' },
  { handle: 'LiberalAlliance', name: 'Liberal Alliance',        role: 'Parti',                         cat: 'Partier' },
  { handle: 'EnhedslistenDK',  name: 'Enhedslisten',            role: 'Parti',                         cat: 'Partier' },
  { handle: 'alternativetdk',  name: 'Alternativet',            role: 'Parti',                         cat: 'Partier' },
  { handle: 'radikale_dk',     name: 'Radikale Venstre',        role: 'Parti',                         cat: 'Partier' },
  { handle: 'SFpartiet',       name: 'SF',                      role: 'Parti',                         cat: 'Partier' },
  { handle: 'Konservative',    name: 'Konservative',            role: 'Parti',                         cat: 'Partier' },
  // Kommentatorer & journalister
  { handle: 'andersfoghr',     name: 'Anders Fogh Rasmussen',   role: 'F. statsminister, NATO-chef',   cat: 'Kommentatorer' },
  { handle: 'nielsBrix',       name: 'Niels Brix',              role: 'Politisk kommentator',          cat: 'Kommentatorer' },
  { handle: 'RizaAkdeniz',     name: 'Riza Akdeniz',            role: 'Politisk journalist, DR',       cat: 'Kommentatorer' },
  { handle: 'hannaheandersen',  name: 'Hannah Engelby Andersen', role: 'Politisk kommentator, TV2',    cat: 'Kommentatorer' },
  // Tænketanke & økonomi
  { handle: 'Statsmin',        name: 'Statsministeriet',        role: 'Statsministerens kontor',       cat: 'Tænketanke' },
  { handle: 'finansmin',       name: 'Finansministeriet',       role: 'Statens finanser',              cat: 'Tænketanke' },
  { handle: 'CEPOS_dk',        name: 'CEPOS',                   role: 'Liberal tænketank',             cat: 'Tænketanke' },
  { handle: 'AERaadet',        name: 'AE-rådet',                role: 'Arbejderbevægelsens Erhvervsråd', cat: 'Tænketanke' },
  { handle: 'DreamGruppen',    name: 'DREAM',                   role: 'Makroøkonomisk modelgruppe',    cat: 'Tænketanke' },
  // Medier
  { handle: 'drnyheder',       name: 'DR Nyheder',              role: 'Public service medie',          cat: 'Medier' },
  { handle: 'tv2newsdk',       name: 'TV 2 News',               role: 'Nyhedskanal',                   cat: 'Medier' },
  { handle: 'politiken',       name: 'Politiken',               role: 'Dagblad',                       cat: 'Medier' },
  { handle: 'Berlingske',      name: 'Berlingske',              role: 'Dagblad',                       cat: 'Medier' },
  { handle: 'JyllandsPosten',  name: 'Jyllands-Posten',         role: 'Dagblad',                       cat: 'Medier' },
];

const XDECK_LS_KEY   = 'vg_xdeck_v2';
const XDECK_DEFAULTS = ['mfrederiksen', 'larsloekke', 'piaolsendyhr'];

VG.xdeck.getAccounts = () => XDECK_ACCOUNTS;

VG.xdeck.getFollowed = function() {
  try {
    const s = JSON.parse(localStorage.getItem(XDECK_LS_KEY));
    return Array.isArray(s) ? s : [...XDECK_DEFAULTS];
  } catch(e) { return [...XDECK_DEFAULTS]; }
};

VG.xdeck.setFollowed = function(handles) {
  localStorage.setItem(XDECK_LS_KEY, JSON.stringify(handles));
};

VG.xdeck.load = function() {};

VG.xdeck.renderInto = function(container) {
  if (!container) return;
  VG.xdeck._fetchAndRender(container);
};

// ── API-backed native tweet feed ─────────────────────────────────────────────
VG.xdeck._fetchAndRender = function(root, handles) {
  const followed = handles || VG.xdeck.getFollowed();
  if (!followed.length) { VG.xdeck._renderHTML(root, followed); return; }

  root.innerHTML = '<div class="xdf-loading"><i class="ph ph-circle-notch" style="animation:xf-spin .8s linear infinite;display:inline-block"></i> Henter X-feed…</div>';

  fetch(`/api/xfeed?handles=${followed.join(',')}&limit=4`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      if (data.configured && data.accounts && data.accounts.some(a => a.items && a.items.length)) {
        VG.xdeck._renderNative(root, data.accounts, followed);
      } else {
        VG.xdeck._renderHTML(root, followed);
      }
    })
    .catch(() => VG.xdeck._renderHTML(root, followed));
};

// ── Native tweet card render (API mode) ──────────────────────────────────────
VG.xdeck._renderNative = function(root, accounts, followed) {
  const feedHtml = accounts.map(acc => {
    const meta = XDECK_ACCOUNTS.find(a => a.handle.toLowerCase() === acc.handle.toLowerCase());
    const role = meta ? meta.role : '';
    const tweetsHtml = (acc.items || []).map(t => {
      const txt = (t.text || '').replace(/https?:\/\/t\.co\/\S+/g, '').trim();
      return `
        <a class="xf-tweet" href="${t.url}" target="_blank" rel="noopener">
          <p class="xf-tweet-text">${txt.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
          <div class="xf-tweet-foot">
            <span class="xf-tweet-age">${t.age || ''}</span>
            ${t.likes    ? `<span class="xf-tweet-stat"><i class="ph ph-heart"></i> ${t.likes.toLocaleString('da-DK')}</span>` : ''}
            ${t.retweets ? `<span class="xf-tweet-stat"><i class="ph ph-repeat"></i> ${t.retweets.toLocaleString('da-DK')}</span>` : ''}
          </div>
        </a>`;
    }).join('');
    return `
      <div class="xdf-item">
        <div class="xdf-hd">
          <div class="xdf-av">${(acc.name || acc.handle)[0].toUpperCase()}</div>
          <div class="xdf-meta">
            <span class="xdf-name">${acc.name || acc.handle}</span>
            <a class="xdf-handle" href="https://x.com/${acc.handle}" target="_blank" rel="noopener">@${acc.handle}</a>
            ${role ? `<span class="xdf-role">${role}</span>` : ''}
          </div>
          <button class="xdf-remove" data-unfollow="${acc.handle}" title="Fjern fra feed"><i class="ph ph-x"></i></button>
        </div>
        <div class="xf-tweets">${tweetsHtml || '<p class="xf-no-tweets">Ingen nylige posts</p>'}</div>
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="xdf-wrap">
      <div class="xdf-toolbar">
        <span class="xdf-toolbar-count"><i class="ph ph-rss"></i> ${followed.length} konto${followed.length !== 1 ? 'er' : ''}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="xdf-curator-btn" id="xdf-curator-btn"><i class="ph ph-sliders-horizontal"></i> Tilpas feed</button>
          <button class="xdf-curator-btn" id="xdf-refresh-btn" title="Genindlæs feed"><i class="ph ph-arrows-clockwise"></i></button>
        </div>
      </div>
      <div class="xdf-curator" id="xdf-curator" hidden>
        <div class="xdf-curator-inner">${VG.xdeck._curatorHtml(followed)}</div>
      </div>
      <div class="xdf-feed" id="xdf-feed">${feedHtml || VG.xdeck._emptyHtml()}</div>
    </div>`;

  VG.xdeck._bindEvents(root, followed);
};

// ── Embed-widget render (no API token — uses Twitter's JS widget) ─────────────
VG.xdeck._renderHTML = function(root, followed) {
  followed = followed || VG.xdeck.getFollowed();
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const theme  = isDark ? 'dark' : 'light';

  const feedHtml = followed.length
    ? followed.map(h => {
        const acc  = XDECK_ACCOUNTS.find(a => a.handle === h);
        const name = acc ? acc.name : h;
        const role = acc ? acc.role : '';
        return `
          <div class="xdf-item">
            <div class="xdf-hd">
              <div class="xdf-av">${name[0].toUpperCase()}</div>
              <div class="xdf-meta">
                <span class="xdf-name">${name}</span>
                <a class="xdf-handle" href="https://x.com/${h}" target="_blank" rel="noopener">@${h}</a>
                ${role ? `<span class="xdf-role">${role}</span>` : ''}
              </div>
              <button class="xdf-remove" data-unfollow="${h}" title="Fjern fra feed"><i class="ph ph-x"></i></button>
            </div>
            <div class="xdf-embed">
              <a class="twitter-timeline"
                 data-tweet-limit="4"
                 data-chrome="noheader nofooter noborders transparent"
                 data-theme="${theme}"
                 data-dnt="true"
                 href="https://twitter.com/${h}">Indlæg fra @${h}</a>
            </div>
          </div>`;
      }).join('')
    : VG.xdeck._emptyHtml();

  root.innerHTML = `
    <div class="xdf-wrap">
      <div class="xdf-toolbar">
        <span class="xdf-toolbar-count"><i class="ph ph-rss"></i> ${followed.length} konto${followed.length !== 1 ? 'er' : ''}</span>
        <button class="xdf-curator-btn" id="xdf-curator-btn"><i class="ph ph-sliders-horizontal"></i> Tilpas feed</button>
      </div>
      <div class="xdf-curator" id="xdf-curator" hidden>
        <div class="xdf-curator-inner">${VG.xdeck._curatorHtml(followed)}</div>
      </div>
      <div class="xdf-feed" id="xdf-feed">${feedHtml}</div>
    </div>`;

  VG.xdeck._bindEvents(root, followed);
  VG.xdeck._loadWidgets();
};

// ── Shared helpers ────────────────────────────────────────────────────────────
VG.xdeck._curatorHtml = function(followed) {
  const cats = {};
  XDECK_ACCOUNTS.forEach(a => { (cats[a.cat] = cats[a.cat] || []).push(a); });
  return Object.entries(cats).map(([cat, list]) => `
    <div class="xdc-cat">
      <div class="xdc-cat-lbl">${cat}</div>
      <div class="xdc-cat-list">
        ${list.map(a => {
          const on = followed.includes(a.handle);
          return `
            <button class="xdc-acct${on ? ' on' : ''}" data-toggle="${a.handle}" title="${a.role}">
              <span class="xdc-av">${a.name[0]}</span>
              <span class="xdc-acct-name">${a.name}</span>
              <span class="xdc-check"><i class="ph ${on ? 'ph-check-circle' : 'ph-plus-circle'}"></i></span>
            </button>`;
        }).join('')}
      </div>
    </div>`).join('');
};

VG.xdeck._emptyHtml = function() {
  return `<div class="xdf-empty">
    <i class="ph ph-x-logo xdf-empty-icon"></i>
    <p>Dit X-feed er tomt. Klik <strong>Tilpas feed</strong> for at tilføje politikere, partier og medier.</p>
  </div>`;
};

VG.xdeck._bindEvents = function(root, followed) {
  const curatorBtn = root.querySelector('#xdf-curator-btn');
  const curator    = root.querySelector('#xdf-curator');
  if (curatorBtn && curator) {
    curatorBtn.onclick = () => {
      curator.hidden = !curator.hidden;
      curatorBtn.classList.toggle('active', !curator.hidden);
    };
  }
  const refreshBtn = root.querySelector('#xdf-refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = () => VG.xdeck._fetchAndRender(root, followed);
  }
  root.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => VG.xdeck.toggle(btn.dataset.toggle, root);
  });
  root.querySelectorAll('[data-unfollow]').forEach(btn => {
    btn.onclick = () => VG.xdeck.toggle(btn.dataset.unfollow, root);
  });
};

VG.xdeck.toggle = function(handle, root) {
  const f = VG.xdeck.getFollowed();
  const i = f.indexOf(handle);
  if (i === -1) f.push(handle); else f.splice(i, 1);
  VG.xdeck.setFollowed(f);
  const target = root || document.getElementById('dw-xdeck-body');
  if (target) VG.xdeck._fetchAndRender(target);
};

VG.xdeck._loadWidgets = function() {
  if (!document.getElementById('twitter-wjs')) {
    const s = document.createElement('script');
    s.id      = 'twitter-wjs';
    s.src     = 'https://platform.twitter.com/widgets.js';
    s.async   = true;
    s.charset = 'utf-8';
    s.onload  = () => window.twttr && window.twttr.widgets.load();
    document.head.appendChild(s);
  } else if (window.twttr && window.twttr.widgets) {
    window.twttr.widgets.load();
  }
};
