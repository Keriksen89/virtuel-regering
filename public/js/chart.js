VG.chart = {};

VG.chart.drawDebt = function() {
  const cvs = document.getElementById('debt-chart');
  if (!cvs) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = cvs.offsetWidth || 600;
  const H   = 320;
  cvs.width  = W * dpr;
  cvs.height = H * dpr;
  cvs.style.height = H + 'px';
  const ctx = cvs.getContext('2d');
  ctx.scale(dpr, dpr);

  const css    = getComputedStyle(document.documentElement);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
     window.matchMedia('(prefers-color-scheme: dark)').matches);

  const cBorder = css.getPropertyValue('--border').trim()  || (isDark ? '#3a3936' : '#e0ddd6');
  const cText2  = css.getPropertyValue('--text-2').trim()  || (isDark ? '#b0ae a6' : '#6b6a67');
  const cText1  = css.getPropertyValue('--text-1').trim()  || (isDark ? '#f1efe8' : '#1c1b19');
  const cAccent = css.getPropertyValue('--accent').trim()  || '#1d6fbd';
  const cSurface= isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

  // ── Data ────────────────────────────────────────────────────────────────────
  const bal  = VG.sumRev() - VG.sumExp();
  const BNP  = VG.state.baseline.gdp;
  let debt = BNP * VG.state.baseline.debtStartRatio, gdpY = BNP;
  const pts = [{ y: 2026, r: debt / gdpY * 100 }];
  for (let y = 2027; y <= 2034; y++) {
    debt -= bal;
    gdpY *= 1.02;
    pts.push({ y, r: debt / gdpY * 100 });
  }

  // Baseline (FL2026 unchanged) — constant debt ratio with 0-balance assumption
  const bPts = pts.map((p, i) => ({ y: p.y, r: VG.state.baseline.debtStartRatio * 100 }));

  const hasChanges = VG.getChanges().length > 0;
  const trendDown  = pts[pts.length - 1].r <= pts[0].r;
  const lineColor  = trendDown ? cAccent : '#d85a30';

  // ── Layout ──────────────────────────────────────────────────────────────────
  const pad = { l: 52, r: 16, t: 28, b: 44 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const allR   = [...pts.map(p => p.r), 0, 60];
  const maxR   = Math.ceil((Math.max(70, ...allR) + 8) / 10) * 10;
  const minR   = Math.floor((Math.min(-5, ...allR) - 4) / 10) * 10;
  const rangeR = maxR - minR;

  const toX = i => pad.l + (plotW / (pts.length - 1)) * i;
  const toY = r => pad.t + plotH * ((maxR - r) / rangeR);

  // ── Plot background ─────────────────────────────────────────────────────────
  ctx.fillStyle = cSurface;
  ctx.fillRect(pad.l, pad.t, plotW, plotH);

  // ── Grid lines ──────────────────────────────────────────────────────────────
  const gridSteps = 5;
  ctx.strokeStyle = cBorder;
  ctx.lineWidth   = 0.5;
  ctx.font        = `11px -apple-system, system-ui, sans-serif`;
  for (let i = 0; i <= gridSteps; i++) {
    const r = maxR - (rangeR / gridSteps) * i;
    const y = toY(r);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + plotW, y); ctx.stroke();
    ctx.fillStyle    = cText2;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(r) + '%', pad.l - 6, y);
  }

  // ── EU 60 % reference line ──────────────────────────────────────────────────
  const eu60y = toY(60);
  if (eu60y >= pad.t - 2 && eu60y <= pad.t + plotH + 2) {
    ctx.strokeStyle = 'rgba(210,40,40,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(pad.l, eu60y); ctx.lineTo(pad.l + plotW, eu60y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle    = 'rgba(210,40,40,0.65)';
    ctx.font         = `10px -apple-system, system-ui, sans-serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('EU-grænse 60%', pad.l + 6, eu60y - 4);
  }

  // ── Baseline comparison (ghost line) ────────────────────────────────────────
  if (hasChanges) {
    ctx.strokeStyle = isDark ? 'rgba(180,178,169,0.22)' : 'rgba(100,100,100,0.18)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    bPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(toX(i), toY(p.r));
      else         ctx.lineTo(toX(i), toY(p.r));
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const bLabelY = toY(bPts[0].r);
    ctx.fillStyle    = isDark ? 'rgba(180,178,169,0.4)' : 'rgba(100,100,100,0.35)';
    ctx.font         = `10px -apple-system, system-ui, sans-serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Basis FL2026', toX(1) + 4, bLabelY + 3);
  }

  // ── Gradient fill ────────────────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + plotH);
  if (trendDown) {
    grad.addColorStop(0, 'rgba(29,111,189,0.22)');
    grad.addColorStop(1, 'rgba(29,111,189,0.02)');
  } else {
    grad.addColorStop(0, 'rgba(216,90,48,0.22)');
    grad.addColorStop(1, 'rgba(216,90,48,0.02)');
  }
  const floorY = Math.min(pad.t + plotH, toY(Math.max(minR, 0)));
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(toX(i), toY(p.r));
    else         ctx.lineTo(toX(i), toY(p.r));
  });
  ctx.lineTo(toX(pts.length - 1), floorY);
  ctx.lineTo(toX(0),              floorY);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // ── Main line ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = lineColor;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(toX(i), toY(p.r));
    else         ctx.lineTo(toX(i), toY(p.r));
  });
  ctx.stroke();

  // ── Dots + value labels ──────────────────────────────────────────────────────
  pts.forEach((p, i) => {
    const x = toX(i), y = toY(p.r);

    // Outer dot
    ctx.fillStyle = lineColor;
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
    // Inner white dot
    ctx.fillStyle = isDark ? '#1c1b19' : '#fff';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();

    // Value label (above dot, clear background)
    const label = p.r.toFixed(1) + '%';
    ctx.font        = `bold 10px -apple-system, system-ui, sans-serif`;
    ctx.textAlign   = 'center';
    const lx = x, ly = y - 12;
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = isDark ? 'rgba(28,27,25,0.75)' : 'rgba(255,255,255,0.8)';
    ctx.fillRect(lx - lw / 2 - 2, ly - 9, lw + 4, 12);
    ctx.fillStyle    = cText1;
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, lx, ly);

    // Year label
    ctx.fillStyle    = cText2;
    ctx.font         = `11px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(p.y, x, pad.t + plotH + 8);
  });

  // ── Axis lines ───────────────────────────────────────────────────────────────
  ctx.strokeStyle = cBorder;
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();
};
