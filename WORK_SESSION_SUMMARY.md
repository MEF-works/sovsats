# Work session summary — 2026-04-01 (package boundary)

## SovSats npm package — standalone

- **`useSovSats`** — Polls `GET {pollEndpoint}/{invoiceId}`. Parses **camelCase only**: Greenfield invoice (`id`, `status`, `checkoutLink`, `paymentMethods` / `availablePaymentMethods`) or **`PollInvoiceResponse`** from this package’s `pollInvoice()`. No snake_case. Derives `paid` / `processing` from `status` when booleans are absent. **`deferPollingToParent` / `externalIsPolling` removed**; polling is always internal after `startPolling()`.
- **`BtcCheckoutProps`** — Trimmed and documented for first-time readers; removed **`usdTotalLabel`**, **`deferPollingToParent`**, **`externalIsPolling`**.
- **`BtcNexusCheckout`** — Uses the simplified props and waiting copy driven only by hook **`isPolling`**.
- **`normalize.ts`** — Invoice-level keys: **`paymentMethods`**, **`availablePaymentMethods`**, **`PaymentMethods`**; legacy **`cryptoInfo` / `cryptos`** only (snake_case invoice keys dropped). Header comment is BTCPay-focused, not app-specific.
- **`BtcpayCryptoRow`** — Documented as backwards-compatible alias for **`CryptoRow`**.

## mgmalkz

Not modified in this pass (per request). When you wire mgmalkz to npm **`sovsats`**, map any legacy API shapes **in mgmalkz** (or adapt the GET route to return Greenfield / `pollInvoice` JSON).

## Version

- **0.2.0** — on npm today; breaking vs 0.1.x (removed defer/label/snake_case poll handling).
- **0.2.1** — current **`package.json`**; doc/metadata + package layout (not yet on npm until you publish).

## Verify

```bash
npm run typecheck && npm publish --dry-run
```

## Published (npm)

- **sovsats@0.2.0** — live. Install: `npm install sovsats@0.2.0` or range that resolves to it.
- **sovsats@0.2.1** — publish from your machine (see below). Then: `npm install sovsats@^0.2.1`.

## Documentation pass — 2026-04-02

- **README** — Requirements (Node 18+, BTCPay Greenfield); package **entry-point table**; fixed “redirect” wording (navigation via **callbacks**); **POST response** and **GET/poll** field tables; **`useSovSats`** section; **Express** example with **`express.raw` before `express.json()`** for webhooks; `transpilePackages` note for Next monorepos; safer **`cryptoInfo?.find`** example; links to npm, GitHub Pages, issues, **CHANGELOG**.
- **CHANGELOG.md** — **0.2.0** history + **0.2.1** doc-only entry; shipped in tarball via **`package.json` `files`**.
- **package.json** — **`homepage`**, **`bugs`**, **`engines.node` >=18**; version bumped to **0.2.1** for publishing doc/metadata updates (registry already had **0.2.0**).

## Media for the website

- Put files in **`docs/assets/`** with the names in **`docs/assets/PLACE_FILES_HERE.txt`** (`checkout-mobile.png`, `checkout-demo.mp4`, optional `.webm` + poster).
- **`docs/preview.png`** — image for README / npm (copy or export a representative frame).

## docs/index.html (marketing site)

- GitHub links already target **`https://github.com/MEF-works/sovsats`**; npm → **`https://www.npmjs.com/package/sovsats`**; footer profile **`https://github.com/MEF-works`**.
- Added **`canonical`** + **`og:url`** → **`https://sovsats.com/`** for the custom domain.
- Code sample updated to **`import { BtcNexusCheckout }`**, **`buildBitcoinUri`**, and required props **`bitcoinUri`** / **`orderId`** (matches package API).

## URLs — personal GitHub, custom domain

- **`github.com/MEF-works`** is a **personal username** (not a GitHub Organization). Repo: **`MEF-works/sovsats`**.
- **`package.json` `homepage`** and README “Site” point to **`https://sovsats.com/`** (canonical landing). GitHub Pages remains optional hosting behind that domain.

## Git push — 2026-04-03

- Pushed **`docs/index.html`** updates (demo/phone copy, no `PLACE_FILES_HERE` on-page) — **`bff6411`** on **`main`**.

## Git push — 2026-04-02

- Added **`.gitignore`** (`node_modules/`, `dist/`, env files) so GitHub Pages / clones stay clean.
- Committed package restructure + docs; **`git pull --rebase origin main`** then **`git push origin main`** to **https://github.com/MEF-works/sovsats** (remote was ahead; rebase succeeded).

## npm publish — sovsats@0.2.1

- **`npm publish --dry-run`** from **`h:\sovsats`** succeeds (typecheck + build + pack **sovsats@0.2.1**).
- **Cursor / CI shells here are not `npm login`’d** (`npm whoami` → **401**), so **`npm publish`** must run **on your PC** as the **`sovsats` owner**.
- **Commands:** `cd h:\sovsats` → **`npm whoami`** (expect your npm username) → **`npm login`** if needed → **`npm publish`**. With 2FA, use an npm **automation** / **Granular Access Token** with publish permission if the CLI prompts for OTP.
- After publish: **`npm view sovsats version`** should show **0.2.1** (or set **`npm dist-tag add sovsats@0.2.1 latest`** if `latest` did not move).
