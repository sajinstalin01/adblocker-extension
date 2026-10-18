# Rolex Key AdBlocker

Version 3.0.0 — Chrome Manifest V3 extension focused on reliability, recoverability, and local-first privacy.

## Features
- Bundled network filtering for known ad, tracker, and pop-up-ad domains
- Daily refresh of trusted JSON block rules with manual update
- Validates remote rules before atomic replacement; retains last-known-good rules when downloads or validation fail
- Namespaced dynamic rules so allowlist, custom domain, and remote filter updates do not erase one another
- Pause/resume that disables bundled, remote, and custom blocking rules
- Separate global tracker and pop-up ad-network controls
- Permanent and temporary website allowlists; temporary entries expire automatically
- Optional subscriptions to up to 10 HTTPS JSON filter lists (maximum 500 rules each, 5,000 combined)
- Custom blocked domains and common ad-slot cleanup
- Best-effort YouTube skip-button helper
- Dark/light/system themes, import/export, local statistics, and restore-defaults recovery
- Automated CI checks for JSON, rule IDs, resource references, JavaScript syntax, and UI element references
- No remotely downloaded JavaScript

## Install locally
1. Download or clone this repository.
2. Open `chrome://extensions` in desktop Chrome.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the folder containing `manifest.json`.
5. Reload the extension after updating files.

## Filter update safety
Remote lists must be HTTPS JSON arrays in Chrome Declarative Net Request block-rule format. Standard EasyList/Adblock Plus text lists are not parsed directly. All remote lists are validated before rules are replaced. Bundled rules remain active if an update fails. Only add community sources you trust.

## Statistics
Detailed `onRuleMatchedDebug` counts are available in unpacked/developer builds only. Counts are therefore not guaranteed to represent every blocked request in a normal Chrome Web Store install.

## Video ads
Skip automation depends on the current site UI and is best-effort. It cannot reliably remove every ad or sponsorship embedded directly into a creator's video.

## Permissions
- `storage`: preferences, rules, subscriptions, and local stats
- `alarms`: daily filter refresh and temporary allowlist expiry
- `declarativeNetRequest`: bundled and dynamic network rules
- `declarativeNetRequestFeedback`: developer matched-rule statistics
- `<all_urls>`: filtering and ad-slot cleanup across websites
- `raw.githubusercontent.com`: fetch this project's JSON filter files

## License
MIT — see `LICENSE`.
