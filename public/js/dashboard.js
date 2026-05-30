VG.dashboard = {};

function _sparks(vals, colorClass) {
  if (!vals || vals.length < 2) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const n = vals.length;
  const pts = vals.map((v, i) => `${(2 + i / (n - 1) * 96).toFixed(1)},${(26 - (v - mn) / rng * 22).toFixed(1)}`).join(' ');
  const ly = (26 - (vals[n - 1] - mn) / rng * 22).toFixed(1);
  const clr = colorClass === 'dw-ok' ? 'var(--neg)' : colorClass === 'dw-bad' ? 'var(--pos)' : 'var(--warn)';
  return `<div class="dw-spark-wrap"><svg class="dw-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${clr}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="98" cy="${ly}" r="2.5" fill="${clr}"/></svg></div>`;
}

// ── Widget definitions ────────────────────────────────────────────────────────
// gs-w / gs-h: default grid size (grid is 12 columns, each cell ~80px tall)
const DASH_WIDGETS = [
  // ── KPI metric widgets ──
  {
    id: 'budget', icon: '<i class="ph ph-scales"></i>', title: 'Budgetsaldo',
    panel: 'laboratorium', w: 3, h: 4,
    render() {
      if (!VG.state || !VG.state.current) return { big: '—', sub: 'Indlæser…' };
      const bal = VG.sumRev() - VG.sumExp();
      const pct = (bal / VG.state.baseline.gdp * 100);
      const sign = pct >= 0 ? '+' : '';
      const mia = Math.round(bal / 1e9);
      return {
        big: sign + pct.toFixed(1).replace('.', ',') + '%',
        sub: 'af BNP',
        trend: (bal >= 0 ? '↑ Overskud ' : '↓ Underskud ') + (mia >= 0 ? '+' : '') + mia + ' mia DKK',
        trendCls: bal >= 0 ? 'dw-ok' : 'dw-bad',
        detail: 'Krav: strukturel balance · Konvergenskrav: −3% BNP',
        status: bal >= 0 ? 'ok' : 'bad',
        spark: [3.4, 2.8, 1.2, 0.8, pct],
        gauge: { pct: Math.max(0, Math.min(100, (pct + 5) / 10 * 100)), label: `Saldo: ${sign}${pct.toFixed(1).replace('.', ',')}% BNP`, color: bal >= 0 ? 'var(--neg)' : 'var(--pos)' },
      };
    },
  },
  {
    id: 'ledighed', icon: '<i class="ph ph-hard-hat"></i>', title: 'Ledighed',
    panel: 'ledighed', w: 3, h: 4,
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.unemployment && live.unemployment.value)
        return {
          big: live.unemployment.value.toLocaleString('da-DK'),
          sub: 'ledige · ' + (live.unemployment.period || ''),
          trend: 'Ledighedspct: ~2,9%',
          trendCls: 'dw-ok',
          detail: 'EU-gns: 6,1% · Danmark: historisk lavt',
          spark: [115, 108, 97, 94, 93, live.unemployment.value / 1000],
          gauge: { pct: Math.max(0, 100 - live.unemployment.value / 1000 / 6 * 100), label: 'Lav = bedre', color: 'var(--neg)' },
        };
      return { big: '~93.000', sub: 'ledige (seneste DST)', trend: 'Ledighedspct: ~2,9%', trendCls: 'dw-ok', detail: 'EU-gns: 6,1% · Historisk lavt', spark: [115, 108, 97, 94, 93, 93], gauge: { pct: 84, label: 'Lav = bedre', color: 'var(--neg)' } };
    },
  },
  {
    id: 'inflation', icon: '<i class="ph ph-trend-up"></i>', title: 'Inflation',
    panel: 'inflation', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.inflation) {
        const v = eco.inflation.yoy != null ? eco.inflation.yoy : eco.inflation.value;
        return {
          big: v.toFixed(1).replace('.', ',') + '%',
          sub: eco.inflation.period || 'forbrugerprisindeks',
          trend: v <= 2 ? '↓ Under ECB-mål på 2%' : v <= 3 ? '↑ Over ECB-mål på 2%' : '↑ Markant over mål',
          trendCls: v > 4 ? 'dw-bad' : v > 2 ? 'dw-warn' : 'dw-ok',
          detail: 'ECB-mål: 2,0% · EU-gns: 2,4% · Kerneinflation: ~2,1%',
          status: v > 4 ? 'bad' : v > 2 ? 'warn' : 'ok',
          spark: [1.9, 7.5, 6.8, 3.8, 2.3, v],
          gauge: { pct: Math.max(0, 100 - Math.abs(v - 2) / 4 * 100), label: `ECB-mål: 2% · Afstand: ${Math.abs(v - 2).toFixed(1).replace('.', ',')}pp`, color: v > 4 ? 'var(--pos)' : v > 2 ? 'var(--warn)' : 'var(--neg)' },
        };
      }
      return { big: '~2,3%', sub: 'forbrugerprisindeks', trend: '↓ Faldende tendens', trendCls: 'dw-ok', detail: 'ECB-mål: 2,0% · EU-gns: 2,4%', status: 'ok', spark: [1.9, 7.5, 6.8, 3.8, 2.3, 2.3], gauge: { pct: 93, label: 'ECB-mål: 2% · Afstand: 0,3pp', color: 'var(--neg)' } };
    },
  },
  {
    id: 'rente', icon: '<i class="ph ph-bank"></i>', title: 'Nationalbankrente',
    panel: 'statsgaeld', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.nbRate)
        return {
          big: eco.nbRate.value.toFixed(2).replace('.', ',') + '%',
          sub: 'pengepolitisk rente',
          trend: '↓ Nedsat fra 3,60% (okt. 2024)',
          trendCls: 'dw-ok',
          detail: 'ECB indlånsrente: 3,25% · Følger ECB tæt',
          spark: [0.0, 0.0, 3.0, 3.60, 3.35, eco.nbRate.value],
        };
      return { big: '3,35%', sub: 'pengepolitisk rente', trend: '↓ Nedsat fra 3,60%', trendCls: 'dw-ok', detail: 'ECB indlånsrente: 3,25%', spark: [0.0, 0.0, 3.0, 3.60, 3.35, 3.35] };
    },
  },
  {
    id: 'boligpris', icon: '<i class="ph ph-house"></i>', title: 'Boligpriser',
    panel: 'boligmarked', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.housing) {
        const v = eco.housing.qoq;
        return {
          big: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%',
          sub: 'kvartal/kvartal',
          trend: v > 0 ? '↑ Stigende boligmarked' : '↓ Faldende boligmarked',
          trendCls: v > 0 ? 'dw-ok' : 'dw-bad',
          detail: 'Kbh: +2,1% · Jylland: +0,8% · Realkreditrente: ~4,5%',
          status: v > 0 ? 'ok' : 'bad',
          spark: [6.2, 8.5, -3.2, -1.8, 1.2, v],
        };
      }
      return { big: '+1,2%', sub: 'kvartal/kvartal', trend: '↑ Stabilt stigende', trendCls: 'dw-ok', detail: 'Kbh: +2,1% · Jylland: +0,8%', status: 'ok', spark: [6.2, 8.5, -3.2, -1.8, 1.2, 1.2] };
    },
  },
  {
    id: 'co2', icon: '<i class="ph ph-leaf"></i>', title: 'CO₂-mål 2030',
    panel: 'co2', w: 3, h: 4,
    render() {
      const cli = VG.livedata && VG.livedata.climate;
      if (cli && cli.co2 && cli.co2.target2030) {
        const pct = Math.round((1 - cli.co2.value / cli.co2.target2030) * 100);
        return {
          big: pct + '%',
          sub: 'reduktion siden 1990',
          trend: 'Mål 2030: 70% · Afstand: ' + (70 - pct) + 'pp',
          trendCls: pct >= 60 ? 'dw-ok' : 'dw-warn',
          detail: 'Nuværende: ~38 Mton · Mål: 21,2 Mton CO₂-ækvivalenter',
          status: pct >= 70 ? 'ok' : pct >= 50 ? 'warn' : 'bad',
          spark: [28, 33, 38, 44, 52, pct],
          gauge: { pct: Math.min(100, pct / 70 * 100), label: `2030-mål: 70% reduktion — ${70 - pct > 0 ? (70 - pct) + 'pp mangler' : 'Opnået!'}`, color: pct >= 70 ? 'var(--neg)' : pct >= 50 ? 'var(--warn)' : 'var(--pos)' },
        };
      }
      return { big: '~38 Mton', sub: 'CO₂-ækvivalenter 2024', trend: 'Mål 2030: 21,2 Mton', trendCls: 'dw-warn', detail: '70%-mål vs. 1990 · Afstand: 17 Mton', status: 'warn', spark: [28, 33, 38, 44, 52, 56], gauge: { pct: 56 / 70 * 100, label: '2030-mål: 70% reduktion — 14pp mangler', color: 'var(--warn)' } };
    },
  },
  {
    id: 'polls', icon: '<i class="ph ph-chart-bar"></i>', title: 'Meningsmåling',
    panel: 'meningsmaalinger', w: 3, h: 4,
    render() {
      return {
        big: 'S 20%',
        sub: 'LA 13% · V 13%',
        trend: 'Opdateret: maj 2025',
        trendCls: '',
        detail: 'Rød blok: ~49% · Blå blok: ~43% · Uafklaret: 8%',
      };
    },
  },
  {
    id: 'loenvaekst', icon: '<i class="ph ph-briefcase"></i>', title: 'Lønvækst',
    panel: 'indkomst', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.wageGrowth) {
        const v = eco.wageGrowth.yoy;
        return {
          big: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%',
          sub: 'nominelt år/år',
          trend: v > 2.3 ? '↑ Realløn i plus' : '↓ Realløn i minus',
          trendCls: v > 2.3 ? 'dw-ok' : 'dw-bad',
          detail: 'Realløn: +1,4% · Minimalløn DK: 145 DKK/time',
          status: v > 0 ? 'ok' : 'bad',
        };
      }
      return { big: '+3,8%', sub: 'nominelt år/år', trend: '↑ Realløn i plus (+1,4%)', trendCls: 'dw-ok', detail: 'EU-gns: +3,2% · Minimalløn: 145 DKK/t', status: 'ok' };
    },
  },
  {
    id: 'befolkning', icon: '<i class="ph ph-users"></i>', title: 'Befolkning',
    panel: 'demographics', w: 3, h: 4,
    render() {
      const live = VG.state && VG.state.live;
      if (live && live.population && live.population.value)
        return {
          big: live.population.value.toLocaleString('da-DK'),
          sub: live.population.period || '',
          trend: '↑ +42.000 siden 2024',
          trendCls: 'dw-ok',
          detail: 'Fødselrate: 1,65 · Nettoindvandring: +32k/år',
        };
      return { big: '6.031.247', sub: '2026K2', trend: '↑ +42.000 siden 2024', trendCls: 'dw-ok', detail: 'Fødselrate: 1,65 · Nettoindvandring: +32k/år' };
    },
  },
  {
    id: 'folketing', icon: '<i class="ph ph-buildings"></i>', title: 'Folketing',
    panel: 'folketing', w: 3, h: 4,
    render() {
      const bills = VG.state && VG.state.live && VG.state.live.activeBills ? VG.state.live.activeBills.length : '—';
      return { big: String(bills), sub: 'aktive afstemninger', trend: '3. samling · Slutter juni 2025', trendCls: '', detail: 'Flertal: 90 ud af 179 mandater' };
    },
  },
  {
    id: 'gini', icon: '<i class="ph ph-scales"></i>', title: 'Ulighed',
    panel: 'ligestilling', w: 3, h: 4,
    render() {
      const ineq = VG.livedata && VG.livedata.inequality;
      if (ineq && ineq.gini)
        return {
          big: ineq.gini.value.toFixed(3),
          sub: 'Gini-koefficient',
          trend: '↑ +0,003 vs. 2022',
          trendCls: 'dw-warn',
          detail: 'EU-gns: 0,306 · Danmark: laveste i EU',
        };
      return { big: '0,292', sub: 'Gini-koefficient', trend: 'Lavest i EU', trendCls: 'dw-ok', detail: 'EU-gns: 0,306 · Stigende tendens de seneste år' };
    },
  },
  {
    id: 'dsb', icon: '<i class="ph ph-train"></i>', title: 'DSB Rettidighed',
    panel: 'dsb', w: 3, h: 4,
    render() {
      return {
        big: '83%',
        sub: 'tog til tiden',
        trend: '↓ Fra 87% i 2023',
        trendCls: 'dw-bad',
        detail: 'Mål: 90% · Regionaltog: 79% · S-tog: 88%',
        status: 'warn',
      };
    },
  },
  {
    id: 'sundhed', icon: '<i class="ph ph-first-aid"></i>', title: 'Sundhed', panel: 'sundhed', w: 3, h: 4,
    render() {
      return { big: '184 mia', sub: 'sundhedsudgifter/år', trend: '↑ +6,2% vs. 2023', trendCls: 'dw-warn', detail: '8,8% af BNP · EU-gns: 9,9% · Ny sundhedsreform' };
    },
  },
  {
    id: 'ventetider', icon: '<i class="ph ph-clock"></i>', title: 'Ventetider', panel: 'ventetider', w: 3, h: 4,
    render() {
      return { big: '18%', sub: 'venter over 2 mdr.', trend: '↑ +3pp vs. 2022', trendCls: 'dw-bad', detail: 'Garantiret: 30 dage · Kræftpakker: 12 dage', status: 'warn' };
    },
  },
  {
    id: 'aeldrepleje', icon: '<i class="ph ph-heart"></i>', title: 'Ældrepleje', panel: 'aeldrepleje', w: 3, h: 4,
    render() {
      return { big: '135k', sub: 'modtagere af hjemmehjælp', trend: '↑ +8.000 siden 2020', trendCls: 'dw-warn', detail: '1.890 kr/time · 900 plejehjem i DK' };
    },
  },
  {
    id: 'psykiatri', icon: '<i class="ph ph-brain"></i>', title: 'Psykiatri', panel: 'psykiatri', w: 3, h: 4,
    render() {
      return { big: '2,1 år', sub: 'ventetid børn & unge', trend: 'Psykiatriplan 2022–25', trendCls: 'dw-warn', detail: '2,2 mia DKK afsat til reform · 12% mangler sengepladser', status: 'bad' };
    },
  },
  {
    id: 'uddannelse', icon: '<i class="ph ph-graduation-cap"></i>', title: 'Uddannelse', panel: 'uddannelse', w: 3, h: 4,
    render() {
      return { big: '560k', sub: 'folkeskoleelever', trend: '9 ud af 10 fuldfører', trendCls: 'dw-ok', detail: 'PISA 2022: 480 pt · Mål: 500 pt · Gymnasier: 135k' };
    },
  },
  {
    id: 'forsvar', icon: '<i class="ph ph-shield"></i>', title: 'Forsvar', panel: 'forsvar', w: 3, h: 4,
    render() {
      return { big: '1,65%', sub: 'af BNP · NATO-mål 3%', trend: '↑ Fra 1,35% i 2020', trendCls: 'dw-warn', detail: 'Forsvarsforlig +20 mia DKK/år · Mål 2% inden 2025', status: 'warn' };
    },
  },
  {
    id: 'statsgaeld', icon: '<i class="ph ph-bank"></i>', title: 'Statsgæld', panel: 'statsgaeld', w: 3, h: 4,
    render() {
      return { big: '29%', sub: 'af BNP', trend: '↓ Fra 33% i 2022', trendCls: 'dw-ok', detail: 'Maastricht-krav: under 60% · Absolut: ~875 mia DKK', status: 'ok' };
    },
  },
  {
    id: 'erhverv', icon: '<i class="ph ph-briefcase"></i>', title: 'Erhverv / BNP', panel: 'erhverv', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.gdpGrowth) {
        const v = eco.gdpGrowth.yoy;
        return {
          big: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + ' %',
          sub: 'BNP-vækst år/år',
          trend: v > 0 ? '↑ Ekspansion' : '↓ Kontraktion',
          trendCls: v > 0 ? 'dw-ok' : 'dw-bad',
          detail: 'Servicesektor: 75% · Industri: 20% · BNP: ~2.500 mia DKK',
          status: v > 0 ? 'ok' : 'bad',
        };
      }
      return { big: '+2,3 %', sub: 'BNP-vækst år/år', trend: '↑ Over EU-gns (+1,2%)', trendCls: 'dw-ok', detail: 'BNP: ~2.500 mia DKK · Servicesektor: 75%', status: 'ok' };
    },
  },
  {
    id: 'elpris', icon: '<i class="ph ph-lightning"></i>', title: 'Elpris', panel: 'elpris', w: 3, h: 4,
    render() {
      const en = VG.livedata && VG.livedata.energy;
      if (en && en.spotPrice) {
        const v = en.spotPrice.value;
        return {
          big: Math.round(v) + ' øre',
          sub: 'spotpris DK1 · kWh',
          trend: v > 200 ? '↑ Høj elpris' : v > 100 ? '→ Middel elpris' : '↓ Lav elpris',
          trendCls: v > 200 ? 'dw-bad' : v > 100 ? 'dw-warn' : 'dw-ok',
          detail: 'DK2 (Øst): tilsvarende · Afgifter: +90 øre/kWh til forbrugerpris',
          status: v > 200 ? 'bad' : v > 100 ? 'warn' : 'ok',
          spark: [50, 350, 120, 80, 87, v],
        };
      }
      return { big: '~87 øre', sub: 'spotpris DK1 · kWh', trend: '↓ Under historisk gns.', trendCls: 'dw-ok', detail: 'Afgifter+moms: +90 øre/kWh til forbrugerpris', status: 'ok', spark: [50, 350, 120, 80, 87, 87] };
    },
  },
  {
    id: 'vedvarende', icon: '<i class="ph ph-wind"></i>', title: 'VE-andel', panel: 'energi', w: 3, h: 4,
    render() {
      const en = VG.livedata && VG.livedata.energy;
      if (en && en.renewableShare) {
        const v = en.renewableShare;
        return {
          big: Math.round(v) + ' %',
          sub: 'vedvarende energi',
          trend: 'Mål 2030: 100% · Afstand: ' + Math.round(100 - v) + 'pp',
          trendCls: v >= 70 ? 'dw-ok' : 'dw-warn',
          detail: 'Vind: 43% · Sol: 7% · Biogas: 7% · Vandkraft: <1%',
          status: v >= 70 ? 'ok' : v >= 50 ? 'warn' : 'bad',
          spark: [33, 40, 46, 52, 57, v],
          gauge: { pct: v, label: `Mod 100%-mål 2030 — ${Math.round(100 - v)}pp mangler`, color: v >= 70 ? 'var(--neg)' : 'var(--warn)' },
        };
      }
      return { big: '~57 %', sub: 'vedvarende energi', trend: 'Mål 2030: 100%', trendCls: 'dw-warn', detail: 'Vind: 43% · Sol: 7% · Biogas: 7%', status: 'ok', spark: [33, 40, 46, 52, 57, 57], gauge: { pct: 57, label: 'Mod 100%-mål 2030 — 43pp mangler', color: 'var(--warn)' } };
    },
  },
  {
    id: 'udenrigshandel', icon: '<i class="ph ph-arrows-left-right"></i>', title: 'Handelsbalance', panel: 'udenrigshandel', w: 3, h: 4,
    render() {
      const eco = VG.livedata && VG.livedata.economic;
      if (eco && eco.tradeBalance) {
        const v = eco.tradeBalance.value;
        return {
          big: (v >= 0 ? '+' : '') + Math.round(v / 1e9).toLocaleString('da-DK') + ' mia',
          sub: 'DKK · handelsoverskud',
          trend: '↑ +4% vs. 2023',
          trendCls: 'dw-ok',
          detail: 'Eksport: 1.421 mia · Import: 1.324 mia DKK',
          status: v >= 0 ? 'ok' : 'bad',
        };
      }
      return { big: '+97 mia', sub: 'DKK · handelsoverskud', trend: '↑ +4% vs. 2023', trendCls: 'dw-ok', detail: 'Eksport: 1.421 mia · Import: 1.324 mia DKK', status: 'ok' };
    },
  },
  {
    id: 'forsvarandel', icon: '<i class="ph ph-shield-checkered"></i>', title: 'Forsvarsandel', panel: 'forsvar', w: 3, h: 4,
    render() {
      const live = VG.state && VG.state.current;
      if (live) {
        const pct = ((live.spending?.forsvar || 33) / (live.gdp || 2400) * 100);
        return {
          big: pct.toFixed(2).replace('.', ',') + ' %',
          sub: 'af BNP · NATO-mål 3 %',
          trend: 'Mål 2030: 3% af BNP',
          trendCls: pct >= 2 ? 'dw-ok' : 'dw-warn',
          detail: 'Forsvarsforlig +20 mia DKK/år · Nuværende: 33 mia DKK',
          status: pct >= 2 ? 'ok' : 'warn',
          spark: [1.35, 1.38, 1.40, 1.55, 1.65, pct],
          gauge: { pct: pct / 3 * 100, label: `NATO-mål: 3% BNP — ${(3 - pct).toFixed(2).replace('.', ',')}pp mangler`, color: pct >= 2 ? 'var(--neg)' : 'var(--warn)' },
        };
      }
      return { big: '1,65 %', sub: 'af BNP · NATO-mål 3 %', trend: 'Mål 2030: 3% · Afstand: 1,35pp', trendCls: 'dw-warn', detail: 'Forsvarsforlig +20 mia/år · ~33 mia DKK i dag', status: 'warn', spark: [1.35, 1.38, 1.40, 1.55, 1.65, 1.65], gauge: { pct: 1.65 / 3 * 100, label: 'NATO-mål: 3% BNP — 1,35pp mangler', color: 'var(--warn)' } };
    },
  },
  {
    id: 'integration', icon: '<i class="ph ph-globe"></i>', title: 'Integration', panel: 'integration', w: 3, h: 4,
    render() {
      return {
        big: '~12.400',
        sub: 'asylansøgere 2025',
        trend: '↓ Fra 17.400 i 2024',
        trendCls: 'dw-ok',
        detail: 'Syrere: 2.100 · Ukrainere: 8.500 · Øvrige: 1.800',
      };
    },
  },
  {
    id: 'kriminalitet', icon: '<i class="ph ph-detective"></i>', title: 'Kriminalitet', panel: 'kriminalitet', w: 3, h: 4,
    render() {
      return {
        big: '448k',
        sub: 'anmeldelser 2024',
        trend: '↓ −2,1% vs. 2023',
        trendCls: 'dw-ok',
        detail: 'Bandekriminalitet: 4.200 sigtelser · Opklaring: 38%',
        status: 'warn',
      };
    },
  },
  {
    id: 'naturvand', icon: '<i class="ph ph-drop"></i>', title: 'Drikkevand', panel: 'naturvand', w: 3, h: 4,
    render() {
      return {
        big: '30 %',
        sub: 'boringer med pesticider',
        trend: '↑ +5pp vs. 2020',
        trendCls: 'dw-bad',
        detail: 'PFAS: 45% boringer · Nitrat: 12% over grænseværdi',
        status: 'bad',
      };
    },
  },
  {
    id: 'pension', icon: '<i class="ph ph-umbrella"></i>', title: 'Pensionsalder', panel: 'pension', w: 3, h: 4,
    render() {
      return {
        big: '67 år',
        sub: 'folkepensionsalder 2025',
        trend: '68 år fra 2030',
        trendCls: 'dw-warn',
        detail: 'LD + ATP: 1.200 mia DKK pensionsfond · Tidligpension: 61 år',
      };
    },
  },
  {
    id: 'innovation', icon: '<i class="ph ph-flask"></i>', title: 'F&U-udgifter', panel: 'innovation', w: 3, h: 4,
    render() {
      return { big: '3,1 %', sub: 'af BNP · over EU-mål', trend: '↑ +0,2pp vs. 2022', trendCls: 'dw-ok', detail: 'EU-mål: 3% · EU-gns: 2,2% · Privat FoU: 2,1%', status: 'ok' };
    },
  },
  {
    id: 'arbejdsmiljoe', icon: '<i class="ph ph-hard-hat"></i>', title: 'Arbejdsmiljø', panel: 'arbejdsmiljoe', w: 3, h: 4,
    render() {
      return { big: '43k', sub: 'arbejdsulykker/år', trend: '↓ −1.200 vs. 2023', trendCls: 'dw-ok', detail: 'Dødsfald: 36 · Erhvervssygdomme: 8.100/år', status: 'warn' };
    },
  },
  {
    id: 'ligestilling', icon: '<i class="ph ph-gender-intersex"></i>', title: 'Ligestilling', panel: 'ligestilling', w: 3, h: 4,
    render() {
      return { big: '14,5 %', sub: 'lønforskel mænd/kvinder', trend: '↓ −0,5pp vs. 2022', trendCls: 'dw-ok', detail: 'Kvinder i ledelse: 28% · EU-mål: 40% · Orlov: 11/11/6 uger', status: 'warn' };
    },
  },

  // ── New KPI widgets ──
  {
    id: 'beskæftigelse', icon: '<i class="ph ph-person-simple-run"></i>', title: 'Beskæftigelse', panel: 'ledighed', w: 3, h: 4,
    render() {
      return { big: '74,1 %', sub: 'beskæftigelsesgrad', trend: '↑ +0,3pp år/år · Højeste i 20 år', trendCls: 'dw-ok', detail: 'EU-gns: 70,0% · Kvinder: 72,8% · Mænd: 75,4%', status: 'ok' };
    },
  },
  {
    id: 'eksport', icon: '<i class="ph ph-export"></i>', title: 'Eksport', panel: 'udenrigshandel', w: 3, h: 4,
    render() {
      return { big: '1.421 mia', sub: 'DKK · varer & tjenester 2024', trend: '↑ +4,2% år/år', trendCls: 'dw-ok', detail: 'Medicin (Novo m.fl.): 42% · Fødevarer: 11%', status: 'ok' };
    },
  },
  {
    id: 'forbrugertillid', icon: '<i class="ph ph-smiley"></i>', title: 'Forbrugertillid', panel: 'forbrug', w: 3, h: 4,
    render() {
      return { big: '+3,2', sub: 'nettotal · over nul = optimisme', trend: '↑ +1,1 ift. forrige måned', trendCls: 'dw-ok', detail: 'Danmarks Statistik · Privateøkonomi: +8,2', status: 'ok' };
    },
  },
  {
    id: 'hjemlos', icon: '<i class="ph ph-house-simple"></i>', title: 'Hjemløse', panel: 'velfaerdsstat', w: 3, h: 4,
    render() {
      return { big: '5.765', sub: 'hjemløse (VIVE 2024)', trend: '↓ −3,1% siden 2019', trendCls: 'dw-ok', detail: 'Mål: reducere med 1/3 · Unge: 21% af total', status: 'warn' };
    },
  },
  {
    id: 'energiimport', icon: '<i class="ph ph-factory"></i>', title: 'Energiimport', panel: 'energi', w: 3, h: 4,
    render() {
      return { big: '28 %', sub: 'importafhængighed', trend: '↓ −8pp siden 2020', trendCls: 'dw-ok', detail: 'EU-gns: 60% · Gas: 35% af import · Nordsø: faldende', status: 'ok' };
    },
  },
  {
    id: 'byggetilladelser', icon: '<i class="ph ph-hammer"></i>', title: 'Byggetilladelser', panel: 'boligmarked', w: 3, h: 4,
    render() {
      return { big: '22.400', sub: 'nye boliger 2024', trend: '↓ −12% år/år · Laveste siden 2012', trendCls: 'dw-bad', detail: 'Boligmangel: 70.000 boliger mangler · Kbh: −18%', status: 'bad' };
    },
  },
  {
    id: 'landbrug', icon: '<i class="ph ph-plant"></i>', title: 'Landbrug', panel: 'landbrug', w: 3, h: 4,
    render() {
      return { big: '155 mia', sub: 'DKK fødevareeksport 2024', trend: '↑ +3,2% år/år', trendCls: 'dw-ok', detail: '2. største eksportsektor · Svin: 44% · Mejeri: 18%', status: 'ok' };
    },
  },
  {
    id: 'medietillid', icon: '<i class="ph ph-newspaper-clipping"></i>', title: 'Medietillid', panel: 'medietillid', w: 3, h: 4,
    render() {
      return { big: '67 %', sub: 'stoler på nyhedsmedier', trend: '↓ −2pp siden 2023', trendCls: 'dw-warn', detail: 'Reuters Institute 2024 · EU-gns: 40% · DK: næsthøjest i verden', status: 'ok' };
    },
  },
  {
    id: 'groenomstilling', icon: '<i class="ph ph-recycle"></i>', title: 'Grøn Omstilling', panel: 'groenomstilling', w: 3, h: 4,
    render() {
      return { big: '32 %', sub: 'red. vs. 2005 (ikke-kvotesektor)', trend: 'Mål 2030: 50% · Afstand: 18pp', trendCls: 'dw-warn', detail: 'Landbrug: vanskeligst · CO₂-afgift: 750 DKK/ton fra 2030', status: 'warn' };
    },
  },
  {
    id: 'skatteprocent', icon: '<i class="ph ph-percent"></i>', title: 'Skattetryk', panel: 'laboratorium', w: 3, h: 4,
    render() {
      return { big: '46,3 %', sub: 'af BNP · skattetryk 2024', trend: '↓ −0,4pp vs. 2022', trendCls: 'dw-ok', detail: 'OECD-rangering: nr. 1 · Topskat: 56,5% marginal', status: 'ok' };
    },
  },

  // ── Content widgets (larger) ──
  {
    id: 'danmarkidag',
    icon: '<i class="ph ph-newspaper"></i>',
    title: 'Danmark i dag',
    panel: 'rygter',
    w: 6, h: 5,
    content: 'news',
  },
  {
    id: 'aiinsights',
    icon: '<i class="ph ph-sparkle"></i>',
    title: 'AI Indsigter',
    panel: 'feed',
    w: 6, h: 5,
    content: 'insights',
  },
  {
    id: 'nyhedsradar',
    icon: '<i class="ph ph-radar"></i>',
    title: 'Nyhedsradar',
    panel: 'feed',
    w: 3, h: 5,
    content: 'trends',
  },
  {
    id: 'gridfreq',
    icon: '<i class="ph ph-lightning"></i>',
    title: 'Elnetfrekvens',
    panel: 'energi',
    w: 3, h: 4,
    content: 'gridfreq',
  },
  {
    id: 'valuta',
    icon: '<i class="ph ph-currency-circle-dollar"></i>',
    title: 'Valutakurser',
    panel: 'udenrigshandel',
    w: 3, h: 4,
    content: 'valuta',
  },
  {
    id: 'reddit',
    icon: '<i class="ph ph-reddit-logo"></i>',
    title: 'Reddit Danmark',
    panel: 'reddit',
    w: 6, h: 6,
    content: 'reddit',
  },
  {
    id: 'xdeck',
    icon: '<i class="ph ph-x-logo"></i>',
    title: 'X feed',
    panel: null,
    w: 6, h: 8,
    content: 'xdeck',
  },
  {
    id: 'folketing',
    icon: '<i class="ph ph-buildings"></i>',
    title: 'Folketing — aktive afstemninger',
    panel: 'folketing',
    w: 6, h: 5,
    content: 'folketing',
  },
  {
    id: 'meningsmaalinger',
    icon: '<i class="ph ph-chart-bar"></i>',
    title: 'Meningsmålinger',
    panel: 'meningsmaalinger',
    w: 6, h: 5,
    content: 'polls',
  },
];

