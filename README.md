# Rolex Key AdBlocker

Version 4.5.0 — Chromium Manifest V3 extension with expanded ad-network filtering, early-running live ad cleanup, improved explicit Skip Ad detection, and hardened filter validation.

## Features
- Expanded bundled ad network filtering (84 static rules), tracker, pop-up and optional known cryptomining-script filtering; safe daily/manual JSON filter refresh
- Automatic GitHub release-feed checks every 6 hours, update badge/status and optional desktop notifications
- Popup and Settings update notice with link to official GitHub releases
- Permanent/temporary allowlists, custom blocked domains, import/export and local statistics
- Advanced local dashboard with protection configuration score, activity timeline, per-site allowlist controls, element picker, custom selector rules, URL rule preview, runtime diagnostics, and debug console
- Conservative mutation-aware page ad classification and optional floating-ad cleanup; optional cookie choice clicks only explicit reject/necessary-only controls
- Heuristic hostname warnings and broken-page recovery hints; these are not complete phishing, malware, or page compatibility scanners
- Separate counters for DNR network matches, page ad elements hidden, ad skip clicks and segment skips; popup totals and detailed Settings breakdown
- Balanced, Strict, Minimal and Custom protection profiles
- Optional heuristic anti-adblock overlay detection
- Real-time ad cleanup helper starts at document start and reacts to dynamically inserted page elements on supported video sites
- Automatic ad skipping now clicks supported Skip Ad controls as soon as they become visible and enabled, including controls that transition from countdown/disabled to enabled; master toggle in Settings
- Added SponsorBlock-style category metadata mapping and lower-overhead mutation coalescing/throttled detection
- Added 12 configurable segment-skip categories (sponsor, promotions, self-promotion, unpaid plugs, non-music sections, intermissions, intros, end cards, credits, greetings, previews and recaps); works only where a supported marker or explicit skip control exists
- Improved explicit Skip Ad button detection: clicks only visible/enabled ad-skip controls, ignores Skip Intro/Recap/Next Episode, and rate-limits clicks; does not manipulate video playback or DRM
- YouTube Shorts blocking toggle and cosmetic cleanup of clearly marked YouTube ad cards/overlays (best effort; in-stream ads are not guaranteed to be blocked)
- Optional device-local settings sign-in with PBKDF2 password hashing; ad blocking remains active without sign-in
- Toggleable streaming-site cosmetic cleanup for clearly marked ad banners/sponsored placements on JioHotstar/Hotstar, Prime Video, SonyLIV, ZEE5, MX Player, YouTube, Twitch, and other major streaming sites
- Reading mode with **Alt+Shift+R** shortcut
- English and Malayalam labels for new settings and help
- First-run setup wizard and update release notes
- Local permission/security auditor
- Popup compact/comfortable layout, accent colors and optional hidden statistics
- Custom crowned-shield vector icon with generated 16/32/48/128 px PNG sizes, protection profile controls, and automated GitHub Actions validation; no remotely downloaded JavaScript

## Ad intelligence and alerts (4.5.0)\n- Added original, heuristic YouTube ad-leak signals from visible ad markers and advertising-related resource observations.\n- Added conservative Dailymotion ad-marker and resource detection. These detections report possible ads; they do not guarantee network-level removal.\n- Added explicit anti-adblock warning detection and a local event history with optional desktop notifications.\n- Added independent settings toggles, allowlist-aware operation, event deduplication and bounded history. No third-party code, icons, fonts or branding from the supplied archive are included.\n\n## Advanced Control Center (4.2.0)
Open `advanced-dashboard.html` from Settings to view local activity, network/action timeline, website controls, element picker, custom cosmetic rules, simplified URL-rule testing, runtime diagnostics, appearance preferences and local debug events. The new page cleanup module uses conservative ad-label heuristics and excludes major page/player containers. Optional cookie cleanup clicks only explicit reject/necessary-only controls. Hostname warnings are heuristic only; this is not a complete phishing or malware scanner.

## Custom extension icon
The vector source lives at `icons/rolex-key-adblocker.svg`. GitHub Actions generates 16, 32, 48, and 128 px PNG icons using `scripts/generate_icons.py`. The manifest uses PNG assets for the browser toolbar and extension listing.

