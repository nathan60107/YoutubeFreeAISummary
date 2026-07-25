/**
 * Intercepts the YouTube player's own `/api/timedtext` network requests so we can reuse the URL
 * it generates - which carries a valid PoToken and the user's auth session. This is the only way
 * to capture subtitles for PoToken-gated (`exp=xpe`) and member-only videos, where the static
 * `baseUrl` from the player response returns an empty body and `get_transcript` is rejected.
 *
 * Installed at document-start (before the player runs) by patching `fetch` and `XMLHttpRequest`
 * on the page realm via `unsafeWindow`.
 */

import { log } from "./log";

const timedtextMarker = "/api/timedtext";

/** Page realm, where the player's `fetch` / `XMLHttpRequest` live. */
const pageWindow = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as unknown as {
  fetch: typeof fetch;
  XMLHttpRequest: typeof XMLHttpRequest;
};

/** Most recently observed timedtext URL (from the page's own requests). */
let latestUrl: string | null = null;

let installed = false;

/** Records the URL if it is a timedtext request, so callers can reuse it. */
function record(rawUrl: string): void {
  if(rawUrl.includes(timedtextMarker))
    latestUrl = rawUrl;
}

/** Patches `fetch` and `XMLHttpRequest.open` on the page realm. Idempotent. */
export function installTimedtextInterceptor(): void {
  if(installed)
    return;
  installed = true;

  // fetch
  const origFetch = pageWindow.fetch;
  pageWindow.fetch = function(this: unknown, ...args: Parameters<typeof fetch>) {
    try {
      const input = args[0];
      const url = typeof input === "string"
        ? input
        : input instanceof URL ? input.href : input.url;
      record(url);
    }
    catch { /* never let interception break the page's request */ }
    return origFetch.apply(this, args);
  };

  // XMLHttpRequest
  const proto = pageWindow.XMLHttpRequest?.prototype;
  if(proto) {
    const origOpen = proto.open as (...a: unknown[]) => void;
    proto.open = function(this: XMLHttpRequest, ...args: [string, string | URL, ...unknown[]]) {
      try {
        const u = args[1];
        record(typeof u === "string" ? u : u.href);
      }
      catch { /* ignore */ }
      return origOpen.apply(this, args);
    } as typeof proto.open;
  }

  log("timedtext interceptor installed");
}

/** True when `url` belongs to `videoId` (or any video when `videoId` is omitted). */
function matchesVideo(url: string, videoId?: string): boolean {
  return !videoId || url.includes(`v=${videoId}`);
}

/**
 * Returns the most recently captured timedtext URL for `videoId` (or the latest one), or `null` if
 * none has been observed yet. Callers poll this after nudging the player into issuing a request.
 */
export function peekTimedtextUrl(videoId?: string): string | null {
  return latestUrl && matchesVideo(latestUrl, videoId) ? latestUrl : null;
}
