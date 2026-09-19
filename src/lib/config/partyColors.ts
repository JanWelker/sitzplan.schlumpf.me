/**
 * Fallback color used when the live `ParlGroup.ParlGroupColour` field is
 * null (confirmed to happen for at least the Grünliberale/GLP group at time
 * of writing) or when a seat's parliamentary group can't be resolved at
 * all. Party colors are otherwise fetched live from the official API
 * (src/lib/api/parlGroups.ts) — this is intentionally the only hardcoded
 * color in the app.
 */
export const FALLBACK_PARTY_COLOR = '#9e9e9e';
