// Cloudflare Pages middleware — runs on every request to the Pages project (argon.gl).
//
// Goal: honour an explicit mirror choice, and nothing else. Visitors are never moved
// off argon.gl on their behalf.
//
// There used to be a geo rule here that pushed every RU-geolocated visitor to the mirror,
// because Russian transit throttles Cloudflare connections. Measured from a St. Petersburg
// exit (AS42065), that throttle cuts a response at 19139 bytes on HTTP/2 and 24162 on
// HTTP/1.1, then drops to ~637 B/s. Every page and every asset this site serves compresses
// under that — the main page is 17244 bytes brotli, all twelve subresources pass — so the
// blanket redirect was routing traffic away from a host that already works. The one asset
// that did not fit, the 626KB screen-share clip, now loads from the media origin instead
// (see PUBLIC_MEDIA_ORIGIN in src/components/argon-mock/argon-client-mock.ts).
//
// The margin is thin: 1895 bytes on the main page. scripts/check-size-budget.ts fails the
// build before it can be spent, and the mirror stays deployed as a manual fallback.
//
// Decision order:
//   1. ?lang=en|ru  → explicit toggle: remember it, clean the URL, go to the right host.
//   2. on ru.argon.gl → never redirect away (no loops).
//   3. has a cookie  → respect it (en = stay on main, ru = go to mirror).
// Everything else passes through.

const MAIN_HOST = 'argon.gl';
const RU_HOST = 'ru.argon.gl';

// Renamed from argon_lang deliberately. Every argon_lang cookie in the wild was written by the
// geo rule, not chosen by anyone; honouring those would pin exactly the visitors this change is
// meant to free to the mirror forever. The new name is only ever set by an explicit ?lang=.
const COOKIE = 'argon_site';

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

  // 2. On the Russian host: just serve. Never redirect away (avoids loops).
  if (url.hostname === RU_HOST) return next();

  // 3. A remembered explicit choice moves page loads only — never assets, OG fetches or
  //    non-GET. A visitor who picked the mirror lands there and fetches the rest from it.
  if (readCookie(request, COOKIE) === 'ru') {
    const accept = request.headers.get('Accept') || '';
    if (request.method === 'GET' && accept.includes('text/html')) {
      url.hostname = RU_HOST;
      return redirect(url, 'ru');
    }
  }

  return next();
}

// 302 (temporary — never cache a host choice) + remember it.
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
