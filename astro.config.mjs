import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { bake } from './scripts/bake.mjs';

// The city's data worked out once here, not in every visitor's browser (src/scripts/city3d/baked.ts)
const BAKED = await bake();

export default defineConfig({
  site: 'https://degenemporium.com',
  integrations: [sitemap()],
  vite: {
    define: {
      __CITY_BAKED__: JSON.stringify(JSON.stringify(BAKED)),
      // Free play (src/scripts/city3d/freeplay.ts): everything in the city's game costs nothing; a test build only
      __FREE_PLAY__: JSON.stringify(process.env.PUBLIC_FREE_PLAY === '1'),
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