## Releases and extension updates
The official release center is [`releases.html`](releases.html), which displays the current update feed and fetches published release history from GitHub. Once the GitHub Pages deployment completes, it is available at [the hosted release center](https://sajinstalin01.github.io/adblocker-extension/releases.html). The [GitHub Releases page](https://github.com/sajinstalin01/adblocker-extension/releases) is the canonical release/download page. `CHANGELOG.md` records version notes.

For each release, update `manifest.json` to the new version and add a dated `## [x.y.z] - YYYY-MM-DD` section to `CHANGELOG.md`, then push a matching `vX.Y.Z` tag. The `Publish extension release` GitHub Actions workflow validates the tagged version, runs project validation, refreshes `update-feed.json`, and publishes a GitHub Release with a versioned ZIP. Ensure repository Actions permissions allow workflows to write contents/releases. You can also run the workflow manually with an existing version tag.

The extension checks `update-feed.json` on GitHub every six hours and when the browser starts/extension is installed. Users can enable desktop notifications in Settings. Only version/release metadata is fetched; remote JavaScript is never downloaded or executed. When a newer release is available, the extension shows an update badge and link to the official GitHub Releases page.

Chrome Web Store installations receive extension code updates through Chrome's built-in update system after a new version is published to the store. Unpacked/developer installs cannot safely self-replace extension code; users must download the updated repository/release and reload the unpacked extension manually. The release workflow updates the feed from the matching changelog section. Unpacked/developer installs still require a manual download and reload; metadata checks do not install new extension code.

## Multi-browser installation hub
Open [`browsers.html`](browsers.html) for the browser compatibility chart, browser icons, official store-search links, and installation guidance for Chrome, Firefox, Safari, Microsoft Edge, Brave, and Opera Mini. Store-search links do not imply that this project is already published in those stores. At present, the tested codebase is Chromium-focused; Firefox needs a compatible build and testing, Safari requires packaging/signing and App Store distribution, and Opera Mini does not support normal browser extensions.

## Install
For desktop Chrome, Microsoft Edge, or Brave, download the [repository ZIP](https://github.com/sajinstalin01/adblocker-extension/archive/refs/heads/main.zip), extract it, open the browser's extensions page, enable Developer mode (where available), and choose **Load unpacked** / **Load unpacked extension**. The browser compatibility page explains the limitations. Do not install this Chromium package in Firefox or Safari and assume compatibility.

## Optional local sign-in
The optional sign-in is device-local and only gates the settings page UI. It does not create a cloud account, sync credentials, or protect against someone with access to the browser profile or extension files. Ad blocking works with sign-in disabled. Use a unique password.

## Limitations
Reading mode changes presentation only and may not fit every layout. Anti-adblock detection is heuristic and may miss sites or produce false positives; disable it if a site behaves incorrectly. YouTube Shorts hiding and ad-card cleanup are best-effort and may need selector updates as YouTube changes its UI. Real-time video-site ad cleanup is best-effort. The bundled ad-network list has been expanded, but network filters cannot identify every ad request. Segment skipping is best-effort and relies on visible skip controls or page-provided segment metadata; it does not infer segments from audio/video. Automatic skipping clicks only controls that are visible and enabled; it cannot prevent an ad from starting or skip server-side/in-stream ads that expose no skip control. Video-site cleanup is best-effort: it hides clearly marked page-level ad elements and clicks explicit skip controls where present. Ads inserted into the video stream or delivered from the same media endpoint (including some YouTube, Twitch, JioHotstar, and Prime Video ads) may still play. No browser extension can guarantee instant removal on every platform, and this extension deliberately avoids manipulating video playback or DRM. Detailed matched-rule counts may be unavailable in store installs.

## Filter safety and permissions
Filter sources must be trusted HTTPS JSON arrays in Chrome Declarative Net Request format; standard EasyList text is not parsed. Remote filter downloads are size-limited, redirects are rejected, and unsupported/overly broad rules are rejected before use. Community lists are still user-selected, so only subscribe to sources you trust. The optional miner rules block a small set of known browser-mining script domains; this is not a malware or phishing scanner and may cause site breakage if a site intentionally loads those scripts. The auditor explains declared permissions. `<all_urls>` is broad and supports cross-site filtering and page enhancements; browser site-access controls may limit execution. Audit results remain local.

## License
MIT — see `LICENSE`.
