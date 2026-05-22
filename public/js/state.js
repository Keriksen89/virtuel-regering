window.VG = window.VG || {};

VG.state = {
  baseline: null,
  current: null,
  activeTab: 'overview',
  live: {
    population: null,
    gdp: null,
    unemployment: null,
    votes: [],
    parties: []
  },
  status: 'loading',
  manualAdj: { expense: {}, revenue: {} }
};

VG.fmt = function(n) {
  const r = Math.round(n * 10) / 10;
  return r.toLocaleString('da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' mia';
};

VG.fmtSigned = function(n) {
  return (n > 0 ? '+' : '') + VG.fmt(n);
};

VG.ppct = function(n) {
  return (Math.round(n * 10) / 10).toFixed(1) + '%';
};

VG.sumExp = function() {
  return Object.values(VG.state.current.expense).reduce((s, v) => s + v.val, 0);
};

VG.sumRev = function() {
  return Object.values(VG.state.current.revenue).reduce((s, v) => s + v.val, 0);
};

VG.baseExp = function() {
  return Object.values(VG.state.baseline.expense).reduce((s, v) => s + v.val, 0);
};

VG.baseRev = function() {
  return Object.values(VG.state.baseline.revenue).reduce((s, v) => s + v.val, 0);
};

VG.applyPolicy = function() {
  const s = VG.state.current;
  const b = VG.state.baseline;
  for (const k in s.expense) s.expense[k].val = b.expense[k].val;
  for (const k in s.revenue) s.revenue[k].val = b.revenue[k].val;
  for (const pk in s.policy) {
    const p = s.policy[pk];
    const bp = b.policy[pk];
    const diff = p.val - bp.val;
    const impact = diff * p.elasticity;
    const bucket = p.direction === 'revenue' ? s.revenue : s.expense;
    if (bucket[p.target]) {
      bucket[p.target].val = Math.max(0, bucket[p.target].val + impact);
    }
  }
  // Manual direct-slider overrides win over policy calculations
  const adj = VG.state.manualAdj;
  for (const k in adj.expense) if (s.expense[k]) s.expense[k].val = adj.expense[k];
  for (const k in adj.revenue) if (s.revenue[k]) s.revenue[k].val = adj.revenue[k];
};

VG.deepClone = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

VG.reset = function() {
  VG.state.current = VG.deepClone(VG.state.baseline);
  VG.state.manualAdj = { expense: {}, revenue: {} };
};

VG.getChanges = function() {
  const changes = [];
  const s = VG.state.current;
  const b = VG.state.baseline;
  if (!s || !b) return changes;
  for (const k in s.policy) {
    if (Math.abs(s.policy[k].val - b.policy[k].val) > 0.01) {
      changes.push({
        type: 'policy', key: k,
        name: s.policy[k].name,
        from: b.policy[k].val + ' ' + s.policy[k].unit,
        to: s.policy[k].val + ' ' + s.policy[k].unit
      });
    }
  }
  for (const k in s.expense) {
    if (Math.abs(s.expense[k].val - b.expense[k].val) > 0.5) {
      changes.push({
        type: 'expense', key: k,
        name: s.expense[k].name,
        from: b.expense[k].val.toFixed(0) + ' mia',
        to: s.expense[k].val.toFixed(0) + ' mia',
        delta: s.expense[k].val - b.expense[k].val
      });
    }
  }
  for (const k in s.revenue) {
    if (Math.abs(s.revenue[k].val - b.revenue[k].val) > 0.5) {
      changes.push({
        type: 'revenue', key: k,
        name: s.revenue[k].name,
        from: b.revenue[k].val.toFixed(0) + ' mia',
        to: s.revenue[k].val.toFixed(0) + ' mia',
        delta: s.revenue[k].val - b.revenue[k].val
      });
    }
  }
  return changes;
};
