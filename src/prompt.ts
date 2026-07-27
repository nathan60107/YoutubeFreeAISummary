/**
 * Builds the final AI prompt from a captured transcript, shared by both trigger surfaces: the
 * watch-page summary button and the off-page thumbnail overlay. Kept separate from `youtube.ts`
 * so the off-page path can supply its own title/URL (the ones it fetched) instead of reading the
 * current watch page's DOM.
 */

import { getActiveLanguage, getLanguageLabel, t } from "./i18n";
import type { SubtitleResult } from "./subtitle-core";

/**
 * Substitutes the template tokens with the video's data. An empty template means "follow the
 * interface language": the active locale's default prompt is used instead.
 *
 * @param title   Video title, substituted for `{{title}}`.
 * @param url     Watch URL, substituted for `{{url}}`.
 * @param channel Channel name, substituted for `{{channel}}`. Empty when it couldn't be read.
 */
export function buildPrompt(
  result: SubtitleResult,
  template: string,
  includeTimestamps: boolean,
  title: string,
  url: string,
  channel: string,
): string {
  const transcript = includeTimestamps ? result.timedText : result.text;
  const language = getLanguageLabel(getActiveLanguage());
  let text = template.trim() || t("prompt.default");
  // An unknown channel would leave a dangling "Channel:" label, so drop its whole line instead of
  // substituting an empty value. Locale-independent: it works for any label the template uses.
  if(!channel)
    text = text.split("\n").filter(line => !line.includes("{{channel}}")).join("\n");
  return text
    .split("{{title}}").join(title)
    .split("{{channel}}").join(channel)
    .split("{{url}}").join(url)
    .split("{{language}}").join(language)
    .split("{{transcript}}").join(transcript);
}
