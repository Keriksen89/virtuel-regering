// ─────────────────────────────────────────────────────────────────────────
// minkommune.js — "Din Kommune": enter your postnummer, see how your own
// municipality compares to the national average on the metrics we already
// have (ledighed, indkomst, boligpris, CO₂, erhverv, skat). Personalisation
// is the strongest retention lever for civic data — this is the entry point.
//
// Postnummer→kommune uses an ascending-breakpoint table: a code belongs to the
// last breakpoint whose start ≤ the code. Danish postal codes are roughly
// geographically ordered, so this resolves every 1000–9990 code to a kommune.
// Kommune names match the keys in VG.danmarkskort.kommuneData exactly.
// ─────────────────────────────────────────────────────────────────────────
VG.minkommune = {};

// [startPostnummer, kommuneNavn] — ascending. Covers the whole 1000–9990 range.
VG.minkommune.RANGES = [
  [1000,'København'], [1800,'Frederiksberg'], [2000,'Frederiksberg'],
  [2100,'København'], [2500,'København'], [2600,'Glostrup'], [2605,'Brøndby'],
  [2610,'Rødovre'], [2620,'Albertslund'], [2625,'Vallensbæk'], [2630,'Høje-Taastrup'],
  [2635,'Ishøj'], [2640,'Høje-Taastrup'], [2650,'Hvidovre'], [2660,'Brøndby'],
  [2665,'Vallensbæk'], [2670,'Greve'], [2680,'Solrød'], [2690,'Greve'],
  [2700,'København'], [2730,'Herlev'], [2740,'Ballerup'], [2765,'Egedal'],
  [2770,'Tårnby'], [2780,'Dragør'], [2800,'Lyngby-Taarbæk'], [2820,'Gentofte'],
  [2830,'Lyngby-Taarbæk'], [2840,'Rudersdal'], [2860,'Gladsaxe'], [2870,'Gentofte'],
  [2880,'Gladsaxe'], [2900,'Gentofte'], [2942,'Rudersdal'], [2960,'Hørsholm'],
  [2970,'Hørsholm'], [2980,'Fredensborg'],
  [3000,'Helsingør'], [3100,'Helsingør'], [3120,'Gribskov'], [3140,'Helsingør'],
  [3200,'Gribskov'], [3300,'Halsnæs'], [3320,'Hillerød'], [3360,'Halsnæs'],
  [3400,'Hillerød'], [3450,'Allerød'], [3460,'Rudersdal'], [3480,'Fredensborg'],
  [3490,'Helsingør'], [3500,'Furesø'], [3540,'Allerød'], [3550,'Frederikssund'],
  [3600,'Frederikssund'], [3650,'Egedal'], [3700,'Bornholm'], [3790,'Christiansø'],
  [4000,'Roskilde'], [4050,'Frederikssund'], [4060,'Lejre'], [4100,'Ringsted'],
  [4130,'Roskilde'], [4140,'Køge'], [4160,'Næstved'], [4180,'Sorø'],
  [4200,'Slagelse'], [4250,'Næstved'], [4261,'Slagelse'], [4262,'Næstved'],
  [4270,'Kalundborg'], [4291,'Sorø'], [4296,'Kalundborg'], [4300,'Holbæk'],
  [4320,'Lejre'], [4340,'Holbæk'], [4400,'Kalundborg'], [4420,'Holbæk'],
  [4460,'Kalundborg'], [4500,'Odsherred'], [4520,'Holbæk'], [4534,'Odsherred'],
  [4591,'Kalundborg'], [4600,'Køge'], [4621,'Roskilde'], [4622,'Solrød'],
  [4623,'Køge'], [4640,'Faxe'], [4652,'Stevns'], [4681,'Køge'],
  [4682,'Faxe'], [4684,'Næstved'], [4690,'Faxe'], [4700,'Næstved'],
  [4720,'Vordingborg'], [4733,'Næstved'], [4735,'Vordingborg'], [4736,'Næstved'],
  [4750,'Vordingborg'], [4800,'Guldborgsund'], [4895,'Lolland'], [4990,'Guldborgsund'],
  [4900,'Lolland'],
  [5000,'Odense'], [5290,'Kerteminde'], [5320,'Odense'], [5330,'Kerteminde'],
  [5400,'Nordfyns'], [5463,'Middelfart'], [5471,'Nordfyns'], [5491,'Odense'],
  [5492,'Assens'], [5500,'Middelfart'], [5540,'Nyborg'], [5550,'Kerteminde'],
  [5560,'Assens'], [5580,'Middelfart'], [5600,'Faaborg-Midtfyn'], [5610,'Assens'],
  [5642,'Faaborg-Midtfyn'], [5683,'Assens'], [5700,'Svendborg'], [5750,'Faaborg-Midtfyn'],
  [5762,'Svendborg'], [5772,'Faaborg-Midtfyn'], [5800,'Nyborg'], [5853,'Nyborg'],
  [5854,'Faaborg-Midtfyn'], [5874,'Svendborg'], [5900,'Langeland'], [5960,'Ærø'],
  [6000,'Kolding'], [6040,'Vejle'], [6051,'Kolding'], [6100,'Haderslev'],
  [6200,'Aabenraa'], [6240,'Tønder'], [6300,'Sønderborg'], [6330,'Aabenraa'],
  [6400,'Sønderborg'], [6500,'Haderslev'], [6520,'Tønder'], [6541,'Haderslev'],
  [6580,'Kolding'], [6600,'Vejen'], [6640,'Kolding'], [6650,'Vejen'],
  [6690,'Esbjerg'], [6700,'Esbjerg'], [6720,'Fanø'], [6731,'Esbjerg'],
  [6753,'Varde'], [6760,'Esbjerg'], [6780,'Tønder'], [6800,'Varde'],
  [6880,'Ringkøbing-Skjern'], [6933,'Herning'], [6940,'Ringkøbing-Skjern'],
  [6973,'Herning'], [6980,'Ringkøbing-Skjern'], [6990,'Holstebro'],
  [7000,'Fredericia'], [7080,'Vejle'], [7100,'Vejle'], [7130,'Hedensted'],
  [7182,'Vejle'], [7190,'Billund'], [7200,'Billund'], [7270,'Herning'],
  [7300,'Vejle'], [7330,'Ikast-Brande'], [7400,'Herning'], [7430,'Ikast-Brande'],
  [7451,'Herning'], [7470,'Viborg'], [7480,'Herning'], [7500,'Holstebro'],
  [7560,'Struer'], [7570,'Holstebro'], [7600,'Struer'], [7620,'Lemvig'],
  [7700,'Thisted'], [7790,'Struer'], [7800,'Skive'], [7830,'Holstebro'],
  [7840,'Skive'], [7850,'Viborg'], [7860,'Skive'], [7900,'Morsø'],
  [8000,'Århus'], [8300,'Odder'], [8305,'Samsø'], [8310,'Århus'],
  [8350,'Odder'], [8355,'Århus'], [8362,'Skanderborg'], [8370,'Favrskov'],
  [8380,'Århus'], [8382,'Favrskov'], [8400,'Syddjurs'], [8450,'Favrskov'],
  [8462,'Århus'], [8464,'Skanderborg'], [8471,'Århus'], [8472,'Favrskov'],
  [8500,'Norddjurs'], [8520,'Århus'], [8543,'Syddjurs'], [8570,'Norddjurs'],
  [8581,'Syddjurs'], [8585,'Norddjurs'], [8600,'Silkeborg'], [8660,'Skanderborg'],
  [8700,'Horsens'], [8721,'Hedensted'], [8732,'Horsens'], [8762,'Hedensted'],
  [8765,'Ikast-Brande'], [8781,'Vejle'], [8783,'Hedensted'], [8800,'Viborg'],
  [8860,'Favrskov'], [8870,'Randers'], [8881,'Favrskov'], [8882,'Silkeborg'],
  [8900,'Randers'], [8950,'Norddjurs'], [8970,'Randers'],
  [9000,'Aalborg'], [9300,'Frederikshavn'], [9310,'Aalborg'], [9320,'Brønderslev-Dronninglund'],
  [9352,'Frederikshavn'], [9362,'Aalborg'], [9440,'Jammerbugt'], [9480,'Hjørring'],
  [9490,'Jammerbugt'], [9500,'Mariagerfjord'], [9520,'Rebild'], [9550,'Mariagerfjord'],
  [9574,'Rebild'], [9600,'Vesthimmerland'], [9610,'Rebild'], [9620,'Vesthimmerland'],
  [9632,'Viborg'], [9640,'Vesthimmerland'], [9690,'Jammerbugt'], [9700,'Brønderslev-Dronninglund'],
  [9750,'Frederikshavn'], [9760,'Hjørring'], [9800,'Hjørring'], [9900,'Frederikshavn'],
  [9940,'Læsø'], [9970,'Frederikshavn'],
];

