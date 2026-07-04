/**
 * Settings panel (modal) for the YouTube side, opened from the button's gear half.
 * Reads/writes the persisted {@linkcode config} DataStore.
 */

import { config, defaultPromptTemplate } from "./config";
import { openModal } from "./modal";
import { defaultProvider, getProviderById, providers } from "./providers";
import { addStyle } from "./utils";

const overlayId = "yfas-settings-overlay";
const styleRef = "yfas-settings";

/** Opens the settings modal, prefilled from the current config. */
export function openSettings(): void {
  const data = config.getData();

  const handle = openModal({
    id: overlayId,
    label: "YFAS 設定",
    innerHtml: `
      <h2 class="yfas-modal-title">YouTube 摘要設定</h2>

      <label class="yfas-field">
        <span class="yfas-field-label">AI 服務</span>
        <span class="yfas-field-hint">選擇摘要要送到哪個 AI（需先登入該服務）</span>
        <select class="yfas-input" data-field="provider">
          ${providers.map(p => `<option value="${p.id}">${p.label}${p.recommended ? "（推薦）" : ""}</option>`).join("")}
        </select>
        <span class="yfas-provider-note" data-role="provider-note"></span>
      </label>

      <label class="yfas-field">
        <span class="yfas-field-label">提示詞模板</span>
        <span class="yfas-field-hint">可用變數：<code>{{title}}</code> 標題、<code>{{url}}</code> 連結、<code>{{transcript}}</code> 字幕</span>
        <textarea class="yfas-input yfas-textarea" data-field="promptTemplate" rows="8"></textarea>
      </label>

      <label class="yfas-field">
        <span class="yfas-field-label">偏好字幕語言</span>
        <span class="yfas-field-hint">逗號分隔的語言代碼，例如 <code>zh-TW, ja, en</code>。留空＝跟隨瀏覽器語言</span>
        <input type="text" class="yfas-input" data-field="preferredLangs" placeholder="留空＝自動" />
      </label>

      <label class="yfas-check">
        <input type="checkbox" data-field="includeTimestamps" />
        <span>字幕包含時間戳（<code>[h:mm:ss]</code>）</span>
      </label>

      <label class="yfas-check">
        <input type="checkbox" data-field="autoSubmit" />
        <span>注入後自動送出</span>
      </label>

      <div class="yfas-actions">
        <button type="button" class="yfas-modal-btn yfas-modal-btn--secondary" data-action="reset">重設為預設</button>
        <span class="yfas-spacer"></span>
        <button type="button" class="yfas-modal-btn yfas-modal-btn--secondary" data-action="cancel">取消</button>
        <button type="button" class="yfas-modal-btn yfas-modal-btn--primary" data-action="save">儲存</button>
      </div>`,
  });
  if(!handle)
    return; // already open

  if(!document.getElementById(`global-style-${styleRef}`))
    addStyle(settingsStyle, styleRef);

  const { overlay, close } = handle;
  const providerEl = overlay.querySelector<HTMLSelectElement>("[data-field='provider']")!;
  const providerNoteEl = overlay.querySelector<HTMLElement>("[data-role='provider-note']")!;
  const promptEl = overlay.querySelector<HTMLTextAreaElement>("[data-field='promptTemplate']")!;
  const langEl = overlay.querySelector<HTMLInputElement>("[data-field='preferredLangs']")!;
  const tsEl = overlay.querySelector<HTMLInputElement>("[data-field='includeTimestamps']")!;
  const autoEl = overlay.querySelector<HTMLInputElement>("[data-field='autoSubmit']")!;

  // Prefill from config.
  providerEl.value = data.provider;
  promptEl.value = data.promptTemplate;
  langEl.value = data.preferredLangs;
  tsEl.checked = data.includeTimestamps;
  autoEl.checked = data.autoSubmit;

  // Show the selected provider's quality/limitation note, and keep it in sync with the dropdown.
  const syncProviderNote = () => (providerNoteEl.textContent = getProviderById(providerEl.value).note);
  syncProviderNote();
  providerEl.addEventListener("change", syncProviderNote);

  overlay.querySelector("[data-action='cancel']")!.addEventListener("click", close);

  overlay.querySelector("[data-action='reset']")!.addEventListener("click", () => {
    providerEl.value = defaultProvider.id;
    syncProviderNote();
    promptEl.value = defaultPromptTemplate;
    langEl.value = "";
    tsEl.checked = true;
    autoEl.checked = true;
  });

  overlay.querySelector("[data-action='save']")!.addEventListener("click", () => {
    void config.setData({
      provider: providerEl.value,
      promptTemplate: promptEl.value,
      preferredLangs: langEl.value.trim(),
      includeTimestamps: tsEl.checked,
      autoSubmit: autoEl.checked,
    });
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
