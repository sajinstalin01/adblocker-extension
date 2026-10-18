# Rolex Key AdBlocker

A Chrome Manifest V3 extension that blocks requests to a curated set of advertising and tracking domains, hides selected common ad containers, and tries to skip video ads when a visible skip control is available.

## Features
- Network-level ad and tracker blocking using packaged Declarative Net Request rules
- Expanded ad-domain list
- Best-effort hiding of common ad slots on websites
- YouTube skip-button automation, plus best-effort fast-forward/mute for some unskippable ads
- Popup enable/pause control and per-domain allowlist
- Local preferences; no remote code or runtime dependencies

## Install locally
1. Download and extract this project.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose the folder containing `manifest.json`.
5. Reload the extension after updating files.

## Important limitations
No extension can guarantee removal of every ad on every site. Some ads are served from the same domain as page content, and websites frequently change their markup and video-ad behavior. YouTube's ad handling is particularly changeable; skip/fast-forward behavior is best-effort and may stop working after site updates. Hiding generic ad containers can occasionally hide legitimate page content. This extension does not remove sponsorships embedded directly into a video by its creator.

## Permissions
- `storage`: persist preferences and allowlist
- `declarativeNetRequest`: enforce packaged network rules
- `declarativeNetRequestFeedback`: optional local rule-match debugging count
- `<all_urls>`: apply filtering and ad-slot cleanup across websites

## Project layout
```text
rolex-key-adblocker/
├── manifest.json
├── background.js
├── content-ad-cleaner.js
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
