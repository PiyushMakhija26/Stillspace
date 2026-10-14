# Stillspace — Third-Party Notices & Attributions

Stillspace v2.18.1 is built as a zero-dependency, local-first Chrome extension.

## 1. Third-Party Software Libraries

- **Runtime Dependencies:** None. Stillspace does not bundle, import, or load any external runtime JavaScript libraries, npm packages, or framework runtimes.
- All application logic in `newtab.js`, `popup.js`, `manager.js`, `theme-store.js`, and `wallpapers.js` is implemented directly in native standard JavaScript (ECMAScript 2022+ / Chrome Extension Manifest V3 APIs).

## 2. Fonts & Typefaces

Stillspace does not embed or bundle binary font files (`.ttf`, `.otf`, `.woff`, `.woff2`). The user interface specifies system font stacks that map to typefaces installed locally on the user's operating system:

- **Manrope:** Available via local system installations; falls back to standard `sans-serif`.
- **DM Sans:** Available via local system installations; falls back to `system-ui, sans-serif`.
- **Inter:** Available via local system installations; falls back to `ui-sans-serif, system-ui, -apple-system, sans-serif`.
- **Playfair Display:** Available via local system installations; falls back to `serif`.
- **DM Mono:** Available via local system installations; falls back to `monospace`.

No font files are requested from Google Fonts or remote CDN servers at runtime.

## 3. Bundled Vector Artwork

- The 100 wallpapers in `wallpapers/` (`wallpaper-001.svg` to `wallpaper-100.svg`) are self-contained procedural vector SVG illustrations created for the Stillspace project. They contain no embedded raster images, third-party logos, or external references.

## 4. Search Services

- Stillspace includes an optional search input on the New Tab page. When used, navigation is directed to Google Search (`https://www.google.com/search`). Google is a trademark of Google LLC. Stillspace is not affiliated with, sponsored by, or endorsed by Google LLC.
