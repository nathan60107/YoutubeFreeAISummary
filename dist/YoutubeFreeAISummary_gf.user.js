// ==UserScript==
// @name              YoutubeFreeAISummary
// @namespace         https://github.com/nathan60107/YoutubeFreeAISummary
// @version           0.5.0
// @description       Capture a YouTube video's on-page subtitles and send them straight to your chosen AI (AI Studio, Gemini, ChatGPT, Claude, or Grok) for a free summary
// @homepageURL       https://github.com/nathan60107/YoutubeFreeAISummary#readme
// @supportURL        https://github.com/nathan60107/YoutubeFreeAISummary/issues
// @license           MIT
// @author            nathan60107
// @copyright         nathan60107 (https://github.com/nathan60107)
// @icon              https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/icon.svg?b=1e94c46
// @match             *://*.youtube.com/*
// @match             *://aistudio.google.com/*
// @match             *://gemini.google.com/*
// @match             *://chatgpt.com/*
// @match             *://chat.openai.com/*
// @match             *://claude.ai/*
// @match             *://grok.com/*
// @run-at            document-start
// @downloadURL       https://update.greasyfork.org/scripts/#REPLACE:greasyfork_script_id/YoutubeFreeAISummary_gf.user.js
// @updateURL         https://update.greasyfork.org/scripts/#REPLACE:greasyfork_script_id/YoutubeFreeAISummary_gf.user.js
// @connect           github.com
// @connect           raw.githubusercontent.com
// @grant             GM.getValue
// @grant             GM.setValue
// @grant             GM.deleteValue
// @grant             GM.getResourceUrl
// @grant             GM.xmlHttpRequest
// @grant             GM.openInTab
// @grant             unsafeWindow
// @noframes
// @resource          img-icon https://raw.githubusercontent.com/nathan60107/YoutubeFreeAISummary/main/assets/icon.svg?b=1e94c46
// @require           https://cdn.jsdelivr.net/npm/@sv443-network/userutils@6.3.0/dist/index.global.js
// ==/UserScript==

