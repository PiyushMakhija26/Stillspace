# Stillspace 2.18.1 — Chrome Web Store Release Checklist & Submission Guide

## 1. Verified Release Gates

- [x] **Manifest V3 Compliance:** Valid manifest version 3 with root manifest layout.
- [x] **Brand Consistency:** "Stillspace" wordmark and brand assets consistent across all views.
- [x] **First-Run Stealth Mode:** Verified default theme is Stealth with `#c8ff00` lime accent identity.
- [x] **Upgrade Persistence:** Returning user themes, wallpapers, workspaces, and notes survive updates without overwrite.
- [x] **Theme & Wallpaper Independence:** Theme selection does not alter wallpaper; wallpaper selection/upload does not reset theme.
- [x] **Appearance View Isolation:** Appearance chooser isolates Themes, Wallpapers (100 SVGs), and Custom Upload into dedicated views.
- [x] **Core Features Preserved:** Clock, Quick Notes, Focus Timer, Priorities, Workspaces, Browser Memory, Project Checkpoints.
- [x] **Removed Features Purged:** AI Capture and webpage-injected floating timer completely absent. Obsolete permissions removed.
- [x] **Security Review:** Zero `eval`, zero remote scripts, zero unvalidated HTML injections, safe file upload validation.
- [x] **Asset & License Audit:** 100 procedural SVG wallpapers verified, system fonts used, zero uncredited third-party runtime dependencies.
- [x] **Automated Testing:** 100% test pass rate across static, unit, integration, and Chrome browser automated tests.
- [x] **Public Privacy Policy URL:** Deployed at https://piyushmakhija26.github.io/Stillspace/PRIVACY-POLICY.html (Repository: https://github.com/PiyushMakhija26/Stillspace)

---

## 2. Store Listing Metadata

### Extension Name
`Stillspace`

### Short Description (100 / 132 chars max)
`Stillspace — a cinematic New Tab workspace with themes, wallpapers, focus tools and saved tab workspaces.`

### Category
`Productivity` / `Workflow & Planning`

### Detailed Description
```
Stillspace — Make room to think.

Transform your browser's New Tab into a calm, cinematic workspace designed for deep focus and clean tab management. Stillspace is local-first, lightweight, and completely private by design: your workspaces, notes, priorities, and wallpapers never leave your device.

KEY FEATURES:

✦ QUIET COMMAND DASHBOARD
A refined New Tab dashboard featuring an uncluttered clock, date display, local timezone indicator, and fast web search.

✦ STEALTH MODE & CINEMATIC THEMES
Carefully crafted dark aesthetic with near-black surfaces and laser-sharp accent lighting. Choose from curated color moods or explore the full Theme catalog.

✦ 100 OFFLINE VECTOR WALLPAPERS
Procedural geometric worlds, neon horizons, auroras, and cosmic gradients bundled offline as lightweight SVGs. Or upload your own custom wallpaper image with local compression.

✦ INDEPENDENT CUSTOMIZATION
Themes and wallpapers work independently. Switch color moods without resetting your wallpaper, or change backgrounds without altering your theme.

✦ TAB WORKSPACES
Stash distracting open tabs into named, organized workspaces with a single click. Restore full sessions whenever you are ready.

✦ IN-PAGE FOCUS TIMER & TODAY'S PRIORITIES
Built-in 25, 50, and 90-minute local focus sessions with completed session statistics. Keep track of daily tasks and clear finished priorities as you work.

✦ QUICK NOTES & PROJECT CONTINUITY
Jot down thoughts instantly with local autosave. Save project continuity checkpoints ("What are you working on?", "Where did you stop?", "Next step") so you can pick up momentum instantly.

✦ BROWSER MEMORY
Bookmark and search pages locally with personal tags and notes. Build a private, searchable knowledge base on your machine.

✦ 100% LOCAL-FIRST & PRIVATE
• No user accounts or sign-ins
• No external servers or cloud databases
• No analytics SDKs, advertising trackers, or telemetry
• Offline capable
```

---

## 3. Single-Purpose Explanation
"Stillspace provides a focused, local-first New Tab workspace that combines customizable aesthetic themes and wallpapers with tab workspace management, daily focus tools, and local note capture."

---

## 4. Permissions Justifications for CWS Dashboard

### Permission: `tabs`
- **Why it is needed:** Used to read the titles and URLs of open tabs when a user explicitly chooses to stash tabs into a workspace, restore saved workspaces, view tabs in the Workspace Manager, or bookmark the active website into Browser Memory.
- **Why narrower permissions fail:** The `activeTab` permission only provides access to the single active tab upon explicit user invocation. Stashing or managing a multi-tab window requires inspecting inactive tabs across the window, which requires the standard `tabs` permission.

### Permission: `storage`
- **Why it is needed:** Stores user workspaces, daily priorities, quick notes, focus timer history, project continuity checkpoints, and appearance preferences locally on the user's computer via `chrome.storage.local`.

### Permission: `unlimitedStorage`
- **Why it is needed:** Allows saving user-uploaded custom wallpaper images (compressed JPEG data URLs) and extensive multi-tab workspaces without encountering browser storage quota limitations.

---

## 5. Privacy Practices Declarations

- **Single Purpose:** Yes.
- **Data Collection Declarations:**
  - *Web History / Tab URLs:* Declared as processed locally to enable tab workspace stashing and Browser Memory. Stored strictly in local extension storage; never transmitted off the user's machine.
  - *User Content:* User-written notes, priorities, and checkpoints stored strictly in local extension storage.
- **Data Usage Affirmations:**
  - [x] Does not sell data to third parties.
  - [x] Does not use or transfer data for purposes unrelated to the extension's core functionality.
  - [x] Does not use or transfer data to determine creditworthiness or for lending purposes.
  - [x] Does not use or transfer data for personalized advertising.