const DASH_LS_KEY      = 'vg_dashboard_v7';
const DASH_LAYOUT_KEY  = 'vg_dashboard_layout_v7';
const DASH_DEFAULTS    = ['budget', 'ledighed', 'inflation', 'rente', 'boligpris', 'co2', 'polls', 'forsvarandel', 'vedvarende', 'elpris', 'gridfreq', 'valuta', 'danmarkidag', 'nyhedsradar', 'aiinsights', 'xdeck', 'reddit'];

const STATUS_CLS = { ok: 'dw-ok', warn: 'dw-warn', bad: 'dw-bad' };
const SRC_CLS    = {
  DR: 'source-dr', TV2: 'source-tv2', JP: 'source-jp',
  Berlingske: 'source-berlingske', Politiken: 'source-politiken',
  Weekendavisen: 'source-weekendavisen', Altinget: 'source-altinget',
  Information: 'source-information', 'Børsen': 'source-børsen',
};

VG.dashboard.getCatalog = () => DASH_WIDGETS;

VG.dashboard.getActive = function() {
  try {
    const s = JSON.parse(localStorage.getItem(DASH_LS_KEY));
    return Array.isArray(s) && s.length ? s : [...DASH_DEFAULTS];
  } catch(e) { return [...DASH_DEFAULTS]; }
};
VG.dashboard.saveActive = ids => localStorage.setItem(DASH_LS_KEY, JSON.stringify(ids));

