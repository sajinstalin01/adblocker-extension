# Rolex Key AdBlocker

A Chrome Manifest V3 extension using `declarativeNetRequest` to block requests to a curated set of known advertising and analytics domains.

## Features
- Manifest V3 network request rules
- Separate, maintainable ad and tracker JSON rule lists
- Popup protection toggle
- Per-domain allowlist, including subdomains
- Local settings stored with `chrome.storage`
- No remote code and no external runtime dependencies

## Install locally
1. Download and extract this project.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose the folder containing `manifest.json`.

## Maintain filter rules
Edit `rules/ads.json` or `rules/trackers.json`. Each rule needs a unique integer ID within its own ruleset. After changes, open `chrome://extensions` and reload the extension. Keep rule conditions narrow and test sites that rely on third-party scripts.

## Limitations
This is a starter filter set, not a complete replacement for large community-maintained filter lists. Ads served from the same domain as page content, first-party sponsored content, and some video ads may not be blocked. The local counter is approximate and depends on Chrome's debugging event availability.

## Permissions
- `storage`: persist preferences and allowlist
- `declarativeNetRequest`: enforce packaged network rules
- `declarativeNetRequestFeedback`: optional local rule-match debugging count
- `<all_urls>`: allow rules and current-site allowlisting across websites

## Project layout
```text
rolex-key-adblocker/
├── manifest.json
├── background.js
├── popup.html
├── popup.css
├── popup.js
├── options.html
├── options.css
├── options.js
└── rules/
    ├── ads.json
    └── trackers.json
```

## License
MIT — see `LICENSE`.
