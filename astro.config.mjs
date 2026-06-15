// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://argon.gl',
  integrations: [vue(), sitemap({ filter: (page) => !page.includes('/icon-generator') && !page.includes('/mock') && !page.includes('/compare') })],
  vite: {
    plugins: [tailwindcss()]
  }
});