# Rolex Key AdBlocker

Version 3.1.0 — Chrome Manifest V3 extension with local-first settings.

## Features
- Bundled ad, tracker and pop-up network filtering; safe daily/manual JSON filter refresh
- Permanent/temporary allowlists, custom blocked domains, import/export and local statistics
- Balanced, Strict, Minimal and Custom protection profiles
- Optional heuristic anti-adblock overlay detection
- Reading mode with **Alt+Shift+R** shortcut
- English and Malayalam labels for new settings and help
- First-run setup wizard and update release notes
- Local permission/security auditor
- Popup compact/comfortable layout, accent colors and optional hidden statistics
- Themes and automated GitHub Actions validation; no remotely downloaded JavaScript

## Install
Open `chrome://extensions` in desktop Chrome, enable Developer mode, choose **Load unpacked**, and select the repository folder.

## Limitations
Reading mode changes presentation only and may not fit every layout. Anti-adblock detection is heuristic and may miss sites or produce false positives; disable it if a site behaves incorrectly. Video ad skipping is best-effort. Detailed matched-rule counts may be unavailable in store installs.

## Filter safety and permissions
Filter sources must be trusted HTTPS JSON arrays in Chrome Declarative Net Request format; standard EasyList text is not parsed. The auditor explains declared permissions. `<all_urls>` is broad and supports cross-site filtering and page enhancements; Chrome site-access controls may limit execution. Audit results remain local.

## License
MIT — see `LICENSE`.
