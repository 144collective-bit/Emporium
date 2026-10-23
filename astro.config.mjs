import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { bake } from './scripts/bake.mjs';

// The city's data worked out once here, not in every visitor's browser (src/scripts/city3d/baked.ts)
const BAKED = await bake();

export default defineConfig({
  site: 'https://degenemporium.com',
  integrations: [sitemap()],
  vite: {
    define: { __CITY_BAKED__: JSON.stringify(BAKED) },
  },
});
