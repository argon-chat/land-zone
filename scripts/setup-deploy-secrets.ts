#!/usr/bin/env bun
/**
 * Fills in the secrets `.github/workflows/deploy.yml` needs, on the repo the workflow runs in.
 *
 *   CLOUDFLARE_API_TOKEN        minted here, scoped to "Cloudflare Pages: Write" on one account
 *   CLOUDFLARE_ACCOUNT_ID       read off the account the token was scoped to
 *   FIREBASE_SERVICE_ACCOUNT    a key for a dedicated service account, created here via gcloud
 *   FIREBASE_TOKEN              the `firebase login:ci` refresh token — only if gcloud is not usable
 *
 * Run it once per repository, and again whenever a credential is rotated.
 *
 * Nothing here prints a secret, writes one anywhere under the repo, or passes one as a command-line
 * argument (argv is world-readable on most systems). Values reach `gh` over stdin. The one file that
 * ever holds a credential is the gcloud key, written to the OS temp dir and unlinked before exit.
 */

import { spawnSync } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CF_API = "https://api.cloudflare.com/client/v4";

/**
 * Characters that survive double-quoting inside cmd.exe and would still change what runs: `"` ends
 * the quoting, `%` is expanded even inside quotes, and a newline splits the command line. Consulted
 * on Windows only — see `run`.
 */
