// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

// Where hashed build assets are served from. Russian transit throttles a Cloudflare connection
// to a crawl once a single response passes ~19KB, so anything bulky served from argon.gl never
// arrives there. Pointing _astro/ at a host that is not behind Cloudflare takes every chunk,
// stylesheet and font out of that budget for good — only the HTML documents, which Cloudflare
// still serves, have to stay under it.
//
// Two things must hold for this host, or the site breaks silently:
//   - it must send Access-Control-Allow-Origin on /_astro/** — Astro emits <script type="module">
//     and module scripts are fetched in CORS mode, so without it nothing executes;
//   - it must appear in script-src / style-src / font-src of both CSPs (public/_headers for
//     Cloudflare, firebase.json for the mirror).
// Left unset by default, and that default is deliberate. Every chunk is under the ceiling on
// its own (the mock splits ./presets and its stylesheet out for exactly that reason), so
// Cloudflare can serve them and nothing in Russia suffers. Turning this on moves all asset
// traffic worldwide onto the mirror, which makes the mirror a hard dependency of the primary
// host rather than its fallback — a real availability trade, worth making deliberately when
// Cloudflare degrades further, not by default.
//
// scripts/check-size-budget.ts keeps enforcing the per-chunk ceiling either way, so this can
// be switched on and off without the split quietly rotting.
const assetsPrefix = process.env.PUBLIC_MEDIA_ORIGIN?.replace(/\/+$/, '') || undefined;

// https://astro.build/config
export default defineConfig({
  site: 'https://argon.gl',
  build: { assetsPrefix },
  // The invite shells (/i, /v) are excluded: they say nothing without a code in the path, and every
  // real invite URL is a one-off that should not be in a sitemap.
  integrations: [vue(), sitemap({ filter: (page) => !page.includes('/pricing') && !page.includes('/icon-generator') && !page.includes('/mock') && !page.includes('/compare') && !/\/(i|v)\/?$/.test(page) })],
  vite: {
    plugins: [tailwindcss()]
  }
});