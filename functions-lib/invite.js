/**
 * Server side of an invite link, shared by functions/i/[code].js and functions/v/[code].js.
 *
 * A statically built page cannot know which invite it is showing, and the thing that most needs to
 * know is not a browser — it is the crawler that unfurls the link into somebody else's chat, which
 * runs no JavaScript and reads only the tags in <head>. So the card is fetched here, on the edge,
 * the shell's own Open Graph tags are replaced with ones naming the space, and the fetched card is
 * handed to the page as `window.__ARGON_INVITE__` so the browser does not fetch it a second time.
 *
 * It lives outside functions/ because everything inside that directory is a route: two files that
 * both exported a handler for the same logic would be two routes, and a shared module in there
 * would be a third. Pages bundles imports from anywhere in the project, so this is just a module.
 */

const DEFAULT_API = 'https://api.argon.gl';

/** Cache the unfurl briefly: a link being pasted around is read many times in a few seconds. */
const CACHE_CONTROL = 'public, max-age=60';

/**
 * @param {EventContext<{ ASSETS: Fetcher, ARGON_API?: string }, 'code', unknown>} context
 * @param {'/i' | '/v'} shellPath which static page holds the markup for this link shape
 */
export async function handleInviteRequest(context, shellPath) {
	const { request, params, env } = context;

	const shell = await loadShell(env, request, shellPath);

	// Anything that is not a page load (HEAD, a stray asset request) gets the shell untouched.
	if (request.method !== 'GET') return shell;

	const code = normalizeCode(params.code);
	if (!code) return withInvite(shell, { error: 'NOT_FOUND' }, null, request);

	const card = await fetchCard(env, code);

	return withInvite(shell, card.ok ? { code, card: card.card } : { code, error: card.error }, card.ok ? card.card : null, request);
}

/**
 * The built page for this route, served from the same deployment.
 *
 * Redirects are followed by hand — `redirect: 'manual'` — rather than left to fetch. The asset
 * server answers a bare `/i` with a redirect to `/i/`, and following that automatically walks
 * straight into a redirect loop the runtime aborts with "Too many redirects", taking the whole page
 * down with it. Asking for the concrete file first, and treating anything that is not a 200 as "try
 * the next spelling", is what makes this work the same on Pages as it does under `wrangler dev`.
 */
async function loadShell(env, request, shellPath) {
	const url = new URL(request.url);
	url.search = '';

	for (const candidate of [`${shellPath}/index.html`, `${shellPath}/`, shellPath]) {
		url.pathname = candidate;

		const response = await env.ASSETS.fetch(new Request(url.toString(), {
			headers: request.headers,
			redirect: 'manual',
		}));

		if (response.status === 200) return new Response(response.body, response);
	}

	// Nothing to dress up. Better an honest 404 than a blank 200.
	return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
}

/** Codes are shared dashed ("ABC-DEF-GHI"); the API accepts either form, but a path segment can carry junk. */
function normalizeCode(raw) {
	const code = typeof raw === 'string' ? raw.trim() : '';
	if (!code || code.length > 32) return '';
	return /^[A-Za-z0-9-]+$/.test(code) ? code : '';
}

async function fetchCard(env, code) {
	const base = (env.ARGON_API || DEFAULT_API).replace(/\/+$/, '');

	try {
		const response = await fetch(`${base}/api/invite/${encodeURIComponent(code)}`, {
			headers: { Accept: 'application/json' },
			// The page under it is cached for a minute; the card it was built from should not be older.
			cf: { cacheTtl: 30, cacheEverything: true },
		});
		const body = await response.json().catch(() => null);

		if (!response.ok || !body?.space) return { ok: false, error: body?.error || 'NOT_FOUND' };
		return { ok: true, card: body };
	} catch {
		// The landing is still useful without a card — the page will retry from the browser.
		return { ok: false, error: 'NETWORK' };
	}
}

/**
 * Rewrites the shell's head: our tags in place of the generic ones, plus the card as a global.
 */
function withInvite(shell, preload, card, request) {
	const contentType = shell.headers.get('Content-Type') || '';
	if (!contentType.includes('text/html')) return shell;

	return new HTMLRewriter()
		.on('head', new HeadRewriter(preload, card, request))
		.on('meta', new MetaStripper())
		.on('title', new TitleRewriter(card))
		.transform(withHeaders(shell));
}

function withHeaders(shell) {
	const response = new Response(shell.body, shell);
	response.headers.set('Cache-Control', CACHE_CONTROL);
	return response;
}

/** Drops the shell's generic social tags so the ones we append are the only ones a crawler sees. */
class MetaStripper {
	element(element) {
		const property = element.getAttribute('property') || '';
		const name = element.getAttribute('name') || '';

		if (property.startsWith('og:') || name.startsWith('twitter:') || name === 'description')
			element.remove();
	}
}

class TitleRewriter {
	constructor(card) {
		this.title = card ? titleFor(card) : null;
	}

	element(element) {
		if (this.title) element.setInnerContent(this.title);
	}
}

class HeadRewriter {
	constructor(preload, card, request) {
		this.preload = preload;
		this.card = card;
		this.request = request;
	}

	element(element) {
		const url = new URL(this.request.url);
		const title = this.card ? titleFor(this.card) : 'You are invited to Argon';
		const description = this.card ? descriptionFor(this.card) : 'Open the link to see the space and join.';
		// The space's own picture when it has one: an unfurl of a specific invite should look like
		// that space, not like the product. The generic card stays as the fallback.
		const image = this.card?.space?.splashUrl || this.card?.space?.bannerUrl || this.card?.space?.avatarUrl
			|| new URL('/og/invite.png', url.origin).toString();

		element.append(
			[
				meta('property', 'og:title', title),
				meta('property', 'og:description', description),
				meta('property', 'og:type', 'website'),
				meta('property', 'og:url', url.toString()),
				meta('property', 'og:image', image),
				meta('property', 'og:site_name', 'Argon Chat'),
				meta('name', 'twitter:card', 'summary_large_image'),
				meta('name', 'twitter:title', title),
				meta('name', 'twitter:description', description),
				meta('name', 'twitter:image', image),
				meta('name', 'description', description),
				`<script>window.__ARGON_INVITE__=${jsonForScript(this.preload)}</script>`,
			].join(''),
			{ html: true },
		);
	}
}

function titleFor(card) {
	return card.voiceChannel
		? `Join ${card.voiceChannel.name} in ${card.space.name} — Argon`
		: `Join ${card.space.name} — Argon`;
}

function descriptionFor(card) {
	const counts = `${card.space.onlineCount} online · ${card.space.memberCount} members`;
	const room = card.voiceChannel ? `Voice room: ${card.voiceChannel.name}. ` : '';
	const about = card.space.description ? `${card.space.description} ` : '';

	return `${room}${about}${counts} on Argon.`;
}

function escapeHtml(value) {
	return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function meta(keyAttribute, key, value) {
	return `<meta ${keyAttribute}="${key}" content="${escapeHtml(value)}" />`;
}

/**
 * JSON that is safe to sit inside a script element.
 *
 * The card carries a space name and description written by whoever made the space, so `</script>`
 * in either would end the element early and hand the rest of the payload to the parser as markup.
 */
function jsonForScript(value) {
	return JSON.stringify(value)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