VG.dashboard.getLayout = function() {
  try { return JSON.parse(localStorage.getItem(DASH_LAYOUT_KEY)) || {}; } catch(e) { return {}; }
};
VG.dashboard.saveLayout = function(items) {
  const layout = {};
  items.forEach(item => {
    if (item.id) layout[item.id] = { x: item.x, y: item.y, w: item.w, h: item.h };
  });
  localStorage.setItem(DASH_LAYOUT_KEY, JSON.stringify(layout));
};

VG.dashboard.load = function() {
  const panel = document.getElementById('panel-dashboard');
  if (!panel) return;
  panel._dashEditMode = false;
  VG.dashboard.renderPanel();
};

VG.dashboard._grid = null;

VG.dashboard.renderPanel = function() {
  const panel   = document.getElementById('panel-dashboard');
  if (!panel) return;
  const editing  = !!panel._dashEditMode;
  const activeIds = VG.dashboard.getActive();
  const byId     = Object.fromEntries(DASH_WIDGETS.map(w => [w.id, w]));
  const active   = activeIds.map(id => byId[id]).filter(Boolean);
  const inactive = DASH_WIDGETS.filter(w => !activeIds.includes(w.id));
  const savedLayout = VG.dashboard.getLayout();

  if (VG.dashboard._grid) {
    try { VG.dashboard._grid.destroy(false); } catch(e) {}
    VG.dashboard._grid = null;
  }

  const catalogHtml = editing ? `
    <div class="dw-catalog-section">
      <div class="dw-catalog-hd">Tilgængelige widgets — klik for at tilføje</div>
      <div class="dw-catalog-grid">
        ${inactive.map(w => `
          <button class="dw-catalog-item" data-add="${w.id}">
            <span class="dw-cat-icon">${w.icon}</span>
            <div class="dw-cat-info">
              <span class="dw-cat-name">${w.title}</span>
            </div>
            <span class="dw-cat-plus">+</span>
          </button>`).join('')}
        ${inactive.length === 0 ? '<p class="dw-catalog-empty">Alle widgets er tilføjet.</p>' : ''}
      </div>
    </div>` : '';

  panel.innerHTML = `
    <div class="dw-toolbar">
      <div class="dw-toolbar-left">
        <h2 class="dw-toolbar-title">Dashboard</h2>
        <p class="dw-toolbar-sub">${editing ? 'Træk for at flytte · Træk i hjørnet for at ændre størrelse' : 'Klik på et felt for at se detaljer · Klik Tilpas for at redigere'}</p>
      </div>
      <div class="dw-toolbar-right">
        ${editing ? '<button class="dw-edit-btn active" id="dw-edit-btn"><i class="ph ph-check"></i> Gem layout</button>' : '<button class="dw-edit-btn" id="dw-edit-btn"><i class="ph ph-sliders-horizontal"></i> Tilpas</button>'}
      </div>
    </div>
    ${catalogHtml}
    <div class="grid-stack dw-gridstack" id="dw-gridstack"></div>`;

  const W       = window.innerWidth;
  const isMobile = W < 480;
  const isTablet = W < 769;

  const gs = GridStack.init({
    cellHeight: isMobile ? 66 : isTablet ? 72 : 80,
    margin: isMobile ? 5 : isTablet ? 6 : 8,
    column: 12,
    columnOpts: { breakpoints: [
      { w: 420, c: 1 },
      { w: 768, c: 2 },
      { w: 1024, c: 6 },
    ]},
    animate: !isMobile,
    draggable: { handle: '.dw-card-header' },
    resizable: { handles: 'se' },
    disableDrag: !editing || isTablet,
    disableResize: !editing || isTablet,
  }, '#dw-gridstack');
  VG.dashboard._grid = gs;

  active.forEach(w => {
    const saved = savedLayout[w.id];
    const x = saved ? saved.x : undefined;
    const y = saved ? saved.y : undefined;
    const ww = saved ? saved.w : w.w;
    const hh = saved ? saved.h : w.h;

    const d = w.render ? w.render() : {};
    const sc = STATUS_CLS[d.status] || '';
    const isClickable = !editing && w.panel;
    const removeBtn = editing ? `<button class="dw-card-remove" data-remove="${w.id}" title="Fjern"><i class="ph ph-x"></i></button>` : '';
    const gotoBtn = isClickable ? `<button class="dw-card-goto" data-goto="${w.panel}" title="Åbn panel"><i class="ph ph-arrow-square-out"></i></button>` : '';

    let body = '';
    if (w.content === 'news') {
      body = `<div class="dw-news-body" id="dw-news-body">
        <div class="dw-skeleton"></div><div class="dw-skeleton"></div><div class="dw-skeleton"></div>
      </div>`;
    } else if (w.content === 'insights') {
      body = `<div class="dw-insights-body" id="dw-insights-body"></div>`;
    } else if (w.content === 'trends') {
      body = `<div class="dw-trends-body" id="dw-trends-body">
        <div class="dw-skeleton"></div><div class="dw-skeleton"></div><div class="dw-skeleton"></div>
      </div>`;
    } else if (w.content === 'xdeck') {
      body = `<div class="dw-xdeck-body" id="dw-xdeck-body"></div>`;
    } else if (w.content === 'reddit') {
      body = `<div class="dw-reddit-body" id="dw-reddit-body"><p class="dw-loading">Henter Reddit…</p></div>`;
    } else if (w.content === 'folketing') {
      body = `<div class="dw-folketing-body" id="dw-folketing-body"><div class="dw-skeleton"></div><div class="dw-skeleton"></div></div>`;
    } else if (w.content === 'polls') {
      body = `<div class="dw-polls-body" id="dw-polls-body"><div class="dw-skeleton"></div><div class="dw-skeleton"></div></div>`;
    } else if (w.content === 'gridfreq') {
      body = `<div class="dw-gridfreq-body" id="dw-gridfreq-body"><div class="dw-skeleton"></div></div>`;
    } else if (w.content === 'valuta') {
      body = `<div class="dw-valuta-body" id="dw-valuta-body"><div class="dw-skeleton"></div></div>`;
    } else if (w.render) {
      const sparkHtml = d.spark ? _sparks(d.spark, d.trendCls) : '';
      const gaugeHtml = d.gauge ? `<div class="dw-gauge-wrap"><div class="dw-gauge-track"><div class="dw-gauge-fill" style="width:${Math.max(2, Math.min(100, d.gauge.pct)).toFixed(1)}%;background:${d.gauge.color}"></div></div>${d.gauge.label ? `<span class="dw-gauge-lbl">${d.gauge.label}</span>` : ''}</div>` : '';
      body = `
        <div class="dw-kpi-big ${sc}">${d.big || '—'}</div>
        <div class="dw-kpi-sub">${d.sub || ''}</div>
        ${d.trend ? `<div class="dw-kpi-trend ${d.trendCls || ''}">${d.trend}</div>` : ''}
        ${sparkHtml}${gaugeHtml}
        ${d.detail ? `<div class="dw-kpi-detail">${d.detail}</div>` : ''}`;
    }

    const el = document.createElement('div');
    el.className = `grid-stack-item${editing ? '' : ' dw-static'}`;
    el.setAttribute('gs-w', ww); el.setAttribute('gs-h', hh);
    if (x !== undefined) el.setAttribute('gs-x', x);
    if (y !== undefined) el.setAttribute('gs-y', y);
    el.setAttribute('gs-id', w.id);

    const clickableAttr = isClickable ? ` data-goto-panel="${w.panel}"` : '';
    const clickableCls  = isClickable ? ' dw-card-clickable' : '';

    el.innerHTML = `
      <div class="grid-stack-item-content">
        <div class="dw-card-inner ${sc}${clickableCls}"${clickableAttr}>
          <div class="dw-card-header">
            <span class="dw-card-icon">${w.icon}</span>
            <span class="dw-card-title">${w.title}</span>
            <div class="dw-card-actions">${gotoBtn}${removeBtn}</div>
          </div>
          <div class="dw-card-body">${body}</div>
        </div>
      </div>`;
    gs.makeWidget(el);
    document.getElementById('dw-gridstack').appendChild(el);
  });

  gs.on('change', () => VG.dashboard.saveLayout(gs.save(false)));

  VG.dashboard._fillNews();
  VG.dashboard._fillTrends();
  VG.dashboard._fillInsights();
  VG.dashboard._fillXdeck();
  VG.dashboard._fillReddit();
  VG.dashboard._fillFolketing();
  VG.dashboard._fillPolls();
  VG.dashboard._fillGridFreq();
  VG.dashboard._fillValuta();

  document.getElementById('dw-edit-btn').onclick = () => {
    panel._dashEditMode = !panel._dashEditMode;
    if (!panel._dashEditMode) VG.dashboard.saveLayout(gs.save(false));
    VG.dashboard.renderPanel();
  };

  panel.querySelectorAll('[data-add]').forEach(btn => btn.onclick = () => {
    const ids = VG.dashboard.getActive();
    if (!ids.includes(btn.dataset.add)) { VG.dashboard.saveActive([...ids, btn.dataset.add]); VG.dashboard.renderPanel(); }
  });
  panel.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => {
    VG.dashboard.saveActive(VG.dashboard.getActive().filter(id => id !== btn.dataset.remove));
    VG.dashboard.renderPanel();
  });
  // Goto button (small icon in header)
  panel.querySelectorAll('[data-goto]').forEach(btn => btn.onclick = e => {
    e.stopPropagation();
    window.__mkClick && window.__mkClick(btn.dataset.goto);
  });
  // Whole-card click (for KPI tiles)
  panel.querySelectorAll('[data-goto-panel]').forEach(card => card.onclick = e => {
    if (!e.target.closest('[data-remove]') && !e.target.closest('[data-goto]'))
      window.__mkClick && window.__mkClick(card.dataset.gotoPanel);
  });
};

