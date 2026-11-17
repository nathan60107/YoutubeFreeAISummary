/**
 * Off-page summary trigger: a small sparkle button that fades in over any video thumbnail (home,
 * search, related, channel, …). Clicking it summarizes that video without the user opening it.
 * Its corner (or "off") comes from the `thumbButtonPosition` setting.
 *
 * Videos are captured entirely off-page via InnerTube player requests (`remote-subtitles.ts`): the
 * anonymous ANDROID player for public videos, then — unless the `signedInCapture` setting is off —
 * the signed-in WEB player for gated ones (member-only / age-restricted). Only if that fails do we
 * fall back to a new auto-summary tab that captures with the real player (`auto-summarize.ts`).
 */

import { openAutoSummaryTab } from "./auto-summarize";
import { config } from "./config";
import { notify, reportFailure } from "./feedback";
import { stashSummaryPayload } from "./handoff";
import { t } from "./i18n";
import { loadingIcon, sparkleIcon } from "./icons";
import { buildPrompt } from "./prompt";
import { getProviderById } from "./providers";
import { getSubtitlesForVideo } from "./remote-subtitles";
import { error, log, warn } from "./log";
import { addStyle, onInteraction, openInTab, setInnerHtml } from "./utils";

/** Class of the injected overlay button, also used to guard against double-injection. */
const btnClass = "yfas-thumb-btn";
/** Class placed on the thumbnail anchor that hosts a button, so CSS can reveal it on hover. */
const hostClass = "yfas-thumb-host";
/** Dataset flag marking an anchor we've already processed (whether or not a button was added). */
const processedFlag = "yfasThumb";

/**
 * Thumbnail anchors across YouTube's list surfaces. Classic renderers use `a#thumbnail`; the newer
 * `*ViewModel` lockups use camelCase content-image classes (`ytLockupViewModelContentImage` for
 * videos, `reel-item-endpoint` for Shorts). We deliberately target the *image* anchor, not the
 * metadata/title link, so the button lands on the positioned thumbnail box (where the duration badge
 * sits) — a reliable containing block for our absolutely-placed button. YouTube renames these often,
 * so this list is best-effort and expected to drift.
 */
const thumbnailAnchorSelector = [
  "a#thumbnail",
  "a.ytd-thumbnail",
  "a.ytLockupViewModelContentImage",           // current lockup (home/search/related feed)
  "a.reel-item-endpoint",                      // current Shorts lockup thumbnail
  "a.yt-lockup-view-model-wiz__content-image", // older lockup (kept for compatibility)
].join(", ");

/**
 * The element inside a thumbnail anchor that is exactly the image's box, which the button is placed
 * in. The anchor itself can't be used for the `*ViewModel` lockups: it's padded past the image (home
 * feed: 12px below; search / related lists: 12–16px on the right), and absolute positioning measures
 * from the padding edge. Their `yt-thumbnail-view-model` matches the image exactly (checked on home,
 * search, related and Shorts). Classic `a#thumbnail` anchors have no such child and no padding, so
 * the anchor itself is used there.
 */
const thumbnailBoxSelector = "yt-thumbnail-view-model";

/** Class added to a statically positioned box so it becomes the button's containing block. */
const boxClass = "yfas-thumb-box";

/** Extracts a video id from a thumbnail anchor's href (watch / shorts / live / embed forms). */
function videoIdFromHref(href: string): string | null {
  try {
    const u = new URL(href, location.origin);
    const v = u.searchParams.get("v");
    if (v)
      return v;
    const path = u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{6,})/);
    return path ? path[1] : null;
  }
  catch {
    return null;
  }
}

/** Default label / tooltip for an overlay button, naming the currently selected provider. */
const buttonLabel = () => t("button.summarizeWith", getProviderById(config.getData().provider).label);

/** Injects the overlay button into a thumbnail anchor the first time it's hovered. */
function injectButton(anchor: HTMLAnchorElement): void {
  if (anchor.dataset[processedFlag])
    return;
  anchor.dataset[processedFlag] = "1";

  const videoId = videoIdFromHref(anchor.href);
  if (!videoId)
    return; // playlist/channel/other non-video thumbnail

  anchor.classList.add(hostClass);

  const btn = document.createElement("div");
  btn.className = btnClass;
  // A div with role=button (rather than a <button>) avoids nesting interactive content inside the
  // thumbnail's <a>; onInteraction gives it click + keyboard activation and stops the anchor from
  // navigating when it's pressed.
  btn.setAttribute("role", "button");
  btn.setAttribute("tabindex", "0");
  const label = buttonLabel();
  btn.title = label;
  btn.setAttribute("aria-label", label);
  setInnerHtml(btn, sparkleIcon);
  onInteraction(btn, () => void onThumbClick(btn, videoId));

  const box = anchor.querySelector<HTMLElement>(thumbnailBoxSelector) ?? anchor;
  // Only force `relative` when the box isn't positioned already: classic `a#thumbnail` anchors are
  // `position: absolute`, and overriding that would break their layout.
  if (getComputedStyle(box).position === "static")
    box.classList.add(boxClass);
  box.appendChild(btn);
}

/** Toggles an overlay button's busy state: swaps the sparkle for the spinner and blocks re-clicks. */
function setBusy(btn: HTMLElement, busy: boolean): void {
  btn.classList.toggle("yfas-busy", busy);
  setInnerHtml(btn, busy ? loadingIcon : sparkleIcon);
}

