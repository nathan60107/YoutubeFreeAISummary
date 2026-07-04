/**
 * Tiny i18n engine for the userscript.
 *
 * Strings live in per-locale dictionaries under `./locales`. English (`en`) is the reference: it
 * defines every {@linkcode TranslationKey} and is the runtime fallback when the active locale is
 * missing a key. The active locale is resolved once at startup ({@linkcode initI18n}) from the user's
 * saved `config.language` (or, when that is `"auto"`, from the browser's languages).
 *
 * Rendering helpers:
 * - {@linkcode t} — translate a key in the active locale (used everywhere outside the settings modal).
 * - {@linkcode translate} — translate a key in an *explicit* locale, so the settings modal can preview
 *   another language without committing to it until the user saves.
 * - {@linkcode applyI18n} — fills every `[data-i18n*]` element under a root, so modal markup can be
 *   built once with attributes and (re-)localized in one call when the previewed language changes.
 */

import { en, type TranslationKey, type Translations } from "./locales/en";
import { zhTW } from "./locales/zh-TW";
import { zhCN } from "./locales/zh-CN";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { de } from "./locales/de";
import { ptBR } from "./locales/pt-BR";
import { ru } from "./locales/ru";

/** A supported locale code. Config stores one of these, or `"auto"`. */
export type LangCode =
  | "en" | "zh-TW" | "zh-CN" | "ja" | "ko" | "es" | "fr" | "de" | "pt-BR" | "ru";

/** The special config value meaning "pick the locale from the browser". */
export const AUTO_LANG = "auto";

/** All locale dictionaries, keyed by code. `en` doubles as the fallback. */
const dictionaries: Record<LangCode, Translations> = {
  "en": en,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  "ja": ja,
  "ko": ko,
  "es": es,
  "fr": fr,
  "de": de,
  "pt-BR": ptBR,
  "ru": ru,
};

/**
 * Locales offered in the settings dropdown, in display order, each labelled with its own endonym so a
 * user can recognise their language regardless of the current interface language.
 */
export const supportedLanguages: readonly { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "pt-BR", label: "Português (BR)" },
  { code: "ru", label: "Русский" },
];

const langCodes = supportedLanguages.map(l => l.code);

/** Active locale, resolved by {@linkcode initI18n}. Defaults to English until then. */
let activeLang: LangCode = "en";

/**
 * Resolves a stored config language (`"auto"` or a specific code) to a concrete locale, matching the
 * browser's preferred languages when set to auto. Falls back to English if nothing matches.
 */
export function resolveLanguage(configured: string): LangCode {
  if(configured !== AUTO_LANG && (langCodes as string[]).includes(configured))
    return configured as LangCode;
  return matchBrowserLanguage();
}

/** Picks the best-supported locale from the browser's language preferences. */
function matchBrowserLanguage(): LangCode {
  const prefs = Array.isArray(navigator.languages) && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for(const raw of prefs) {
    const tag = raw?.trim();
    if(!tag)
      continue;
    // Exact code match (case-insensitively), e.g. "pt-BR".
    const exact = langCodes.find(c => c.toLowerCase() === tag.toLowerCase());
    if(exact)
      return exact;
    // Chinese needs script/region disambiguation: Traditional (TW/HK/MO/Hant) vs. Simplified.
    const lower = tag.toLowerCase();
    if(lower.startsWith("zh"))
      return /(^|-)(hant|tw|hk|mo)(-|$)/.test(lower) ? "zh-TW" : "zh-CN";
    // Otherwise match on the primary subtag, e.g. "en-GB" -> "en", "pt-PT" -> "pt-BR".
    const base = lower.split("-")[0];
    const byBase = langCodes.find(c => c.split("-")[0] === base);
    if(byBase)
      return byBase;
  }
  return "en";
}

/** Sets the active locale used by {@linkcode t} and the default of {@linkcode applyI18n}. */
export function setActiveLanguage(lang: LangCode): void {
  activeLang = lang;
}

/** The currently active locale. */
export function getActiveLanguage(): LangCode {
  return activeLang;
}

/**
 * Resolves the active locale from the given stored config value and applies it. Call once after the
 * config DataStore has loaded, on every page the script runs on.
 */
export function initI18n(configuredLanguage: string): void {
  setActiveLanguage(resolveLanguage(configuredLanguage));
}

/** Replaces `%1`, `%2`, … placeholders with the positional args (1-indexed). */
function interpolate(raw: string, args: (string | number)[]): string {
  if(args.length === 0)
    return raw;
  return raw.replace(/%(\d+)/g, (match, n) => {
    const val = args[Number(n) - 1];
    return val === undefined ? match : String(val);
  });
}

/** Translates `key` in an explicit `lang`, falling back to English then the key itself. */
export function translate(lang: LangCode, key: TranslationKey, ...args: (string | number)[]): string {
  const raw = dictionaries[lang]?.[key] ?? en[key] ?? key;
  return interpolate(raw, args);
}

/** Translates `key` in the active locale. */
export function t(key: TranslationKey, ...args: (string | number)[]): string {
  return translate(activeLang, key, ...args);
}

/**
 * Localizes an already-rendered DOM subtree from its `data-i18n*` attributes, using `lang` (or the
 * active locale). Lets modal markup be authored once with attributes and re-localized in one call
 * when the previewed language changes:
 * - `data-i18n` → element text content
 * - `data-i18n-html` → element inner HTML (for values containing trusted `<code>` etc.)
 * - `data-i18n-placeholder` → the `placeholder` attribute
 *
 * Callers must provide a `setHtml` sink (our Trusted Types-aware `setInnerHtml`) for the HTML variant;
 * i18n stays free of DOM-injection policy that way.
 */
export function applyI18n(
  root: Element | Document,
  setHtml: (el: Element, html: string) => void,
  lang: LangCode = activeLang,
): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = translate(lang, el.dataset.i18n as TranslationKey);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    setHtml(el, translate(lang, el.dataset.i18nHtml as TranslationKey));
  });
  root.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = translate(lang, el.dataset.i18nPlaceholder as TranslationKey);
  });
}

export type { TranslationKey };
