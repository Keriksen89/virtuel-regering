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
  VG.xdeck._render(container);
};

// ── Render using X's own embed widgets (zero server cost) ────────────────────
// Tweets load in the user's own browser context via platform.twitter.com.
// If the visitor is logged in to X they get the full experience; if not,
// X shows public posts and a prompt to log in — all handled by X, not us.
VG.xdeck._render = function(root) {
  const followed = VG.xdeck.getFollowed();
  const isDark   = document.documentElement.getAttribute('data-theme') !== 'light';
  const theme    = isDark ? 'dark' : 'light';

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
    : `<div class="xdf-empty">
        <i class="ph ph-x-logo xdf-empty-icon"></i>
        <p>Dit X-feed er tomt. Klik <strong>Tilpas feed</strong> for at tilføje politikere, partier og medier.</p>
       </div>`;

  root.innerHTML = `
    <div class="xdf-wrap">
      <div class="xdf-toolbar">
        <span class="xdf-toolbar-count"><i class="ph ph-rss"></i> ${followed.length} konto${followed.length !== 1 ? 'er' : ''}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <a class="xdf-login-btn" href="https://x.com/login" target="_blank" rel="noopener"
             title="Log ind på X for at se alle indlæg">
            <i class="ph ph-x-logo"></i> Log ind på X
          </a>
          <button class="xdf-curator-btn" id="xdf-curator-btn"><i class="ph ph-sliders-horizontal"></i> Tilpas feed</button>
        </div>
      </div>
      <div class="xdf-notice">
        <i class="ph ph-info"></i>
        Indlæg vises via X's egne indlejrede widgets — indlæses direkte i din browser.
        <a href="https://x.com/login" target="_blank" rel="noopener">Log ind på X</a> for den fulde oplevelse.
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

VG.xdeck._bindEvents = function(root, followed) {
  const curatorBtn = root.querySelector('#xdf-curator-btn');
  const curator    = root.querySelector('#xdf-curator');
  if (curatorBtn && curator) {
    curatorBtn.onclick = () => {
      curator.hidden = !curator.hidden;
      curatorBtn.classList.toggle('active', !curator.hidden);
    };
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
  if (target) VG.xdeck._render(target);
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
