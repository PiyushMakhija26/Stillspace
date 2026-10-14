# Stillspace 2.18.0 — Chrome Web Store upload package

Stillspace is a local-first New Tab workspace with a customizable appearance, locally stored wallpapers and notes, focus timer, daily priorities, saved tab workspaces, and Browser Memory.

## Package
- This ZIP is packaged for Chrome Web Store upload: `manifest.json` is at the archive root.
- First-run appearance defaults to Stealth; existing saved preferences are preserved.
- Themes and wallpapers are separate choices.
- 100 locally bundled procedural SVG wallpapers are included offline.
- AI Capture and the floating focus timer have been removed.
- No remote JavaScript, remote font files, analytics SDK, or external image dependencies were found in the static source scan.

## Permissions and purposes
- `tabs`: save and restore user-selected tab workspaces and support tab information in the workspace manager and Browser Memory.
- `storage`: store user preferences, workspaces, notes, daily priorities, timer state and related content locally in Chrome storage.
- `unlimitedStorage`: support user-selected custom wallpaper files and local workspace data.

## Local test installation
1. Extract this ZIP to a folder.
2. Open `chrome://extensions` and enable Developer mode.
3. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.

## Before publishing
- Host `PRIVACY-POLICY.html` at a stable public HTTPS URL and enter that URL in the Chrome Web Store listing. The file inside this ZIP is not itself a hosted URL.
- Add a monitored support contact to the privacy policy and Store listing.
- Complete Chrome Web Store Privacy practices accurately, including tab titles/URLs and local processing.
- Verify store listing assets, screenshots, support contact, and single-purpose description.
- Run a live Chrome smoke test: first-run Stealth default; existing theme persistence; New Tab search; save/restore/delete workspaces; theme/wallpaper independence; custom wallpaper upload; notes; focus timer; Browser Memory.
- Review the final package and all Chrome Web Store policy warnings before submitting.

## Static validation
This package should be treated as statically checked, not live-tested. Validation includes JavaScript syntax, manifest and referenced-file checks, local HTML references, all bundled SVG wallpapers, absence of removed floating timer and AI Capture features, and ZIP integrity. This is not a live Chrome test, independent security review, or guarantee of Store approval.
