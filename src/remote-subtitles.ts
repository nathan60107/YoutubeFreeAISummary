/**
 * Off-page subtitle capture: fetches subtitles for an arbitrary video id *without* opening its
 * watch page, so the thumbnail overlay button (see `thumbnails.ts`) can summarize straight from a
 * home/search/related list.
 *
 * The on-page strategies in `subtitles.ts` (intercepting the player's timedtext request, scraping
 * the transcript panel) all need the player to be running, which it isn't off-page. And the static
 * `captionTracks[].baseUrl` from a normal (WEB) player response is now PoToken-gated (`exp=xpe`) and
 * returns an empty body when fetched directly.
 *
 * So instead we ask YouTube's InnerTube `player` endpoint for a fresh player response while
 * impersonating the **ANDROID** client: that client's `captionTracks[].baseUrl` is *not* PoToken-
 * gated, so we can fetch it as `fmt=json3` and parse it with the same code path as the watch page.
 * The request is same-origin (we're on youtube.com), so it just works under YouTube's CSP.
 *
 * The ANDROID request is *unauthenticated* (that client ignores the web session), so member-only /
 * age-restricted / private videos come back unplayable. For those we fall back to a second request:
 * the **WEB** client, authenticated with the user's session (`SAPISIDHASH`), but with a *minimal*
 * client context. The PoToken gating of caption URLs is switched on by the experiment config the
 * page normally sends along (`context.client.configInfo`); leave it out and the very same WEB
 * client hands back plain, directly fetchable `baseUrl`s — for exactly the videos the signed-in
 * user is entitled to watch.
 *
 * Only when both fail (e.g. signed out, or YouTube closes that gap) does the caller fall back to
 * opening the watch page, where the interceptor strategy uses the real player.
 */

import {
  defaultPreferredLangs,
  getCaptionTracks,
  parseJson3,
  pickTrack,
  toTimedText,
  trackName,
  type CaptureOptions,
  type Json3Response,
  type SubtitleResult,
  type YtPlayerResponse,
} from "./subtitle-core";
import { warn } from "./log";

/** A subtitle capture plus the title/URL of the (remote) video it came from. */
export type RemoteSubtitleResult = SubtitleResult & {
  /** The video id these subtitles belong to. */
  videoId: string;
  /** The video's title, read from its fetched player response. */
  videoTitle: string;
  /** The uploading channel's name, read from its fetched player response (`""` if absent). */
  videoChannel: string;
  /** The canonical watch URL for the video. */
  videoUrl: string;
};

/**
 * ANDROID InnerTube client identity. The ANDROID client's caption `baseUrl`s aren't PoToken-gated,
 * which is the whole reason we impersonate it here. The version drifts over time but YouTube is
 * lenient about it; bump it if the endpoint starts rejecting requests.
 */
const ANDROID_CLIENT = {
  clientName: "ANDROID",
  clientVersion: "20.10.38",
  androidSdkVersion: 30,
} as const;

/** Public WEB InnerTube key, used only as a fallback if the page's own key can't be read. */
const FALLBACK_INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

/** Page realm, where YouTube's `ytcfg` (holding the real InnerTube key) lives. */
const pageWindow = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as unknown as {
  ytcfg?: { get?: (k: string) => unknown; data_?: Record<string, unknown> };
};

/** Builds the canonical watch URL for a video id. */
export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Reads the page's own InnerTube API key (from `ytcfg`), falling back to the public WEB key. */
function getInnertubeApiKey(): string {
  try {
    const key = pageWindow.ytcfg?.get?.("INNERTUBE_API_KEY")
      ?? pageWindow.ytcfg?.data_?.INNERTUBE_API_KEY;
    if(typeof key === "string" && key.length > 0)
      return key;
  }
  catch { /* fall through to the constant */ }
  return FALLBACK_INNERTUBE_API_KEY;
}

/**
 * Fetches a fresh player response for `videoId` from the InnerTube `player` endpoint using the
 * ANDROID client, so the caption `baseUrl`s it returns are usable without a PoToken.
 */
async function fetchAndroidPlayerResponse(videoId: string): Promise<YtPlayerResponse | null> {
  const apiKey = getInnertubeApiKey();
  const hl = (navigator.language || "en").split("-")[0];

  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-YouTube-Client-Name": "3", // 3 = ANDROID
      "X-YouTube-Client-Version": ANDROID_CLIENT.clientVersion,
    },
    body: JSON.stringify({ context: { client: { ...ANDROID_CLIENT, hl } }, videoId }),
  });

  if(!res.ok) {
    warn(`InnerTube player request for ${videoId} failed with HTTP ${res.status}`);
    return null;
  }
  return await res.json() as YtPlayerResponse;
}

/** Fallback WEB client version, used only if the page's own (`ytcfg`) can't be read. */
const FALLBACK_WEB_CLIENT_VERSION = "2.20260101.00.00";

/** Reads a string value from the page's `ytcfg`, or `undefined` if it's missing/unreadable. */
function getYtcfgString(key: string): string | undefined {
  try {
    const value = pageWindow.ytcfg?.get?.(key) ?? pageWindow.ytcfg?.data_?.[key];
    if(typeof value === "string" && value.length > 0)
      return value;
    if(typeof value === "number")
      return String(value);
  }
  catch { /* unreadable — treat as missing */ }
  return undefined;
}

/**
 * Builds the `Authorization: SAPISIDHASH …` value that authenticates an InnerTube request as the
 * signed-in user, or `null` when no session cookie is readable (signed out).
 */
