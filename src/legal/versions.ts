// SOURCE OF TRUTH for the current legal-document versions.
//
// Each document is versioned by a plain date string in DD.MM.YYYY form.
// Bump the relevant value whenever the corresponding *Body.vue changes, then
// run `bun run sync:legal` in the client to copy the updated template + version
// into client/src/legal/generated/. The client compares the user's accepted
// version against these to decide whether to force the update modal.

export const LEGAL_VERSIONS = {
  terms: "10.06.2026",
  privacy: "11.06.2026",
} as const;

export type LegalDoc = keyof typeof LEGAL_VERSIONS;