// ── Content fillers ──────────────────────────────────────────────────────────
VG.dashboard._fillNews = function() {
  const el = document.getElementById('dw-news-body');
  if (!el) return;
  fetch('/api/news?limit=20')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ items }) => {
      if (!items || !items.length) { el.innerHTML = '<p class="dw-empty">Ingen nyheder</p>'; return; }
      const newsList = items.slice(0, 12);
      el.innerHTML = newsList.map((n, i) => {
        const sc = SRC_CLS[n.source] || 'source-dr';
        const hasDream = n.dream && n.dream.category && n.dream.category !== 'Øvrig';
        const catDot = hasDream ? `<span class="dw-news-cat">${n.dream.category}</span>` : '';
        const breaking = (n.minutesAgo != null && n.minutesAgo < 120)
          ? '<span class="dw-news-breaking">BREAKING</span>' : '';
        const sent = n.sentiment > 0 ? '<span class="dw-news-sent dw-sent-pos" title="Positiv tone">▲</span>'
                   : n.sentiment < 0 ? '<span class="dw-news-sent dw-sent-neg" title="Negativ tone">▼</span>' : '';
        return `<div class="dw-news-item dw-news-item--modal" data-news-idx="${i}">
          <div class="dw-news-meta">${breaking}<span class="rygte-source-badge ${sc}">${n.source}</span><span class="dw-news-age">${n.age || ''}</span>${catDot}${sent}</div>
          <div class="dw-news-hl">${n.headline}</div>
          <div class="dw-news-topic">${n.topicLabel}${hasDream ? ' <span class="dw-news-dream-hint">📊 Analyse</span>' : ''}</div>
        </div>`;
      }).join('');
      el.querySelectorAll('[data-news-idx]').forEach(item => {
        item.onclick = () => VG.dashboard._openNewsModal(newsList[+item.dataset.newsIdx]);
      });
    })
    .catch(() => { if (el) el.innerHTML = '<p class="dw-empty">Nyheder utilgængelige</p>'; });
};

