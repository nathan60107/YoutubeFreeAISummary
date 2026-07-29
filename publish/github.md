# GitHub 上架資訊（Repository + Release）

> 平台：<https://github.com/nathan60107/YoutubeFreeAISummary>
> 對應建置：`npm run build-prod-gh` → `dist/YoutubeFreeAISummary.user.js`
> 這是「直接從 GitHub 安裝」的通道，同時也是 Greasy Fork 版的原始碼與問題回報來源。
>
> **兩個建置中只有這一個帶 `@downloadURL` / `@updateURL`**（指向 `raw.githubusercontent.com/.../main/dist/YoutubeFreeAISummary.user.js`）：
> raw 檔案與 release 附件本身不帶任何更新來源，所以必須寫明；Greasy Fork 會自行注入，gf 版建置因此刻意不輸出這兩個 key。

---

## 0. 上架前準備

- [ ] 確認 `package.json` 的 `version` 是要發佈的版本（目前 **0.10.0**）
- [ ] 執行 `npm run build-prod`（一次產出 gh / gf 兩個檔案）
- [ ] `npm run lint` 通過
- [ ] `dist/*.user.js` 兩個檔案已 commit 並推上 `main`（`.gitignore` 已設定為只追蹤 `dist/*.user.js`）—— GitHub 安裝連結直接讀 `main` 上的這個檔案，沒推上去就等於沒發佈
- [ ] 目前 repo 尚無任何 tag，這會是第一個 release

---

## 1. Repository 設定（About 區塊）

| 欄位 | 值 |
|------|-----|
| Description | `Capture a YouTube video's on-page subtitles and send them straight to your chosen AI (AI Studio, Gemini, ChatGPT, Claude, or Grok) for a free summary` |
| Website | `https://greasyfork.org/scripts/589075-youtubefreeaisummary` |
| Topics | 見下方 |

Topics（複製貼上，GitHub 上以空白分隔輸入）：

```
userscript tampermonkey violentmonkey youtube youtube-subtitles ai-summary gemini chatgpt claude grok greasyfork typescript
```

---

## 2. Release

| 欄位 | 值 |
|------|-----|
| Tag | `v0.10.0`（target: `main`） |
| Release title | `v0.10.0 — First public release` |
| Set as latest release | ✅ |
| Attachments | `dist/YoutubeFreeAISummary.user.js`、`dist/YoutubeFreeAISummary_gf.user.js` |

### Release notes（直接貼上）

```markdown
First public release of **YouTube Free AI Summary** — a Tampermonkey / Violentmonkey userscript that adds a button to YouTube which grabs the current video's subtitles and drops them straight into a freshly opened AI chat (Google AI Studio, Gemini, ChatGPT, Claude, or Grok), ready to be summarized.

## Install

| Platform | Link |
|----------|------|
| Greasy Fork | https://greasyfork.org/scripts/589075-youtubefreeaisummary |
| Direct from this repo | https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/dist/YoutubeFreeAISummary.user.js |

Requires Tampermonkey or Violentmonkey, plus a logged-in account on the AI service you pick. No API key, no payment.

## Highlights

- **On-page subtitle capture** — reads the subtitles the page already has, so members-only, age-restricted and region-locked videos work too
- **Choice of AI service** — AI Studio, Gemini, ChatGPT, Claude or Grok, picked in settings
- **No length limit** — the transcript is typed into the AI's input instead of being smuggled through the URL
- **Summarize from a thumbnail** — hover any thumbnail on home / search / related / channel pages for a sparkle button, no need to open the video
- **Custom prompt** with `{{title}}`, `{{channel}}`, `{{url}}`, `{{language}}`, `{{transcript}}` tokens
- **10 interface languages**, auto-detected from the browser

## Changes in 0.10.0

- Include the channel name in the summary: the default prompt now passes it to the AI (via a new `{{channel}}` token), giving the summary the context of who made the video

Full history: [changelog.md](https://github.com/nathan60107/YoutubeFreeAISummary/blob/main/changelog.md)
```

### 用 gh CLI 建立（可選）

```bash
gh release create v0.10.0 \
  dist/YoutubeFreeAISummary.user.js \
  dist/YoutubeFreeAISummary_gf.user.js \
  --title "v0.10.0 — First public release" \
  --notes-file publish/release-notes-0.10.0.md
```

（`--notes-file` 指向的檔案請先自行從上面的 release notes 另存；或改用 `--notes "…"` 直接帶入。）

---

## 3. 上架後待辦

- [x] 更新 [README.md](../README.md) 與 [README.zh-TW.md](../README.zh-TW.md) 的安裝區塊（已填入 Greasy Fork 連結，並補上 GitHub raw 這一列）
- [ ] Repository 的 Website 欄位填入 `https://greasyfork.org/scripts/589075-youtubefreeaisummary`
- [ ] 後續每次發版：更新 `package.json` 版本 → `npm run build-prod` → 更新 `changelog.md` → commit + push → 開 tag/release → 更新 Greasy Fork 上的原始碼
