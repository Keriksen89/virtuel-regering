VG.share = {};

VG.share.encode = function() {
  if (!VG.state.current || !VG.state.baseline) return '';
  const diffs = {};
  const s = VG.state.current, b = VG.state.baseline;
  for (const k in s.policy) {
    if (Math.abs(s.policy[k].val - b.policy[k].val) > 0.001) {
      diffs['p_' + k] = s.policy[k].val;
    }
  }
  for (const k in s.expense) {
    if (Math.abs(s.expense[k].val - b.expense[k].val) > 0.1) {
      diffs['e_' + k] = Math.round(s.expense[k].val * 10) / 10;
    }
  }
  for (const k in s.revenue) {
    if (Math.abs(s.revenue[k].val - b.revenue[k].val) > 0.1) {
      diffs['r_' + k] = Math.round(s.revenue[k].val * 10) / 10;
    }
  }
  if (!Object.keys(diffs).length) return '';
  try {
    const json = JSON.stringify(diffs);
    const compact = btoa(unescape(encodeURIComponent(json)));
    return compact;
  } catch {
    return '';
  }
};

VG.share.decode = function(str) {
  try {
    const json = decodeURIComponent(escape(atob(str)));
    return JSON.parse(json);
  } catch {
    return null;
  }
};

VG.share.applyFromURL = function() {
  const params = new URLSearchParams(window.location.search);
  const b = params.get('b');
  if (!b) return false;
  const diffs = VG.share.decode(b);
  if (!diffs) return false;
  for (const key in diffs) {
    const val = diffs[key];
    if (key.startsWith('p_')) {
      const k = key.slice(2);
      if (VG.state.current.policy[k]) VG.state.current.policy[k].val = val;
    } else if (key.startsWith('e_')) {
      const k = key.slice(2);
      if (VG.state.current.expense[k]) VG.state.manualAdj.expense[k] = val;
    } else if (key.startsWith('r_')) {
      const k = key.slice(2);
      if (VG.state.current.revenue[k]) VG.state.manualAdj.revenue[k] = val;
    }
  }
  return true;
};

VG.share.getURL = function() {
  const encoded = VG.share.encode();
  if (!encoded) return window.location.origin + window.location.pathname;
  return window.location.origin + window.location.pathname + '?b=' + encoded;
};
