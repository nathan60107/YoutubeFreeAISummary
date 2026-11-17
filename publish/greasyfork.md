# Greasy Fork 上架資訊

> ✅ **已上架**（2026-07-29，首發版本 0.10.0）
> 腳本頁面：<https://greasyfork.org/scripts/589075-youtubefreeaisummary>
> 安裝網址：`https://update.greasyfork.org/scripts/589075/YoutubeFreeAISummary.user.js`
> 對應建置：`npm run build-prod-gf` → `dist/YoutubeFreeAISummary_gf.user.js`
>
> 程式碼與說明文都由 Greasy Fork 從 GitHub 同步（webhook）：push 到 `main` 後，`dist/YoutubeFreeAISummary_gf.user.js` 與第 2 節的說明文有改動就會自動更新，**push 即發佈**。
> 程式碼同步網址：`https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/dist/YoutubeFreeAISummary_gf.user.js`

---

## 0. 上架前準備（每次更新版本沿用）

- [ ] 確認 `package.json` 的 `version` 是要發佈的版本（目前 **0.10.0**）
- [ ] 重新執行 `npm run build-prod-gf`（`dist/` 內現有檔案的 build number 停在舊 commit，且 header 內的 icon URL 帶 commit SHA）
- [ ] 確認 `main` 分支已推上 GitHub —— header 內的 `@icon` / `@resource` 都指向 `raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/icon.svg`，沒推上去圖示會 404；第 2 節說明文內的 `assets/summarize-button.png`（英文）與 `assets/summarize-button.zh-TW.png`（中文）同理

> **關於 `@downloadURL` / `@updateURL`**：gf 版建置刻意不輸出這兩個 key。Greasy Fork 官方說明明確指出會移除它們——
> 「Greasy Fork will strip these keys, which makes any script installed from Greasy Fork only update from Greasy Fork」——
> 並在提供下載時注入自己的版本。已於 0.10.0 上架後實地驗證，安裝檔中確實是 Greasy Fork 注入的：
> `@downloadURL https://update.greasyfork.org/scripts/589075/YoutubeFreeAISummary.user.js`、
> `@updateURL https://update.greasyfork.org/scripts/589075/YoutubeFreeAISummary.meta.js`。

---

## 1. 表單欄位對應

Greasy Fork 的**名稱、描述、適用網站、授權**都直接從中繼資料（metadata block）讀取，表單上不需要另外填。以下為對應值：

| 項目 | 值 | 來源 |
|------|-----|------|
| Name | `YoutubeFreeAISummary` | `@name`（另有 9 種語言的 `@name:<code>`） |
| Description | `Capture a YouTube video's on-page subtitles and send them straight to your chosen AI (AI Studio, Gemini, ChatGPT, Claude, or Grok) for a free summary` | `@description`（另有 9 種語言） |
| Version | `0.10.0` | `@version` |
| License | `MIT` | `@license` |
| Applies to | `youtube.com`, `aistudio.google.com`, `gemini.google.com`, `chatgpt.com`, `chat.openai.com`, `claude.ai`, `grok.com` | `@match` |
| Script language | JavaScript | — |
| Additional info | 見下方第 2 節（英文為主要語言，另有「中文（正體）」） | 從 GitHub 同步 |

同步的原始碼：`dist/YoutubeFreeAISummary_gf.user.js`。

### Greasy Fork 規則自查

- 程式碼未混淆、未壓縮（build 沒有經過 terser）✅
- 唯一的 `@require` 來自 `cdn.jsdelivr.net/npm/@sv443-network/userutils@6.3.0`，屬 Greasy Fork 允許的 CDN ✅
- 無廣告、無聯盟連結、無追蹤 ✅
- `@license MIT` 已標示 ✅

---

## 2. Additional info（說明文）

說明文放在 repo 根目錄，由 Greasy Fork 從 GitHub 同步，不再手動貼上：

| 語言 | 檔案 | 同步網址 |
|------|------|----------|
| English（主要語言） | [greasyfork.md](../greasyfork.md) | `https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/greasyfork.md` |
| 中文（正體） | [greasyfork.zh-TW.md](../greasyfork.zh-TW.md) | `https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/greasyfork.zh-TW.md` |

兩份內容需與 [README.md](../README.md) / [README.zh-TW.md](../README.zh-TW.md) 的功能、隱私說明保持一致；圖片要用 `raw.githubusercontent.com` 的絕對網址。

---

## 3. 版本說明（Notes on this version）

0.10.0 首次上架已填：`Initial release on Greasy Fork (v0.10.0).`

之後每次更新，從 [changelog.md](../changelog.md) 取對應版本的條列貼上即可。

---

## 4. 上架後待辦

- [x] 記下腳本頁面網址：<https://greasyfork.org/scripts/589075-youtubefreeaisummary>
- [x] 確認安裝檔內是 Greasy Fork 自己注入的 `@downloadURL` / `@updateURL`（已驗證，見上方說明）
- [x] 更新 [README.md](../README.md) 與 [README.zh-TW.md](../README.zh-TW.md) 安裝表格中的 GreasyFork 連結