VG.minkommune.lookup = function (postnr) {
  const n = parseInt(postnr, 10);
  if (!(n >= 1000 && n <= 9999)) return null;
  let komm = null;
  for (const [from, k] of VG.minkommune.RANGES) {
    if (n >= from) komm = k; else break;
  }
  return komm;
};

// The metrics we compare on (matching keys in kommuneData)
VG.minkommune.METRICS = [
  { key: 'ledighed',  label: 'Ledighed',        icon: '📉', goodHigh: false, fmt: v => v.toFixed(1) + '%',         unit: '%' },
  { key: 'indkomst',  label: 'Median­indkomst',  icon: '💰', goodHigh: true,  fmt: v => (v/1000).toFixed(0) + '.000 kr', unit: 'kr/år' },
  { key: 'boligpris', label: 'Boligpris',       icon: '🏠', goodHigh: false, fmt: v => v.toLocaleString('da-DK') + ' kr/m²', unit: 'kr/m²' },
  { key: 'co2',       label: 'CO₂ pr. person',  icon: '🌿', goodHigh: false, fmt: v => v.toFixed(1) + ' t',        unit: 't/pers' },
  { key: 'erhverv',   label: 'Erhvervs­frekvens', icon: '📈', goodHigh: true,  fmt: v => v.toFixed(0) + '%',         unit: '%' },
  { key: 'skat',      label: 'Kommune­skat',     icon: '🏛', goodHigh: false, fmt: v => v.toFixed(1) + '%',         unit: '%' },
];

