import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { createHash } from 'node:crypto';
import { bake } from './scripts/bake.mjs';

// The city's data worked out once here, not in every visitor's browser (src/scripts/city3d/baked.ts)
const BAKED = JSON.stringify(await bake());
// One hashed JSON file under /_astro/ (named by its contents like the code, so the service worker and a year's
// caching keep it: polish plan Phase 4); the page carries only its address. Not JavaScript, so scripts/budget.mjs
// counts it on its own row, not in the boot's code.
const BAKED_FILE = `baked.${createHash('sha256').update(BAKED).digest('base64url').slice(0, 8)}.json`;
/** Writes the baked data into the build next to the code */
const bakedAsset = () => ({
  name: 'city-baked-asset',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: `_astro/${BAKED_FILE}`, source: BAKED });
  },
});

// The owner's test phase: everything in the city's game free for a limited time. false ends it.
const FREE_FOR_NOW = true;

export default defineConfig({
  site: 'https://degenemporium.com',
  integrations: [sitemap()],
  vite: {
    plugins: [bakedAsset()],
    define: {
      __CITY_BAKED_URL__: JSON.stringify(`/_astro/${BAKED_FILE}`),
      // (the build has its baked data: what only works it out leaves the browser's code, baked.ts `BUILT`)
      __CITY_BUILT__: 'true',
      // Free play (src/scripts/city3d/freeplay.ts): everything in the city's game costs nothing. The owner's test
      // phase (2026-11, "everything is free for a limited time"): on in every build of the site, the live one too.
      // To end it, set FREE_FOR_NOW to false at the top of this file (PUBLIC_FREE_PLAY=1 still turns it on for a test build).
      __FREE_PLAY__: JSON.stringify(FREE_FOR_NOW || process.env.PUBLIC_FREE_PLAY === '1'),
    },
    build: {
      rollupOptions: {
        output: {
          // three.js on its own: it changes far less often than the city, so a return visit after a
          // deploy usually still has it cached (its file name only changes when three does)
          manualChunks: (id) => (/node_modules\/three\/(build|src)\//.test(id) ? 'three' : id.includes('vite/preload-helper') ? 'preload' : undefined),
        },
      },
    },
  },
});