async function buildSapisidHash(): Promise<string | null> {
  const sapisid = /(?:^|;\s*)(?:SAPISID|__Secure-3PAPISID)=([^;]+)/.exec(document.cookie)?.[1];
  if(!sapisid)
    return null;

  const timestamp = Math.floor(Date.now() / 1000);
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(`${timestamp} ${sapisid} ${location.origin}`),
  );
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return `SAPISIDHASH ${timestamp}_${hex}`;
}

/**
 * Fetches a player response for `videoId` as the signed-in user via the WEB client, for gated
 * videos the anonymous ANDROID request can't play. Returns `null` when signed out or on HTTP error.
 *
 * The client context is deliberately minimal: sending the page's full `INNERTUBE_CONTEXT` (namely
 * its `configInfo` experiment blob) makes YouTube return PoToken-gated (`exp=xpe`) caption URLs,
 * whose bodies are empty when fetched directly. Don't "improve" this by passing the full context.
 */
async function fetchAuthedWebPlayerResponse(videoId: string): Promise<YtPlayerResponse | null> {
  const authorization = await buildSapisidHash();
  if(!authorization)
    return null;

  const hl = (navigator.language || "en").split("-")[0];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": authorization,
    "X-Origin": location.origin,
    "X-Goog-AuthUser": getYtcfgString("SESSION_INDEX") ?? "0",
  };
  // Set when the user is acting as a brand account/channel; memberships belong to that identity.
  const pageId = getYtcfgString("DELEGATED_SESSION_ID");
  if(pageId)
    headers["X-Goog-PageId"] = pageId;

  const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      context: {
        client: {
          clientName: "WEB",
          clientVersion: getYtcfgString("INNERTUBE_CLIENT_VERSION") ?? FALLBACK_WEB_CLIENT_VERSION,
          hl,
        },
      },
      videoId,
    }),
  });

  if(!res.ok) {
    warn(`Authenticated InnerTube player request for ${videoId} failed with HTTP ${res.status}`);
    return null;
  }
  return await res.json() as YtPlayerResponse;
}

/** Fetches a caption track's `baseUrl` as `fmt=json3` and parses it into segments. */
async function fetchTrackSegments(baseUrl: string) {
  const url = new URL(baseUrl, "https://www.youtube.com");
  url.searchParams.set("fmt", "json3");

  const res = await fetch(url.toString(), { credentials: "include" });
  if(!res.ok)
    return null;

  const body = await res.text();
  if(body.trim().length === 0)
    return null;

  const segments = parseJson3(JSON.parse(body) as Json3Response);
  return segments.length > 0 ? segments : null;
}

/** The `playabilityStatus.status` field, when present, tells us why a video is inaccessible. */
type PlayerResponseWithStatus = YtPlayerResponse & { playabilityStatus?: { status?: string } };

/**
 * Turns a fetched player response into a subtitle result.
 * Returns `null` if the video is playable but has no caption tracks at all.
 *
 * @throws if the response is missing/unplayable or a track exists but its text couldn't be fetched.
 */
async function captureFromPlayerResponse(
  videoId: string,
  resp: PlayerResponseWithStatus | null,
  preferredLangs: string[],
): Promise<RemoteSubtitleResult | null> {
  if(!resp)
    throw new Error(`No player response for ${videoId}`);

  const track = pickTrack(getCaptionTracks(resp), preferredLangs);
  if(!track) {
    // No tracks can mean "genuinely no captions" or "this client couldn't play it" (member-only /
    // age-restricted / private): distinguish so the caller can try another way in.
    const status = resp.playabilityStatus?.status;
    if(status && status !== "OK")
      throw new Error(`Video ${videoId} is not accessible off-page (${status})`);
    return null; // no captions at all
  }

  if(!track.baseUrl)
    throw new Error(`Caption track for ${videoId} has no baseUrl to fetch`);

  const segments = await fetchTrackSegments(track.baseUrl);
  if(!segments)
    throw new Error(`Found a caption track for ${videoId} but its timedtext body was empty`);

  return {
    videoId,
    videoTitle: resp.videoDetails?.title ?? "",
    videoChannel: resp.videoDetails?.author ?? "",
    videoUrl: watchUrl(videoId),
    lang: track.languageCode,
    trackName: trackName(track),
    segments,
    text: segments.map(s => s.text).join("\n"),
    timedText: toTimedText(segments),
    source: "innertube-player",
  };
}

/**
 * Captures subtitles for `videoId` without opening its watch page: first through the anonymous
 * ANDROID player, then — for gated videos it can't play — through the signed-in WEB player.
 * Returns `null` if the video has no caption tracks at all.
 *
 * @throws if neither player could reach the video or its caption text; open the watch page instead.
 */
export async function getSubtitlesForVideo(
  videoId: string,
  opts: CaptureOptions = {},
): Promise<RemoteSubtitleResult | null> {
  const preferredLangs = opts.preferredLangs ?? defaultPreferredLangs();

  try {
    return await captureFromPlayerResponse(videoId, await fetchAndroidPlayerResponse(videoId), preferredLangs);
  }
  catch(err) {
    // TODO: once the thumbnail button gets its own settings (on/off, position), add an option to
    // skip this signed-in retry and go straight to the auto-summary tab instead (see README roadmap).
    warn(`ANDROID off-page capture failed for ${videoId}; retrying with the signed-in WEB player:`, err);
  }

  return await captureFromPlayerResponse(videoId, await fetchAuthedWebPlayerResponse(videoId), preferredLangs);
}
