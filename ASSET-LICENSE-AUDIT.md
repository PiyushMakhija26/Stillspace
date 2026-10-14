# Stillspace asset provenance and copyright audit

Audit date: 2026-10-14

## Bundled wallpapers

- The 100 bundled `.jpg` wallpapers from the previous package were removed from this release because the package did not contain source URLs, creator records, or license files sufficient to establish redistribution rights. This is a precaution, not a finding that those images infringe.
- The remaining 100 `.svg` wallpapers are self-contained procedural vector artwork bundled locally in `wallpapers/`. They do not embed external image URLs. Keep the source files and change history as evidence of their creation.
- Built-in themes in `theme-store.js` are CSS color palettes and gradient expressions authored for this project; they do not bundle third-party photographs or logos.
- User-uploaded wallpapers are selected by the user and stored locally. The extension cannot verify whether a user has permission to use an uploaded image.

## Fonts, icons, and other assets

- The UI uses system font stacks; no third-party font binaries are bundled.
- Check icon PNGs and any future third-party assets before publishing; this source audit does not independently prove the origin of the existing extension icon artwork.
- Do not add external wallpapers, fonts, logos, or images unless the exact asset and its license/permission are recorded here. For third-party fonts, retain the license text and copyright notice alongside the font files.

## Release gate

No audit can guarantee that a copyright complaint will never be filed. Before public release, retain original artwork/source files, a dated inventory, license copies for every third-party asset, and written permissions where applicable. Chrome Web Store policy requires developers not to infringe others' intellectual-property rights. See https://developer.chrome.com/docs/webstore/program-policies/policies?hl=en and https://googlefonts.github.io/gf-guide/license-file.html.


## v2.10.0 separation
- Theme Store now has separate Themes and Wallpapers views. Themes control interface appearance; wallpaper selection controls the New Tab background.
- Count labels and release notes reflect the 100 SVG wallpaper files actually included.


## v2.18.0 release note
The floating focus timer UI and injection script were removed. The `scripting` and `activeTab` permissions were removed because the feature was their only identified use. AI Capture remains removed.
