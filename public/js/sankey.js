// ─────────────────────────────────────────────────────────────────────────
// sankey.js — the iconic budget flow: revenue sources (left) flow through the
// treasury (middle) out to spending categories (right), link widths
// proportional to billions of kroner. Pure SVG, no charting library. Reads
// the live budget from VG.state.current so it reflects the user's changes.
//   VG.sankey.render(containerEl, { height })
// ─────────────────────────────────────────────────────────────────────────
VG.sankey = {};

VG.sankey._palette = {
  // revenue greens/teals
  income:'#3fb6a8', am:'#56c4b6', vat:'#2f9e93', corp:'#6fd0c2', excise:'#48b3a4',
  pal:'#7ad8ca', property:'#3aa89a', green:'#8fe0d2', other:'#5cc2b4',
  // expense ambers/oranges
  pension:'#e0a23a', social:'#e8b34f', health:'#d98f2e', education:'#edc065',
  elderly:'#d4862a', childcare:'#f0cd7e', defense:'#c9761f', police:'#e6a845',
  foreign:'#dca03c', climate:'#7bbf4a', transport:'#d99a35', housing:'#e3b257',
  culture:'#ecc878', eu:'#cf9433', it:'#e0ad4e', asylum:'#d88f3f',
  admin:'#cfa04a', interest:'#b86a2e',
};

VG.sankey.render = function (host, opts = {}) {
  if (!host || !VG.state.current) return;
  const s = VG.state.current;
  const rev = Object.entries(s.revenue).map(([k, v]) => ({ k, name: v.name, val: v.val })).filter(d => d.val > 0).sort((a,b)=>b.val-a.val);
  const exp = Object.entries(s.expense).map(([k, v]) => ({ k, name: v.name, val: v.val })).filter(d => d.val > 0).sort((a,b)=>b.val-a.val);
  const totalRev = rev.reduce((s,d)=>s+d.val,0);
  const totalExp = exp.reduce((s,d)=>s+d.val,0);
  const bal = totalRev - totalExp;

  const W = host.clientWidth || 720;
  const H = opts.height || Math.max(420, Math.max(rev.length, exp.length) * 26 + 60);
  const pad = 8;
  const colW = 150;              // label column allowance
  const nodeW = 13;
  const gap = 3;                 // px gap between stacked nodes
  const midX = W / 2;
  const leftX = pad + colW;
  const rightX = W - pad - colW - nodeW;
  const topY = 34, botY = H - 14;
  const usableH = botY - topY;

  // scale: total height maps to the larger of the two sides
  const maxTotal = Math.max(totalRev, totalExp);
  const px = (val) => (val / maxTotal) * (usableH - gap * (Math.max(rev.length, exp.length) - 1));

  const fmt = v => v.toFixed(0);
  let y;

  // layout revenue nodes (left)
  y = topY;
  rev.forEach(d => { d.h = px(d.val); d.y = y; y += d.h + gap; });
  const revH = y - gap - topY;
  // layout expense nodes (right)
  y = topY;
  exp.forEach(d => { d.h = px(d.val); d.y = y; y += d.h + gap; });
  const expH = y - gap - topY;

  // middle treasury node spans the larger stack
  const midH = Math.max(revH, expH);
  const midY = topY;
  const midW = 20;

  const color = k => VG.sankey._palette[k] || '#888';
  const link = (x1, y1, x2, y2, thick, fill) => {
    const mx = (x1 + x2) / 2;
    return `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" stroke="${fill}" stroke-opacity="0.35" stroke-width="${Math.max(1,thick)}" fill="none"/>`;
  };

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" class="sankey-svg" preserveAspectRatio="xMidYMid meet">`;
  svg += `<text x="${leftX}" y="20" class="sk-head sk-head-rev">INDTÆGTER ${fmt(totalRev)} mia</text>`;
  svg += `<text x="${rightX+nodeW}" y="20" text-anchor="end" class="sk-head sk-head-exp">UDGIFTER ${fmt(totalExp)} mia</text>`;

  // links revenue → treasury (stack onto middle proportionally)
  let midCursor = midY;
  rev.forEach(d => {
    const sy = d.y + d.h/2;
    const my = midCursor + d.h/2; midCursor += d.h + gap*0;
    svg += link(leftX + nodeW, sy, midX - midW/2, my, d.h, color(d.k));
  });
  // links treasury → expense
  midCursor = midY;
  exp.forEach(d => {
    const ey = d.y + d.h/2;
    const my = midCursor + d.h/2; midCursor += d.h + gap*0;
    svg += link(midX + midW/2, my, rightX, ey, d.h, color(d.k));
  });

  // treasury node
  svg += `<rect x="${midX - midW/2}" y="${midY}" width="${midW}" height="${midH}" rx="3" class="sk-treasury"/>`;
  svg += `<text x="${midX}" y="${midY + midH + 11}" text-anchor="middle" class="sk-mid-label">Statskassen</text>`;

  // revenue nodes + labels
  rev.forEach(d => {
    svg += `<rect x="${leftX}" y="${d.y}" width="${nodeW}" height="${Math.max(1,d.h)}" rx="2" fill="${color(d.k)}"/>`;
    svg += `<text x="${leftX - 6}" y="${d.y + d.h/2 + 3}" text-anchor="end" class="sk-lbl">${d.name} <tspan class="sk-val">${fmt(d.val)}</tspan></text>`;
  });
  // expense nodes + labels
  exp.forEach(d => {
    svg += `<rect x="${rightX}" y="${d.y}" width="${nodeW}" height="${Math.max(1,d.h)}" rx="2" fill="${color(d.k)}"/>`;
    svg += `<text x="${rightX + nodeW + 6}" y="${d.y + d.h/2 + 3}" class="sk-lbl"><tspan class="sk-val">${fmt(d.val)}</tspan> ${d.name}</text>`;
  });

  svg += `</svg>`;

  const balCls = bal >= 0 ? 'sk-surplus' : 'sk-deficit';
  const balTxt = `${bal >= 0 ? 'Overskud' : 'Underskud'}: ${VG.fmtSigned(bal)} (${VG.ppct(bal/VG.state.baseline.gdp*100)} af BNP)`;
  host.innerHTML = `<div class="sankey-balance ${balCls}">${balTxt}</div>${svg}`;
};
