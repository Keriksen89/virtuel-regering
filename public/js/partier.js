/* ── VG.partier ──────────────────────────────────────────────────────────── */
VG.partier = {};

VG.partier.renderPanel = function() {
  const panel = document.getElementById('panel-partier');
  if (!panel) return;
  panel.innerHTML = VG.partier.buildHTML();
};

VG.partier.calcMatch = function(party) {
  const score = VG.platform.getScore();
  if (!score || score.answered === 0) return null;
  const userE = score.e;
  const userS = score.s;
  const dist = Math.sqrt(Math.pow(userE - party.e, 2) + Math.pow(userS - party.s, 2));
  const maxDist = Math.sqrt(Math.pow(20, 2) + Math.pow(20, 2)); // 28.28
  return Math.max(0, 100 - (dist / maxDist) * 100);
};

VG.partier.stanceLabel = function(stance) {
  const labels = {
    'far-left':    'Langt til venstre',
    'left':        'Venstre',
    'center-left': 'Centrum-venstre',
    'center':      'Centrum',
    'center-right':'Centrum-højre',
    'right':       'Højre',
    'far-right':   'Langt til højre'
  };
  return labels[stance] || stance;
};

VG.partier.stancePillClass = function(stance) {
  if (stance === 'far-left' || stance === 'left') return 'left';
  if (stance === 'far-right' || stance === 'right') return 'right';
  if (stance === 'center-left') return 'left';
  if (stance === 'center-right') return 'right';
  if (stance === 'green') return 'green';
  return '';
};

VG.partier.buildHTML = function() {
  if (!VG.regering || !VG.regering.data) {
    return '<div class="card"><p style="color:var(--text-2)">Indlæser partidata…</p></div>';
  }

  const { partyProfiles } = VG.regering.data;
  const compassParties = VG.platform.PARTIES; // [{abbr, name, e, s, color}]

  // Build compass map abbr → {e, s}
  const compassMap = {};
  compassParties.forEach(p => { compassMap[p.abbr] = { e: p.e, s: p.s, color: p.color }; });

  const score = VG.platform.getScore();
  const hasAnswers = score && score.answered > 0;

  // Merge profiles with compass data and calculate match
  const profiles = partyProfiles.map(pp => {
    const compass = compassMap[pp.abbr] || {};
    const matchPct = hasAnswers && compass.e !== undefined
      ? VG.partier.calcMatch({ e: compass.e, s: compass.s })
      : null;
    return { ...pp, e: compass.e, s: compass.s, matchPct };
  });

  // Sort by match score (desc) if we have answers, otherwise by seat count / name
  if (hasAnswers) {
    profiles.sort((a, b) => (b.matchPct || 0) - (a.matchPct || 0));
  }

  const issues = ['tax', 'welfare', 'climate', 'immigration', 'defense', 'pension'];

  let noAnswerBanner = '';
  if (!hasAnswers) {
    noAnswerBanner = `<div style="background:var(--surface-2);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--text-2)">
      ℹ️ Tag stilling til positioner i <strong>⭐ Mit Parti</strong> for at se din match-score med de danske partier.
    </div>`;
  }

  let cardsHTML = '<div class="party-match-list">';
  profiles.forEach((pp, idx) => {
    const isTop = hasAnswers && idx === 0;
    const matchBar = pp.matchPct !== null
      ? `<div class="match-bar-wrap">
          <div class="match-bar-track"><div class="match-bar-fill" style="width:${pp.matchPct.toFixed(1)}%"></div></div>
          <span class="match-pct">${pp.matchPct.toFixed(0)}%</span>
        </div>`
      : '';

    let pillsHTML = '<div class="issue-pills">';
    issues.forEach(issue => {
      if (pp.keyIssues && pp.keyIssues[issue]) {
        const { label, stance } = pp.keyIssues[issue];
        const cls = VG.partier.stancePillClass(stance);
        pillsHTML += `<span class="issue-pill ${cls}" title="${VG.partier.stanceLabel(stance)}">${label}: ${VG.partier.stanceLabel(stance)}</span>`;
      }
    });
    pillsHTML += '</div>';

    const color = pp.color || compassMap[pp.abbr]?.color || '#888';
    cardsHTML += `<div class="party-match-card${isTop ? ' top-match' : ''}" style="border-left-color:${color}">
      <div class="party-match-head">
        <div class="party-abbr-badge" style="background:${color}">${pp.abbr}</div>
        <div>
          <div class="party-match-name">${pp.name}</div>
          <div class="party-match-leader">${pp.leader || ''} ${pp.tagline ? '· ' + pp.tagline : ''}</div>
        </div>
        ${isTop ? '<span style="margin-left:auto;font-size:11px;color:var(--accent);font-weight:600">Bedste match ★</span>' : ''}
      </div>
      ${matchBar}
      ${pillsHTML}
    </div>`;
  });
  cardsHTML += '</div>';

  return `
<div class="card">
  <h2>📊 Partier & Match-score</h2>
  <p style="font-size:13px;color:var(--text-2);margin-top:4px">
    Sammenlign de 11 partiers holdninger til centrale politiske emner.
    ${hasAnswers ? `Din politiske profil er baseret på <strong>${score.answered}</strong> besvarede spørgsmål.` : ''}
  </p>
  <div style="margin-top:16px">
    ${noAnswerBanner}
    ${cardsHTML}
  </div>
  <p style="font-size:11px;color:var(--text-3);margin-top:12px">Match-score beregnes som euklidisk afstand på det politiske kompas (økonomi × social-akse). Partipositioner er illustrative.</p>
</div>`;
};
