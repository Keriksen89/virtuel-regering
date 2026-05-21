VG.party = {};

VG.party.state = {
  proposals: [],
  voted: {},
  loading: false,
  lastUpdated: null,
  pollTimer: null
};

VG.party.init = function() {
  try {
    const raw = localStorage.getItem('vg-party-voted');
    if (raw) VG.party.state.voted = JSON.parse(raw);
  } catch {}
};

VG.party.saveVoted = function() {
  try { localStorage.setItem('vg-party-voted', JSON.stringify(VG.party.state.voted)); } catch {}
};

VG.party.load = async function() {
  try {
    const data = await VG.api.fetchJSON('/api/party/proposals');
    if (data && data.proposals) {
      VG.party.state.proposals = data.proposals;
      VG.party.state.lastUpdated = new Date();
      if (VG.state.activeTab === 'party') {
        VG.party.renderPanel();
      }
    }
  } catch (err) {
    console.warn('[party] Could not load proposals:', err.message);
  }
};

VG.party.vote = async function(proposalId, option) {
  if (VG.party.state.voted[proposalId]) return;

  try {
    const data = await VG.api.fetchJSON('/api/party/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposalId, option })
    });

    if (data && data.ok) {
      VG.party.state.voted[proposalId] = option;
      VG.party.saveVoted();

      const p = VG.party.state.proposals.find(x => x.id === proposalId);
      if (p) p.votes = data.votes;

      VG.party.renderPanel();
      VG.toast('Din stemme er registreret!');
    }
  } catch (err) {
    VG.toast('Kunne ikke registrere stemme. Prøv igen.');
    console.warn('[party] Vote error:', err.message);
  }
};

VG.party.startPolling = function() {
  if (VG.party.state.pollTimer) clearInterval(VG.party.state.pollTimer);
  VG.party.state.pollTimer = setInterval(() => {
    VG.party.load();
  }, 30000);
};

VG.party.renderPanel = function() {
  const el = document.getElementById('panel-party');
  if (!el) return;
  el.innerHTML = VG.party.buildHTML();
  VG.party.bindVoteButtons();
};

VG.party.buildHTML = function() {
  const proposals = VG.party.state.proposals;
  if (!proposals.length) {
    return `<div class="card"><h2>VirtuelPartiet — Borgernes Parti</h2><div class="loading">Henter forslag...</div></div>`;
  }

  const totalVotes = proposals.reduce((s, p) => s + (p.votes ? p.votes.ja + p.votes.nej : 0), 0);

  const adoptedCount = proposals.filter(p => {
    const v = p.votes || { ja: 0, nej: 0 };
    return v.ja + v.nej > 0 && v.ja > v.nej;
  }).length;

  const budgetImpact = proposals.reduce((s, p) => {
    const v = p.votes || { ja: 0, nej: 0 };
    if (v.ja + v.nej > 0 && v.ja > v.nej) return s + p.budgetImpact.value;
    return s;
  }, 0);

  const lastUpd = VG.party.state.lastUpdated
    ? VG.party.state.lastUpdated.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const categories = [...new Set(proposals.map(p => p.category))];

  let html = `
    <div class="party-hero">
      <div class="party-hero-text">
        <h2>VirtuelPartiet</h2>
        <p>Et demokratisk eksperiment: borgerne bestemmer hvad partiet mener — i realtid, ikke kun hvert 4. år. Stem på forslagene nedenfor og form partiets politik.</p>
      </div>
      <div class="party-stats">
        <div class="party-stat"><div class="party-stat-num">${totalVotes.toLocaleString('da-DK')}</div><div class="party-stat-label">stemmer afgivet</div></div>
        <div class="party-stat"><div class="party-stat-num">${adoptedCount}/${proposals.length}</div><div class="party-stat-label">forslag vedtaget</div></div>
        <div class="party-stat"><div class="party-stat-num ${budgetImpact > 0 ? 'impact-pos' : 'impact-neg'}">${budgetImpact > 0 ? '+' : ''}${budgetImpact} mia</div><div class="party-stat-label">budgeteffekt</div></div>
        <div class="party-stat"><div class="party-stat-num party-stat-time">${lastUpd}</div><div class="party-stat-label">sidst opdateret</div></div>
      </div>
    </div>

    <div class="party-platform-banner">
      <strong>Nuværende platform:</strong> ${adoptedCount === 0 ? 'Ingen forslag vedtaget endnu — stem for at forme partiet.' : `Borgerne har vedtaget ${adoptedCount} forslag med en samlet budgeteffekt på ${budgetImpact > 0 ? '+' : ''}${budgetImpact} mia kr/år.`}
    </div>`;

  for (const cat of categories) {
    const catProposals = proposals.filter(p => p.category === cat);
    html += `<div class="party-category">
      <div class="party-category-title">${VG.party.categoryIcon(cat)} ${cat}</div>
      <div class="party-proposals">`;

    for (const p of catProposals) {
      html += VG.party.renderProposal(p);
    }

    html += `</div></div>`;
  }

  html += `<p class="party-disclaimer">Stemmer er anonyme og baseret på IP-adresse pr. session. Formålet er demokratisk eksperiment, ikke bindende afstemning. Budgeteffekter er estimater.</p>`;

  return html;
};

