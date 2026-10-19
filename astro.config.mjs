import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://emporium.144collective.workers.dev',
  integrations: [sitemap()],
});
