import express from 'express';
const router = express.Router();

// Exposes client-side map tokens to the browser. These are *client* tokens by
// design (Cesium ion access tokens and referer-restricted Google Maps keys are
// meant to ship to the browser), so this is not a secret leak. When the env
// vars are absent the client falls back to token-free OpenStreetMap imagery.
router.get('/config', (req, res) => {
  // Kill switch: when GOOGLE_TILES_DISABLED=1 the key is withheld from the
  // browser so new page loads never request Google tiles. (Already-open tabs
  // keep their copy until reloaded — disable the key in Google Cloud for a
  // guaranteed, immediate billing stop.) Toggle with deploy/google-kill.sh.
  const killed = process.env.GOOGLE_TILES_DISABLED === '1';
  res.json({
    cesiumIonToken: process.env.CESIUM_ION_TOKEN || '',
    googleTilesKey: killed ? '' : (process.env.GOOGLE_MAPS_KEY || ''),
  });
});

export default router;
