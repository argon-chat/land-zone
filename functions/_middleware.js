// Cloudflare Pages middleware — runs on every request to the Pages project (argon.gl).
//
// Goal: visitors geolocated to Russia get sent to the Russian mirror at ru.argon.gl,
// exactly once. The choice is remembered in a cookie so we never loop, and never
// fight a user who explicitly picked a language.
//
// This redirect is load-bearing, not a nicety. Russian transit throttles a Cloudflare
// connection once it has carried roughly 19KB, and the budget is CUMULATIVE PER CONNECTION,
// not per response — a browser multiplexes a whole page over one HTTP/2 connection, so the
// document alone (16.4KB) all but exhausts it and every subresource after that crawls at
// ~637 B/s. Measured from a St. Petersburg exit (AS42065, 2026-09-18):
//
//   whole page over one H2 connection, as a browser loads it   0 responses in 120s
//   same page, HTML from here and assets off Cloudflare        document itself stalled, 60s
//   302 from here, everything from the mirror                  full page in 1s
//
// Do not be fooled by fetching resources one per connection — each gets a fresh budget and
// everything looks fine. That measurement is what briefly cost this file its geo rule.
//
// The 302 works because it is a few hundred bytes: far under the cut-off, so it lands before
// the throttle engages. Everything after it comes off a host that is not throttled at all.
//
// Decision order:
//   1. ?lang=en|ru  → explicit toggle: remember it, clean the URL, go to the right host.
//   2. on ru.argon.gl → never redirect away (no loops).
//   3. has a cookie  → respect it (en = stay on main, ru = go to mirror).
//   4. no cookie, real HTML page load, geo == RU → redirect to the mirror + remember.
// Everything else (assets, robots.txt, sitemaps, OG images, /.well-known, non-GET) passes through.

const MAIN_HOST = 'argon.gl';
const RU_HOST = 'ru.argon.gl';
const COOKIE = 'argon_lang';

// Countries routed to the Russian site. Add 'BY', 'KZ', 'KG', … here if you want them too.
// Only RU has been measured; the others are a guess until someone tests from them.
const RU_COUNTRIES = ['RU'];

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // 1. Explicit choice via ?lang= — works from any host. Record it and strip the param.
  const langParam = url.searchParams.get('lang');
  if (langParam === 'en' || langParam === 'ru') {
    url.searchParams.delete('lang');
    if (langParam === 'ru' && url.hostname !== RU_HOST) url.hostname = RU_HOST;
    if (langParam === 'en' && url.hostname === RU_HOST) url.hostname = MAIN_HOST;
    return redirect(url, langParam);
  }

  // 2. On the Russian host: just serve. Never geo-redirect (avoids loops).
  if (url.hostname === RU_HOST) return next();

  // 3. Remembered choice wins.
  const cookie = readCookie(request, COOKIE);
  if (cookie === 'en') return next();
  if (cookie === 'ru') {
    url.hostname = RU_HOST;
    return redirect(url, 'ru');
  }

  // 4. Only act on genuine HTML page loads — not assets, robots.txt, sitemaps, OG, /.well-known.
  const accept = request.headers.get('Accept') || '';
  if (request.method !== 'GET' || !accept.includes('text/html')) return next();

  // Geo: send RU-country visitors to the mirror (once), remembering it.
  if (RU_COUNTRIES.includes(request.cf?.country)) {
    url.hostname = RU_HOST;
    return redirect(url, 'ru');
  }

  return next();
}

// 302 (temporary — geo redirects must never be cached/permanent) + remember the choice.
function redirect(url, lang) {
  const headers = new Headers();
  headers.set('Location', url.toString());
  headers.append('Set-Cookie', `${COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
  headers.set('Cache-Control', 'no-store');
  return new Response(null, { status: 302, headers });
}

function readCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp('(?:^|; )' + name + '=([^;]+)'));
  return match ? match[1] : null;
}
