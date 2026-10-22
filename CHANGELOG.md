# Changelog

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

