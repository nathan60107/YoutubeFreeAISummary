/**
 * Shared subtitle primitives: the types describing YouTube's caption data and the pure functions
 * that parse and normalize it. Both capture strategies depend on this core — `subtitles.ts` for
 * on-page (watch page) capture and `remote-subtitles.ts` for off-page (InnerTube) capture — so the
 * shared code lives here rather than in either strategy module, keeping the dependency direction
 * flat (both strategies point at the core, not at each other).
 */

//#region types

/** A single subtitle line with its start time (seconds) and text. */
export type SubtitleSegment = {
  /** Start time in seconds. */
  start: number;
  /** The line's text content, decoded and trimmed. */
  text: string;
};

/** Result of a successful subtitle capture. */
export type SubtitleResult = {
  /** BCP-47-ish language code of the captured track, e.g. "en", "zh-Hant". */
  lang: string;
  /** Human-readable track name, e.g. "English (auto-generated)". */
  trackName: string;
  /** Parsed segments in chronological order. */
  segments: SubtitleSegment[];
  /** Convenience: all segment texts joined with newlines (no timestamps). */
  text: string;
  /** All segments as `[h:mm:ss] text` lines - this is what gets sent to the AI for time-aware analysis. */
  timedText: string;
  /** Which strategy produced the result. */
  source: "intercept-timedtext" | "transcript-panel" | "innertube-player";
};

/** Subset of YouTube's player response that we rely on. */
export type YtPlayerResponse = {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: YtCaptionTrack[];
      /**
       * Indices into `captionTracks` of the track(s) YouTube treats as the video's original-language
       * source. On videos with dubbed audio tracks (AI or human) each dub gets its own ASR caption
       * track, and this is how the one transcribed from the original audio is told apart.
       */
      defaultTranslationSourceTrackIndices?: number[];
    };
  };
  videoDetails?: {
    videoId?: string;
    title?: string;
    author?: string;
  };
};

export type YtCaptionTrack = {
  /** e.g. { simpleText: "English" } */
  name?: { simpleText?: string; runs?: { text: string }[] };
  languageCode: string;
  /** "asr" for auto-generated tracks, otherwise absent. */
  kind?: string;
  /**
   * Static timedtext URL from the player response. On the watch page we prefer the intercepted
   * (PoToken-bearing) URL instead, but off-page — where no player runs — this is our only handle.
   */
  baseUrl?: string;
};

/** Shape of YouTube's `fmt=json3` timedtext payload (only the fields we read). */
export type Json3Response = {
  events?: {
    segs?: { utf8?: string }[];
    tStartMs?: number;
  }[];
};

/** Options for picking which caption track to capture. */
export type CaptureOptions = {
  /**
   * Ordered list of preferred language codes (e.g. "zh-TW", "ja", "en").
   * When omitted or empty, tracks are picked by kind alone (see `pickTrack`).
   */
  preferredLangs?: string[];
  /**
   * When `true` (used by the thumbnail-triggered auto-summary tab), fetch the track chosen by
   * `pickTrack` rather than whichever track the watch-page player happens to have active.
   */
  preferPickedTrack?: boolean;
};

//#endregion
//#region track selection

/** Extracts the caption track list from a player response. */
export function getCaptionTracks(resp: YtPlayerResponse | undefined): YtCaptionTrack[] {
  return resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
}

/** Resolves a track's display name across the two shapes YouTube uses. */
export function trackName(track: YtCaptionTrack): string {
  return track.name?.simpleText
    ?? track.name?.runs?.map(r => r.text).join("")
    ?? track.languageCode;
}

/**
 * Resolves a BCP-47 tag to its base language and likely script via CLDR likely-subtags
 * (`Intl.Locale#maximize`), e.g. `zh-TW` → `zh`/`Hant`, `yue` → `zh`/`Hant`, `sr` → `sr`/`Cyrl`.
 * Cantonese (`yue`) is folded into `zh` so it can serve as a Chinese fallback and vice versa.
 * Tags `Intl.Locale` rejects (e.g. legacy `zh-yue`) fall back to the primary subtag with no script.
 */
