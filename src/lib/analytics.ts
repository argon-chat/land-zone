// Client-side only telemetry for the Argon landing.
//
// We ship pure static (no SSR), so everything here runs in the browser.
// Two jobs:
//   1. Error monitoring via self-hosted Sentry.
//   2. "Who clicked what" metrics via Sentry's native metrics API
//      (Sentry.metrics.*), available since SDK v10.25.0.
//
// No Session Replay, no PII — keeps us aligned with the cookie banner
// and the privacy page. Clicks are anonymous counters.

import * as Sentry from '@sentry/browser';

const DSN = import.meta.env.PUBLIC_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.PUBLIC_SENTRY_ENV as string | undefined) ?? import.meta.env.MODE;
const RELEASE = import.meta.env.PUBLIC_SENTRY_RELEASE as string | undefined;
// Tracing is optional for metrics; keep it cheap on the self-hosted instance.
const TRACES_RATE = Number(import.meta.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

type Attrs = Record<string, string | number | boolean>;

let started = false;

/** Initialize Sentry + click tracking. Safe to call multiple times. */
export function initAnalytics(): void {
  if (started) return;
  // No DSN (e.g. local dev without env) → stay completely inert.
  if (!DSN) return;
  started = true;

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    release: RELEASE,
    // Privacy: never attach IP / cookies / request bodies.
    sendDefaultPii: false,
    // Light tracing gives metrics a trace context without burning quota.
    tracesSampleRate: Number.isFinite(TRACES_RATE) ? TRACES_RATE : 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    // Explicitly NO replayIntegration — we don't record sessions.
  });

  // Coarse, non-identifying context shared across every metric/event.
  try {
    Sentry.getGlobalScope().setAttributes({
      'browser.viewport': `${window.innerWidth}x${window.innerHeight}`,
      'browser.lang': navigator.language,
    });
  } catch {
    /* older SDKs / SSR guard — ignore */
  }

  setupClickTracking();
  trackPageview();
}

/** Record a custom metric event. No-op until initAnalytics() succeeds. */
export function track(event: string, attributes: Attrs = {}): void {
  if (!started) return;
  try {
    Sentry.metrics.count(event, 1, { attributes });
    // Breadcrumb so the same action shows up in the timeline of any error.
    Sentry.addBreadcrumb({ category: 'ui', message: event, level: 'info', data: attributes });
  } catch {
    /* never let telemetry throw into the UI */
  }
}

/** Count a page view. Called on load and on client-side navigation. */
export function trackPageview(): void {
  track('pageview', { page: location.pathname, title: document.title });
}

// ── Auto-capture clicks on every interactive element ──────────────────
// Capture phase so we still see clicks even when handlers stopPropagation
// (e.g. the footer heart easter egg).
function setupClickTracking(): void {
  document.addEventListener(
    'click',
    (e) => {
      const start = e.target as Element | null;
      if (!start) return;
      const el = start.closest('a, button, [role="button"], [data-track]');
      if (!el) return;

      const label = labelFor(el);
      const attrs: Attrs = {
        label,
        page: location.pathname,
        tag: el.tagName.toLowerCase(),
      };

      if (el instanceof HTMLAnchorElement && el.getAttribute('href')) {
        const href = el.getAttribute('href')!;
        attrs.href = href;
        try {
          const url = new URL(href, location.href);
          attrs.outbound = url.host !== location.host;
        } catch {
          /* relative / hash-only href — not outbound */
        }
      }

      track('ui.click', attrs);
    },
    { capture: true },
  );
}

/** Best label for a clicked element: explicit data-track wins, else derive. */
function labelFor(el: Element): string {
  const tagged = el.closest('[data-track]');
  const raw =
    tagged?.getAttribute('data-track') ||
    el.getAttribute('aria-label') ||
    el.id ||
    el.textContent?.replace(/\s+/g, ' ').trim() ||
    el.tagName.toLowerCase();
  return raw.slice(0, 80);
}
