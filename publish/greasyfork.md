# Greasy Fork 上架資訊

> ✅ **已上架**（2026-07-29，首發版本 0.10.0）
> 腳本頁面：<https://greasyfork.org/scripts/589075-youtubefreeaisummary>
> 安裝網址：`https://update.greasyfork.org/scripts/589075/YoutubeFreeAISummary.user.js`
> 對應建置：`npm run build-prod-gf` → `dist/YoutubeFreeAISummary_gf.user.js`
>
> 之後每次更新版本：於腳本頁面的「更新程式碼」貼上新的 gf 建置，並填第 4 節的版本說明。

---

## 0. 上架前準備（每次更新版本沿用）

- [ ] 確認 `package.json` 的 `version` 是要發佈的版本（目前 **0.10.0**）
- [ ] 重新執行 `npm run build-prod-gf`（`dist/` 內現有檔案的 build number 停在舊 commit，且 header 內的 icon URL 帶 commit SHA）
- [ ] 確認 `main` 分支已推上 GitHub —— header 內的 `@icon` / `@resource` 都指向 `raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/icon.svg`，沒推上去圖示會 404；第 2、3 節說明文內的 `assets/summarize-button.png`（英文）與 `assets/summarize-button.zh-TW.png`（中文）同理

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
| Additional info | 見下方第 2、3 節（英文為主要語言，另新增一份「中文（正體）」） | — |

實際貼上的原始碼：`dist/YoutubeFreeAISummary_gf.user.js` 全文。

### Greasy Fork 規則自查

- 程式碼未混淆、未壓縮（build 沒有經過 terser）✅
- 唯一的 `@require` 來自 `cdn.jsdelivr.net/npm/@sv443-network/userutils@6.3.0`，屬 Greasy Fork 允許的 CDN ✅
- 無廣告、無聯盟連結、無追蹤 ✅
- `@license MIT` 已標示 ✅

---

## 2. Additional info（English，主要語言）

```markdown
**YouTube Free AI Summary** adds a button to YouTube that grabs the current video's subtitles and drops them straight into a freshly opened AI chat — your choice of Google AI Studio, Gemini, ChatGPT, Claude, or Grok — ready to be summarized.

It is built to solve the two problems other summary scripts run into: they can't get the subtitles of restricted videos, and long transcripts don't reach the AI in one piece, so you end up with a summary of only part of the video.

![The Summarize button on a video page](https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/summarize-button.png)

Once installed, a **Summarize** button (outlined in red) appears next to the like / dislike buttons on the video page. One press and it starts.

## Features

- **Completely free** — No API key, no payment, no subscription; you only need to be logged into the AI service you picked
- **One click** — Adds a button to the YouTube video page: press it and the subtitles are captured, your AI opens, and the summary starts
- **Choice of AI service** — Google AI Studio, Gemini, ChatGPT, Claude, or Grok — pick your usual one in the settings
- **Works on restricted videos** — Members-only, age-restricted and region-locked videos can be summarized too, as long as you can watch them yourself
- **Long videos aren't cut short** — The whole transcript reaches the AI, so the summary won't stop halfway through
- **Summarize without opening the video** — Hover any video thumbnail for a button that summarizes it right there
- **Custom prompt** — Write your own prompt in the settings to control how the AI summarizes and what it focuses on
- **10 interface languages** — English, 繁體中文, 简体中文, 日本語, 한국어, Español, Français, Deutsch, Português (BR), Русский

## How to use

1. Install Tampermonkey, then install this script
2. Open any YouTube video that has subtitles
3. Click the **Summarize** button next to the like/dislike buttons — the subtitles are captured and your chosen AI opens with the prompt already filled in
4. Click the gear next to it to open settings: AI service, interface language, custom prompt, timestamps, auto-submit, preferred subtitle languages

## Requirements

- Tampermonkey, or another userscript manager
- A logged-in account on the AI service you pick — no API key, no payment, no subscription

## Privacy

- No data collection, no analytics, no server of the author's involved
- Subtitles are read from YouTube itself (same-origin requests from the page) and handed to the AI tab you chose; nothing else leaves your browser
- Settings are stored locally by your userscript manager

## Source & support

- Source code: https://github.com/nathan60107/YoutubeFreeAISummary
- Bug reports & feature requests: https://github.com/nathan60107/YoutubeFreeAISummary/issues
- License: MIT
```