function resolveLang(tag: string): { lang: string; script?: string } {
  let lang: string;
  let script: string | undefined;
  try {
    const loc = new Intl.Locale(tag).maximize();
    lang = loc.language;
    script = loc.script;
  }
  catch {
    lang = tag.split("-")[0].toLowerCase();
  }
  return { lang: lang === "yue" ? "zh" : lang, script };
}

/**
 * How closely `trackLang` matches a preferred language `prefLang`:
 *  - `1`: exact/prefix match, or same language written in the same script
 *    (e.g. `zh-TW` ↔ `zh-Hant` / `yue-HK`, `en-US` ↔ `en-GB`).
 *  - `2`: same language, different script (e.g. `zh-TW` ↔ `zh-CN` / `zh`).
 *  - `null`: different language.
 */
function langMatchTier(trackLang: string, prefLang: string): 1 | 2 | null {
  const t = trackLang.toLowerCase();
  const p = prefLang.toLowerCase();
  if(t === p || t.startsWith(`${p}-`))
    return 1;
  const tr = resolveLang(t);
  const pr = resolveLang(p);
  if(tr.lang !== pr.lang)
    return null;
  return tr.script && tr.script === pr.script ? 1 : 2;
}

/**
 * Picks a caption track from a player response.
 *
 * `captionTracks` only ever holds three kinds of track — machine translations aren't listed; they
 * are produced on request by adding `tlang` to any track's URL — ranked here as:
 *  1. manual: uploaded by the creator (including their own translations into other languages);
 *  2. ASR of the original audio;
 *  3. ASR of a dubbed audio track (AI or human dub), usually much worse than the original's.
 *
 * ASR tracks share `kind: "asr"`, so 2 and 3 are told apart by language: the original audio's
 * language is that of `defaultTranslationSourceTrackIndices`. Without that field (single-audio
 * videos) every ASR track counts as original.
 *
 * With `preferredLangs`, each language is tried in order — closest match tier first (see
 * `langMatchTier`), then best rank within it; otherwise the best-ranked track overall wins.
 * Ties go to the earlier track in the list.
 */
export function pickTrack(
  resp: YtPlayerResponse | undefined,
  preferredLangs: string[] = [],
): YtCaptionTrack | undefined {
  const renderer = resp?.captions?.playerCaptionsTracklistRenderer;
  const tracks = renderer?.captionTracks ?? [];

  const originalLangs = new Set(
    (renderer?.defaultTranslationSourceTrackIndices ?? [])
      .map(i => tracks[i]?.languageCode)
      .filter(Boolean),
  );
  const rank = (t: YtCaptionTrack) => {
    if(t.kind !== "asr")
      return 1;
    return originalLangs.size === 0 || originalLangs.has(t.languageCode) ? 2 : 3;
  };
  const best = (candidates: YtCaptionTrack[]) =>
    candidates.reduce<YtCaptionTrack | undefined>((acc, t) => (!acc || rank(t) < rank(acc) ? t : acc), undefined);

  for(const pref of preferredLangs) {
    for(const tier of [1, 2] as const) {
      const hit = best(tracks.filter(t => langMatchTier(t.languageCode, pref) === tier));
      if(hit)
        return hit;
    }
  }

  return best(tracks);
}

//#endregion
//#region json3 parsing / formatting

/** Decodes a json3 timedtext payload into ordered segments. */
export function parseJson3(data: Json3Response): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  for(const event of data.events ?? []) {
    const text = (event.segs ?? []).map(s => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
    if(text.length === 0)
      continue;
    segments.push({
      start: (event.tStartMs ?? 0) / 1000,
      text,
    });
  }
  return segments;
}

/** Formats a number of seconds as `m:ss`, or `h:mm:ss` once it reaches an hour. */
function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hrs > 0
    ? `${hrs}:${pad(mins)}:${pad(secs)}`
    : `${mins}:${pad(secs)}`;
}

/** Joins segments into `[h:mm:ss] text` lines for time-aware AI analysis. */
export function toTimedText(segments: SubtitleSegment[]): string {
  return segments.map(s => `[${formatTimestamp(s.start)}] ${s.text}`).join("\n");
}

//#endregion
