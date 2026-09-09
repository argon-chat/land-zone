# landing

The Argon landing page (argon.gl). Astro, static output, no SSR.

```
bun install
bun run dev
bun run build
```

## Deployment

Every push to `master` builds once and publishes that same build to both hosts, through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Pull requests build only.

| Host | What it serves | Config |
| --- | --- | --- |
| Cloudflare Pages (`chat-landing`) | argon.gl, plus the Pages Functions in `functions/` — the geo middleware that routes RU visitors to the mirror, and the `/i/`, `/v/` invite unfurlers that render an OG card per code | `wrangler.toml` |
| Firebase Hosting (`argon-land`) | the fallback origin: same static build, with `/i/**` and `/v/**` rewritten to the client-side shells | `firebase.json`, `.firebaserc` |

`workflow_dispatch` takes a `target` input if you need to republish to just one of them. To deploy
by hand from a checkout, `bun run deploy` (Cloudflare) and `bun run deploy:firebase` still work.

### Secrets

The workflow reads these from the repository's Actions secrets:

| Secret | Used by | Notes |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare job | scoped to Cloudflare Pages: Write on one account |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare job | |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase job | JSON key; the supported way in |
| `FIREBASE_TOKEN` | Firebase job | `firebase login:ci` refresh token, used only when the service account is absent |
| `PUBLIC_SENTRY_DSN` | build | optional — without it `src/lib/analytics.ts` stays inert |

Plus two optional repository *variables*: `PUBLIC_ARGON_API` (defaults to `https://api.argon.gl`)
and `PUBLIC_SENTRY_ENV` (defaults to `production`).

Create and store the four credentials with:

```
bun run setup:ci-secrets              # both providers
bun run setup:ci-secrets -- --dry-run # report what it would do, create nothing
bun run setup:ci-secrets -- --help
```

It mints the Cloudflare token through the API and creates a dedicated
`land-zone-ci@argon-chat.iam.gserviceaccount.com` service account through `gcloud`, then writes both
to the repo with `gh`.

Cloudflare needs a bootstrap credential in the environment first, because an API token cannot mint
itself. Make one at [the API tokens page](https://dash.cloudflare.com/profile/api-tokens) with
**User · API Tokens · Edit** and **Account · Account Settings · Read**, then:

```powershell
$env:CLOUDFLARE_BOOTSTRAP_TOKEN = "..."   # PowerShell
export CLOUDFLARE_BOOTSTRAP_TOKEN=...     # bash
```

`CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_API_KEY` + `CLOUDFLARE_EMAIL`, are read as well. With none of
them set the script asks you to paste a token; one that turns out not to be allowed to mint is
offered for storing as-is instead.
