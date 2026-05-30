import { Router } from 'express';

const router = Router();

// The 5 main Danish airports — modeled daily operations.
const AIRPORTS = [
  { code: 'CPH', name: 'København Kastrup', city: 'Kastrup',  lat: 55.618, lon: 12.656, departures: 360, onTime: 82, delay: 14, route: 'CPH–LHR (London)' },
  { code: 'BLL', name: 'Billund Lufthavn',  city: 'Billund',  lat: 55.740, lon: 9.152,  departures: 78,  onTime: 88, delay: 9,  route: 'BLL–AMS (Amsterdam)' },
  { code: 'AAL', name: 'Aalborg Lufthavn',  city: 'Aalborg',  lat: 57.093, lon: 9.849,  departures: 44,  onTime: 86, delay: 11, route: 'AAL–CPH (København)' },
  { code: 'AAR', name: 'Aarhus Lufthavn',   city: 'Tirstrup', lat: 56.300, lon: 10.619, departures: 18,  onTime: 79, delay: 16, route: 'AAR–CPH (København)' },
  { code: 'EBJ', name: 'Esbjerg Lufthavn',  city: 'Esbjerg',  lat: 55.526, lon: 8.553,  departures: 8,   onTime: 91, delay: 7,  route: 'EBJ–ABZ (Aberdeen)' },
];

function onTimeColor(p) {
  return p >= 88 ? '#27ae60' : p >= 80 ? '#f39c12' : '#e74c3c';
}
function delayColor(m) {
  return m <= 9 ? '#27ae60' : m <= 14 ? '#f39c12' : '#e74c3c';
}

function aggregate() {
  const totalDep = AIRPORTS.reduce((a, b) => a + b.departures, 0);
  // Traffic-weighted national on-time %.
  const weightedOnTime = Math.round(
    AIRPORTS.reduce((a, b) => a + b.onTime * b.departures, 0) / totalDep
  );
  const mostDelayed = AIRPORTS.slice().sort((a, b) => b.delay - a.delay)[0];
  const busiest = AIRPORTS.slice().sort((a, b) => b.departures - a.departures)[0];
  return { totalDep, weightedOnTime, mostDelayed, busiest };
}

router.get('/', (req, res) => {
  const { totalDep, weightedOnTime, mostDelayed, busiest } = aggregate();
  const maxDep = Math.max(...AIRPORTS.map((a) => a.departures));
  const maxDelay = Math.max(...AIRPORTS.map((a) => a.delay));

  res.json({
    kpi: { big: String(weightedOnTime), unit: '% til tiden', color: onTimeColor(weightedOnTime) },
    meta: [
      { label: 'Afgange/dag', value: String(totalDep), color: '#3498db' },
      { label: 'Mest forsinket', value: mostDelayed.code + ' (' + mostDelayed.delay + ' min)', color: '#e74c3c' },
      { label: 'Travleste', value: busiest.code, color: '#9b59b6' },
      { label: 'Lufthavne', value: String(AIRPORTS.length), color: '#27ae60' },
    ],
    sections: [
      {
        title: 'Til tiden % pr. lufthavn',
        rows: AIRPORTS.slice()
          .sort((a, b) => b.onTime - a.onTime)
          .map((a) => ({
            label: a.code + ' ' + a.city, value: a.onTime, max: 100,
            color: onTimeColor(a.onTime), valueLabel: a.onTime + ' %',
          })),
      },
      {
        title: 'Gns. forsinkelse pr. lufthavn (min)',
        rows: AIRPORTS.slice()
          .sort((a, b) => b.delay - a.delay)
          .map((a) => ({
            label: a.code + ' ' + a.city, value: a.delay, max: maxDelay,
            color: delayColor(a.delay), valueLabel: a.delay + ' min',
          })),
      },
      {
        title: 'Afgange pr. dag',
        rows: AIRPORTS.slice()
          .sort((a, b) => b.departures - a.departures)
          .map((a) => ({
            label: a.code + ' ' + a.city, value: a.departures, max: maxDep,
            color: '#3498db', valueLabel: a.departures + ' afg.',
          })),
      },
    ],
    note: 'Eurocontrol · lufthavnsstatistik',
  });
});

router.get('/points', (req, res) => {
  const maxDep = Math.max(...AIRPORTS.map((a) => a.departures));
  const points = AIRPORTS.map((a) => {
    const c = a.onTime >= 88 ? [39, 174, 96] : a.onTime >= 80 ? [243, 156, 18] : [231, 76, 60];
    return {
      lat: a.lat, lon: a.lon,
      color: c,
      size: 8 + Math.round((a.departures / maxDep) * 26),
      kind: 'lufthavn',
      tip: {
        title: a.name + ' (' + a.code + ')',
        rows: [
          ['Afgange/dag', String(a.departures)],
          ['Til tiden', a.onTime + ' %'],
          ['Gns. forsinkelse', a.delay + ' min'],
          ['Travleste rute', a.route],
        ],
      },
    };
  });
  res.json({ points });
});

export default router;