// ── Nyhedsradar widget — topic coverage from /api/news/trends ───────────────
VG.dashboard._fillTrends = function() {
  const el = document.getElementById('dw-trends-body');
  if (!el) return;
  const color = (VG.feed && VG.feed._topicColor) ? VG.feed._topicColor : () => 'var(--accent)';
  fetch('/api/news/trends')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ topics }) => {
      if (!topics || !topics.length) { el.innerHTML = '<p class="dw-empty">Ingen data</p>'; return; }
      const top = topics.slice(0, 9);
      const max = top[0].count || 1;
      el.innerHTML = top.map(t => {
        const pct = Math.max(6, Math.round(t.count / max * 100));
        const fresh = (t.latestAge != null && t.latestAge < 120)
          ? '<span class="dw-trend-fresh" title="Frisk historie">●</span>' : '';
        return `<div class="dw-trend-row" data-goto-topic="${t.panel}" title="${t.label}: ${t.count} artikler">
          <span class="dw-trend-label">${t.label}${fresh}</span>
          <span class="dw-trend-track"><span class="dw-trend-fill" style="width:${pct}%;background:${color(t.label)}"></span></span>
          <span class="dw-trend-count">${t.count}</span>
        </div>`;
      }).join('');
      el.querySelectorAll('[data-goto-topic]').forEach(row => {
        row.onclick = () => window.__mkClick && window.__mkClick(row.dataset.gotoTopic);
      });
    })
    .catch(() => { if (el) el.innerHTML = '<p class="dw-empty">Radar utilgængelig</p>'; });
};

