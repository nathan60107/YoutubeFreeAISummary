/**
 * Settings panel (modal) for the YouTube side, opened from the button's gear half.
 * Reads/writes the persisted {@linkcode config} DataStore.
 */

import { config, defaultPromptTemplate } from "./config";
import { addStyle } from "./utils";

const overlayId = "yfswg-settings-overlay";

/** Opens the settings modal, prefilled from the current config. */
export function openSettings(): void {
  if(document.getElementById(overlayId))
    return; // already open

  addStyle(settingsStyle, "yfswg-settings");
  const data = config.getData();

  const overlay = document.createElement("div");
  overlay.id = overlayId;
  overlay.className = "yfswg-overlay";

  overlay.innerHTML = `
    <div class="yfswg-modal" role="dialog" aria-modal="true" aria-label="YFSWG 設定">
      <h2 class="yfswg-modal-title">YouTube 摘要設定</h2>

      <label class="yfswg-field">
        <span class="yfswg-field-label">提示詞模板</span>
        <span class="yfswg-field-hint">可用變數：<code>{{title}}</code> 標題、<code>{{url}}</code> 連結、<code>{{transcript}}</code> 字幕</span>
        <textarea class="yfswg-input yfswg-textarea" data-field="promptTemplate" rows="8"></textarea>
      </label>

      <label class="yfswg-field">
        <span class="yfswg-field-label">偏好字幕語言</span>
        <span class="yfswg-field-hint">逗號分隔的語言代碼，例如 <code>zh-TW, ja, en</code>。留空＝跟隨瀏覽器語言</span>
        <input type="text" class="yfswg-input" data-field="preferredLangs" placeholder="留空＝自動" />
      </label>

      <label class="yfswg-check">
        <input type="checkbox" data-field="includeTimestamps" />
        <span>字幕包含時間戳（<code>[h:mm:ss]</code>）</span>
      </label>

      <label class="yfswg-check">
        <input type="checkbox" data-field="autoSubmit" />
        <span>注入後自動於 AI Studio 送出</span>
      </label>

      <div class="yfswg-actions">
        <button type="button" class="yfswg-btn-secondary" data-action="reset">重設為預設</button>
        <span class="yfswg-spacer"></span>
        <button type="button" class="yfswg-btn-secondary" data-action="cancel">取消</button>
        <button type="button" class="yfswg-btn-primary" data-action="save">儲存</button>
      </div>
    </div>`;

  const modal = overlay.querySelector(".yfswg-modal") as HTMLElement;
  const promptEl = overlay.querySelector<HTMLTextAreaElement>("[data-field='promptTemplate']")!;
  const langEl = overlay.querySelector<HTMLInputElement>("[data-field='preferredLangs']")!;
  const tsEl = overlay.querySelector<HTMLInputElement>("[data-field='includeTimestamps']")!;
  const autoEl = overlay.querySelector<HTMLInputElement>("[data-field='autoSubmit']")!;

  // Prefill from config.
  promptEl.value = data.promptTemplate;
  langEl.value = data.preferredLangs;
  tsEl.checked = data.includeTimestamps;
  autoEl.checked = data.autoSubmit;

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKeydown);
  };
  const onKeydown = (e: KeyboardEvent) => {
    if(e.key === "Escape")
      close();
  };

  // Close when clicking the backdrop (but not inside the modal).
  overlay.addEventListener("click", (e) => {
    if(e.target === overlay)
      close();
  });
  modal.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("keydown", onKeydown);

  overlay.querySelector("[data-action='cancel']")!.addEventListener("click", close);

  overlay.querySelector("[data-action='reset']")!.addEventListener("click", () => {
    promptEl.value = defaultPromptTemplate;
    langEl.value = "";
    tsEl.checked = true;
    autoEl.checked = true;
  });

  overlay.querySelector("[data-action='save']")!.addEventListener("click", () => {
    void config.setData({
      promptTemplate: promptEl.value,
      preferredLangs: langEl.value.trim(),
      includeTimestamps: tsEl.checked,
      autoSubmit: autoEl.checked,
    });
    close();
  });

  document.body.appendChild(overlay);
  promptEl.focus();
}

const settingsStyle = `
.yfswg-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
.yfswg-modal {
  width: min(560px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  border-radius: 12px;
  background: var(--yt-spec-base-background, #fff);
  color: var(--yt-spec-text-primary, #0f0f0f);
  font-family: "Roboto", "Arial", sans-serif;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.yfswg-modal-title {
  margin: 0 0 16px;
  font-size: 1.8rem;
  font-weight: 500;
}
.yfswg-field {
  display: block;
  margin-bottom: 16px;
}
.yfswg-field-label {
  display: block;
  font-size: 1.4rem;
  font-weight: 500;
  margin-bottom: 4px;
}
.yfswg-field-hint {
  display: block;
  font-size: 1.2rem;
  opacity: 0.7;
  margin-bottom: 6px;
}
.yfswg-field-hint code,
.yfswg-check code {
  font-family: monospace;
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.08));
  padding: 1px 4px;
  border-radius: 4px;
}
.yfswg-input {
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
.yfswg-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: monospace;
  line-height: 1.4;
}
.yfswg-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.4rem;
  margin-bottom: 12px;
  cursor: pointer;
}
.yfswg-check input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.yfswg-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
}
.yfswg-spacer {
  flex: 1;
}
.yfswg-btn-primary,
.yfswg-btn-secondary {
  padding: 8px 16px;
  font-size: 1.4rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 18px;
  border: none;
  cursor: pointer;
}
.yfswg-btn-primary {
  background: var(--yt-spec-call-to-action, #065fd4);
  color: #fff;
}
.yfswg-btn-secondary {
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.08));
  color: inherit;
}
.yfswg-btn-primary:hover,
.yfswg-btn-secondary:hover {
  filter: brightness(1.1);
}
`;
