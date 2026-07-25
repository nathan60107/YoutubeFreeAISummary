/**
 * Page-based YouTube subtitle extraction.
 *
 * Design goal (see project memory): capture subtitles directly from the page the user
 * is already watching, never via an external subtitle API. This is what makes the script
 * work on member-only / region-locked / age-restricted videos, and avoids the third-party
 * scraper breakage caused by YouTube's PoToken (`&exp=xpe`) requirement.
 *
 * Two layered strategies, tried in order:
 *  1. Intercept the player's own `/api/timedtext` request (it carries a valid PoToken and the
 *     user's session) and refetch it as `fmt=json3`.
 *  2. DOM scrape of YouTube's own "Show transcript" panel.
 *
 * The types and pure parsing helpers shared with the off-page path live in `subtitle-core.ts`.
 */

import { peekTimedtextUrl } from "./intercept";
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
  type SubtitleSegment,
  type YtPlayerResponse,
} from "./subtitle-core";
import { warn } from "./log";
import { delay, waitForSelector } from "./utils";

//#region page-global access

/** The `#movie_player` element exposes these methods at runtime. */
type MoviePlayer = HTMLElement & {
  getPlayerResponse?: () => YtPlayerResponse;
  playVideo?: () => void;
};

/**
 * Page globals (`ytInitialPlayerResponse`, the player element's methods) live in the page's
 * realm. In sandboxed userscript engines we need `unsafeWindow` to reach them.
 */
const pageWindow = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as Window & {
  ytInitialPlayerResponse?: YtPlayerResponse;
};

//#endregion
//#region player response

/**
 * Returns the most up-to-date player response. `movie_player.getPlayerResponse()` reflects the
 * currently playing video after SPA navigation, whereas `ytInitialPlayerResponse` goes stale.
 */
function getPlayerResponse(): YtPlayerResponse | undefined {
  try {
    const player = (pageWindow.document ?? document).getElementById("movie_player") as MoviePlayer | null;
    const fromPlayer = player?.getPlayerResponse?.();
    if(fromPlayer?.captions)
      return fromPlayer;
  }
  catch(err) {
    warn("getPlayerResponse() unavailable, falling back to ytInitialPlayerResponse:", err);
  }
  return pageWindow.ytInitialPlayerResponse;
}

//#endregion
//#region strategy 1: intercepted player timedtext request

/**
 * Whether a captured timedtext URL can actually be fetched for text. A PoToken-gated (`exp=xpe`)
 * request returns an empty body unless it carries a `pot=` token; any other request (non-gated, or
 * already token-bearing) is fetchable as-is.
 */
function isFetchable(url: string | null): url is string {
  return !!url && !(/[?&]exp=xpe\b/.test(url) && !/[?&]pot=/.test(url));
}

/**
 * Drives the player into issuing a timedtext request we can fetch. Turning captions on makes the
 * player fetch the track; on a PoToken-gated (`exp=xpe`) video its first fetch is premature and
 * token-less (empty body) because BotGuard mints the token slightly later - so we re-toggle captions
 * off→on until a later fetch carries a `pot=` token. Returns the fetchable URL, or `null` if none
 * appears within `timeoutMs`.
 */
async function captureFetchableTimedtext(videoId?: string, timeoutMs = 15000): Promise<string | null> {
  const player = (pageWindow.document ?? document).getElementById("movie_player") as MoviePlayer | null;
  try {
    player?.playVideo?.();
  }
  catch(err) {
    warn("playVideo() failed:", err);
  }

  const deadline = Date.now() + timeoutMs;
  while(Date.now() < deadline) {
    const url = peekTimedtextUrl(videoId);
    if(isFetchable(url))
      return url;

    const btn = document.querySelector<HTMLButtonElement>(".ytp-subtitles-button");
    if(!btn) {
      warn("CC button (.ytp-subtitles-button) not found; cannot enable captions");
      return null;
    }
    // Force an off→on transition so the player re-fetches the track (rather than reusing a cached,
    // token-less result); ending "on" is what triggers the fetch.
    if(btn.getAttribute("aria-pressed") === "true") {
      btn.click();
      await delay(300);
    }
    btn.click();
    await delay(900);
  }

  warn("no fetchable timedtext request appeared after retrying captions");
  return null;
}

/**
 * Strategy: trigger the player to fetch captions, grab the (PoToken-bearing, authenticated) URL
 * it requested via the interceptor, then refetch it as json3 ourselves. Works for member-only and
 * `exp=xpe` videos. Returns `null` if no request was captured or it produced no segments.
 */
