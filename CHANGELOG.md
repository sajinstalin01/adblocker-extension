# Changelog

## [4.2.0] - 2026-10-31
- Added an Advanced Control Center with local statistics, action/network timeline, per-site allowlist controls, diagnostics and debug console.
- Added a mutation-aware conservative page-ad classifier, floating-ad cleanup and optional explicit cookie rejection controls.
- Added a page element picker with per-domain cosmetic rules, simplified URL rule preview and custom blocked-domain shortcut.
- Added heuristic suspicious-host warnings and incomplete-page recovery hints.
- Added local appearance, profile and cleanup preferences; documented limitations for heuristic detection and unsupported cloud/threat-intelligence services.


## [4.1.0] - 2026-10-30
- Added separate counters for network requests matched by DNR, page ads hidden, ad skip clicks, and segment skips.
- Added popup totals and detailed Settings statistics with local reset and backup support.
- Clarified that network debug counters may be unavailable in normal store installs and action counts are not unique-ad estimates.


## [4.0.0] - 2026-10-30
- Added 12 configurable segment-skip categories for sponsor, promotional, self-promotional, unpaid, non-music, intermission, intro, end-card, credit, greeting, preview, and recap segments.
- Added explicit skip-control and segment metadata recognition with per-category settings.
- Preserved allowlists, rate-limited clicks, and fail-open playback-safe behavior; no audio/video analysis or DRM manipulation.


All notable project releases are recorded here. Release automation expects a matching section for each tag (for example, tag `v3.9.0` requires `## [3.9.0] - YYYY-MM-DD`).

## [3.9.0] - 2026-10-22
- Improved detection of explicit Skip Ad controls on supported video sites.
- Rate-limited skip clicks and excluded Skip Intro, Skip Recap, and Next Episode controls.
- Kept cleanup fail-open and outside video playback, media URL, and DRM handling.
- Improved page-ad selector checks to avoid hiding player/application containers.

## [3.8.0] - 2026-10-21
- Expanded bundled ad-network block list to 84 static rules.
- Added additional ad-tech, sponsored-content, and measurement endpoints.
- Preserved document-start page cleanup and the metadata-only update checker.
- Clarified that platform in-stream ad blocking remains best-effort.