const CMD_UNSAFE = /["%\r\n\u0000]/;

const USAGE = `
Fills in the Actions secrets that .github/workflows/deploy.yml needs.

  bun run setup:ci-secrets [-- <options>]

  --repo <owner/name>          target repository (default: this checkout's origin)
  --only <both|cloudflare|firebase>
  --firebase-mode <service-account|token>
                               default: service-account when gcloud is available
  --cf-account <id>            skip account discovery
  --dry-run                    report what would happen; create and store nothing
  --yes, -y                    skip the confirmation
  --help, -h

Cloudflare needs a bootstrap credential, because an API token cannot mint itself. Put one in the
environment before running:

  PowerShell   $env:CLOUDFLARE_BOOTSTRAP_TOKEN = "..."
  bash         export CLOUDFLARE_BOOTSTRAP_TOKEN=...

Make it at https://dash.cloudflare.com/profile/api-tokens with User · API Tokens · Edit and
Account · Account Settings · Read. CLOUDFLARE_API_TOKEN and CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL
are read too; with none of them set the script asks you to paste one. A token that cannot mint is
offered for storing as-is instead.

Firebase needs an authenticated gcloud that may create service accounts and grant roles on the
project; otherwise it falls back to a pasted \`firebase login:ci\` token.
`;

// ── shell ───────────────────────────────────────────────────────────────────────────────────────

interface RunResult {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs a command, optionally feeding it something on stdin. Secrets go through `input`, never
 * through `args` — argv is world-readable on most systems.
 *
 * Windows needs `shell: true`, because gcloud and friends ship as `.cmd` shims and Node refuses to
 * execute one without a shell. That shell is also the only reason any of this is delicate: with
 * `shell: true` Node joins the arguments with spaces and quotes none of them, so a path such as
 * C:\Users\Jane Doe\AppData\Local\Temp\key.json arrives as three arguments. Each one is therefore
 * quoted here, and the few characters that double quotes do not tame are refused outright.
 *
 * Everywhere else there is no shell, arguments reach execve exactly as written, and nothing needs
 * escaping or restricting.
 */
function run(cmd: string, args: string[], input?: string): RunResult {
  const shell = process.platform === "win32";
  if (shell) {
    for (const arg of args) {
      if (CMD_UNSAFE.test(arg)) throw new Error(`refusing to pass an unquotable argument: ${arg}`);
    }
  }
  const result = spawnSync(cmd, shell ? args.map((arg) => `"${arg}"`) : args, {
    input,
    encoding: "utf8",
    shell,
  });
  return {
    ok: result.status === 0,
    code: result.status,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

const have = (cmd: string): boolean => run(cmd, ["--version"]).ok;

// ── console ─────────────────────────────────────────────────────────────────────────────────────

const say = (msg = ""): void => void process.stdout.write(`${msg}\n`);
const step = (msg: string): void => say(`\n\x1b[1m${msg}\x1b[0m`);
const ok = (msg: string): void => say(`  \x1b[32m✓\x1b[0m ${msg}`);
const info = (msg: string): void => say(`  \x1b[2m·\x1b[0m ${msg}`);
const warn = (msg: string): void => say(`  \x1b[33m!\x1b[0m ${msg}`);

function die(msg: string): never {
  process.stderr.write(`\n\x1b[31m✗ ${msg}\x1b[0m\n`);
  process.exit(1);
}

/** readline's echo hook is not on the public type, but muting a credential prompt needs it. */
type MutableInterface = Interface & { _writeToOutput?: (chunk: string) => void };

function ask(question: string, muted = false): Promise<string> {
  const rl: MutableInterface = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  if (muted) {
    // Left to itself readline echoes as you type, which would leave a pasted credential in the
    // scrollback and in any terminal recording. Write the prompt by hand, then silence the rest.
    process.stdout.write(question);
    rl._writeToOutput = () => {};
  }
  return new Promise((resolve) => {
    rl.question(muted ? "" : question, (answer) => {
      rl.close();
      if (muted) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function confirm(question: string): Promise<boolean> {
  return /^y(es)?$/i.test(await ask(`${question} [y/N] `));
}

// ── github ──────────────────────────────────────────────────────────────────────────────────────

/** owner/name of the repo this checkout pushes to. */
function detectRepo(): string | null {
  const remote = run("git", ["remote", "get-url", "origin"]);
  if (!remote.ok) return null;
  const match = remote.stdout.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function setSecret(repo: string, name: string, value: string, dryRun: boolean): void {
  if (!value) throw new Error(`refusing to store an empty ${name}`);
  if (dryRun) {
    info(`would set ${name} (${value.length} chars) on ${repo}`);
    return;
  }
  const result = run("gh", ["secret", "set", name, "--repo", repo, "--app", "actions"], value);
  if (!result.ok) die(`gh secret set ${name} failed: ${result.stderr || result.stdout}`);
  ok(`${name} set on ${repo}`);
}

// ── cloudflare ──────────────────────────────────────────────────────────────────────────────────

interface CfEnvelope<T> {
  success: boolean;
  result: T;
  errors?: { code: number; message: string }[];
  result_info?: { page: number; per_page: number; total_pages: number; total_count: number };
}

interface CfAccount {
  id: string;
  name: string;
}
interface CfPermissionGroup {
  id: string;
  name: string;
  scopes?: string[];
}
interface CfToken {
  id: string;
  name?: string;
  value?: string;
}
interface CfVerify {
  status: string;
}

/**
 * The credential the script authenticates *with*, which is not the one it produces. `token` here is
 * set only when that credential is a bearer token we could fall back to storing verbatim — a global
 * key never can be, and neither can one we are told is bootstrap-only.
 */
type CfAuth = { kind: string; headers: Record<string, string>; token: string | null };

const bearer = (kind: string, token: string, storable: boolean): CfAuth => ({
  kind,
  headers: { Authorization: `Bearer ${token}` },
  token: storable ? token : null,
});

/**
 * Bootstrap credential from the environment.
 *
 * CLOUDFLARE_BOOTSTRAP_TOKEN is the name to reach for: it says what the token is for, and it does
 * not collide with the CLOUDFLARE_API_TOKEN that wrangler and the rest of the toolchain read — a
 * token allowed to mint other tokens is not one you want sitting in the shell you deploy from.
 * CLOUDFLARE_API_TOKEN is still accepted, for the case where it is the only one you have.
 */
function cloudflareBootstrapAuth(): CfAuth | null {
  const { CLOUDFLARE_BOOTSTRAP_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_API_KEY, CLOUDFLARE_EMAIL } = process.env;
  if (CLOUDFLARE_BOOTSTRAP_TOKEN)
    return bearer("CLOUDFLARE_BOOTSTRAP_TOKEN", CLOUDFLARE_BOOTSTRAP_TOKEN, false);
  if (CLOUDFLARE_API_TOKEN) return bearer("CLOUDFLARE_API_TOKEN", CLOUDFLARE_API_TOKEN, true);
  if (CLOUDFLARE_API_KEY && CLOUDFLARE_EMAIL)
    return {
      kind: "global key",
      headers: { "X-Auth-Key": CLOUDFLARE_API_KEY, "X-Auth-Email": CLOUDFLARE_EMAIL },
      token: null,
    };
  return null;
}

async function cfEnvelope<T>(
  path: string,
  init: { method?: string; body?: unknown; headers: Record<string, string> },
): Promise<CfEnvelope<T>> {
  const response = await fetch(`${CF_API}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const payload = (await response.json().catch(() => null)) as CfEnvelope<T> | null;
  if (!payload?.success) {
    const detail =
      payload?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${response.status}`;
    throw new Error(`${init.method ?? "GET"} ${path} — ${detail}`);
  }
  return payload;
}

async function cf<T>(
  path: string,
  init: { method?: string; body?: unknown; headers: Record<string, string> },
): Promise<T> {
  return (await cfEnvelope<T>(path, init)).result;
}

/**
 * Every page of a list endpoint.
 *
 * Not an optimisation: /user/tokens/permission_groups is several hundred entries against a default
 * page size of 50, so a single unpaged GET quietly returns a slice that does not contain the group
 * you are looking for, and the only symptom is "not found".
 */
async function cfList<T>(path: string, headers: Record<string, string>, perPage = 50): Promise<T[]> {
  const separator = path.includes("?") ? "&" : "?";
  const items: T[] = [];
  for (let page = 1; page <= 50; page++) {
    const envelope = await cfEnvelope<T[]>(`${path}${separator}per_page=${perPage}&page=${page}`, { headers });
    items.push(...envelope.result);
    const info = envelope.result_info;
    if (!info || page >= info.total_pages || envelope.result.length === 0) break;
  }
  return items;
}

interface CloudflareOptions {
  repo: string;
  dryRun: boolean;
  accountIdOverride: string | null;
}

async function setupCloudflare({ repo, dryRun, accountIdOverride }: CloudflareOptions): Promise<void> {
  step("Cloudflare Pages");

  let auth = cloudflareBootstrapAuth();

  // Nothing in the environment: ask for the same thing the environment would have supplied. Whether
  // it can mint is decided by trying, not by asking the operator to classify their own token.
  if (!auth) {
    warn("no Cloudflare credential in the environment");
    info("set CLOUDFLARE_BOOTSTRAP_TOKEN (or CLOUDFLARE_API_KEY + CLOUDFLARE_EMAIL) and re-run,");
    info("or paste a token here. Make one at https://dash.cloudflare.com/profile/api-tokens with");
    info("User · API Tokens · Edit  +  Account · Account Settings · Read, and a scoped Pages token");
    info("is created from it. A plain Account · Cloudflare Pages · Edit token is stored as-is.");
    const pasted = await ask("  Cloudflare API token (input hidden, empty to skip): ", true);
    if (!pasted) {
      warn("skipped Cloudflare");
      return;
    }
    auth = bearer("the token you pasted", pasted, true);
  } else {
    info(`bootstrapping with ${auth.kind} from the environment`);
  }

  // A token that is expired or revoked fails every call below with a different message each time.
  const check = await cf<CfVerify>("/user/tokens/verify", { headers: auth.headers }).catch(() => null);
  if (check && check.status !== "active") die(`that credential verifies as "${check.status}"`);

  const accountId = await resolveAccountId(auth, accountIdOverride);

  const minted = await mintPagesToken(auth, accountId, dryRun);
  if (minted) {
    setSecret(repo, "CLOUDFLARE_API_TOKEN", minted, dryRun);
    setSecret(repo, "CLOUDFLARE_ACCOUNT_ID", accountId, dryRun);
    return;
  }

  // Minting failed. If what we hold is itself a bearer token, it may simply be the Pages token the
  // operator already made, in which case storing it is the right answer — but that hands CI whatever
  // else it can do, so it is asked rather than assumed.
  if (!auth.token)
    die("could not mint a token, and a global key cannot be stored — give the bootstrap token \"User API Tokens: Write\"");
  warn("storing it as-is gives CI every permission that token has, not just Pages");
  if (!(await confirm(`  store ${auth.kind} as CLOUDFLARE_API_TOKEN instead?`))) die("cancelled");

  setSecret(repo, "CLOUDFLARE_API_TOKEN", auth.token, dryRun);
  setSecret(repo, "CLOUDFLARE_ACCOUNT_ID", accountId, dryRun);
}

/** The account the Pages project lives under, asked for only when the credential cannot list them. */
async function resolveAccountId(auth: CfAuth, override: string | null): Promise<string> {
  if (override) {
    ok(`account ${override}`);
    return override;
  }

  const accounts = await cfList<CfAccount>("/accounts", auth.headers).catch(() => null);
  if (!accounts || accounts.length === 0) {
    warn("that credential cannot list accounts — it is missing Account · Account Settings · Read");
    const entered = await ask("  Cloudflare account id: ");
    if (!entered) die("an account id is required — it is the hex string in the dashboard URL");
    return entered;
  }

  let chosen = accounts[0]!;
  if (accounts.length > 1) {
    say("  more than one account is visible:");
    accounts.forEach((a, i) => say(`    ${i + 1}. ${a.name} — ${a.id}`));
    const pick = Number(await ask("  which one? "));
    if (!Number.isInteger(pick) || pick < 1 || pick > accounts.length) die("not one of the listed accounts");
    chosen = accounts[pick - 1]!;
  }
  ok(`account ${chosen.id} (${chosen.name})`);
  return chosen.id;
}

/**
 * The account-scoped group that grants "deploy a Pages project".
 *
 * Matched by shape and not by one exact string: Cloudflare has renamed this group before (it has
 * shipped as both "Cloudflare Pages Write" and "Pages Write", and Workers/Pages naming keeps
 * shifting), and pinning the label means the script breaks on a rename with a "not found" that
 * looks like a permissions problem.
 */
function findPagesWriteGroup(groups: CfPermissionGroup[]): CfPermissionGroup | undefined {
  const accountScoped = groups.filter((g) => g.scopes?.includes("com.cloudflare.api.account"));
  return (
    accountScoped.find((g) => g.name === "Cloudflare Pages Write") ??
    accountScoped.find((g) => g.name === "Pages Write") ??
    accountScoped.find((g) => /pages/i.test(g.name) && /(write|edit)/i.test(g.name))
  );
}

/**
 * Mints a token that may do exactly one thing: deploy Pages on one account. Returns null when the
 * bootstrap credential is not allowed to create tokens, which is an ordinary outcome here and not
 * an error — the caller has a fallback.
 */
async function mintPagesToken(auth: CfAuth, accountId: string, dryRun: boolean): Promise<string | null> {
  // Permission group ids are per-instance UUIDs, so they are looked up by name rather than pinned.
  const groups = await cfList<CfPermissionGroup>("/user/tokens/permission_groups", auth.headers).catch(
    (error: unknown) => {
      warn(`cannot read permission groups: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    },
  );
  if (!groups) return null;

  const pagesWrite = findPagesWriteGroup(groups);
  if (!pagesWrite) {
    warn("no account-scoped Pages write permission group is visible to this credential");
    const nearby = groups.filter((g) => /pages/i.test(g.name)).map((g) => g.name);
    if (nearby.length > 0) info(`groups mentioning Pages: ${[...new Set(nearby)].join(", ")}`);
    return null;
  }
  info(`using permission group "${pagesWrite.name}"`);

  const name = `land-zone CI ${new Date().toISOString().slice(0, 10)}`;

  // A token is readable only at creation, so a re-run always mints a new one. The old ones keep
  // working until somebody revokes them, which is worth saying out loud rather than leaving to be
  // discovered later.
  const existing = await cfList<CfToken>("/user/tokens", auth.headers).catch(() => []);
  const stale = existing.filter((t) => t.name?.startsWith("land-zone CI"));
  if (stale.length > 0) {
    warn(`${stale.length} older land-zone CI token(s) still active — revoke once the new one is deployed:`);
    for (const t of stale) info(`${t.name} (${t.id}) — https://dash.cloudflare.com/profile/api-tokens`);
  }

  if (dryRun) {
    info(`would create token "${name}" with Cloudflare Pages Write on account ${accountId}`);
    return "dry-run-placeholder";
  }

  const created = await cf<CfToken>("/user/tokens", {
    method: "POST",
    headers: auth.headers,
    body: {
      name,
      policies: [
        {
          effect: "allow",
          resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
          permission_groups: [{ id: pagesWrite.id }],
        },
      ],
    },
  }).catch((error: unknown) => {
    warn(`cannot create a token: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  if (!created?.value) return null;
  ok(`minted "${name}" (id ${created.id})`);

  // Cloudflare hands the token back before it has fully propagated; verifying now turns a 403 at
  // deploy time three days from now into a failure here, where the cause is in front of you.
  const verified = await cf<CfVerify>("/user/tokens/verify", {
    headers: { Authorization: `Bearer ${created.value}` },
  });
  if (verified.status !== "active") die(`the new token verifies as "${verified.status}" rather than active`);
  ok("token verifies as active");

  return created.value;
}


// ── firebase ────────────────────────────────────────────────────────────────────────────────────

/** The project the landing deploys to, from .firebaserc rather than a second copy of the name. */
function firebaseProject(): string | null {
  try {
    const rc = JSON.parse(readFileSync(new URL("../.firebaserc", import.meta.url), "utf8")) as {
      projects?: { default?: string };
    };
    return rc.projects?.default ?? null;
  } catch {
    return null;
  }
}

/**
 * The roles the deploy actually exercises:
 *   firebasehosting.admin              upload a version and release it
 *   firebase.viewer                    resolve the site named in firebase.json against the project
 *   serviceusage.serviceUsageConsumer  spend the project's API quota rather than nobody's
 */
const FIREBASE_ROLES = [
  "roles/firebasehosting.admin",
  "roles/firebase.viewer",
  "roles/serviceusage.serviceUsageConsumer",
];

async function setupFirebaseViaGcloud(repo: string, dryRun: boolean, project: string): Promise<void> {
  const account = "land-zone-ci";
  const email = `${account}@${project}.iam.gserviceaccount.com`;

  if (run("gcloud", ["iam", "service-accounts", "describe", email, "--project", project]).ok) {
    ok(`service account ${email} already exists`);
  } else if (dryRun) {
    info(`would create service account ${email}`);
  } else {
    const created = run("gcloud", [
      "iam", "service-accounts", "create", account,
      "--project", project,
      "--display-name", "land-zone GitHub Actions",
    ]);
    if (!created.ok) die(`could not create the service account: ${created.stderr || created.stdout}`);
    ok(`created ${email}`);
  }

  for (const role of FIREBASE_ROLES) {
    if (dryRun) {
      info(`would grant ${role}`);
      continue;
    }
    const granted = run("gcloud", [
      "projects", "add-iam-policy-binding", project,
      "--member", `serviceAccount:${email}`,
      "--role", role,
      "--condition=None",
      "--quiet",
      "--no-user-output-enabled",
    ]);
    if (!granted.ok) die(`could not grant ${role}: ${granted.stderr || granted.stdout}`);
    ok(`granted ${role}`);
  }

  if (dryRun) {
    info("would create a JSON key and store it as FIREBASE_SERVICE_ACCOUNT");
    setSecret(repo, "FIREBASE_SERVICE_ACCOUNT", "dry-run-placeholder", dryRun);
    return;
  }

  // gcloud will only write a key to a path, so it briefly exists on disk. Keep that window as short
  // as possible, and inside a directory only this user can read.
  const dir = mkdtempSync(join(tmpdir(), "land-zone-ci-"));
  const keyPath = join(dir, "key.json");
  try {
    const key = run("gcloud", [
      "iam", "service-accounts", "keys", "create", keyPath,
      "--iam-account", email,
      "--project", project,
    ]);
    if (!key.ok) die(`could not create a key: ${key.stderr || key.stdout}`);
    const json = readFileSync(keyPath, "utf8");
    JSON.parse(json); // a truncated key would otherwise fail in CI with a far worse message
    ok("created a new service-account key");
    setSecret(repo, "FIREBASE_SERVICE_ACCOUNT", json, dryRun);
    warn("this key is now the only copy — earlier keys stay valid until deleted:");
    info(`gcloud iam service-accounts keys list --iam-account ${email} --project ${project}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Proves gcloud can actually do something, before anything is created.
 *
 * `gcloud config get-value account` reads a local config file: it says who you last signed in as,
 * not whether that sign-in still works. An expired or revoked refresh token sails past that check
 * and then fails with "invalid_grant: Bad Request" on the first write — halfway through, with a
 * service account possibly already made. Refreshing a token and reading the project costs two round
 * trips and moves that failure to the top, where it is one sentence and nothing is half-done.
 */
function requireWorkingGcloud(project: string): void {
  const who = run("gcloud", ["config", "get-value", "account"]);
  if (!who.ok || !who.stdout || who.stdout.includes("(unset)"))
    die("gcloud has no active account — run: gcloud auth login");
  const account = who.stdout.split("\n")[0]!;

  // Only stderr is echoed on failure: on success this command's stdout is the access token itself.
  const refreshed = run("gcloud", ["auth", "print-access-token"]);
  if (!refreshed.ok) {
    if (refreshed.stderr) say(`\n${refreshed.stderr}\n`);
    die(`gcloud cannot refresh the credentials for ${account} — run: gcloud auth login`);
  }

  const reachable = run("gcloud", ["projects", "describe", project, "--quiet"]);
  if (!reachable.ok) {
    if (reachable.stderr) say(`\n${reachable.stderr}\n`);
    die(`${account} cannot see project ${project} — switch with: gcloud config set account ACCOUNT`);
  }

  ok(`gcloud is signed in as ${account} and can reach ${project}`);
}


async function setupFirebaseViaToken(repo: string, dryRun: boolean): Promise<void> {
  info("`firebase login:ci` prints a refresh token that cannot be scoped: it carries every permission");
  info("your own Google account has on the project. Prefer the service-account path where you can.");
  say();
  info("run this in another terminal, then paste the token below:");
  info("bunx firebase-tools login:ci");
  say();
  const token = await ask("  FIREBASE_TOKEN (input hidden, empty to skip): ", true);
  if (!token) {
    warn("skipped Firebase");
    return;
  }
  setSecret(repo, "FIREBASE_TOKEN", token, dryRun);
}

type FirebaseMode = "service-account" | "token";

async function setupFirebase(repo: string, dryRun: boolean, mode: FirebaseMode | null): Promise<void> {
  step("Firebase Hosting");

  const project = firebaseProject();
  if (!project) die("could not read the default project from .firebaserc");
  info(`project ${project}`);

  const gcloud = have("gcloud");
  const chosen: FirebaseMode = mode ?? (gcloud ? "service-account" : "token");

  if (chosen === "service-account") {
    if (!gcloud) die("--firebase-mode=service-account needs the gcloud CLI on PATH");
    requireWorkingGcloud(project);
    await setupFirebaseViaGcloud(repo, dryRun, project);
    return;
  }

  if (!gcloud) warn("gcloud not found, falling back to a login:ci token");
  await setupFirebaseViaToken(repo, dryRun);
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────

interface Options {
  repo: string | null;
  only: "both" | "cloudflare" | "firebase";
  dryRun: boolean;
  yes: boolean;
  help: boolean;
  firebaseMode: FirebaseMode | null;
  cfAccount: string | null;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    repo: null,
    only: "both",
    dryRun: false,
    yes: false,
    help: false,
    firebaseMode: null,
    cfAccount: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const value = (): string => argv[++i] ?? die(`${arg} needs a value`);
    if (arg === "--repo") options.repo = value();
    else if (arg === "--only") {
      const only = value();
      if (only !== "both" && only !== "cloudflare" && only !== "firebase")
        die("--only must be both, cloudflare or firebase");
      options.only = only;
    } else if (arg === "--firebase-mode") {
      const mode = value();
      if (mode !== "service-account" && mode !== "token")
        die("--firebase-mode must be service-account or token");
      options.firebaseMode = mode;
    } else if (arg === "--cf-account") options.cfAccount = value();
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--yes" || arg === "-y") options.yes = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else die(`unknown argument: ${arg}`);
  }
  return options;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    say(USAGE);
    return;
  }

  if (!have("gh")) die("the GitHub CLI is required — https://cli.github.com");
  if (!run("gh", ["auth", "status"]).ok) die("gh is not signed in — run `gh auth login`");

  const repo = options.repo ?? detectRepo();
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) die("could not work out the repository — pass --repo owner/name");

  say(`\nRepository   ${repo}`);
  say(`Providers    ${options.only}`);
  say(`Mode         ${options.dryRun ? "dry run — nothing will be created or stored" : "live"}`);

  if (!options.dryRun && !options.yes) {
    say();
    warn("this creates real credentials and writes them to that repository's Actions secrets");
    if (!(await confirm("continue?"))) die("cancelled");
  }

  if (options.only !== "firebase")
    await setupCloudflare({ repo, dryRun: options.dryRun, accountIdOverride: options.cfAccount });
  if (options.only !== "cloudflare") await setupFirebase(repo, options.dryRun, options.firebaseMode);

  step("Done");
  info(`gh secret list --repo ${repo}`);
  info(`gh workflow run Deploy --repo ${repo}`);
}

main().catch((error: unknown) => die(error instanceof Error ? error.message : String(error)));
