import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { bake } from './scripts/bake.mjs';

// The city's data worked out once here, not in every visitor's browser (src/scripts/city3d/baked.ts)
const BAKED = await bake();

// The owner's test phase: everything in the city's game free for a limited time. false ends it.
const FREE_FOR_NOW = true;

export default defineConfig({
  site: 'https://degenemporium.com',
  integrations: [sitemap()],
  vite: {
    define: {
      __CITY_BAKED__: JSON.stringify(JSON.stringify(BAKED)),
      // (the page carries its baked data: what only works it out leaves the browser's code, baked.ts `BUILT`)
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