---

## 3. Additional info（中文（正體））

```markdown
**YouTube Free AI Summary** 會在 YouTube 上增加一個按鈕，擷取目前影片的字幕，並直接丟進新開的 AI 對話分頁——可自由選擇 Google AI Studio、Gemini、ChatGPT、Claude 或 Grok——讓你立刻進行總結。

它專門解決其他總結腳本會遇到的兩個問題：抓不到受限影片的字幕，以及字幕太長時沒能完整送進 AI、摘要只做了一半。

![影片頁上的摘要按鈕](https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/summarize-button.zh-TW.png)

安裝後，影片頁的喜歡／不喜歡按鈕旁會出現**摘要**按鈕（紅框處），按一下就開始。

## 功能特色

- **完全免費** — 不需要 API 金鑰、不需付費、也不需訂閱，你只要已登入所選的 AI 服務
- **一鍵完成** — 在 YouTube 影片頁多一顆按鈕，按下就會擷取字幕、開好 AI，摘要立刻開始
- **可選擇 AI 服務** — Google AI Studio、Gemini、ChatGPT、Claude 或 Grok，在設定中挑你慣用的那一個
- **受限影片也能摘要** — 會員專屬、年齡限制、地區限定的影片，只要你自己看得到就摘要得了
- **再長的影片也不會被截斷** — 完整字幕都會送進 AI，不會摘要到一半就停住
- **在觀看頁面外摘要** — 滑鼠移到任何影片縮圖就會浮現按鈕，不必開啟影片也能摘要
- **自訂提示詞** — 可在設定中自訂提示詞，決定 AI 要怎麼整理、著重講什麼
- **10 種介面語言** — English、繁體中文、简体中文、日本語、한국어、Español、Français、Deutsch、Português (BR)、Русский

## 使用方式

1. 安裝 Tampermonkey，再安裝本腳本
2. 開啟任何有字幕的 YouTube 影片
3. 按下喜歡/不喜歡按鈕旁的**摘要**按鈕，腳本會擷取字幕並開啟你選擇的 AI，提示詞已自動填好
4. 按下旁邊的齒輪可開啟設定：AI 服務、介面語言、自訂提示詞、時間戳記、自動送出、偏好字幕語言

## 使用需求

- Tampermonkey 或其他使用者腳本管理器
- 已登入你所選的 AI 服務——不需要 API 金鑰、不需付費、不需訂閱

## 隱私

- 不蒐集任何資料、無分析追蹤、不經過作者的任何伺服器
- 字幕由 YouTube 本身讀取（頁面內的同源請求），並交給你選擇的 AI 分頁；除此之外沒有任何資料離開你的瀏覽器
- 設定值由你的使用者腳本管理器儲存在本機

## 原始碼與支援

- 原始碼：https://github.com/nathan60107/YoutubeFreeAISummary
- 問題回報與功能建議：https://github.com/nathan60107/YoutubeFreeAISummary/issues
- 授權：MIT
```

---

## 4. 版本說明（Notes on this version）

0.10.0 首次上架已填：`Initial release on Greasy Fork (v0.10.0).`

之後每次更新，從 [changelog.md](../changelog.md) 取對應版本的條列貼上即可。

---

## 5. 上架後待辦

- [x] 記下腳本頁面網址：<https://greasyfork.org/scripts/589075-youtubefreeaisummary>
- [x] 確認安裝檔內是 Greasy Fork 自己注入的 `@downloadURL` / `@updateURL`（已驗證，見上方說明）
- [x] 更新 [README.md](../README.md) 與 [README.zh-TW.md](../README.zh-TW.md) 安裝表格中的 GreasyFork 連結
- [ ] 把腳本網址填進 GitHub repo 的 Website 欄位（見 [github.md](github.md)）
