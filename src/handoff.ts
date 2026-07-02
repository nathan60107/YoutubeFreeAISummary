/**
 * Cross-tab handoff between the YouTube tab (which captures subtitles) and the AI Studio tab
 * (which injects them). GM storage is shared across all tabs running this userscript, so the
 * payload survives the `openInTab` jump without going through the URL (avoiding length limits).
 * ⚠️ Requires the directives `@grant GM.setValue`, `@grant GM.getValue`, `@grant GM.deleteValue`
 */

import type { SummaryPayload } from "./types";

const storageKey = "yfswg-pending-summary";

/** Stores a captured payload for the AI Studio tab to pick up. */
export async function stashSummaryPayload(payload: SummaryPayload): Promise<void> {
  await GM.setValue(storageKey, JSON.stringify(payload));
}

/**
 * Reads and removes the pending payload (one-shot). Returns `null` if there is none or it is
 * older than `maxAgeMs` (a stale handoff from a previous, unrelated session).
 */
export async function takeSummaryPayload(maxAgeMs = 5 * 60_000): Promise<SummaryPayload | null> {
  const raw = await GM.getValue<string>(storageKey, "");
  if(!raw)
    return null;

  await GM.deleteValue(storageKey);

  try {
    const payload = JSON.parse(raw) as SummaryPayload;
    if(typeof payload.createdAt !== "number" || Date.now() - payload.createdAt > maxAgeMs)
      return null;
    return payload;
  }
  catch {
    return null;
  }
}
