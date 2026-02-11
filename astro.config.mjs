import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://urbanoise.com',
  publicDir: 'public',
  integrations: [sitemap()],
});
