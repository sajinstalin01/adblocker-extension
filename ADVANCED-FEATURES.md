# Rolex Key AdBlocker 4.2.0 — Advanced Control Center

## Included
- Local protection dashboard with counters, action/network timeline, trend bars, website allowlist controls and health summary.
- Conservative mutation-aware ad-label detection, floating-ad cleanup and page-element hiding.
- Optional cookie consent helper that clicks only an explicit Reject All / Necessary Only / Decline Optional control; disabled by default.
- Element picker that creates per-host CSS selector rules stored locally.
- Simplified URL-pattern test bench, custom blocked-domain shortcut, duplicate rule review by local list, and debug event log.
- Runtime diagnostics for manifest version, approximate storage usage, browser memory API availability and custom domain count.
- Local theme/accent/profile/language preference controls.
- Heuristic suspicious-host warning for selected URL characteristics and a recovery hint for blank pages/repeated load errors.
- Existing tracker/privacy rules, YouTube Shorts controls, explicit Skip Ad handling, streaming cleanup, local sign-in, onboarding and update notifications are retained.

## Important limitations
- Ad classification is heuristic, not an AI/ML model. It may miss ads or hide a false positive; use allowlists and disable smart cleanup if needed.
- Cookie handling only selects an explicit reject/necessary-only control. It does not accept consent or bypass a site's consent requirements.
- Sponsor/segment detection still depends on supported page markers or explicit skip controls; this release does not analyze audio/video.
- The URL test bench is a simplified preview, not a full parser for DNR or EasyList syntax.
- The protection score is a transparent local configuration score, not a security certification.
- Hostname warnings are heuristic and are not a live threat-intelligence or complete phishing scanner.
- Browser memory APIs are not available in every browser. Diagnostics show when data is unavailable.
- Cloud account sync, automatic AI/ML classification, full malware scanning, universal pop-up/redirect interception, and universal media sponsor detection are not claimed by this release.
