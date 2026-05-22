VG.livedata = {};
VG.livedata.economic = null;
VG.livedata.climate = null;
VG.livedata.inequality = null;

VG.livedata.load = async function() {
  const [eco, cli, ineq] = await Promise.allSettled([
    VG.api.fetchJSON('/api/livedata/economic').catch(() => null),
    VG.api.fetchJSON('/api/livedata/climate').catch(() => null),
    VG.api.fetchJSON('/api/livedata/inequality').catch(() => null),
  ]);
  if (eco.value)  VG.livedata.economic   = eco.value;
  if (cli.value)  VG.livedata.climate    = cli.value;
  if (ineq.value) VG.livedata.inequality = ineq.value;
};