VG.dashboard._fillGridFreq = function() {
  const el = document.getElementById('dw-gridfreq-body');
  if (!el) return;
  fetch('/api/energi/frequency')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      const hz = d.frequency ?? 50.0;
      const imb = d.imbalance;
      const dev = Math.abs(hz - 50.0);
      const col = dev < 0.05 ? 'var(--neg)' : dev < 0.1 ? 'var(--warn)' : 'var(--pos)';
      const status = dev < 0.05 ? 'Stabil' : dev < 0.1 ? 'Svag afvigelse' : 'Afvigelse';
      const imbStr = imb != null ? (imb > 0 ? `+${Math.round(imb)}` : `${Math.round(imb)}`) + ' MW ubalance' : '';
      const pct = Math.min(100, Math.max(0, (hz - 49.8) / 0.4 * 100)).toFixed(1);
      el.innerHTML = `
        <div class="dw-freq-hz" style="color:${col}">${hz.toFixed(3)} Hz</div>
        <div class="dw-gauge-wrap" style="margin:6px 0">
          <div class="dw-gauge-track">
            <div class="dw-gauge-fill" style="width:${pct}%;background:${col}"></div>
          </div>
          <span class="dw-gauge-lbl">${status}</span>
        </div>
        ${imbStr ? `<div class="dw-freq-imb">${imbStr}</div>` : ''}
        <div class="dw-freq-target">Mål: 50.000 Hz · ${d.isFallback ? 'Estimat' : 'Energidata.dk'}</div>`;
    })
    .catch(() => { if (el) el.innerHTML = '<p class="dw-empty">Utilgængelig</p>'; });
};

