# Stillspace 2.18.1 — Chrome Web Store Release Package

Stillspace is a local-first New Tab workspace featuring customizable themes, locally bundled offline wallpapers, quick notes, focus timer, daily priorities, tab workspaces, and Browser Memory.

## Package Architecture & Verification
- **Root Manifest:** `manifest.json` is located at the archive root.
- **Version:** `2.18.1` (Incremented from baseline `2.18.0`).
- **First-Run Default:** Defaults to Stealth theme with `#c8ff00` lime accent and Quiet Command layout.
- **Preference Persistence:** Returning users' existing themes, wallpapers, workspaces, and notes are strictly preserved upon upgrade.
- **Independence:** Themes and wallpapers operate independently. Changing a theme preserves the active wallpaper; choosing or uploading a wallpaper preserves the active theme.
- **Wallpapers:** Exactly 100 procedural SVG vector wallpapers bundled offline in `wallpapers/`.
- **Zero Remote Code:** No remote scripts, eval, dynamic string compilation, or remote fonts.
- **Zero Third-Party Runtime Dependencies:** 100% native standard JavaScript and CSS.
- **Removed Features:** AI Capture and the webpage-injected floating focus timer remain completely removed. No `scripting` or `activeTab` permissions are requested.

## Permissions & Least-Privilege Justifications
- `tabs`: Allows the extension to query, stash, and restore user tabs across windows when saving or loading workspaces, and to bookmark pages into Browser Memory. A narrower permission cannot inspect or close other inactive tabs across a window.
- `storage`: Enables storing workspaces, notes, priorities, focus timer state, and user settings locally on the user's device via `chrome.storage.local`.
- `unlimitedStorage`: Enables storing custom user-uploaded wallpapers (Base64 JPEG canvas exports up to 1920x1080) and extensive workspaces without encountering the default 10MB quota ceiling.

## Local Test Installation
1. Extract the release ZIP into a folder.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in upper right).
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Open a new tab to experience Stillspace.

## Links & Privacy Policy
- **GitHub Repository:** [https://github.com/PiyushMakhija26/Stillspace](https://github.com/PiyushMakhija26/Stillspace)
- **Public HTTPS Privacy Policy:** [https://piyushmakhija26.github.io/Stillspace/PRIVACY-POLICY.html](https://piyushmakhija26.github.io/Stillspace/PRIVACY-POLICY.html)
- **Privacy Policy Source:** [https://github.com/PiyushMakhija26/Stillspace/blob/main/PRIVACY-POLICY.html](https://github.com/PiyushMakhija26/Stillspace/blob/main/PRIVACY-POLICY.html)

## Store Submission Steps
1. Upload the final ZIP (`stillspace-v2.18.1-chrome-web-store.zip`) to the Chrome Web Store Developer Dashboard.
2. In the **Privacy Policy** field, enter: `https://piyushmakhija26.github.io/Stillspace/PRIVACY-POLICY.html`
3. Fill in the Single-Purpose description and Permissions Justifications as documented in `STORE-RELEASE-CHECKLIST.md`.
4. Submit for review.
