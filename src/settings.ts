/**
 * Settings panel (modal) for the YouTube side, opened from the button's gear half.
 * Reads/writes the persisted {@linkcode config} DataStore.
 */

import { config } from "./config";
import {
  applyI18n, AUTO_LANG, getActiveLanguage, resolveLanguage, setActiveLanguage,
  supportedLanguages, t, translate, type LangCode,
} from "./i18n";
import { openModal } from "./modal";
import { defaultProvider, getProviderById, providers } from "./providers";
import { addStyle, setInnerHtml } from "./utils";

const overlayId = "yfas-settings-overlay";
const styleRef = "yfas-settings";

/** Opens the settings modal, prefilled from the current config. */
export function openSettings(): void {
  const data = config.getData();

  const handle = openModal({
    id: overlayId,
    label: t("settings.dialogLabel"),
    // Text lives in the locale dictionaries; markup carries `data-i18n*` hooks filled by `localize()`
    // below, so the whole panel can be re-rendered in another language without rebuilding it.
    innerHtml: `
      <h2 class="yfas-modal-title" data-i18n="settings.title"></h2>

      <label class="yfas-field">
        <span class="yfas-field-label" data-i18n="settings.provider.label"></span>
        <span class="yfas-field-hint" data-i18n="settings.provider.hint"></span>
        <select class="yfas-input" data-field="provider"></select>
        <span class="yfas-provider-note" data-role="provider-note"></span>
      </label>

      <label class="yfas-field">
        <span class="yfas-field-label" data-i18n="settings.language.label"></span>
        <span class="yfas-field-hint" data-i18n="settings.language.hint"></span>
        <select class="yfas-input" data-field="language">
          <option value="${AUTO_LANG}" data-i18n="settings.language.auto"></option>
          ${supportedLanguages.map(l => `<option value="${l.code}">${l.label}</option>`).join("")}
        </select>
      </label>

      <label class="yfas-field">
        <span class="yfas-field-label" data-i18n="settings.prompt.label"></span>
        <span class="yfas-field-hint" data-i18n-html="settings.prompt.hint"></span>
        <textarea class="yfas-input yfas-textarea" data-field="promptTemplate" rows="8"></textarea>
      </label>

      <label class="yfas-field">
        <span class="yfas-field-label" data-i18n="settings.langs.label"></span>
        <span class="yfas-field-hint" data-i18n-html="settings.langs.hint"></span>
        <input type="text" class="yfas-input" data-field="preferredLangs" data-i18n-placeholder="settings.langs.placeholder" />
      </label>

      <label class="yfas-check">
        <input type="checkbox" data-field="includeTimestamps" />
        <span data-i18n-html="settings.timestamps"></span>
      </label>

      <label class="yfas-check">
        <input type="checkbox" data-field="autoSubmit" />
        <span data-i18n="settings.autoSubmit"></span>
      </label>

      <div class="yfas-actions">
        <button type="button" class="yfas-modal-btn yfas-modal-btn--secondary" data-action="reset" data-i18n="settings.reset"></button>
        <span class="yfas-spacer"></span>
        <button type="button" class="yfas-modal-btn yfas-modal-btn--secondary" data-action="cancel" data-i18n="settings.cancel"></button>
        <button type="button" class="yfas-modal-btn yfas-modal-btn--primary" data-action="save" data-i18n="settings.save"></button>
      </div>`,
  });
  if(!handle)
    return; // already open

  if(!document.getElementById(`global-style-${styleRef}`))
    addStyle(settingsStyle, styleRef);

  const { overlay, close } = handle;
  const providerEl = overlay.querySelector<HTMLSelectElement>("[data-field='provider']")!;
  const providerNoteEl = overlay.querySelector<HTMLElement>("[data-role='provider-note']")!;
  const languageEl = overlay.querySelector<HTMLSelectElement>("[data-field='language']")!;
  const promptEl = overlay.querySelector<HTMLTextAreaElement>("[data-field='promptTemplate']")!;
  const langEl = overlay.querySelector<HTMLInputElement>("[data-field='preferredLangs']")!;
  const tsEl = overlay.querySelector<HTMLInputElement>("[data-field='includeTimestamps']")!;
  const autoEl = overlay.querySelector<HTMLInputElement>("[data-field='autoSubmit']")!;

  // The raw language setting the user has picked (persisted verbatim: `"auto"` or a locale code) and
  // the concrete locale it currently resolves to (used to render the panel and provider note).
  let selectedLangSetting = data.language;
  let previewLang: LangCode = resolveLanguage(selectedLangSetting);

  /** Rebuilds the provider `<option>`s in `lang` (only the "(recommended)" suffix is translated). */
  const buildProviderOptions = (lang: LangCode) => {
    const selected = providerEl.value || data.provider;
    setInnerHtml(providerEl, providers
      .map(p => `<option value="${p.id}">${p.label}${p.recommended ? translate(lang, "settings.provider.recommended") : ""}</option>`)
      .join(""));
    providerEl.value = selected;
  };

  /** True when the prompt box still shows a built-in default (so it should track the language). */
  const promptIsDefault = () =>
    promptEl.value.trim() === "" || promptEl.value.trim() === translate(previewLang, "prompt.default").trim();

  /** Renders every translatable part of the panel in `lang` (static labels + the dynamic bits). */
  const localize = (lang: LangCode) => {
    applyI18n(overlay, setInnerHtml, lang);
    buildProviderOptions(lang);
    providerNoteEl.textContent = translate(lang, getProviderById(providerEl.value).note);
  };

  // Prefill from config, then localize.
  languageEl.value = selectedLangSetting;
  promptEl.value = data.promptTemplate.trim() ? data.promptTemplate : translate(previewLang, "prompt.default");
  langEl.value = data.preferredLangs;
  tsEl.checked = data.includeTimestamps;
  autoEl.checked = data.autoSubmit;
  localize(previewLang);

  // Keep the provider note in sync with the dropdown.
  providerEl.addEventListener("change", () => {
    providerNoteEl.textContent = translate(previewLang, getProviderById(providerEl.value).note);
  });

  // Switching the interface language re-renders the panel live. If the prompt is still an unmodified
  // default, swap it to the newly selected language's default too (per the "auto-switch" behaviour).
  languageEl.addEventListener("change", () => {
    const wasDefaultPrompt = promptIsDefault();
    selectedLangSetting = languageEl.value;
    previewLang = resolveLanguage(selectedLangSetting);
    localize(previewLang);
    if(wasDefaultPrompt)
      promptEl.value = translate(previewLang, "prompt.default");
  });

  overlay.querySelector("[data-action='cancel']")!.addEventListener("click", close);

  overlay.querySelector("[data-action='reset']")!.addEventListener("click", () => {
    providerEl.value = defaultProvider.id;
    selectedLangSetting = AUTO_LANG;
    languageEl.value = AUTO_LANG;
    previewLang = resolveLanguage(AUTO_LANG);
    localize(previewLang);
    promptEl.value = translate(previewLang, "prompt.default");
    langEl.value = "";
    tsEl.checked = true;
    autoEl.checked = true;
  });

  overlay.querySelector("[data-action='save']")!.addEventListener("click", () => {
    void config.setData({
      language: selectedLangSetting,
      provider: providerEl.value,
      // Empty = follow the language; store "" when the box still shows a built-in default.
      promptTemplate: promptIsDefault() ? "" : promptEl.value,
      preferredLangs: langEl.value.trim(),
      includeTimestamps: tsEl.checked,
      autoSubmit: autoEl.checked,
    });
    // Apply the chosen language immediately so the rest of the page updates without a reload.
    // `previewLang` already holds resolveLanguage(selectedLangSetting) (kept in sync above).
    if(previewLang !== getActiveLanguage()) {
      setActiveLanguage(previewLang);
      window.dispatchEvent(new Event("yfas-lang-changed"));
    }
    close();
  });

  promptEl.focus();
}

const settingsStyle = `
.yfas-field {
  display: block;
  margin-bottom: 16px;
}
.yfas-field-label {
  display: block;
  font-size: 1.4rem;
  font-weight: 500;
  margin-bottom: 4px;
}
.yfas-field-hint {
  display: block;
  font-size: 1.2rem;
  opacity: 0.7;
  margin-bottom: 6px;
}
.yfas-field-hint code,
.yfas-check code {
  font-family: monospace;
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.08));
  padding: 1px 4px;
  border-radius: 4px;
}
.yfas-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-size: 1.4rem;
  font-family: inherit;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.2));
  border-radius: 8px;
  background: var(--yt-spec-base-background, #fff);
  color: inherit;
}
select.yfas-input {
  cursor: pointer;
  appearance: auto;
}
.yfas-provider-note {
  display: block;
  margin-top: 6px;
  font-size: 1.2rem;
  line-height: 1.5;
  opacity: 0.85;
  color: var(--yt-spec-text-secondary, inherit);
}
.yfas-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: monospace;
  line-height: 1.4;
}
.yfas-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  margin-bottom: 12px;
  cursor: pointer;
}
.yfas-check input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.yfas-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}
.yfas-spacer {
  flex: 1;
}
`;
