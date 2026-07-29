# YouTube Free AI Summary

[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![zh-TW](https://img.shields.io/badge/lang-zh--TW-green.svg)](README.zh-TW.md)

---

**YouTube Free AI Summary** is a Tampermonkey / Violentmonkey userscript that adds a button to YouTube which grabs the current video's subtitles and drops them straight into a freshly opened AI chat — your choice of Google AI Studio, Gemini, ChatGPT, Claude, or Grok — ready to be summarized.

It is built to solve the two problems that other summary scripts run into: subtitles that can't be fetched from outside the page, and prompts that get truncated because the transcript is smuggled through the URL.

## Features

- **On-page subtitle capture** — Reads the subtitles the page already has access to, instead of fetching them from an external API, so it still works on restricted, members-only or region-locked videos that outside tools can't reach
- **Choice of AI service** — Send the transcript to whichever AI you prefer: Google AI Studio, Gemini, ChatGPT, Claude, or Grok. Pick it in the settings dialog
- **No length limit** — Hands the transcript to the AI's input directly rather than through URL parameters, avoiding the character cap that truncates other scripts
- **Completely free** — No API key and no paid service required; you only need to be logged into the AI service you picked
- **One click** — Adds a single button to the YouTube player page that captures the subtitles and opens your chosen AI for you
- **Summarize outside the watch page** — Hover any video thumbnail (home, search, related, channel) for a sparkle button that summarizes it without you opening the video. Public videos are captured instantly off-page; member-only and age-restricted ones open briefly in a new tab (using your signed-in session) that summarizes and closes itself, leaving your current page untouched
- **Custom prompt** — Rewrite the prompt sent to the AI in the settings dialog; leave it blank to follow the interface language and use that language's default prompt. Custom prompts can include `{{title}}`, `{{channel}}`, `{{url}}`, `{{language}}` and `{{transcript}}` tokens

## Roadmap

Planned features and fixes:

- **Browser extension version** — a packaged browser extension in addition to the userscript

## Installation

Requires [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).

| Platform | Link |
|----------|------|
| GreasyFork | [Install](https://greasyfork.org/scripts/589075-youtubefreeaisummary) |
| Direct from this repo | [Install](https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/dist/YoutubeFreeAISummary.user.js) |

## Development

```bash
# Install dependencies
npm install

# Development mode with live reload
npm run dev

# Production build (all platforms)
npm run build-prod
```

## License

This project is licensed under the [MIT License](./LICENSE.txt).
