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
  { handle: 'inger_stoejberg',  name: 'Inger Støjberg',          role: 'Leder (Danmarksdemokraterne)',   cat: 'Politikere' },
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
  { handle: 'hannaheandersen',  name: 'Hannah Engelby Andersen', role: 'Politisk kommentator, TV2',     cat: 'Kommentatorer' },
  // Tænketanke & økonomi
  { handle: 'CEPOS_dk',        name: 'CEPOS',                   role: 'Liberal tænketank',             cat: 'Tænketanke' },
  { handle: 'AERaadet',        name: 'AE-rådet',                role: 'Arbejderbevægelsens Erhvervsråd', cat: 'Tænketanke' },
  { handle: 'DreamGruppen',    name: 'DREAM',                   role: 'Makroøkonomisk modelgruppe',    cat: 'Tænketanke' },
  { handle: 'finansmin',       name: 'Finansministeriet',       role: 'Statens finanser',              cat: 'Tænketanke' },
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

VG.xdeck.load = function() {
  // Unused standalone panel — deck lives inside the dashboard widget
};

// Primary render target is any container element (used by dashboard widget)
VG.xdeck.renderInto = function(container) {
  if (!container) return;
  VG.xdeck._renderHTML(container);
};

VG.xdeck._renderHTML = function(root) {
  const followed = VG.xdeck.getFollowed();
  const isDark   = document.documentElement.getAttribute('data-theme') === 'dark';

  // Sidebar — accounts grouped by category
  const cats = {};
  XDECK_ACCOUNTS.forEach(a => { (cats[a.cat] = cats[a.cat] || []).push(a); });

  const sidebar = Object.entries(cats).map(([cat, list]) => `
    <div class="xd-cat">
      <div class="xd-cat-lbl">${cat}</div>
      ${list.map(a => {
        const on = followed.includes(a.handle);
        return `<div class="xd-acct${on ? ' on' : ''}" data-handle="${a.handle}">
          <div class="xd-avatar">${a.handle[0].toUpperCase()}</div>
          <div class="xd-acct-info">
            <div class="xd-acct-name">${a.name}</div>
            <div class="xd-acct-role">${a.role}</div>
          </div>
          <button class="xd-follow${on ? ' on' : ''}" data-toggle="${a.handle}">${on ? '✓' : '+'}</button>
        </div>`;
      }).join('')}
    </div>`).join('');

  // Deck columns
  const deck = followed.length ? followed.map(h => {
    const acc = XDECK_ACCOUNTS.find(a => a.handle === h);
    const name = acc ? acc.name : h;
    return `
      <div class="xd-col" id="xdeck-col-${h}">
        <div class="xd-col-hd">
          <div>
            <div class="xd-col-name">${name}</div>
            <a class="xd-col-handle" href="https://x.com/${h}" target="_blank" rel="noopener">@${h}</a>
          </div>
          <button class="xd-col-close" data-unfollow="${h}" title="Fjern kolonne">×</button>
        </div>
        <div class="xd-embed-wrap">
          <a class="twitter-timeline"
             data-height="560"
             data-chrome="noheader nofooter noborders transparent"
             data-theme="${isDark ? 'dark' : 'light'}"
             href="https://twitter.com/${h}">Tweets by @${h}</a>
        </div>
      </div>`;
  }).join('') : `
    <div class="xd-empty">
      <div class="xd-empty-icon">📱</div>
      <p>Vælg konti at følge i panelet til venstre — deres indlæg vises her som kolonner.</p>
    </div>`;

  root.innerHTML = `
    <div class="xd-layout">
      <div class="xd-sidebar">
        <div class="xd-sidebar-hd">Hvem vil du følge?</div>
        <div class="xd-sidebar-scroll">${sidebar}</div>
      </div>
      <div class="xd-deck">${deck}</div>
    </div>`;

  // Bind follow/unfollow — re-renders just this widget section
  root.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.onclick = () => { VG.xdeck.toggle(btn.dataset.toggle); };
  });
  root.querySelectorAll('[data-unfollow]').forEach(btn => {
    btn.onclick = () => { VG.xdeck.toggle(btn.dataset.unfollow); };
  });

  // Load Twitter widget script (once per page load)
  VG.xdeck._loadWidgets();
};

// toggle re-renders only the xdeck widget body, not the full dashboard
VG.xdeck.toggle = function(handle) {
  const f = VG.xdeck.getFollowed();
  const i = f.indexOf(handle);
  if (i === -1) f.push(handle); else f.splice(i, 1);
  VG.xdeck.setFollowed(f);
  // Re-render into existing body if it exists, otherwise full dashboard repaint
  const body = document.getElementById('dw-wide-body-xdeck');
  if (body) VG.xdeck._renderHTML(body);
};

VG.xdeck._loadWidgets = function() {
  if (!document.getElementById('twitter-wjs')) {
    const s = document.createElement('script');
    s.id = 'twitter-wjs';
    s.src = 'https://platform.twitter.com/widgets.js';
    s.async = true;
    s.charset = 'utf-8';
    s.onload = () => window.twttr && window.twttr.widgets.load();
    document.head.appendChild(s);
  } else if (window.twttr && window.twttr.widgets) {
    window.twttr.widgets.load();
  }
};