VG.dashboard._fillValuta = function() {
  const el = document.getElementById('dw-valuta-body');
  if (!el) return;
  fetch('/api/nationalbank/rates')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(d => {
      const rates = d.rates || {};
      const pairs = [
        { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
        { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
        { code: 'GBP', flag: '🇬🇧', name: 'Pund sterling' },
        { code: 'SEK', flag: '🇸🇪', name: 'Svensk krone' },
        { code: 'NOK', flag: '🇳🇴', name: 'Norsk krone' },
      ].filter(p => rates[p.code] != null);
      if (!pairs.length) { el.innerHTML = '<p class="dw-empty">Ingen data</p>'; return; }
      el.innerHTML = pairs.map(p =>
        `<div class="dw-valuta-row">
          <span class="dw-valuta-flag">${p.flag}</span>
          <span class="dw-valuta-code">${p.code}</span>
          <span class="dw-valuta-rate">${rates[p.code].toFixed(3)}</span>
          <span class="dw-valuta-dkk">DKK</span>
        </div>`
      ).join('') + `<div class="dw-valuta-src">Danmarks Nationalbank${d.isFallback ? ' (estimat)' : ''}</div>`;
    })
    .catch(() => { if (el) el.innerHTML = '<p class="dw-empty">Utilgængelig</p>'; });
};

VG.dashboard._openNewsModal = function(n) {
  if (!n) return;
  const d = n.dream;
  const CAT_COLORS = {
    Skat: 'var(--warn)', Velfærd: 'var(--neg)', Klima: '#2d8a50', Bolig: '#6b5ea8',
    Forsvar: '#8a5c2d', Uddannelse: 'var(--accent)', Sundhed: '#c05858',
    Arbejdsmarked: '#4a7fa5', Immigration: '#7a6b55', Pension: '#5a8a7a',
  };
  const CONF = { rygte: 'Rygte', forhandling: 'Forhandling', forslag: 'Forslag', vedtaget: 'Vedtaget' };
  const catColor  = d ? (CAT_COLORS[d.category] || 'var(--accent)') : 'var(--text-3)';
  const confLabel = d ? (CONF[d.confidence] || 'Rygte') : '';
  const sc        = SRC_CLS[n.source] || 'source-dr';

  let dreamBoxHtml;
  if (!d || d.category === 'Øvrig') {
    dreamBoxHtml = `<div class="dream-box dream-box-na">
      <div class="dream-box-header">📊 Ingen fiskal analyse</div>
      <p class="dream-na-msg">Artiklen indeholder ikke konkrete politiske forslag med identificerbare finanspolitiske konsekvenser. DREAM/MAKRO-analyse kræver enten vedtagne politikker, fremsatte lovforslag eller dokumenterede planer med kvantificerbare budgeteffekter.</p>
    </div>`;
  } else {
    const fiscalHtml = d.fiscalBn != null
      ? (() => {
          const pct   = Math.min(100, Math.abs(d.fiscalBn) / 15 * 100).toFixed(1);
          const color = d.fiscalBn > 0 ? 'var(--neg)' : 'var(--pos)';
          const label = d.fiscalBn > 0
            ? `+${d.fiscalBn.toFixed(1).replace('.', ',')} mia. kr./år (bedre balance)`
            : `${d.fiscalBn.toFixed(1).replace('.', ',')} mia. kr./år (mere underskud)`;
          return `<div class="dream-bar-wrap"><div class="dream-bar-track"><div class="dream-bar-fill" style="width:${pct}%;background:${color}"></div></div><span class="dream-bar-label" style="color:${color}">${label}</span></div>`;
        })()
      : '<span class="dream-na">Ikke estimeret — afhænger af konkret udformning</span>';

    const gdpHtml = d.gdpPct != null
      ? `<span class="dream-gdp ${d.gdpPct >= 0 ? 'pos' : 'neg'}">${d.gdpPct >= 0 ? '▲' : '▼'} ${Math.abs(d.gdpPct).toFixed(2).replace('.', ',')}% BNP</span>`
      : '<span class="dream-na">—</span>';

    const empHtml = d.employmentK != null && Math.abs(d.employmentK) >= 0.5
      ? `<span class="dream-emp ${d.employmentK >= 0 ? 'pos' : 'neg'}">${d.employmentK >= 0 ? '+' : ''}${d.employmentK.toFixed(0)}k job</span>`
      : '<span class="dream-na">—</span>';

    const giniHtml = d.giniDelta != null && Math.abs(d.giniDelta) >= 0.05
      ? `<span class="dream-gini ${d.giniDelta < 0 ? 'eq' : 'uneq'}">${d.giniDelta < 0 ? '↓ Mere lighed' : '↑ Mere ulighed'} (Δ${d.giniDelta >= 0 ? '+' : ''}${d.giniDelta.toFixed(1)})</span>`
      : '<span class="dream-na">Neutral</span>';

    const score     = d.politicalScore || 0;
    const markerPct = Math.max(2, Math.min(98, (score + 100) / 200 * 100)).toFixed(1);
    const compassHtml = `<div class="dream-compass"><div class="dream-compass-labels"><span>Venstre</span><span>Højre</span></div><div class="dream-compass-track"><div class="dream-compass-marker" style="left:${markerPct}%"></div></div></div>`;

    dreamBoxHtml = `<div class="dream-box">
      <div class="dream-box-header">📊 DREAM/MAKRO analyse — ${d.category}</div>
      <div class="dream-stats">
        <div class="dream-stat"><div class="dream-stat-label">Finanspolitisk effekt</div><div class="dream-stat-val">${fiscalHtml}</div></div>
        <div class="dream-stat"><div class="dream-stat-label">BNP-effekt</div><div class="dream-stat-val">${gdpHtml}</div></div>
        <div class="dream-stat"><div class="dream-stat-label">Beskæftigelse</div><div class="dream-stat-val">${empHtml}</div></div>
        <div class="dream-stat"><div class="dream-stat-label">Indkomstfordeling</div><div class="dream-stat-val">${giniHtml}</div></div>
      </div>
      <div class="dream-compass-row">
        <span class="dream-compass-label-txt">Politisk placering</span>
        <div class="dream-compass-wrap">${compassHtml}</div>
      </div>
      <p class="dream-explanation">${d.explanation || ''}</p>
      <p class="dream-disclaimer">Estimat baseret på DREAM/MAKRO-modelparametre. Ikke officiel analyse.</p>
    </div>`;
  }

  const topicLink = n.panel
    ? `<button class="vg-modal-topic-btn" onclick="VG.dashboard._closeNewsModal();window.__mkClick&&window.__mkClick('${n.panel}')">Gå til ${n.topicLabel} →</button>`
    : '';

  document.getElementById('vg-news-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'vg-news-modal';
  modal.className = 'vg-modal';
  modal.innerHTML = `
    <div class="vg-modal-backdrop"></div>
    <div class="vg-modal-inner" role="dialog" aria-modal="true">
      <button class="vg-modal-close" title="Luk"><i class="ph ph-x"></i></button>
      <div class="vg-modal-article">
        <div class="vg-modal-meta">
          <span class="rygte-source-badge ${sc}">${n.source}</span>
          ${d ? `<span class="rygte-cat-badge" style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}55">${d.category}</span>
          <span class="rygte-confidence conf-${d.confidence || 'rygte'}">${confLabel}</span>` : ''}
          <span class="vg-modal-age">${n.age || ''}</span>
        </div>
        <h3 class="vg-modal-headline">
          <a href="${n.link || '#'}" target="_blank" rel="noopener">${n.headline}</a>
        </h3>
        ${n.description ? `<p class="vg-modal-desc">${n.description}</p>` : ''}
        ${dreamBoxHtml}
        <div class="vg-modal-actions">
          <a class="vg-modal-src-btn" href="${n.link || '#'}" target="_blank" rel="noopener"><i class="ph ph-arrow-square-out"></i> Læs hos ${n.source}</a>
          ${topicLink}
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('vg-modal--open'));
  modal.querySelector('.vg-modal-backdrop').onclick = () => VG.dashboard._closeNewsModal();
  modal.querySelector('.vg-modal-close').onclick    = () => VG.dashboard._closeNewsModal();
  const onKey = e => { if (e.key === 'Escape') { VG.dashboard._closeNewsModal(); document.removeEventListener('keydown', onKey); } };
  document.addEventListener('keydown', onKey);
};

VG.dashboard._closeNewsModal = function() {
  const modal = document.getElementById('vg-news-modal');
  if (!modal) return;
  modal.classList.remove('vg-modal--open');
  modal.addEventListener('transitionend', () => modal.remove(), { once: true });
};

VG.dashboard._fillInsights = function() {
  const el = document.getElementById('dw-insights-body');
  if (!el || !VG.feed || !VG.feed._generateInsights) return;
  const insights = VG.feed._generateInsights().slice(0, 4);
  if (!insights.length) { el.innerHTML = '<p class="dw-empty">Ingen indsigter</p>'; return; }
  el.innerHTML = insights.map(item => {
    const voteHtml = VG.votes ? VG.votes.renderBar(item.id, item.basePos, item.baseNeg) : '';
    return `<div class="dw-insight-item" onclick="window.__mkClick && window.__mkClick('${item.panel}')">
      <div class="dw-insight-hl">${item.headline}</div>
      ${voteHtml}
    </div>`;
  }).join('');
};

VG.dashboard._fillXdeck = function() {
  const el = document.getElementById('dw-xdeck-body');
  if (!el || !VG.xdeck) return;
  VG.xdeck.renderInto(el);
};

VG.dashboard._fillReddit = function() {
  const el = document.getElementById('dw-reddit-body');
  if (!el || !VG.reddit) return;
  fetch('https://www.reddit.com/r/denmark/hot.json?limit=8&raw_json=1')
    .then(r => r.json())
    .then(data => {
      const posts = (data.data.children || []).map(c => c.data).filter(p => !p.stickied).slice(0, 6);
      el.innerHTML = posts.map(p => `
        <a class="dw-reddit-item" href="https://reddit.com${p.permalink}" target="_blank" rel="noopener">
          <div class="dw-reddit-hl">${p.title}</div>
          <div class="dw-reddit-meta">${(p.score || 0).toLocaleString('da-DK')} point · ${p.num_comments || 0} kommentarer</div>
        </a>`).join('');
    })
    .catch(() => { el.innerHTML = '<p class="dw-empty">Reddit utilgængeligt</p>'; });
};

VG.dashboard._fillFolketing = function() {
  const el = document.getElementById('dw-folketing-body');
  if (!el) return;
  const bills = VG.state && VG.state.live && VG.state.live.activeBills;
  if (!bills || !bills.length) {
    el.innerHTML = '<p class="dw-empty">Ingen aktive afstemninger</p>';
    return;
  }
  el.innerHTML = bills.slice(0, 8).map(b => `
    <div class="dw-news-item" onclick="window.__mkClick && window.__mkClick('folketing')">
      <div class="dw-news-meta">
        <span class="rygte-source-badge source-dr">${b.type || 'Lovforslag'}</span>
        <span class="dw-news-age">${b.status || ''}</span>
      </div>
      <div class="dw-news-hl">${(b.title || '').slice(0, 100)}</div>
    </div>`).join('');
};

VG.dashboard._fillPolls = function() {
  const el = document.getElementById('dw-polls-body');
  if (!el) return;
  const parties = VG.state && VG.state.current && VG.state.current.polls;
  if (!parties || !Object.keys(parties).length) {
    el.innerHTML = '<p class="dw-empty">Meningsmålinger indlæses…</p>';
    return;
  }
  const sorted = Object.entries(parties)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const max = sorted[0]?.[1] || 1;
  el.innerHTML = sorted.map(([name, pct]) => `
    <div class="dw-poll-row">
      <span class="dw-poll-name">${name}</span>
      <div class="dw-poll-bar-wrap">
        <div class="dw-poll-bar" style="width:${Math.round(pct/max*100)}%"></div>
      </div>
      <span class="dw-poll-pct">${pct.toFixed(1).replace('.', ',')} %</span>
    </div>`).join('');
};
