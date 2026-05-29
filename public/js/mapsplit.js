// Map-split coordinator: shows the globe side-by-side with data panels
// that have geographic context. Watches which panel is active and toggles
// .map-split-active on panels-main, then syncs the map view/metric.
//
// IMPORTANT: we observe each .panel's own `class` attribute (NOT the whole
// subtree). applyMapSplit() mutates classes inside the tree (and calls
// setContextView, which toggles button classes), so a subtree observer would
// re-fire on its own mutations and loop forever. The `_applying` guard plus
// dedupe-by-id are belt-and-suspenders on top of the narrow observation.
(function () {
  const MAP_AFFINITY = {
    ledighed:     { view: 'kommuner',      metric: 'ledighed' },
    indkomst:     { view: 'kommuner',      metric: 'indkomst' },
    boligmarked:  { view: 'kommuner',      metric: 'boligpris' },
    demographics: { view: 'kommuner',      metric: 'befolkning' },
    co2:          { view: 'kommuner',      metric: 'co2' },
    laboratorium: { view: 'kommuner',      metric: 'skat' },
    kommuner:     { view: 'kommuner',      metric: 'ledighed' },
    energi:       { view: 'infrastruktur', metric: null },
    naturvand:    { view: 'infrastruktur', metric: null },
    dsb:          { view: 'infrastruktur', metric: null },
  };

  let _lastId = null;
  let _applying = false;

  function activePanelId() {
    const a = document.querySelector('#panels-main .panel.active');
    return a ? a.id.replace(/^panel-/, '') : null;
  }

  function applyMapSplit(panelId) {
    const panelsMain = document.getElementById('panels-main');
    if (!panelsMain) return;
    _applying = true;
    try {
      const affinity = MAP_AFFINITY[panelId];
      if (affinity) {
        panelsMain.classList.add('map-split-active');
        document.body.classList.remove('dk-immersive');
        const mapPanel = document.getElementById('panel-danmarkskort');
        if (mapPanel && window.VG && window.VG.danmarkskort) {
          try {
            window.VG.danmarkskort.render(mapPanel);
            if (typeof window.VG.danmarkskort.setContextView === 'function') {
              window.VG.danmarkskort.setContextView(affinity.view, affinity.metric);
            }
          } catch (e) { /* map is non-critical — never block the panel */ }
        }
      } else {
        panelsMain.classList.remove('map-split-active');
      }
    } finally {
      _applying = false;
    }
  }

  function check() {
    if (_applying) return;
    const id = activePanelId();
    if (id === _lastId) return;   // only react to real panel changes
    _lastId = id;
    if (id) applyMapSplit(id);
  }

  function watchPanels() {
    const panelsMain = document.getElementById('panels-main');
    if (!panelsMain) { setTimeout(watchPanels, 200); return; }

    const panelObserver = new MutationObserver(check);
    const observePanel = (p) => {
      if (p.nodeType === 1 && p.classList && p.classList.contains('panel')) {
        panelObserver.observe(p, { attributes: true, attributeFilter: ['class'] });
      }
    };
    panelsMain.querySelectorAll('.panel').forEach(observePanel);

    // Panels can be created lazily — observe new ones as they appear.
    new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes && m.addedNodes.forEach(observePanel);
      }
      check();
    }).observe(panelsMain, { childList: true });

    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPanels);
  } else {
    watchPanels();
  }
})();
