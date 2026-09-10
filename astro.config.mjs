// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://argon.gl',
  // The invite shells (/i, /v) are excluded: they say nothing without a code in the path, and every
  // real invite URL is a one-off that should not be in a sitemap.
  integrations: [vue(), sitemap({ filter: (page) => !page.includes('/pricing') && !page.includes('/icon-generator') && !page.includes('/mock') && !page.includes('/compare') && !/\/(i|v)\/?$/.test(page) })],
  vite: {
    plugins: [tailwindcss()]
  }
});