/**
 * Summarizes a thumbnail's video. Tries the off-page InnerTube capture first (anonymous ANDROID for
 * public videos, then the user's sign-in for gated ones when `signedInCapture` allows it). If that
 * throws, the video couldn't be reached off-page, so we open a new auto-summary tab that captures
 * it with the real player and closes itself. A `null` from the off-page capture means "genuinely no
 * captions".
 */
async function onThumbClick(btn: HTMLElement, videoId: string): Promise<void> {
  if (btn.classList.contains("yfas-busy"))
    return;
  setBusy(btn, true);
  try {
    const cfg = config.getData();
    const preferredLangs = cfg.preferredLangs.split(",").map(s => s.trim()).filter(Boolean);
    const opts = {
      ...(preferredLangs.length > 0 ? { preferredLangs } : {}),
      signedIn: cfg.signedInCapture,
    };

    let result;
    try {
      result = await getSubtitlesForVideo(videoId, opts);
    }
    catch (err) {
      // Couldn't capture off-page: open a new tab that captures it with the real player and closes itself.
      // The user's feed tab stays put (scroll position preserved).
      warn(`Off-page capture failed for ${videoId}; opening an auto-summary tab:`, err);
      openAutoSummaryTab(videoId);
      return;
    }

    if (!result) {
      // No captions is an expected outcome, not a failure: just tell the user, without counting it
      // toward the repeated-failure escalation (which would wrongly prompt them to file an issue).
      warn(`No captions are available for video ${videoId}.`);
      notify(t("error.noCaptions"));
      return;
    }

    log(
      `Captured ${result.segments.length} subtitle lines off-page for ${videoId} `
      + `(${result.trackName}, lang=${result.lang}).`,
    );

    await stashSummaryPayload({
      prompt: buildPrompt(
        result, cfg.promptTemplate, cfg.includeTimestamps,
        result.videoTitle || videoId, result.videoUrl, result.videoChannel,
      ),
      autoSubmit: cfg.autoSubmit,
      title: result.videoTitle,
      createdAt: Date.now(),
    });
    openInTab(getProviderById(cfg.provider).newChatUrl, false);
  }
  catch (err) {
    error(`Failed to summarize video ${videoId} off-page:`, err);
    void reportFailure({ context: "youtube:thumbnail:capture-error" });
  }
  finally {
    setBusy(btn, false);
  }
}

/** Root attribute carrying the chosen corner, so a single stylesheet positions every button. */
const positionAttr = "data-yfas-thumb-pos";

/** Mirrors the `thumbButtonPosition` setting onto the root element (CSS does the rest). */
function applyPosition(): void {
  document.documentElement.setAttribute(positionAttr, config.getData().thumbButtonPosition);
}

/** Lazily injects a button when the pointer first enters a thumbnail (handles infinite scroll for free). */
function onPointerOver(e: Event): void {
  if (config.getData().thumbButtonPosition === "off")
    return;
  const target = e.target as Element | null;
  const anchor = target?.closest?.(thumbnailAnchorSelector) as HTMLAnchorElement | null;
  if (anchor)
    injectButton(anchor);
}

/** Re-applies the current interface language to all already-injected overlay buttons. */
function relabelButtons(): void {
  const label = buttonLabel();
  for (const btn of document.querySelectorAll<HTMLElement>(`.${btnClass}`)) {
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
}

/** Registers the thumbnail overlay. Call once on the YouTube side after DOM load. */
export function initThumbnailButtons(): void {
  addStyle(thumbnailStyle, "yfas-thumb");
  applyPosition();
  window.addEventListener("yfas-config-changed", applyPosition);
  // Event delegation over the whole body: cheaper than observing every list container, and it
  // naturally covers thumbnails added later by SPA navigation and infinite scroll.
  document.body.addEventListener("pointerover", onPointerOver, { capture: true, passive: true });
  window.addEventListener("yfas-lang-changed", relabelButtons);
}

const thumbnailStyle = `
.${boxClass} {
  position: relative;
}
.${btnClass} {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  padding: 5px;
  border-radius: 50%;
  color: #fff;
  background: rgba(0, 0, 0, 0.72);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.12s ease, background 0.12s ease;
}
[${positionAttr}="top-right"] .${btnClass} {
  left: auto;
  right: 4px;
}
[${positionAttr}="bottom-left"] .${btnClass} {
  top: auto;
  bottom: 4px;
}
[${positionAttr}="bottom-right"] .${btnClass} {
  top: auto;
  left: auto;
  bottom: 4px;
  right: 4px;
}
[${positionAttr}="off"] .${btnClass} {
  display: none;
}
.${btnClass}:hover {
  background: rgba(0, 0, 0, 0.92);
}
.${btnClass} svg {
  width: 100%;
  height: 100%;
  display: block;
}
.${hostClass}:hover .${btnClass},
.${btnClass}:focus-visible {
  opacity: 1;
}
.${btnClass}.yfas-busy {
  opacity: 1;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.88);
}
.${btnClass}.yfas-busy svg {
  animation: yfas-spin 0.8s linear infinite;
}
@keyframes yfas-spin {
  to { transform: rotate(360deg); }
}
`;
