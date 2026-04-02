# Changelog

All notable changes to this project are documented here.

## [0.2.1] — 2026-04-02

### Changed

- README: entry points, requirements, API tables, `useSovSats`, Express webhook **raw body** order, Next `transpilePackages` note, callback vs auto-redirect clarity.
- Package metadata: `homepage`, `bugs`, `engines`, ship `CHANGELOG.md` in the tarball.

## [0.2.0] — 2026-04

### Changed (breaking)

- **`useSovSats`**: Poll JSON parsing is **camelCase / Greenfield-shaped** only (no snake_case aliases).
- **Removed** `deferPollingToParent`, `externalIsPolling`, and `usdTotalLabel` from the public API.
- **BtcNexusCheckout** / **`BtcCheckoutProps`**: Props trimmed; waiting UI follows hook polling only.

### Added

- **`availablePaymentMethods`** supported in normalization alongside **`paymentMethods`** (Greenfield-style invoice JSON).

