# Rolex Key AdBlocker

Version 3.4.0 — Chrome Manifest V3 extension with local-first settings.

## Features
- Bundled ad, tracker and pop-up network filtering; safe daily/manual JSON filter refresh
- Automatic GitHub release-feed checks every 6 hours, update badge/status and optional desktop notifications
- Popup and Settings update notice with link to official GitHub releases
- Permanent/temporary allowlists, custom blocked domains, import/export and local statistics
- Balanced, Strict, Minimal and Custom protection profiles
- Optional heuristic anti-adblock overlay detection
- YouTube Shorts blocking toggle and cosmetic cleanup of clearly marked YouTube ad cards/overlays (best effort; in-stream ads are not guaranteed to be blocked)
- Optional device-local settings sign-in with PBKDF2 password hashing; ad blocking remains active without sign-in
- Toggleable streaming-site cosmetic cleanup for clearly marked ad banners/sponsored placements on JioHotstar/Hotstar, Prime Video, SonyLIV, ZEE5, MX Player, YouTube, Twitch, and other major streaming sites
- Reading mode with **Alt+Shift+R** shortcut
- English and Malayalam labels for new settings and help
- First-run setup wizard and update release notes
- Local permission/security auditor
- Popup compact/comfortable layout, accent colors and optional hidden statistics
- Themes and automated GitHub Actions validation; no remotely downloaded JavaScript

## Extension updates
The extension checks `update-feed.json` on GitHub every six hours and when the browser starts/extension is installed. Users can enable desktop notifications in Settings. Only version/release metadata is fetched; remote JavaScript is never downloaded or executed. When a newer release is available, the extension shows an update badge and link to the official GitHub Releases page.

Chrome Web Store installations receive extension code updates through Chrome's built-in update system after a new version is published to the store. Unpacked/developer installs cannot safely self-replace extension code; users must download the updated repository/release and reload the unpacked extension manually. The feed must be updated as part of each release.

## Install
Open `chrome://extensions` in desktop Chrome, enable Developer mode, choose **Load unpacked**, and select the repository folder.

## Optional local sign-in
The optional sign-in is device-local and only gates the settings page UI. It does not create a cloud account, sync credentials, or protect against someone with access to the browser profile or extension files. Ad blocking works with sign-in disabled. Use a unique password.

## Limitations
Reading mode changes presentation only and may not fit every layout. Anti-adblock detection is heuristic and may miss sites or produce false positives; disable it if a site behaves incorrectly. YouTube Shorts hiding and ad-card cleanup are best-effort and may need selector updates as YouTube changes its UI. Video ad skipping is best-effort. Streaming-site cleanup targets marked page-level ad placements; it does not promise to remove server-inserted or in-stream video ads, and deliberately avoids manipulating video playback or DRM. Detailed matched-rule counts may be unavailable in store installs.

## Filter safety and permissions
Filter sources must be trusted HTTPS JSON arrays in Chrome Declarative Net Request format; standard EasyList text is not parsed. The auditor explains declared permissions. `<all_urls>` is broad and supports cross-site filtering and page enhancements; Chrome site-access controls may limit execution. Audit results remain local.

## License
MIT — see `LICENSE`.
