# Rolex Key AdBlocker

Version 2.0.0 — Chrome Manifest V3 extension focused on reliability and local-first privacy.

## Features
- Bundled network request filters for known ad and tracker domains
- Daily refresh of trusted JSON block rules from this project's GitHub repository
- Validates remote rules before applying them; retains existing remote rules if an update fails
- Rule namespaces prevent allowlist refreshes from deleting remote or custom rules
- Popup pause/resume, current-site allowlisting, and tracker-filter control
- Custom blocked domains
- Best-effort common ad-slot hiding and YouTube skip-button automation
- Dark/light/system settings theme
- Local matched-rule statistics where Chrome exposes debugging events
- Export/import for preferences, allowlists, custom domains and local stats
- No remotely downloaded JavaScript and no external runtime dependencies

## Install locally
1. Download or clone this repository.
2. Open `chrome://extensions` in desktop Chrome.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Reload the extension after updating files.

## Filter updates and privacy
The service worker checks the repository's `rules/ads.json` and `rules/trackers.json` once a day and also provides a manual update button. Remote JSON is validated and only block rules with supported fields are accepted. Bundled rules stay enabled as a fallback if the network or remote source is unavailable.

The extension needs access to visited websites to block requests and hide known ad containers. You can pause it or allowlist a site in the popup. Custom domain rules may break websites if used too broadly.

## Statistics limitation
Chrome documents `declarativeNetRequestFeedback` and `onRuleMatchedDebug` as debugging features for unpacked extensions. Therefore detailed matched-request counts are best-effort developer statistics, not guaranteed totals in a normal Chrome Web Store installation.

## Video-ad limitation
Video skip automation is best-effort and depends on the current website UI. It cannot reliably remove every video ad or sponsorship embedded directly into a creator's video.

## Permissions
- `storage`: save preferences, custom rules and local stats
- `alarms`: daily filter refresh
- `declarativeNetRequest`: enforce packaged and dynamic rules
- `declarativeNetRequestFeedback`: local developer/debug matched-rule statistics
- `<all_urls>`: apply filtering and page cleanup across websites
- `raw.githubusercontent.com`: fetch this project's JSON filter files

## Project layout
```text
manifest.json
background.js
content-ad-cleaner.js
popup.html
popup.css
popup.js
options.html
options.css
options.js
rules/ads.json
rules/trackers.json
rules/privacy.json
```

## License
MIT — see `LICENSE`.