VG.party.categoryIcon = function(cat) {
  const icons = { Skat: '💰', Velfærd: '🤝', Klima: '🌍', Forsvar: '🛡', Immigration: '🌐', Bolig: '🏠', Sundhed: '❤️' };
  return icons[cat] || '📋';
};

VG.party.renderProposal = function(p) {
  const v = p.votes || { ja: 0, nej: 0 };
  const total = v.ja + v.nej;
  const jaPct = total > 0 ? Math.round(v.ja / total * 100) : 50;
  const nejPct = 100 - jaPct;
  const voted = VG.party.state.voted[p.id];
  const hasVoted = !!voted;
  const position = total === 0 ? null : (v.ja > v.nej ? 'ja' : 'nej');
  const posClass = position === 'ja' ? 'proposal-adopted' : position === 'nej' ? 'proposal-rejected' : '';
  const impactSign = p.budgetImpact.value > 0 ? '+' : '';
  const impactColor = p.budgetImpact.value > 0 ? 'var(--pos)' : p.budgetImpact.value < 0 ? 'var(--neg)' : 'var(--text-2)';

  return `<div class="proposal-card ${posClass}" data-proposal="${p.id}">
    <div class="proposal-head">
      <div class="proposal-title">${p.title}</div>
      ${position ? `<span class="proposal-badge ${position === 'ja' ? 'badge-ja' : 'badge-nej'}">${position === 'ja' ? '✓ Vedtaget' : '✗ Afvist'}</span>` : ''}
    </div>
    <p class="proposal-desc">${p.description}</p>
    <div class="proposal-impact" style="color:${impactColor}">Budgeteffekt: ${impactSign}${p.budgetImpact.value} mia — ${p.budgetImpact.description}</div>

    <div class="vote-bar-wrap">
      <div class="vote-bar-track">
        <div class="vote-bar-fill vote-bar-ja" style="width:${total > 0 ? jaPct : 50}%"></div>
      </div>
      <div class="vote-bar-labels">
        <span class="vote-bar-label-ja">Ja ${total > 0 ? jaPct + '%' : '—'}</span>
        <span class="vote-bar-label-count">${total.toLocaleString('da-DK')} stemmer</span>
        <span class="vote-bar-label-nej">Nej ${total > 0 ? nejPct + '%' : '—'}</span>
      </div>
    </div>

    ${hasVoted
      ? `<div class="voted-indicator">Du stemte: <strong>${voted === 'ja' ? 'Ja' : 'Nej'}</strong></div>`
      : `<div class="vote-buttons">
          <button class="vote-btn vote-btn-ja" data-proposal="${p.id}" data-option="ja">👍 Ja</button>
          <button class="vote-btn vote-btn-nej" data-proposal="${p.id}" data-option="nej">👎 Nej</button>
        </div>`
    }
  </div>`;
};

VG.party.bindVoteButtons = function() {
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.proposal;
      const option = btn.dataset.option;
      VG.party.vote(id, option);
    });
  });
};
