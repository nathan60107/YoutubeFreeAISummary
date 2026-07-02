/**
 * Reference to the page's real `window`, bypassing the userscript sandbox.
 * Required to read page globals like `ytInitialPlayerResponse` and call the
 * `#movie_player` element's runtime methods.
 * ⚠️ Requires the directive `@grant unsafeWindow`
 */
declare const unsafeWindow: Window & typeof globalThis;

/** Import HTML as modules - https://stackoverflow.com/a/47705264/3323672 */
declare module "*.html" {
  /** Content of the HTML file as a string */
  const htmlContent: string;
  export default htmlContent;
}

declare module "*.md" {
  interface Exports {
    /** Content of the markdown file, converted to an HTML string */
    html: string;
    metadata: Record<string, unknown>;
    filename: string;
    path: string;
  }
  export default {} as Exports;
}