VG.minkommune._national = function (kd) {
  const keys = Object.keys(kd);
  const avg = {};
  VG.minkommune.METRICS.forEach(m => {
    avg[m.key] = keys.reduce((s, k) => s + (kd[k][m.key] || 0), 0) / keys.length;
  });
  return avg;
};

VG.minkommune._saved = function () {
  try { return localStorage.getItem('vg-postnr') || ''; } catch { return ''; }
};

VG.minkommune.submit = function (postnr) {
  const komm = VG.minkommune.lookup(postnr);
  if (!komm) { VG.toast('Indtast et gyldigt postnummer (1000–9990)'); return; }
  try { localStorage.setItem('vg-postnr', String(postnr)); } catch {}
  VG.minkommune._show(postnr, komm);
};

VG.minkommune.renderPanel = function () {
  const el = document.getElementById('panel-minkommune');
  if (!el) return;
  const saved = VG.minkommune._saved();
  el.innerHTML = `
  <div class="mk-wrap">
    <div class="card mk-hero">
      <h2>📍 Din Kommune</h2>
      <p class="intro">Indtast dit postnummer og se, hvordan netop din kommune klarer sig sammenlignet med resten af Danmark — på ledighed, indkomst, boligpriser, klima og mere.</p>
      <form class="mk-form" id="mk-form">
        <input type="text" inputmode="numeric" maxlength="4" id="mk-input" class="mk-input"
          placeholder="fx 2200" value="${saved}" aria-label="Postnummer">
        <button type="submit" class="btn primary">Vis min kommune</button>
      </form>
    </div>
    <div id="mk-result"></div>
  </div>`;
  const form = document.getElementById('mk-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    VG.minkommune.submit(document.getElementById('mk-input').value.trim());
  });
  if (saved) {
    const komm = VG.minkommune.lookup(saved);
    if (komm) VG.minkommune._show(saved, komm);
  }
};

VG.minkommune._show = function (postnr, komm) {
  const host = document.getElementById('mk-result');
  const kd = VG.danmarkskort && VG.danmarkskort.kommuneData;
  if (!host) return;
  if (!kd || !kd[komm]) {
    host.innerHTML = `<div class="card"><p>Fandt din kommune (<strong>${komm}</strong>), men der mangler data lige nu. Prøv igen senere.</p></div>`;
    return;
  }
  const nat = VG.minkommune._national(kd);
  const data = kd[komm];

  const rows = VG.minkommune.METRICS.map(m => {
    const v = data[m.key], n = nat[m.key];
    const diff = v - n;
    const better = m.goodHigh ? diff > 0 : diff < 0;
    const diffPct = n ? Math.abs(diff / n * 100) : 0;
    const cls = Math.abs(diffPct) < 2 ? 'mk-neutral' : (better ? 'mk-better' : 'mk-worse');
    const arrow = Math.abs(diffPct) < 2 ? '≈' : (diff > 0 ? '▲' : '▼');
    // bar widths relative to 1.5× national avg so differences are visible
    const scale = Math.max(v, n) * 1.25 || 1;
    return `<div class="mk-row">
      <div class="mk-row-head"><span>${m.icon} ${m.label}</span>
        <span class="mk-row-diff ${cls}">${arrow} ${diffPct.toFixed(0)}% ${better ? 'bedre' : (Math.abs(diffPct) < 2 ? '' : 'ringere')} end landsgns.</span></div>
      <div class="mk-bars">
        <div class="mk-bar-line"><span class="mk-bar-lbl">${komm}</span>
          <div class="mk-bar"><div class="mk-bar-fill ${cls}" style="width:${Math.min(100, v/scale*100)}%"></div></div>
          <span class="mk-bar-val">${m.fmt(v)}</span></div>
        <div class="mk-bar-line"><span class="mk-bar-lbl mk-dim">Danmark</span>
          <div class="mk-bar"><div class="mk-bar-fill mk-bar-nat" style="width:${Math.min(100, n/scale*100)}%"></div></div>
          <span class="mk-bar-val mk-dim">${m.fmt(n)}</span></div>
      </div>
    </div>`;
  }).join('');

  host.innerHTML = `
    <div class="card mk-komm-card">
      <div class="mk-komm-head">
        <div><div class="mk-komm-name">${komm}</div><div class="mk-dim">Postnummer ${postnr}</div></div>
        <button class="btn mk-map-btn" id="mk-to-map">🗺 Se på kortet</button>
      </div>
      <div class="mk-rows">${rows}</div>
      <p class="mk-disclaimer">Kommunetal er kalibreret på DST-data (ledighed, indkomst, boligpriser) og kommunale skatteprocenter 2025. Sammenligning mod simpelt gennemsnit af alle 98 kommuner.</p>
    </div>`;
  document.getElementById('mk-to-map')?.addEventListener('click', () => {
    if (window.__mkClick) window.__mkClick('danmarkskort');
  });
};
