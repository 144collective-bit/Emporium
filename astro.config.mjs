import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://degenemporium.com',
  integrations: [sitemap(), react()],
  image: { responsiveStyles: true },
});
