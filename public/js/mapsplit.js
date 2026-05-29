// Map-split coordinator: shows the globe side-by-side with data panels
// that have geographic context. Observes active panel changes and toggles
// .map-split-active on panels-main, then syncs the map view/metric.
(function () {
  const MAP_AFFINITY = {
    ledighed:     { view: 'kommuner',     metric: 'ledighed' },
    indkomst:     { view: 'kommuner',     metric: 'indkomst' },
    boligmarked:  { view: 'kommuner',     metric: 'boligpris' },
    demographics: { view: 'kommuner',     metric: 'befolkning' },
    co2:          { view: 'kommuner',     metric: 'co2' },
    laboratorium: { view: 'kommuner',     metric: 'skat' },
    kommuner:     { view: 'kommuner',     metric: 'ledighed' },
    energi:       { view: 'infrastruktur', metric: null },
    naturvand:    { view: 'infrastruktur', metric: null },
    dsb:          { view: 'infrastruktur', metric: null },
  };

  function applyMapSplit(panelId) {
    const panelsMain = document.getElementById('panels-main');
    if (!panelsMain) return;

    const affinity = MAP_AFFINITY[panelId];

    if (affinity) {
      panelsMain.classList.add('map-split-active');
      document.body.classList.remove('dk-immersive');

      const mapPanel = document.getElementById('panel-danmarkskort');
      if (mapPanel && window.VG && VG.danmarkskort) {
        VG.danmarkskort.render(mapPanel);
        if (typeof VG.danmarkskort.setContextView === 'function') {
          VG.danmarkskort.setContextView(affinity.view, affinity.metric);
        }
      }
    } else {
      panelsMain.classList.remove('map-split-active');
    }
  }

  function watchPanels() {
    const panelsMain = document.getElementById('panels-main');
    if (!panelsMain) { setTimeout(watchPanels, 200); return; }

    const observer = new MutationObserver(() => {
      const active = panelsMain.querySelector('.panel.active');
      if (active) applyMapSplit(active.id.replace(/^panel-/, ''));
    });
    observer.observe(panelsMain, { attributes: true, subtree: true, attributeFilter: ['class'] });

    const initial = panelsMain.querySelector('.panel.active');
    if (initial) applyMapSplit(initial.id.replace(/^panel-/, ''));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPanels);
  } else {
    watchPanels();
  }
})();
