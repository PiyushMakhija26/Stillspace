# Stillspace Asset Provenance & License Audit

- **Product Name:** Stillspace
- **Release Version:** 2.18.1
- **Audit Date:** 2026-10-14
- **Auditor:** Release Compliance & Engineering Review

---

## 1. Executive Summary

A comprehensive file-by-file audit of all bundled runtime assets, images, styles, scripts, and fonts was conducted for the Stillspace v2.18.1 release package.

- **Total Bundled Wallpapers:** Exactly 100 procedural SVG vector files in `wallpapers/` (`wallpaper-001.svg` to `wallpaper-100.svg`).
- **External Image Dependencies:** 0 (Zero). No remote image URLs, no base64 bitmap payloads embedded in SVGs.
- **Bundled Font Binaries:** 0 (Zero). System font stacks are used (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Manrope`, `DM Sans`, `Inter`, `DM Mono`, `Playfair Display`). No third-party `.ttf`, `.woff`, or `.woff2` files are packaged.
- **Third-Party JavaScript Libraries:** 0 (Zero). The extension is written in 100% native vanilla JavaScript (ES2022 / MV3). No external NPM libraries, lodash, jQuery, or analytics packages are bundled in the runtime extension.
- **Extension Icons:** 4 PNG files in `icons/` (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`). Custom Stillspace geometric icon artwork.

---

## 2. File-by-File Asset Inventory

| Relative Path | Asset Type | Origin / Source | License / Terms | Redistribution / Commercial Use | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `manifest.json` | Extension Config | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `newtab.html` | UI Document | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `newtab.css` | UI Stylesheet | Original Project Authoring (Vanilla CSS) | MIT / Project License | Permitted | **VERIFIED** |
| `newtab.js` | UI Logic | Original Project Authoring (Vanilla JS) | MIT / Project License | Permitted | **VERIFIED** |
| `popup.html` | Extension Action UI | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `popup.css` | Popup Stylesheet | Original Project Authoring (Vanilla CSS) | MIT / Project License | Permitted | **VERIFIED** |
| `popup.js` | Popup Logic | Original Project Authoring (Vanilla JS) | MIT / Project License | Permitted | **VERIFIED** |
| `manager.html` | Workspace Manager UI | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `manager.css` | Manager Stylesheet | Original Project Authoring (Vanilla CSS) | MIT / Project License | Permitted | **VERIFIED** |
| `manager.js` | Manager Logic | Original Project Authoring (Vanilla JS) | MIT / Project License | Permitted | **VERIFIED** |
| `theme-store.html` | Appearance Chooser UI | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `theme-store.css` | Theme Store Styles | Original Project Authoring (Vanilla CSS) | MIT / Project License | Permitted | **VERIFIED** |
| `theme-store.js` | Theme Store Logic | Original Project Authoring (Vanilla JS) | MIT / Project License | Permitted | **VERIFIED** |
| `wallpapers.js` | Catalog Metadata | Original Project Authoring (Metadata) | MIT / Project License | Permitted | **VERIFIED** |
| `icons/icon16.png` | App Icon (16x16) | Custom Project Brand Asset | Project Rights Reserved / Included | Permitted | **VERIFIED** |
| `icons/icon32.png` | App Icon (32x32) | Custom Project Brand Asset | Project Rights Reserved / Included | Permitted | **VERIFIED** |
| `icons/icon48.png` | App Icon (48x48) | Custom Project Brand Asset | Project Rights Reserved / Included | Permitted | **VERIFIED** |
| `icons/icon128.png` | App Icon (128x128) | Custom Project Brand Asset | Project Rights Reserved / Included | Permitted | **VERIFIED** |
| `wallpapers/wallpaper-001.svg` to `wallpaper-100.svg` | Vector Backgrounds (100 files) | Procedurally Generated SVG Vectors | Project / Open Distribution | Permitted | **VERIFIED** |
| `PRIVACY-POLICY.html` | Legal Disclosure | Original Project Authoring | Public Domain / CC0 | Permitted | **VERIFIED** |
| `README.md` | Documentation | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |
| `STORE-RELEASE-CHECKLIST.md` | Verification Checklist | Original Project Authoring | MIT / Project License | Permitted | **VERIFIED** |

---

## 3. Bundled Wallpaper Verification

- In earlier package iterations (prior to v2.10.0), bundled `.jpg` photographs of uncertain provenance were removed as a precaution.
- The 100 wallpapers bundled in `wallpapers/` (`wallpaper-001.svg` through `wallpaper-100.svg`) are self-contained procedural vector graphics.
- Technical verification of all 100 SVGs:
  - Valid XML/SVG syntax with `viewBox="0 0 1600 900"`.
  - Zero `<image>` tags.
  - Zero `<script>` tags.
  - Zero `xlink:href` or external `href` references.
  - Zero remote network fetches.
  - 100% offline-capable rendering.

---

## 4. Fonts and Typography

- No third-party font binaries (`.woff`, `.woff2`, `.ttf`, `.otf`) are bundled in the package.
- System font stacks are employed across all CSS files:
  - Default Sans: `'DM Sans'`, `'Inter'`, `'Manrope'`, `system-ui`, `-apple-system`, `sans-serif`
  - Editorial: `'Playfair Display'`, `serif`
  - Developer Mono: `'DM Mono'`, `monospace`
- When installed on the host OS, these fonts are rendered by the browser; if absent, system fallback fonts render cleanly without network calls.

---

## 5. Third-Party Dependencies

- **Runtime JavaScript Libraries:** None. Zero third-party npm packages are bundled or required at runtime.
- **Build / Packaging Tooling:** Native PowerShell and Node.js built-in runtime utilities (`node:fs`, `node:path`, `node:crypto`, `node:test`).

---

## 6. Trademark & Brand Identity Audit

- **Product Name:** Stillspace
- **Tagline:** "Make room to think."
- **Brand Consistency:** Verified across `manifest.json`, `newtab.html`, `popup.html`, `manager.html`, `theme-store.html`, and documentation.
- **Third-Party Trademarks:** 
  - Standard search navigation directs to Google Search; Google is referenced strictly nominatively to describe external search functionality.
  - No third-party corporate logos or marks are used in a manner that implies sponsorship, affiliation, or endorsement.

---

## 7. Version Release Notes

- **v2.10.0:** Complete separation of Themes and Wallpapers. Removal of unverified legacy JPGs; baseline established at 100 procedural SVG vector wallpapers.
- **v2.18.0:** Removal of legacy floating focus timer injection script and obsolete permissions (`scripting`, `activeTab`). Full removal of AI Capture.
- **v2.18.1:** Full release compliance hardening:
  - Stealth theme set as default on fresh install with lime `#c8ff00` accent.
  - Strict preservation of returning user preferences (theme, wallpaper, workspaces, notes, priorities).
  - True independence of themes and wallpapers: theme selection does not overwrite wallpaper; wallpaper selection does not wipe out active theme.
  - Clean view isolation in Appearance Chooser.
  - Comprehensive automated test suite and Chrome headless verification.
  - Root-manifest packaging for Chrome Web Store upload.