async function fetchViaInterceptedUrl(videoId?: string): Promise<SubtitleSegment[] | null> {
  // Reuse an already-captured, fetchable URL (e.g. the user already had captions on); otherwise
  // drive the player into issuing one.
  let captured = peekTimedtextUrl(videoId);
  if(!isFetchable(captured))
    captured = await captureFetchableTimedtext(videoId);
  if(!captured)
    return null;

  const url = new URL(captured, location.origin);
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

//#endregion
//#region strategy 2: transcript panel DOM scrape

/** The "Show transcript" button, which lives in the description's transcript section. */
const transcriptButtonSelector =
  "ytd-video-description-transcript-section-renderer #primary-button button, "
  + "ytd-video-description-transcript-section-renderer button";
/** The description "...more" expander, which must be opened for the transcript section to render. */
const descriptionExpandSelector =
  "ytd-text-inline-expander #expand, #description #expand, tp-yt-paper-button#expand";
/** A rendered transcript line. */
const transcriptRowSelector = "transcript-segment-view-model";

/**
 * Opens YouTube's transcript panel so its segments render into the DOM, then waits for them.
 * The "Show transcript" button only renders after the description is expanded, so we expand it
 * first if the button isn't already present. Returns true once transcript rows are available.
 */
async function openTranscriptPanel(): Promise<boolean> {
  if(document.querySelector(transcriptRowSelector))
    return true;

  let button = document.querySelector<HTMLElement>(transcriptButtonSelector);
  if(!button) {
    document.querySelector<HTMLElement>(descriptionExpandSelector)?.click();
    button = await waitForSelector<HTMLElement>(transcriptButtonSelector, 3000);
  }

  if(!button) {
    warn("could not find the 'Show transcript' button");
    return false;
  }

  button.click();
  return Boolean(await waitForSelector(transcriptRowSelector, 5000));
}

/** Reads already-rendered transcript segments from YouTube's "Show transcript" panel, if open. */
function scrapeTranscriptPanel(): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  for(const row of document.querySelectorAll<HTMLElement>(transcriptRowSelector)) {
    const text = row.querySelector(".ytAttributedStringHost")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if(text.length === 0)
      continue;
    const stamp = row.querySelector(".ytwTranscriptSegmentViewModelTimestamp")?.textContent?.trim() ?? "";
    segments.push({ start: parseTimestamp(stamp), text });
  }
  return segments;
}

/** Parses a "m:ss" / "h:mm:ss" transcript timestamp into seconds. */
function parseTimestamp(stamp: string): number {
  const parts = stamp.split(":").map(Number);
  if(parts.some(isNaN))
    return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

//#endregion
//#region public API

/**
 * Whether the currently playing video exposes any caption track. Used to grey out the summary
 * button up front when there is nothing to summarize.
 */
export function hasCaptionsAvailable(): boolean {
  return getCaptionTracks(getPlayerResponse()).length > 0;
}

/**
 * Captures subtitles for the currently playing video using page-based strategies.
 * Returns `null` if the video has no captions available at all.
 *
 * @throws if a track was found but every strategy failed to produce text.
 */
export async function getCurrentSubtitles(opts: CaptureOptions = {}): Promise<SubtitleResult | null> {
  const preferredLangs = opts.preferredLangs ?? defaultPreferredLangs();

  const resp = getPlayerResponse();
  const tracks = getCaptionTracks(resp);
  const track = pickTrack(tracks, preferredLangs);

  // Strategy 1: intercept the player's own timedtext request (carries a valid PoToken and the
  // user's session, so it works on member-only / exp=xpe videos).
  if(track) {
    let segments: SubtitleSegment[] | null = null;
    try {
      segments = await fetchViaInterceptedUrl(resp?.videoDetails?.videoId);
    }
    catch(err) {
      warn("intercepted-timedtext fetch failed:", err);
    }

    if(segments && segments.length > 0) {
      return {
        lang: track.languageCode,
        trackName: trackName(track),
        segments,
        text: segments.map(s => s.text).join("\n"),
        timedText: toTimedText(segments),
        source: "intercept-timedtext",
      };
    }
  }

  // Strategy 2: open + scrape YouTube's own transcript panel.
  await openTranscriptPanel();
  const panelSegments = scrapeTranscriptPanel();
  if(panelSegments.length > 0) {
    return {
      lang: track?.languageCode ?? "unknown",
      trackName: track ? trackName(track) : "Transcript",
      segments: panelSegments,
      text: panelSegments.map(s => s.text).join("\n"),
      timedText: toTimedText(panelSegments),
      source: "transcript-panel",
    };
  }

  if(!track)
    return null; // no captions at all

  throw new Error("Found a caption track but could not capture its text (PoToken-gated and transcript panel unavailable)");
}

//#endregion
