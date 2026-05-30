// ─────────────────────────────────────────────────────────────────────────
// tour.js — "Danmark på 2 minutter": a scrollytelling intro. As the user
// scrolls, short data-driven beats fade in one at a time, each pulling a real
// live figure and offering a jump into the relevant panel. Show the overview
// first, let people drill in when they want. Uses IntersectionObserver — no
// external scrollytelling library needed.
// ─────────────────────────────────────────────────────────────────────────
VG.tour = {};

VG.tour.BEATS = [
  { icon: '👥', link: 'demographics',
    title: () => { const p = VG.state.live?.population; return p ? `Vi er ${(p/1e6).toFixed(2)} millioner danskere` : 'Godt 6 millioner danskere'; },
    body: 'Befolkningen vokser langsomt og bliver ældre. Det presser pension, sundhed og ældrepleje i årene frem.' },
  { icon: '🏛', link: 'spending',
    title: () => { const b = VG.state.baseline; return b ? `Staten bruger ${(Object.values(b.expense).reduce((s,v)=>s+v.val,0)).toFixed(0)} mia. kr. om året` : 'Staten bruger over 1.200 mia. kr. om året'; },
    body: 'Pension, sundhed og uddannelse er de tre tungeste poster — tilsammen mere end halvdelen af budgettet.' },
  { icon: '💰', link: 'indkomst',
    title: () => { const b = VG.state.baseline; return b ? `Næsten halvdelen kommer fra din løn` : 'Skatten betaler det meste'; },
    body: 'Personlig indkomstskat og moms er statens to største indtægter. Resten kommer fra selskaber, afgifter og pensionsafkast.' },
  { icon: '📉', link: 'ledighed',
    title: () => { const u = VG.state.live?.unemployment; return u ? `Ledigheden er ${u.toFixed(1)}%` : 'Ledigheden er lav'; },
    body: 'Danmark har historisk lav ledighed — men store forskelle mellem kommunerne.' },
  { icon: '🌍', link: 'co2',
    title: () => 'Vi skal skære 70% af CO₂ inden 2030',
    body: 'Et af verdens mest ambitiøse klimamål. Grøn omstilling fylder mere og mere i budgettet.' },
  { icon: '🏛', link: 'minister',
    title: () => 'Nu er det din tur',
    body: 'Tror du, du kan styre statskassen bedre? Bliv finansminister, træk i håndtagene og se om dit budget holder.',
    cta: 'Bliv finansminister →' },
];

VG.tour.renderPanel = function () {
  const el = document.getElementById('panel-tour');
  if (!el) return;
  const beats = VG.tour.BEATS.map((b, i) => `
    <section class="tour-beat" data-tour-beat="${i}">
      <div class="tour-beat-inner">
        <div class="tour-icon">${b.icon}</div>
        <h2 class="tour-title">${b.title()}</h2>
        <p class="tour-body">${b.body}</p>
        <button class="btn ${b.cta ? 'primary' : ''} tour-jump" data-tour-link="${b.link}">${b.cta || 'Se mere →'}</button>
      </div>
    </section>`).join('');
  el.innerHTML = `
    <div class="tour-wrap">
      <div class="tour-intro">
        <div class="tour-kicker">DANMARK PÅ 2 MINUTTER</div>
        <p>Scroll ned ↓</p>
      </div>
      ${beats}
      <div class="tour-end"><p>Det var Danmark i tal. Dyk ned i resten via menuen til venstre.</p></div>
    </div>`;

  el.onclick = e => {
    const j = e.target.closest('[data-tour-link]');
    if (j && window.__mkClick) window.__mkClick(j.dataset.tourLink);
  };

  // reveal beats as they scroll into view
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('tour-in'); });
  }, { threshold: 0.4, root: el });
  el.querySelectorAll('.tour-beat').forEach(b => io.observe(b));
  VG.tour._io = io;
};
