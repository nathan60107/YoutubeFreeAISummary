/** Custom CLI args passed to rollup */
export type RollupArgs = Partial<{
  "config-mode": "development" | "production";
  "config-branch": "main";
  "config-host": "greasyfork" | "github" | "openuserjs";
  "config-assetSource": "local" | "github";
  "config-suffix": string;
}>;

/** Configuration object for the script (persisted via the config DataStore). */
export type ScriptConfig = {
  /**
   * Which AI provider to hand the transcript off to. One of the {@linkcode AiProvider} ids from
   * `providers.ts` (e.g. `"aistudio"`, `"gemini"`, `"chatgpt"`, `"claude"`, `"grok"`). An unknown
   * id falls back to the default provider at runtime.
   */
  provider: string;
  /**
   * The prompt sent to the chosen AI provider. Supports the tokens `{{title}}`, `{{url}}`,
   * `{{transcript}}`, which are replaced with the video's title, URL, and captured subtitles.
   */
  promptTemplate: string;
  /** Whether `{{transcript}}` uses timestamped lines (`[h:mm:ss] text`) or plain text. */
  includeTimestamps: boolean;
  /** Whether to automatically submit the prompt in the AI provider after injecting it. */
  autoSubmit: boolean;
  /**
   * Comma-separated preferred subtitle language codes (e.g. "zh-TW, ja, en"). The first available
   * track wins. Empty string means "auto" (follow the browser's languages).
   */
  preferredLangs: string;
};

/** Data handed off from the YouTube tab to the AI provider tab via GM storage. */
export type SummaryPayload = {
  /** The fully built prompt (template with tokens already substituted), ready to inject. */
  prompt: string;
  /** Whether the AI provider tab should auto-submit after injecting. */
  autoSubmit: boolean;
  /** Video title, kept for logging/diagnostics. */
  title: string;
  /** Epoch ms when captured, used to discard stale handoffs. */
  createdAt: number;
};