(function (userutils) {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */


    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
        var e = new Error(message);
        return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

    const modeRaw = "production";
    const hostRaw = "greasyfork";
    const buildNumberRaw = "1e94c46";
    /** The mode in which the script was built (production or development) */
    const mode = (modeRaw.match(/^#{{.+}}$/) ? "production" : modeRaw);
    /** Path to the GitHub repo in the format "User/Repo" */
    const repo = "nathan60107/YoutubeFreeAISummary";
    /** Which host the userscript was installed from */
    const host = (hostRaw.match(/^#{{.+}}$/) ? "github" : hostRaw);
    /** The build number of the userscript */
    const buildNumber = (buildNumberRaw.match(/^#{{.+}}$/) ? "BUILD_ERROR!" : buildNumberRaw); // asserted as generic string instead of literal
    /** Names of platforms by value of {@linkcode host} */
    const platformNames = {
        github: "GitHub",
        greasyfork: "GreasyFork",
        openuserjs: "OpenUserJS",
    };
    /** Default compression format used throughout the entire script */
    const compressionFormat = "deflate-raw";
    /** Whether sessionStorage is available and working */
    typeof (sessionStorage === null || sessionStorage === void 0 ? void 0 : sessionStorage.setItem) !== "undefined"
        && (() => {
            try {
                const key = `_ses_test_${userutils.randomId(4)}`;
                sessionStorage.setItem(key, "test");
                sessionStorage.removeItem(key);
                return true;
            }
            catch (_a) {
                return false;
            }
        })();
    /** Info about the userscript, parsed from the userscript header (tools/post-build.js) */
    const scriptInfo = {
        name: GM.info.script.name,
        version: GM.info.script.version,
        namespace: GM.info.script.namespace,
    };

    //#region logging
    /** Shared console prefix so every log is filterable and never lost behind a missing tag. */
    const logPrefix = "[YFAS]";
    /**
     * In-memory ring buffer of the most recent log lines from all three streams. Kept in RAM only
     * (never persisted) so a debug report can include recent history without touching storage.
     */
    const logBuffer = [];
    /** Cap on retained log lines; oldest are dropped past this to bound memory use. */
    const maxLogEntries = 300;
    /** Best-effort conversion of a single log argument to a readable string (expanding Errors/objects). */
    function stringifyArg(arg) {
        if (typeof arg === "string")
            return arg;
        if (arg instanceof Error)
            return `${arg.name}: ${arg.message}${arg.stack ? `\n${arg.stack}` : ""}`;
        try {
            return JSON.stringify(arg);
        }
        catch (_a) {
            return String(arg);
        }
    }
    /** Appends a line to {@linkcode logBuffer}, trimming it back down to {@linkcode maxLogEntries}. */
    function record$1(level, args) {
        logBuffer.push({ t: Date.now(), level, msg: args.map(stringifyArg).join(" ") });
        if (logBuffer.length > maxLogEntries)
            logBuffer.splice(0, logBuffer.length - maxLogEntries);
    }
    /** Prefixed `console.log`, also captured into the in-memory log buffer. */
    const log = (...args) => { record$1("log", args); console.log(logPrefix, ...args); };
    /** Prefixed `console.warn`, also captured into the in-memory log buffer. */
    const warn = (...args) => { record$1("warn", args); console.warn(logPrefix, ...args); };
    /** Prefixed `console.error`, also captured into the in-memory log buffer. */
    const error = (...args) => { record$1("error", args); console.error(logPrefix, ...args); };
    /** Returns the captured log lines (oldest first), each formatted as `[ISO time] LEVEL message`. */
    function getRecentLogs() {
        return logBuffer.map(e => `[${new Date(e.t).toISOString()}] ${e.level.toUpperCase()} ${e.msg}`);
    }
    /**
     * Opens the given URL in a new tab, using GM.openInTab if available
     * ⚠️ Requires the directive `@grant GM.openInTab`
     */
    function openInTab(href, background = true) {
        try {
            userutils.openInNewTab(href, background);
        }
        catch (err) {
            window.open(href, "_blank", "noopener noreferrer");
        }
    }
    //#region DOM utils
    let domLoaded = document.readyState === "complete" || document.readyState === "interactive";
    document.addEventListener("DOMContentLoaded", () => domLoaded = true);
    /**
     * Adds generic, accessible interaction listeners to the passed element.
     * All listeners have the default behavior prevented and stop immediate propagation.
     * @param listenerOptions Provide a {@linkcode listenerOptions} object to configure the listeners
     */
    function onInteraction(elem, listener, listenerOptions) {
        const proxListener = (e) => {
            if (e instanceof KeyboardEvent && !(["Enter", " ", "Space", "Spacebar"].includes(e.key)))
                return;
            e.preventDefault();
            e.stopImmediatePropagation();
            (listenerOptions === null || listenerOptions === void 0 ? void 0 : listenerOptions.once) && e.type === "keydown" && elem.removeEventListener("click", proxListener, listenerOptions);
            (listenerOptions === null || listenerOptions === void 0 ? void 0 : listenerOptions.once) && e.type === "click" && elem.removeEventListener("keydown", proxListener, listenerOptions);
            listener(e);
        };
        elem.addEventListener("click", proxListener, listenerOptions);
        elem.addEventListener("keydown", proxListener, listenerOptions);
    }
    /** Resolves with the first element matching `selector`, polling until found or `timeoutMs` elapses (then `null`). */
    function waitForSelector(selector, timeoutMs = 4000, intervalMs = 100) {
        const existing = document.querySelector(selector);
        if (existing)
            return Promise.resolve(existing);
        return new Promise((resolve) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const el = document.querySelector(selector);
                if (el || Date.now() - start > timeoutMs) {
                    clearInterval(timer);
                    resolve(el);
                }
            }, intervalMs);
        });
    }
    /**
     * A pass-through Trusted Types policy, or `undefined` when the browser has no Trusted Types.
     * YouTube enforces `require-trusted-types-for 'script'` (observed in incognito windows), so a plain
     * `element.innerHTML = "..."` throws a "Sink type mismatch" CSP violation. Routing HTML through this
     * policy satisfies the enforcement; where Trusted Types is absent, assigning the raw string is
     * already allowed. YouTube ships no `trusted-types` names allowlist, so any policy name is accepted.
     */
    const htmlPolicy = (() => {
        const tt = window.trustedTypes;
        try {
            return tt === null || tt === void 0 ? void 0 : tt.createPolicy("yfas", { createHTML: html => html });
        }
        catch (err) {
            warn("Couldn't create Trusted Types policy; falling back to raw innerHTML:", err);
            return undefined;
        }
    })();
    /**
     * Sets `element.innerHTML`, wrapping the HTML in a Trusted Types policy where the browser enforces
     * Trusted Types. Use this instead of assigning `innerHTML` directly so the script keeps working
     * under YouTube's CSP (notably in incognito windows, where the assignment otherwise throws).
     */
    function setInnerHtml(element, html) {
        var _a;
        element.innerHTML = ((_a = htmlPolicy === null || htmlPolicy === void 0 ? void 0 : htmlPolicy.createHTML(html)) !== null && _a !== void 0 ? _a : html);
    }
    /**
     * Adds a style element to the DOM at runtime.
     * @param css The CSS stylesheet to add
     * @param ref A reference string to identify the style element - defaults to a random 5-character string
     */
    function addStyle(css, ref) {
        if (!domLoaded)
            throw new Error("DOM has not finished loading yet");
        // Use textContent rather than a userutils helper's `innerHTML`: on a <style> element innerHTML is
        // still a Trusted Types sink, which YouTube's CSP blocks in incognito windows. textContent isn't.
        const elem = document.createElement("style");
        elem.textContent = css;
        elem.id = `global-style-${ref !== null && ref !== void 0 ? ref : userutils.randomId(5, 36)}`;
        document.head.appendChild(elem);
        return elem;
    }

    /**
     * Shared modal scaffold used by the settings panel and the failure-feedback dialog.
     * Handles the common overlay/backdrop, Escape-to-close, one-at-a-time dedupe, and base styling
     * (overlay, box, title, primary/secondary buttons). Callers supply the inner HTML, wire up their
     * own controls, and add any content-specific styles of their own.
     */
    /** Ref/id used for the shared base stylesheet, injected once. */
    const styleRef$2 = "yfas-modal";
    /**
     * Opens a modal using the shared scaffold and returns a {@linkcode ModalHandle}, or `null` if a
     * modal with the same `id` is already open (so the caller can early-return). The dialog closes on
     * Escape or a backdrop click; clicks inside the box are not propagated to the backdrop.
     */
    function openModal(opts) {
        var _a;
        if (document.getElementById(opts.id))
            return null;
        if (!document.getElementById(`global-style-${styleRef$2}`))
            addStyle(modalStyle, styleRef$2);
        const overlay = document.createElement("div");
        overlay.id = opts.id;
        overlay.className = "yfas-modal-overlay";
        setInnerHtml(overlay, `<div class="yfas-modal-box" role="${(_a = opts.role) !== null && _a !== void 0 ? _a : "dialog"}" aria-modal="true" aria-label="${opts.label}">${opts.innerHtml}</div>`);
        const modal = overlay.querySelector(".yfas-modal-box");
        const close = () => {
            overlay.remove();
            document.removeEventListener("keydown", onKeydown);
        };
        const onKeydown = (e) => {
            if (e.key === "Escape")
                close();
        };
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay)
                close();
        });
        modal.addEventListener("click", (e) => e.stopPropagation());
        document.addEventListener("keydown", onKeydown);
        document.body.appendChild(overlay);
        return { overlay, modal, close };
    }
    const modalStyle = `
.yfas-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  font-family: "Roboto", "Arial", sans-serif;
}
.yfas-modal-box {
  width: min(560px, 92vw);
  max-height: 88vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 20px 24px 24px;
  border-radius: 12px;
  background: var(--yt-spec-base-background, #fff);
  color: var(--yt-spec-text-primary, #0f0f0f);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
.yfas-modal-title {
  margin: 0 0 16px;
  font-size: 1.8rem;
  font-weight: 500;
}
.yfas-modal-btn {
  padding: 8px 16px;
  font-size: 1.4rem;
  font-weight: 500;
  font-family: inherit;
  border-radius: 18px;
  border: none;
  cursor: pointer;
}
.yfas-modal-btn--primary {
  background: var(--yt-spec-call-to-action, #065fd4);
  color: #fff;
}
.yfas-modal-btn--secondary {
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.08));
  color: inherit;
}
.yfas-modal-btn:hover {
  filter: brightness(1.1);
}
`;

    /**
     * Shared failure feedback used by both the YouTube and AI provider sides.
     *
     * On a failure we show a modal telling the user to refresh and retry. Failure timestamps are
     * persisted (via GM storage, shared across tabs) so that if the user hits two failures within
     * five minutes — even across a page refresh or across the YouTube/AI provider tabs — the modal
     * escalates to include a copyable debug report and a prompt to file a GitHub issue.
     */
    /** GM storage key holding the recent failure timestamps (JSON array of epoch ms). */
    const failuresKey = "yfas-recent-failures";
    /** Sliding window within which repeated failures escalate the modal. */
    const failureWindowMs = 5 * 60000;
    /** Number of failures within the window that triggers the debug-report escalation. */
    const escalateThreshold = 2;
    /** GitHub issues page users are directed to when reporting a persistent problem. */
    const issuesUrl = `https://github.com/${repo}/issues/new`;
    const overlayId$1 = "yfas-feedback-overlay";
    const styleRef$1 = "yfas-feedback";
    /**
     * Records the failure and shows the feedback modal, escalating to a debug report if this is the
     * {@linkcode escalateThreshold}-th failure within {@linkcode failureWindowMs}.
     */
    function reportFailure(info) {
        return __awaiter(this, void 0, void 0, function* () {
            const count = yield trackFailure();
            showModal(info, count >= escalateThreshold);
        });
    }
    /** Clears the persisted failure counter. Exposed for the dev-only "reset" menu command. */
    function clearFailureCount() {
        return __awaiter(this, void 0, void 0, function* () {
            yield GM.deleteValue(failuresKey);
        });
    }
    /** Appends `now` to the persisted failure list, prunes old entries, and returns the count in-window. */
    function trackFailure() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            let times = [];
            try {
                times = JSON.parse(yield GM.getValue(failuresKey, "[]"));
                if (!Array.isArray(times))
                    times = [];
            }
            catch (_a) {
                times = [];
            }
            times = times.filter(t => typeof t === "number" && now - t < failureWindowMs);
            times.push(now);
            yield GM.setValue(failuresKey, JSON.stringify(times));
            return times.length;
        });
    }
    /** Assembles a plain-text diagnostic report: environment, install source, and recent logs. */
    function buildDebugReport(context) {
        var _a, _b, _c, _d;
        // scriptHandler/version aren't in the GM typings, so read them loosely.
        const gm = GM.info;
        const langs = Array.isArray(navigator.languages) ? navigator.languages.join(", ") : navigator.language;
        const logs = getRecentLogs();
        return [
            "### YFAS debug report",
            `time: ${new Date().toISOString()}`,
            `context: ${context}`,
            "",
            "**Script**",
            `- name: ${scriptInfo.name}`,
            `- version: ${scriptInfo.version}`,
            `- build: ${buildNumber}`,
            `- install source: ${(_a = platformNames[host]) !== null && _a !== void 0 ? _a : host}`,
            `- namespace: ${scriptInfo.namespace}`,
            "",
            "**Environment**",
            `- manager: ${(_b = gm.scriptHandler) !== null && _b !== void 0 ? _b : "unknown"} ${(_c = gm.version) !== null && _c !== void 0 ? _c : ""}`.trimEnd(),
            `- url: ${location.href}`,
            `- userAgent: ${navigator.userAgent}`,
            `- platform: ${(_d = navigator.platform) !== null && _d !== void 0 ? _d : "unknown"}`,
            `- language: ${navigator.language} (${langs})`,
            `- viewport: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
            "",
            "**Recent logs**",
            logs.length > 0 ? logs.join("\n") : "(no logs captured)",
        ].join("\n");
    }
    const defaultMessage = "摘要失敗了。請重新整理頁面後再試一次。";
    /** Builds and shows the modal. Only one is shown at a time. */
    function showModal(info, escalate) {
        var _a;
        const report = escalate ? buildDebugReport(info.context) : "";
        const handle = openModal({
            id: overlayId$1,
            label: "摘要失敗",
            role: "alertdialog",
            innerHtml: `
      <h2 class="yfas-modal-title">摘要失敗</h2>
      <p class="yfas-fb-msg"></p>
      ${escalate ? `
        <div class="yfas-fb-debug">
          <p class="yfas-fb-debug-lead">這個問題似乎連續發生了。若持續無法使用，請協助回報，讓問題更快被修好：</p>
          <ol class="yfas-fb-steps">
            <li>點下方「複製診斷資訊」。</li>
            <li>前往問題回報頁開一個新的 issue。</li>
            <li>把剛剛複製的內容貼上，並簡述你的操作。</li>
          </ol>
          <textarea class="yfas-fb-report" readonly rows="8"></textarea>
          <div class="yfas-fb-debug-actions">
            <button type="button" class="yfas-modal-btn yfas-modal-btn--secondary" data-action="copy">複製診斷資訊</button>
            <a class="yfas-fb-issue" href="${issuesUrl}" target="_blank" rel="noopener noreferrer">前往問題回報頁 ↗</a>
          </div>
        </div>` : ""}
      <div class="yfas-fb-actions">
        <button type="button" class="yfas-modal-btn yfas-modal-btn--primary" data-action="close">關閉</button>
      </div>`,
        });
        if (!handle)
            return; // one at a time
        if (!document.getElementById(`global-style-${styleRef$1}`))
            addStyle(feedbackStyle, styleRef$1);
        const { overlay, close } = handle;
        // Assign text via textContent to avoid injecting untrusted strings as HTML.
        overlay.querySelector(".yfas-fb-msg").textContent = (_a = info.userMessage) !== null && _a !== void 0 ? _a : defaultMessage;
        overlay.querySelector("[data-action='close']").addEventListener("click", close);
        if (escalate) {
            const reportEl = overlay.querySelector(".yfas-fb-report");
            reportEl.value = report;
            const copyBtn = overlay.querySelector("[data-action='copy']");
            copyBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
                const ok = yield copyText(report, reportEl);
                copyBtn.textContent = ok ? "已複製 ✓" : "複製失敗，請手動選取";
                setTimeout(() => (copyBtn.textContent = "複製診斷資訊"), 2500);
            }));
        }
        overlay.querySelector("[data-action='close']").focus();
    }
    /** Copies text to the clipboard, falling back to selecting the textarea + `execCommand`. */
    function copyText(text, textarea) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield navigator.clipboard.writeText(text);
                return true;
            }
            catch (_a) {
                try {
                    textarea.focus();
                    textarea.select();
                    const ok = document.execCommand("copy");
                    textarea.setSelectionRange(0, 0);
                    textarea.blur();
                    return ok;
                }
                catch (_b) {
                    return false;
                }
            }
        });
    }
    const feedbackStyle = `
.yfas-fb-msg {
  margin: 0 0 8px;
  font-size: 1.4rem;
  line-height: 1.5;
}
.yfas-fb-debug {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.15));
}
.yfas-fb-debug-lead {
  margin: 0 0 8px;
  font-size: 1.3rem;
  line-height: 1.5;
}
.yfas-fb-steps {
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 1.3rem;
  line-height: 1.6;
}
.yfas-fb-report {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  font-family: monospace;
  font-size: 1.2rem;
  line-height: 1.4;
  padding: 8px 10px;
  border: 1px solid var(--yt-spec-10-percent-layer, rgba(0, 0, 0, 0.2));
  border-radius: 8px;
  background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
  color: inherit;
  white-space: pre;
}
.yfas-fb-debug-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}
.yfas-fb-issue {
  font-size: 1.3rem;
  color: var(--yt-spec-call-to-action, #065fd4);
  text-decoration: none;
}
.yfas-fb-issue:hover {
  text-decoration: underline;
}
.yfas-fb-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
`;

    /**
     * Cross-tab handoff between the YouTube tab (which captures subtitles) and the AI provider tab
     * (which injects them). GM storage is shared across all tabs running this userscript, so the
     * payload survives the `openInTab` jump without going through the URL (avoiding length limits).
     * ⚠️ Requires the directives `@grant GM.setValue`, `@grant GM.getValue`, `@grant GM.deleteValue`
     */
    const storageKey = "yfas-pending-summary";
    /** Stores a captured payload for the AI provider tab to pick up. */
    function stashSummaryPayload(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            yield GM.setValue(storageKey, JSON.stringify(payload));
        });
    }
    /**
     * Reads and removes the pending payload (one-shot). Returns `null` if there is none or it is
     * older than `maxAgeMs` (a stale handoff from a previous, unrelated session).
     */
    function takeSummaryPayload() {
        return __awaiter(this, arguments, void 0, function* (maxAgeMs = 5 * 60000) {
            const raw = yield GM.getValue(storageKey, "");
            if (!raw)
                return null;
            yield GM.deleteValue(storageKey);
            try {
                const payload = JSON.parse(raw);
                if (typeof payload.createdAt !== "number" || Date.now() - payload.createdAt > maxAgeMs)
                    return null;
                return payload;
            }
            catch (_a) {
                return null;
            }
        });
    }

    /**
     * AI provider registry + the generic "target tab" engine.
     *
     * The YouTube side captures subtitles and hands off a {@linkcode SummaryPayload}; the target tab
     * (whichever AI site the user picked) picks it up and injects it into that site's prompt input,
     * optionally submitting. Every site has a different DOM (textarea vs. contenteditable rich editor)
     * and different submit affordances, so each is described declaratively by an {@linkcode AiProvider}
     * and driven by one shared engine below.
     */
    /** Google AI Studio (the original target). Uses a plain textarea + a "Run" button. */
    const aiStudio = {
        id: "aistudio",
        label: "Google AI Studio",
        note: "品質最佳：不限字數、可免費使用 Pro 模型；思考時間較長，但結果非常準確。適合長字幕。",
        recommended: true,
        newChatUrl: "https://aistudio.google.com/prompts/new_chat",
        hosts: ["aistudio.google.com"],
        inputKind: "textarea",
        inputSelectors: [
            "ms-autosize-textarea textarea",
            "ms-prompt-input-wrapper textarea",
            "textarea[aria-label]",
            "textarea",
        ],
        submitSelectors: [
            "ms-run-button button",
            "run-button button",
            "button.run-button",
            "button[aria-label='Run']",
        ],
        submitTexts: /^(run|執行|送出|傳送)$/i,
        submitShortcut: "ctrl-enter",
    };
    /** Consumer Gemini (gemini.google.com) — a Quill rich editor, not AI Studio. */
    const gemini = {
        id: "gemini",
        label: "Gemini",
        note: "結果品質良好，但輸入框有長度限制，較長的字幕可能無法完整貼入。",
        newChatUrl: "https://gemini.google.com/app",
        hosts: ["gemini.google.com"],
        inputKind: "contenteditable",
        inputSelectors: [
            "rich-textarea .ql-editor[contenteditable='true']",
            "div.ql-editor[contenteditable='true']",
            "[role='textbox'][contenteditable='true']",
        ],
        submitSelectors: [
            "button.send-button",
            "button[aria-label*='傳送']",
            "button[aria-label*='發送']",
            "button[aria-label*='Send']",
        ],
        submitShortcut: "enter",
        // Gemini's /app landing resets the view on a too-early submit; wait for it to settle first.
        settleBeforeSubmit: true,
    };
    /** ChatGPT (chatgpt.com) — ProseMirror contenteditable `#prompt-textarea`. */
    const chatgpt = {
        id: "chatgpt",
        label: "ChatGPT",
        note: "免費模型品質較弱；字幕過長時可能直接不回應。適合較短的影片。",
        newChatUrl: "https://chatgpt.com/",
        hosts: ["chatgpt.com", "chat.openai.com"],
        inputKind: "contenteditable",
        inputSelectors: [
            "#prompt-textarea",
            "div.ProseMirror[contenteditable='true']",
            "[contenteditable='true'][id='prompt-textarea']",
        ],
        submitSelectors: [
            "button[data-testid='send-button']",
            "#composer-submit-button",
            "button[aria-label*='Send']",
        ],
        submitShortcut: "enter",
    };
    /** Claude (claude.ai) — ProseMirror contenteditable editor. */
    const claude = {
        id: "claude",
        label: "Claude",
        note: "思考時間較長，結果偶有瑕疵。",
        newChatUrl: "https://claude.ai/new",
        hosts: ["claude.ai"],
        inputKind: "contenteditable",
        inputSelectors: [
            "div.ProseMirror[contenteditable='true']",
            "[contenteditable='true'][role='textbox']",
            "fieldset div.ProseMirror",
        ],
        submitSelectors: [
            "button[aria-label='Send message']",
            "button[aria-label*='Send']",
        ],
        submitShortcut: "enter",
    };
    /** Grok (grok.com) — a plain textarea composer. */
    const grok = {
        id: "grok",
        label: "Grok",
        note: "品質次於 AI Studio，結果偶有小瑕疵。",
        newChatUrl: "https://grok.com/",
        hosts: ["grok.com"],
        inputKind: "textarea",
        inputSelectors: [
            "textarea[aria-label]",
            "textarea[dir='auto']",
            "form textarea",
            "textarea",
        ],
        submitSelectors: [
            "button[type='submit']",
            "button[aria-label*='Submit']",
            "button[aria-label*='Send']",
        ],
        submitShortcut: "enter",
    };
    /** All supported providers, ordered best-to-worst (roughly) — this is the order shown to the user. */
    const providers = [aiStudio, grok, claude, gemini, chatgpt];
    /** Provider used when config is empty or references an unknown id (keeps old behaviour). */
    const defaultProvider = aiStudio;
    /** Looks up a provider by its persisted id, falling back to {@linkcode defaultProvider}. */
    function getProviderById(id) {
        var _a;
        return (_a = providers.find(p => p.id === id)) !== null && _a !== void 0 ? _a : defaultProvider;
    }
    /** Returns the provider that owns the given hostname, if any (used to route the target tab). */
    function getProviderByHost(hostname) {
        return providers.find(p => p.hosts.some(h => hostname === h || hostname.endsWith(`.${h}`)));
    }
    /**
     * Entry point for a target tab. Reads the pending payload (if this tab was opened by our YouTube
     * side) and injects it into `provider`'s prompt field. A no-op on a normal, unrelated visit.
     */
    function initProviderTarget(provider) {
        return __awaiter(this, void 0, void 0, function* () {
            const payload = yield takeSummaryPayload();
            if (!payload)
                return; // normal visit, nothing to inject
            try {
                let input = yield waitForInput(provider);
                if (!input) {
                    warn(`Could not find the ${provider.label} prompt input to inject into.`);
                    void reportFailure({
                        context: `provider:${provider.id}:no-input`,
                        userMessage: `在 ${provider.label} 找不到輸入框，可能是頁面尚未載入完成或版面改版。請重新整理頁面後再試一次。`,
                    });
                    return;
                }
                injectPrompt(provider, input, payload.prompt);
                log(`Injected subtitles into ${provider.label}${payload.title ? ` for "${payload.title}"` : ""}.`);
                if (payload.autoSubmit) {
                    if (provider.settleBeforeSubmit)
                        input = yield settleBeforeSubmit(provider, input, payload.prompt);
                    yield submitPrompt(provider, input);
                }
                else {
                    log("Auto-submit disabled; leaving the prompt for review.");
                }
            }
            catch (err) {
                error(`Failed to inject the prompt into ${provider.label}:`, err);
                void reportFailure({ context: `provider:${provider.id}:inject-error` });
            }
        });
    }
    /**
     * Waits for the page to stop mutating before submitting, then makes sure our text is still in the
     * field (the hydration churn can replace or clear the editor). Returns the input to submit against —
     * re-resolved if the original node was swapped out. Used only by providers with `settleBeforeSubmit`.
     */
    function settleBeforeSubmit(provider, input, value) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            yield waitForDomQuiet();
            // If the settled app swapped the editor node or wiped its contents, re-find and re-inject.
            const current = input.isConnected ? input : (_a = yield waitForInput(provider)) !== null && _a !== void 0 ? _a : input;
            if (provider.inputKind === "contenteditable" && !hasText(current)) {
                log(`${provider.label} cleared the prompt while settling; re-injecting.`);
                injectPrompt(provider, current, value);
            }
            return current;
        });
    }
    /**
     * Resolves once the DOM has gone `quietMs` without a mutation (a proxy for "the SPA finished
     * hydrating"), or after `maxMs` regardless so it can never hang. Cheaper and more accurate than a
     * fixed sleep: it proceeds the moment the app calms down and only waits longer when it's still busy.
     */
    function waitForDomQuiet(quietMs = 450, maxMs = 6000) {
        return new Promise((resolve) => {
            let quietTimer = 0;
            const finish = () => {
                clearTimeout(quietTimer);
                clearTimeout(hardCap);
                obs.disconnect();
                resolve();
            };
            const obs = new MutationObserver(() => {
                clearTimeout(quietTimer);
                quietTimer = window.setTimeout(finish, quietMs);
            });
            obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
            quietTimer = window.setTimeout(finish, quietMs);
            const hardCap = window.setTimeout(finish, maxMs);
        });
    }
    /** Waits (generously — these apps load slowly) for any candidate prompt input to appear. */
    function waitForInput(provider) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const combined = provider.inputSelectors.join(", ");
            const found = yield waitForSelector(combined, 20000, 200);
            if (!found)
                return null;
            // Prefer a visible one if several match.
            const all = [...document.querySelectorAll(combined)];
            return (_a = all.find(el => el.offsetParent !== null)) !== null && _a !== void 0 ? _a : found;
        });
    }
    /** Dispatches text into the provider's prompt field according to its {@linkcode InputKind}. */
    function injectPrompt(provider, input, value) {
        if (provider.inputKind === "textarea")
            injectTextarea(input, value);
        else
            injectContentEditable(input, value);
    }
    /**
     * Sets a value on a framework-controlled textarea. Assigning `.value` directly is ignored by
     * Angular/React change detection, so we use the native value setter and dispatch an `input` event.
     */
    function injectTextarea(textarea, value) {
        var _a, _b, _c;
        const proto = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window).HTMLTextAreaElement.prototype;
        const setter = (_b = (_a = Object.getOwnPropertyDescriptor(proto, "value")) === null || _a === void 0 ? void 0 : _a.set) !== null && _b !== void 0 ? _b : (_c = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")) === null || _c === void 0 ? void 0 : _c.set;
        if (setter)
            setter.call(textarea, value);
        else
            textarea.value = value;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        textarea.dispatchEvent(new Event("change", { bubbles: true }));
        textarea.focus();
    }
    /**
     * Inserts text into a contenteditable rich editor (ProseMirror/Quill/Lexical). These editors ignore
     * direct `textContent` writes, so we try, in order, the techniques they *do* honour, and after each
     * one check whether text actually landed before giving up on it:
     *   1. a synthetic `paste` carrying the transcript as `text/plain` (editors convert newlines to
     *      their own block structure) — but a "handled" paste can still insert nothing if the engine
     *      ignores our constructed `clipboardData`, so we verify rather than trusting `defaultPrevented`;
     *   2. `execCommand("insertText")`, which fires the `beforeinput` these editors listen to;
     *   3. a raw `textContent` write + `input` event as a last resort.
     * Verifying between steps is what makes auto-submit work: the send button only enables once the
     * editor's own model actually holds the text.
     */
    function injectContentEditable(el, value) {
        el.focus();
        placeCaretAtEnd(el);
        try {
            const dt = new DataTransfer();
            dt.setData("text/plain", value);
            const paste = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
            el.dispatchEvent(paste);
            if (hasText(el))
                return; // the editor consumed the paste and text landed
        }
        catch (err) {
            warn("Synthetic paste failed, falling back to execCommand:", err);
        }
        if (document.execCommand("insertText", false, value) && hasText(el))
            return;
        warn("Paste and execCommand both left the editor empty; writing textContent directly.");
        el.textContent = value;
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    }
    /** Whether a contenteditable currently holds any non-whitespace text. */
    function hasText(el) {
        var _a;
        return ((_a = el.textContent) !== null && _a !== void 0 ? _a : "").trim().length > 0;
    }
    /** Collapses the selection to the end of a contenteditable so insertions land inside it. */
    function placeCaretAtEnd(el) {
        try {
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel === null || sel === void 0 ? void 0 : sel.removeAllRanges();
            sel === null || sel === void 0 ? void 0 : sel.addRange(range);
        }
        catch (err) {
            warn("Could not place caret in the editor:", err);
        }
    }
    /**
     * Submits the prompt on the user's behalf: clicks the provider's submit button once it becomes
     * enabled, falling back to the provider's keyboard shortcut if the button can't be located.
     */
    function submitPrompt(provider, input) {
        return __awaiter(this, void 0, void 0, function* () {
            const button = yield waitForSubmitButton(provider);
            if (button) {
                button.click();
                log(`Clicked ${provider.label} submit button.`);
                return;
            }
            warn(`${provider.label} submit button not found; trying keyboard shortcut fallback.`);
            dispatchSubmitShortcut(input, provider.submitShortcut);
        });
    }
    /** Polls for a visible, enabled submit button (frameworks enable it once the prompt has content). */
    function waitForSubmitButton(provider, timeoutMs = 8000, intervalMs = 150) {
        const start = Date.now();
        return new Promise((resolve) => {
            const check = () => {
                const btn = findSubmitButton(provider);
                if (btn)
                    return resolve(btn);
                if (Date.now() - start > timeoutMs)
                    return resolve(null);
                setTimeout(check, intervalMs);
            };
            check();
        });
    }
    /** Finds a clickable submit button by selector or (fallback) by button text. */
    function findSubmitButton(provider) {
        var _a;
        const bySelector = [...document.querySelectorAll(provider.submitSelectors.join(", "))];
        const { submitTexts } = provider;
        const byText = submitTexts
            ? [...document.querySelectorAll("button")]
                .filter(b => { var _a, _b; return submitTexts.test((_b = (_a = b.textContent) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : ""); })
            : [];
        return (_a = [...bySelector, ...byText].find(isClickable)) !== null && _a !== void 0 ? _a : null;
    }
    /** Whether a button is visible and not disabled. */
    function isClickable(btn) {
        return btn.offsetParent !== null && !btn.disabled && btn.getAttribute("aria-disabled") !== "true";
    }
    /** Dispatches the provider's submit shortcut (Enter or Ctrl+Enter) on the prompt field. */
    function dispatchSubmitShortcut(el, shortcut) {
        const opts = {
            key: "Enter", code: "Enter", keyCode: 13, which: 13,
            ctrlKey: shortcut === "ctrl-enter", bubbles: true, cancelable: true,
        };
        el.dispatchEvent(new KeyboardEvent("keydown", opts));
        el.dispatchEvent(new KeyboardEvent("keyup", opts));
    }

    let canCompress;
    /** Default prompt template - also used by the settings panel's "reset" action. */
    const defaultPromptTemplate = [
        "請依據以下 YouTube 影片字幕（含時間軸）做重點摘要，並在每個重點標註對應的時間戳記。",
        "",
        "影片標題：{{title}}",
        "影片連結：{{url}}",
        "",
        "{{transcript}}",
    ].join("\n");
    /** Factory so the defaults object isn't shared by reference. */
    const getDefaultConfig = () => ({
        provider: defaultProvider.id,
        promptTemplate: defaultPromptTemplate,
        includeTimestamps: true,
        autoSubmit: true,
        preferredLangs: "",
    });
    const config = new userutils.DataStore({
        id: "script-config",
        defaultData: getDefaultConfig(),
        // increment this value if the data format changes:
        formatVersion: 1,
        // functions that migrate data from older versions to newer ones:
        migrations: {
        // migrate from v1 to v2:
        // 2: (oldData) => {
        //   return { ...oldData, newProp: "foo" };
        // },
        },
        encodeData: (data) => canCompress ? userutils.compress(data, compressionFormat, "string") : data,
        decodeData: (data) => canCompress ? userutils.decompress(data, compressionFormat, "string") : data,
    });
    function initConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            canCompress = yield compressionSupported();
            yield config.loadData();
        });
    }
    function compressionSupported() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof canCompress === "boolean")
                return canCompress;
            try {
                yield userutils.compress(".", compressionFormat, "string");
                return canCompress = true;
            }
            catch (e) {
                return canCompress = false;
            }
        });
    }

    /**
     * Intercepts the YouTube player's own `/api/timedtext` network requests so we can reuse the URL
     * it generates - which carries a valid PoToken and the user's auth session. This is the only way
     * to capture subtitles for PoToken-gated (`exp=xpe`) and member-only videos, where the static
     * `baseUrl` from the player response returns an empty body and `get_transcript` is rejected.
     *
     * Installed at document-start (before the player runs) by patching `fetch` and `XMLHttpRequest`
     * on the page realm via `unsafeWindow`.
     */
    const timedtextMarker = "/api/timedtext";
    /** Page realm, where the player's `fetch` / `XMLHttpRequest` live. */
    const pageWindow$1 = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
    /** Most recently observed working timedtext URL (from the page's own requests). */
    let latestUrl = null;
    /** One-shot resolvers waiting for the next matching URL. */
    const waiters = [];
    let installed = false;
    /** Records a captured URL if it is a timedtext request, and notifies any matching waiters. */
    function record(rawUrl) {
        if (!rawUrl.includes(timedtextMarker))
            return;
        latestUrl = rawUrl;
        for (let i = waiters.length - 1; i >= 0; i--) {
            const w = waiters[i];
            if (w.match(rawUrl)) {
                clearTimeout(w.timer);
                waiters.splice(i, 1);
                w.resolve(rawUrl);
            }
        }
    }
    /** Patches `fetch` and `XMLHttpRequest.open` on the page realm. Idempotent. */
    function installTimedtextInterceptor() {
        var _a;
        if (installed)
            return;
        installed = true;
        // fetch
        const origFetch = pageWindow$1.fetch;
        pageWindow$1.fetch = function (...args) {
            try {
                const input = args[0];
                const url = typeof input === "string"
                    ? input
                    : input instanceof URL ? input.href : input.url;
                record(url);
            }
            catch ( /* never let interception break the page's request */_a) { /* never let interception break the page's request */ }
            return origFetch.apply(this, args);
        };
        // XMLHttpRequest
        const proto = (_a = pageWindow$1.XMLHttpRequest) === null || _a === void 0 ? void 0 : _a.prototype;
        if (proto) {
            const origOpen = proto.open;
            proto.open = function (...args) {
                try {
                    const u = args[1];
                    record(typeof u === "string" ? u : u.href);
                }
                catch ( /* ignore */_a) { /* ignore */ }
                return origOpen.apply(this, args);
            };
        }
        log("timedtext interceptor installed");
    }
    /** True when `url` belongs to `videoId` (or any video when `videoId` is omitted). */
    function matchesVideo(url, videoId) {
        return !videoId || url.includes(`v=${videoId}`);
    }
    /**
     * Returns an already-captured timedtext URL for `videoId` (or the latest one) without waiting,
     * or `null` if none has been observed yet. Lets callers skip re-triggering the player.
     */
    function peekTimedtextUrl(videoId) {
        return latestUrl && matchesVideo(latestUrl, videoId) ? latestUrl : null;
    }
    /**
     * Resolves with a timedtext URL for `videoId` (or the latest one if `videoId` is omitted),
     * waiting up to `timeoutMs` for the player to issue one. Resolves `null` on timeout.
     */
    function waitForTimedtextUrl(videoId, timeoutMs = 6000) {
        const match = (url) => matchesVideo(url, videoId);
        if (latestUrl && match(latestUrl))
            return Promise.resolve(latestUrl);
        return new Promise((resolve) => {
            const timer = window.setTimeout(() => {
                const i = waiters.findIndex(w => w.resolve === resolve);
                if (i >= 0)
                    waiters.splice(i, 1);
                resolve(null);
            }, timeoutMs);
            waiters.push({ match, resolve, timer });
        });
    }

    /** Options that are applied to every SelectorObserver instance */
    const defaultObserverOptions = {
        defaultDebounce: 100,
        defaultDebounceEdge: "rising",
        subtree: false,
    };
    /** Global SelectorObserver instances usable throughout the script for improved performance */
    const globservers = {};
    /** Call after DOM load to initialize all SelectorObserver instances */
    function initObservers() {
        try {
            //#region body
            // -> the entire <body> element - use sparingly due to performance impacts!
            globservers.body = new userutils.SelectorObserver(document.body, Object.assign(Object.assign({}, defaultObserverOptions), { defaultDebounce: 150 }));
            globservers.body.enable();
        }
        catch (err) {
            error("Failed to initialize observers:", err);
        }
    }

    /**
     * Inline SVG icons used in the UI. Inline (rather than image resources) so they scale crisply
     * and inherit the button's text color via `currentColor`, adapting to YouTube's light/dark theme.
     */
    /** "AI summarize" sparkle: one large four-point star plus two small ones. */
    const sparkleIcon = `
<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
  <path d="M11 3l1.6 4.4L17 9l-4.4 1.6L11 15l-1.6-4.4L5 9l4.4-1.6L11 3z"/>
  <path d="M18 12l.8 2.2L21 15l-2.2.8L18 18l-.8-2.2L15 15l2.2-.8L18 12z"/>
  <path d="M5.5 14l.6 1.7L8 16.3l-1.9.6L5.5 19l-.6-2.1L3 16.3l1.9-.6L5.5 14z"/>
</svg>`.trim();
    /**
     * Spinning loading indicator: a ~270° arc drawn with `currentColor`. Rotation comes from the
     * `yfas-spin` CSS keyframes applied to its container while a summary is in progress.
     */
    const loadingIcon = `
<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
  <path d="M12 3a9 9 0 1 0 6.4 2.65"/>
</svg>`.trim();
    /** Standard settings gear/cog. */
    const gearIcon = `
<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
  <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.4 2h-2.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.81 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.69.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.25.42.49.42h2.8c.24 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.26.12.55.02.69-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/>
</svg>`.trim();

    /**
     * Settings panel (modal) for the YouTube side, opened from the button's gear half.
     * Reads/writes the persisted {@linkcode config} DataStore.
     */
    const overlayId = "yfas-settings-overlay";
    const styleRef = "yfas-settings";
    /** Opens the settings modal, prefilled from the current config. */
    function openSettings() {
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
        if (!handle)
            return; // already open
        if (!document.getElementById(`global-style-${styleRef}`))
            addStyle(settingsStyle, styleRef);
        const { overlay, close } = handle;
        const providerEl = overlay.querySelector("[data-field='provider']");
        const providerNoteEl = overlay.querySelector("[data-role='provider-note']");
        const promptEl = overlay.querySelector("[data-field='promptTemplate']");
        const langEl = overlay.querySelector("[data-field='preferredLangs']");
        const tsEl = overlay.querySelector("[data-field='includeTimestamps']");
        const autoEl = overlay.querySelector("[data-field='autoSubmit']");
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
        overlay.querySelector("[data-action='cancel']").addEventListener("click", close);
        overlay.querySelector("[data-action='reset']").addEventListener("click", () => {
            providerEl.value = defaultProvider.id;
            syncProviderNote();
            promptEl.value = defaultPromptTemplate;
            langEl.value = "";
            tsEl.checked = true;
            autoEl.checked = true;
        });
        overlay.querySelector("[data-action='save']").addEventListener("click", () => {
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

    /**
     * Page-based YouTube subtitle extraction.
     *
     * Design goal (see project memory): capture subtitles directly from the page the user
     * is already watching, never via an external subtitle API. This is what makes the script
     * work on member-only / region-locked / age-restricted videos, and avoids the third-party
     * scraper breakage caused by YouTube's PoToken (`&exp=xpe`) requirement.
     *
     * Two layered strategies, tried in order:
     *  1. Intercept the player's own `/api/timedtext` request (it carries a valid PoToken and the
     *     user's session) and refetch it as `fmt=json3`.
     *  2. DOM scrape of YouTube's own "Show transcript" panel.
     */
    //#endregion
    //#region page-global access
    /**
     * Page globals (`ytInitialPlayerResponse`, the player element's methods) live in the page's
     * realm. In sandboxed userscript engines we need `unsafeWindow` to reach them.
     */
    const pageWindow = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window);
    //#endregion
    //#region player response
    /**
     * Returns the most up-to-date player response. `movie_player.getPlayerResponse()` reflects the
     * currently playing video after SPA navigation, whereas `ytInitialPlayerResponse` goes stale.
     */
    function getPlayerResponse() {
        var _a, _b;
        try {
            const player = ((_a = pageWindow.document) !== null && _a !== void 0 ? _a : document).getElementById("movie_player");
            const fromPlayer = (_b = player === null || player === void 0 ? void 0 : player.getPlayerResponse) === null || _b === void 0 ? void 0 : _b.call(player);
            if (fromPlayer === null || fromPlayer === void 0 ? void 0 : fromPlayer.captions)
                return fromPlayer;
        }
        catch (err) {
            warn("getPlayerResponse() unavailable, falling back to ytInitialPlayerResponse:", err);
        }
        return pageWindow.ytInitialPlayerResponse;
    }
    /** Extracts the caption track list from a player response. */
    function getCaptionTracks(resp) {
        var _a, _b, _c;
        return (_c = (_b = (_a = resp === null || resp === void 0 ? void 0 : resp.captions) === null || _a === void 0 ? void 0 : _a.playerCaptionsTracklistRenderer) === null || _b === void 0 ? void 0 : _b.captionTracks) !== null && _c !== void 0 ? _c : [];
    }
    /** Resolves a track's display name across the two shapes YouTube uses. */
    function trackName(track) {
        var _a, _b, _c, _d, _e;
        return (_e = (_b = (_a = track.name) === null || _a === void 0 ? void 0 : _a.simpleText) !== null && _b !== void 0 ? _b : (_d = (_c = track.name) === null || _c === void 0 ? void 0 : _c.runs) === null || _d === void 0 ? void 0 : _d.map(r => r.text).join("")) !== null && _e !== void 0 ? _e : track.languageCode;
    }
    /**
     * Picks the best track for the user: first a manually-created track in a preferred language,
     * then an auto-generated one in a preferred language, then any manual track, then anything.
     */
    function pickTrack(tracks, preferredLangs) {
        var _a, _b, _c;
        if (tracks.length === 0)
            return undefined;
        const matchesLang = (t) => preferredLangs.some(l => t.languageCode.toLowerCase().startsWith(l.toLowerCase()));
        const isManual = (t) => t.kind !== "asr";
        return (_c = (_b = (_a = tracks.find(t => matchesLang(t) && isManual(t))) !== null && _a !== void 0 ? _a : tracks.find(t => matchesLang(t))) !== null && _b !== void 0 ? _b : tracks.find(isManual)) !== null && _c !== void 0 ? _c : tracks[0];
    }
    //#endregion
    //#region json3 parsing
    /** Decodes a json3 timedtext payload into ordered segments. */
    function parseJson3(data) {
        var _a, _b, _c, _d;
        const segments = [];
        for (const event of (_a = data.events) !== null && _a !== void 0 ? _a : []) {
            const text = ((_b = event.segs) !== null && _b !== void 0 ? _b : []).map(s => { var _a; return (_a = s.utf8) !== null && _a !== void 0 ? _a : ""; }).join("").replace(/\s+/g, " ").trim();
            if (text.length === 0)
                continue;
            segments.push({
                start: ((_c = event.tStartMs) !== null && _c !== void 0 ? _c : 0) / 1000,
                duration: ((_d = event.dDurationMs) !== null && _d !== void 0 ? _d : 0) / 1000,
                text,
            });
        }
        return segments;
    }
    //#endregion
    //#region strategy 1: intercepted player timedtext request
    /**
     * Turns on the player's captions (via the CC button) so it issues a timedtext request that our
     * interceptor can capture. Clicking is a plain DOM action, avoiding cross-realm method calls.
     */
    function enablePlayerCaptions() {
        const btn = document.querySelector(".ytp-subtitles-button");
        if (!btn) {
            warn("CC button (.ytp-subtitles-button) not found; cannot enable captions");
            return;
        }
        if (btn.getAttribute("aria-pressed") !== "true")
            btn.click();
    }
    /**
     * Strategy: trigger the player to fetch captions, grab the (PoToken-bearing, authenticated) URL
     * it requested via the interceptor, then refetch it as json3 ourselves. Works for member-only and
     * `exp=xpe` videos. Returns `null` if no request was captured or it produced no segments.
     */
    function fetchViaInterceptedUrl(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            // If the player already issued a timedtext request we can reuse, don't disturb the user's
            // caption state; only toggle captions on when we have nothing captured yet.
            if (!peekTimedtextUrl(videoId))
                enablePlayerCaptions();
            const captured = yield waitForTimedtextUrl(videoId, 6000);
            if (!captured) {
                warn("no player timedtext request captured (could not enable captions in time?)");
                return null;
            }
            const url = new URL(captured, location.origin);
            url.searchParams.set("fmt", "json3");
            const res = yield fetch(url.toString(), { credentials: "include" });
            if (!res.ok)
                return null;
            const body = yield res.text();
            if (body.trim().length === 0)
                return null;
            const segments = parseJson3(JSON.parse(body));
            return segments.length > 0 ? segments : null;
        });
    }
    //#endregion
    //#region strategy 2: transcript panel DOM scrape
    /** The "Show transcript" button, which lives in the description's transcript section. */
    const transcriptButtonSelector = "ytd-video-description-transcript-section-renderer #primary-button button, "
        + "ytd-video-description-transcript-section-renderer button";
    /** The description "...more" expander, which must be opened for the transcript section to render. */
    const descriptionExpandSelector = "ytd-text-inline-expander #expand, #description #expand, tp-yt-paper-button#expand";
    /** A rendered transcript line. */
    const transcriptRowSelector = "transcript-segment-view-model";
    /**
     * Opens YouTube's transcript panel so its segments render into the DOM, then waits for them.
     * The "Show transcript" button only renders after the description is expanded, so we expand it
     * first if the button isn't already present. Returns true once transcript rows are available.
     */
    function openTranscriptPanel() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (document.querySelector(transcriptRowSelector))
                return true;
            let button = document.querySelector(transcriptButtonSelector);
            if (!button) {
                (_a = document.querySelector(descriptionExpandSelector)) === null || _a === void 0 ? void 0 : _a.click();
                button = yield waitForSelector(transcriptButtonSelector, 3000);
            }
            if (!button) {
                warn("could not find the 'Show transcript' button");
                return false;
            }
            button.click();
            return Boolean(yield waitForSelector(transcriptRowSelector, 5000));
        });
    }
    /** Reads already-rendered transcript segments from YouTube's "Show transcript" panel, if open. */
    function scrapeTranscriptPanel() {
        var _a, _b, _c, _d, _e, _f;
        const segments = [];
        for (const row of document.querySelectorAll(transcriptRowSelector)) {
            const text = (_c = (_b = (_a = row.querySelector(".ytAttributedStringHost")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.replace(/\s+/g, " ").trim()) !== null && _c !== void 0 ? _c : "";
            if (text.length === 0)
                continue;
            const stamp = (_f = (_e = (_d = row.querySelector(".ytwTranscriptSegmentViewModelTimestamp")) === null || _d === void 0 ? void 0 : _d.textContent) === null || _e === void 0 ? void 0 : _e.trim()) !== null && _f !== void 0 ? _f : "";
            segments.push({ start: parseTimestamp(stamp), duration: 0, text });
        }
        return segments;
    }
    /** Parses a "m:ss" / "h:mm:ss" transcript timestamp into seconds. */
    function parseTimestamp(stamp) {
        const parts = stamp.split(":").map(Number);
        if (parts.some(isNaN))
            return 0;
        return parts.reduce((acc, n) => acc * 60 + n, 0);
    }
    //#endregion
    //#region public API
    /** Formats a number of seconds as `m:ss`, or `h:mm:ss` once it reaches an hour. */
    function formatTimestamp(totalSeconds) {
        const s = Math.max(0, Math.floor(totalSeconds));
        const hrs = Math.floor(s / 3600);
        const mins = Math.floor((s % 3600) / 60);
        const secs = s % 60;
        const pad = (n) => n.toString().padStart(2, "0");
        return hrs > 0
            ? `${hrs}:${pad(mins)}:${pad(secs)}`
            : `${mins}:${pad(secs)}`;
    }
    /** Joins segments into `[h:mm:ss] text` lines for time-aware AI analysis. */
    function toTimedText(segments) {
        return segments.map(s => `[${formatTimestamp(s.start)}] ${s.text}`).join("\n");
    }
    /** Returns the browser UI language plus English as default preferred languages. */
    function defaultPreferredLangs() {
        var _a;
        const langs = [navigator.language, ...((_a = navigator.languages) !== null && _a !== void 0 ? _a : [])].filter(Boolean);
        return [...new Set([...langs, "en"])];
    }
    /**
     * Whether the currently playing video exposes any caption track. Used to grey out the summary
     * button up front when there is nothing to summarize.
     */
    function hasCaptionsAvailable() {
        return getCaptionTracks(getPlayerResponse()).length > 0;
    }
    /**
     * Captures subtitles for the currently playing video using page-based strategies.
     * Returns `null` if the video has no captions available at all.
     *
     * @throws if a track was found but every strategy failed to produce text.
     */
    function getCurrentSubtitles() {
        return __awaiter(this, arguments, void 0, function* (opts = {}) {
            var _a, _b, _c;
            const preferredLangs = (_a = opts.preferredLangs) !== null && _a !== void 0 ? _a : defaultPreferredLangs();
            const resp = getPlayerResponse();
            const tracks = getCaptionTracks(resp);
            const track = pickTrack(tracks, preferredLangs);
            // Strategy 1: intercept the player's own timedtext request (carries a valid PoToken and the
            // user's session, so it works on member-only / exp=xpe videos).
            if (track) {
                let segments = null;
                try {
                    segments = yield fetchViaInterceptedUrl((_b = resp === null || resp === void 0 ? void 0 : resp.videoDetails) === null || _b === void 0 ? void 0 : _b.videoId);
                }
                catch (err) {
                    warn("intercepted-timedtext fetch failed:", err);
                }
                if (segments && segments.length > 0) {
                    return {
                        lang: track.languageCode,
                        trackName: trackName(track),
                        autoGenerated: track.kind === "asr",
                        segments,
                        text: segments.map(s => s.text).join("\n"),
                        timedText: toTimedText(segments),
                        source: "intercept-timedtext",
                    };
                }
            }
            // Strategy 2: open + scrape YouTube's own transcript panel.
            yield openTranscriptPanel();
            const panelSegments = scrapeTranscriptPanel();
            if (panelSegments.length > 0) {
                return {
                    lang: (_c = track === null || track === void 0 ? void 0 : track.languageCode) !== null && _c !== void 0 ? _c : "unknown",
                    trackName: track ? trackName(track) : "Transcript",
                    autoGenerated: (track === null || track === void 0 ? void 0 : track.kind) === "asr",
                    segments: panelSegments,
                    text: panelSegments.map(s => s.text).join("\n"),
                    timedText: toTimedText(panelSegments),
                    source: "transcript-panel",
                };
            }
            if (!track)
                return null; // no captions at all
            throw new Error("Found a caption track but could not capture its text (PoToken-gated and transcript panel unavailable)");
        });
    }
    //#endregion

    /**
     * YouTube-side logic: injects the summary button into the watch page's action row
     * (next to Share / Save) and triggers subtitle capture when clicked.
     */
    /** id of the injected button, used to avoid inserting duplicates. */
    const btnId = "yfas-summary-btn";
    /**
     * The like/dislike segmented button. We anchor to this element (rather than the action-row
     * container) and insert immediately to its left, so the button stays put across responsive
     * reflows that move or collapse items in the action row.
     */
    const likeDislikeSelector = "ytd-watch-metadata segmented-like-dislike-button-view-model";
    /** Registers the button injection. Call once on the YouTube side after DOM load. */
    function initYoutube() {
        addStyle(buttonStyle, "yfas-button");
        void ensureSummaryButton();
        // The action row is re-rendered on SPA navigation, so re-insert after each navigation.
        window.addEventListener("yt-navigate-finish", () => void ensureSummaryButton());
    }
    /**
     * Polls the live DOM for the like/dislike anchor and inserts the button next to it. Polling
     * directly (rather than via SelectorObserver) avoids the observer's debounce dropping the only
     * trigger, which made the button intermittently fail to appear.
     */
    function ensureSummaryButton() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!location.pathname.startsWith("/watch") && !location.pathname.startsWith("/live/"))
                return;
            const anchor = yield waitForSelector(likeDislikeSelector, 15000);
            if (anchor)
                addSummaryButton(anchor);
            else
                warn("like/dislike anchor not found within timeout; button not inserted");
        });
    }
    /** Shared YouTube button-shape classes so our button inherits the native (visible) styling. */
    const shapeBase = "ytSpecButtonShapeNextHost ytSpecButtonShapeNextTonal ytSpecButtonShapeNextMono ytSpecButtonShapeNextSizeM";
    /**
     * Inserts a segmented button immediately to the left of the like/dislike button, mirroring
     * YouTube's own segmented button: the left segment (sparkle + label) runs the summary, the right
     * segment (gear) opens settings. Reuses YouTube's `ytSpecButtonShapeNext*` classes so it matches.
     */
    function addSummaryButton(likeDislike) {
        const parent = likeDislike.parentElement;
        if (!parent || parent.querySelector(`#${btnId}`))
            return;
        const split = document.createElement("div");
        split.id = btnId;
        split.className = "yfas-split";
        setInnerHtml(split, `
    <button class="yfas-main ${shapeBase} ytSpecButtonShapeNextIconLeading ytSpecButtonShapeNextSegmentedStart" title="${enabledLabel()}" aria-label="${enabledLabel()}">
      <div aria-hidden="true" class="ytSpecButtonShapeNextIcon">${sparkleIcon}</div>
      <div class="ytSpecButtonShapeNextButtonTextContent">摘要</div>
    </button>
    <button class="yfas-settings ${shapeBase} ytSpecButtonShapeNextIconButton ytSpecButtonShapeNextSegmentedEnd" title="設定" aria-label="設定">
      <div aria-hidden="true" class="ytSpecButtonShapeNextIcon">${gearIcon}</div>
    </button>`);
        const mainBtn = split.querySelector(".yfas-main");
        const gearBtn = split.querySelector(".yfas-settings");
        onInteraction(mainBtn, () => void onSummaryClick(mainBtn));
        onInteraction(gearBtn, () => openSettings());
        likeDislike.before(split);
        void watchCaptionAvailability(mainBtn);
    }
    /** Default (enabled) label / tooltip for the summary button, naming the currently selected provider. */
    const enabledLabel = () => `用 ${getProviderById(config.getData().provider).label} 摘要`;
    /** Label / tooltip shown while the button is greyed out because the video has no captions. */
    const noCaptionsLabel = "這部影片沒有可用的字幕，無法摘要";
    /**
     * Greys out the summary button until captions are detected for the current video. The player
     * response can lag behind button insertion, so we poll: enable as soon as a track appears, and
     * settle on the disabled state only if none shows up within the timeout.
     */
    function watchCaptionAvailability(mainBtn_1) {
        return __awaiter(this, arguments, void 0, function* (mainBtn, timeoutMs = 10000, intervalMs = 400) {
            setAvailable(mainBtn, false);
            const start = Date.now();
            while (mainBtn.isConnected && Date.now() - start < timeoutMs) {
                if (hasCaptionsAvailable()) {
                    setAvailable(mainBtn, true);
                    return;
                }
                yield new Promise(r => setTimeout(r, intervalMs));
            }
        });
    }
    /**
     * Toggles the summary button between its normal and greyed-out (no-captions) states. The native
     * `disabled` attribute blocks the click without any JS guard, while the `title` tooltip still
     * surfaces on hover so the user learns why it is greyed out. `aria-disabled` mirrors the state for
     * assistive tech.
     */
    function setAvailable(mainBtn, available) {
        mainBtn.classList.toggle("yfas-disabled", !available);
        mainBtn.disabled = !available;
        mainBtn.setAttribute("aria-disabled", String(!available));
        const label = available ? enabledLabel() : noCaptionsLabel;
        mainBtn.title = label;
        mainBtn.setAttribute("aria-label", label);
    }
    /** Captures the current video's subtitles when the button is pressed. */
    function onSummaryClick(btn) {
        return __awaiter(this, void 0, void 0, function* () {
            const iconEl = btn.querySelector(".ytSpecButtonShapeNextIcon");
            setBusy(btn, iconEl, true);
            try {
                const cfg = config.getData();
                const preferredLangs = cfg.preferredLangs.split(",").map(s => s.trim()).filter(Boolean);
                const result = yield getCurrentSubtitles(preferredLangs.length > 0 ? { preferredLangs } : {});
                if (!result) {
                    warn("No captions are available for this video.");
                    void reportFailure({
                        context: "youtube:no-captions",
                        userMessage: "找不到這部影片的字幕／翻譯，無法摘要。請確認影片有字幕，重新整理頁面後再試一次。",
                    });
                    return;
                }
                log(`Captured ${result.segments.length} subtitle lines `
                    + `(${result.trackName}, lang=${result.lang}, via ${result.source}).`);
                yield stashSummaryPayload({
                    prompt: buildPrompt(result, cfg.promptTemplate, cfg.includeTimestamps),
                    autoSubmit: cfg.autoSubmit,
                    title: getVideoTitle(),
                    createdAt: Date.now(),
                });
                openInTab(getProviderById(cfg.provider).newChatUrl, false); // foreground the AI provider tab
                // Success: restore silently (handled in finally), no extra indicator.
            }
            catch (err) {
                error("Failed to capture subtitles:", err);
                void reportFailure({ context: "youtube:capture-error" });
            }
            finally {
                setBusy(btn, iconEl, false);
            }
        });
    }
    /** Toggles the button's busy state: dims it and swaps the sparkle icon for the spinner (or back). */
    function setBusy(btn, iconEl, busy) {
        btn.classList.toggle("yfas-busy", busy);
        if (!iconEl)
            return;
        iconEl.classList.toggle("yfas-spin", busy);
        setInnerHtml(iconEl, busy ? loadingIcon : sparkleIcon);
    }
    /** Builds the final prompt by substituting the template tokens with the video's data. */
    function buildPrompt(result, template, includeTimestamps) {
        const transcript = includeTimestamps ? result.timedText : result.text;
        return template
            .split("{{title}}").join(getVideoTitle())
            .split("{{url}}").join(location.href)
            .split("{{transcript}}").join(transcript);
    }
    /** Reads the current video's title from the watch page, falling back to the document title. */
    function getVideoTitle() {
        var _a, _b;
        const fromMeta = (_b = (_a = document.querySelector("ytd-watch-metadata h1")) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim();
        if (fromMeta)
            return fromMeta;
        return document.title.replace(/\s*-\s*YouTube\s*$/, "").trim();
    }
    const buttonStyle = `
.yfas-split {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-right: 8px;
  vertical-align: middle;
}
.yfas-split .ytSpecButtonShapeNextIcon svg {
  width: 100%;
  height: 100%;
  display: block;
}
.yfas-main.yfas-busy {
  opacity: 0.6;
  pointer-events: none;
}
.yfas-main.yfas-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.yfas-split .ytSpecButtonShapeNextIcon.yfas-spin {
  animation: yfas-spin 0.8s linear infinite;
}
@keyframes yfas-spin {
  to { transform: rotate(360deg); }
}
`;

    /** Runs when the userscript is loaded initially */
    function init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Must run at document-start, before the YouTube player issues its timedtext requests.
            if (location.hostname.endsWith("youtube.com"))
                installTimedtextInterceptor();
            yield initConfig();
            if (domLoaded)
                run();
            else
                document.addEventListener("DOMContentLoaded", run);
        });
    }
    /** Runs after the DOM is available */
    function run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                log(`Initializing ${scriptInfo.name} v${scriptInfo.version} (#${buildNumber})...`);
                // post-build these double quotes are replaced by backticks (because if backticks are used here, the bundler converts them to double quotes)
                addStyle("#{{GLOBAL_STYLE}}", "global");
                registerDevCommands();
                initObservers();
                // The script matches YouTube and every supported AI provider - run only the relevant side.
                if (location.hostname.endsWith("youtube.com")) {
                    initYoutube();
                }
                else {
                    const provider = getProviderByHost(location.hostname);
                    if (provider)
                        void initProviderTarget(provider);
                }
            }
            catch (err) {
                error("Fatal error:", err);
                return;
            }
        });
    }
    /** Registers development-only menu commands. `GM.registerMenuCommand` is only granted in dev builds. */
    function registerDevCommands() {
        if (mode !== "development")
            return;
        GM.registerMenuCommand("[dev] 清除失敗計數", () => __awaiter(this, void 0, void 0, function* () {
            yield clearFailureCount();
            log("Failure counter cleared.");
        }));
    }
    init();

})(UserUtils);
