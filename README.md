# SovSats ₿
### Checkout Without Compromise

A drop-in Bitcoin checkout UI for [BTCPay Server](https://btcpayserver.org). Built for merchants who don't have payment processor options — and don't want one.

No Stripe. No PayPal. No getting banned. Sovereign by design.

![SovSats Checkout](./docs/preview.png)

---

## Why

BTCPay Server is the right infrastructure. The default checkout UI is not. Every merchant running BTCPay is staring at the same generic interface. SovSats is a production-grade, mobile-first checkout shell built on top of BTCPay's Greenfield API — with real UX, real polling, and a confirmation flow that protects both merchant and customer.

- **Redirect on detection** — customer sees confirmation immediately
- **Fulfill on settlement** — your backend waits for real confirmation before fulfilling
- **Framework agnostic** — works with Next.js, Express, or any Node server
- **One component** — drop it in, wire 4 env vars, done

---

## Install

```bash
npm install sovsats
# or
yarn add sovsats
# or
pnpm add sovsats
```

**Peer deps** (only needed if using the React component):
```bash
npm install react react-dom framer-motion
```

---

## Quickstart (Next.js)

### 1. Set environment variables

```env
BTCPAY_SERVER_URL=https://btcpay.yourdomain.com
BTCPAY_STORE_ID=your_store_id
BTCPAY_API_KEY=your_greenfield_api_key
BTCPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 2. Create your API routes

**`app/api/payments/btcpay/route.ts`**
```ts
export { POST } from "sovsats/adapters/next";
```

**`app/api/payments/btcpay/[invoiceId]/route.ts`**
```ts
export { GET } from "sovsats/adapters/next";
```

**`app/api/webhooks/btcpay/route.ts`**
```ts
import { makeWebhookHandler } from "sovsats/adapters/next";

export const POST = makeWebhookHandler({
  onSettled: async (invoiceId) => {
    // Fulfill your order here — this fires only after full confirmation
    await fulfillOrder(invoiceId);
  },
  onProcessing: async (invoiceId) => {
    // Optional: fire early notifications, analytics, etc.
  },
});
```

### 3. Create an invoice from your checkout page

```ts
const res = await fetch("/api/payments/btcpay", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: 49.99,
    currency: "USD",
    orderId: "ORD-12345",
    customerEmail: "customer@email.com",
    redirectUrl: `${process.env.NEXT_PUBLIC_URL}/checkout/success?orderId={OrderId}`,
    notificationUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/btcpay`,
  }),
});

const invoice = await res.json();
// invoice.invoiceId, invoice.cryptoInfo[0].address, invoice.cryptoInfo[0].due
```

### 4. Drop in the checkout component

```tsx
import BtcNexusCheckout from "sovsats/react";
import { buildBitcoinUri } from "sovsats";

const btc = invoice.cryptoInfo.find(r => r.cryptoCode === "BTC");

<BtcNexusCheckout
  invoiceId={invoice.invoiceId}
  pollEndpoint="/api/payments/btcpay"
  storeName="Your Store"
  usdTotal="$49.99"
  btcAddress={btc.address}
  btcAmount={btc.due}
  bitcoinUri={buildBitcoinUri(btc.address, btc.due, invoice.invoiceId)}
  orderId="ORD-12345"
  callbacks={{
    onProcessing: (id) => console.log("Payment detected", id),
    onSettled: (id) => router.push(`/checkout/success?orderId=${id}`),
  }}
/>
```

---

## Quickstart (Express)

```ts
import express from "express";
import { makeBtcpayRouter, makeWebhookRouter } from "sovsats/adapters/express";

const config = {
  btcpayUrl: process.env.BTCPAY_SERVER_URL!,
  storeId: process.env.BTCPAY_STORE_ID!,
  apiKey: process.env.BTCPAY_API_KEY!,
  webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET,
};

app.use("/api/payments/btcpay", makeBtcpayRouter(config));

app.use("/api/webhooks/btcpay", makeWebhookRouter(config, {
  onSettled: async (invoiceId) => {
    await fulfillOrder(invoiceId);
  },
}));
```

---

## Settlement Logic

SovSats handles the two-phase confirmation pattern correctly out of the box:

| BTCPay Status | SovSats Behavior |
|---|---|
| `New` | Polling, waiting for mempool detection |
| `Processing` | Fires `onProcessing` — safe for UX redirect only |
| `Settled` | Fires `onSettled` — safe for order fulfillment |
| `Expired` | Shows expired state, stops polling |

**Never fulfill orders on `Processing`.** Use `onSettled` (or your webhook's `InvoiceSettled` event) for that. The UI will redirect the customer early for a smooth experience — the backend waits.

---

## BTCPay Server Setup

1. Create a store in your BTCPay instance
2. Generate a Greenfield API key with **Invoice: Create, Read** permissions
3. Add a webhook pointing to your `/api/webhooks/btcpay` endpoint
4. Enable events: `InvoiceSettled`, `InvoiceProcessing`, `InvoiceExpired`
5. Copy the webhook secret into your env

---

## Component Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `invoiceId` | `string` | ✓ | — | BTCPay invoice ID |
| `pollEndpoint` | `string` | ✓ | — | Your server poll route, e.g. `/api/payments/btcpay` |
| `btcAddress` | `string` | ✓ | — | BTC address from invoice |
| `btcAmount` | `string` | ✓ | — | Exact BTC amount due |
| `bitcoinUri` | `string` | ✓ | — | `bitcoin:` URI for wallet deep links |
| `usdTotal` | `string` | ✓ | — | Display total, e.g. `"$49.99"` |
| `orderId` | `string` | ✓ | — | Your order ID for display |
| `storeName` | `string` | — | `"Merchant"` | Display name shown in header |
| `pollInterval` | `number` | — | `5000` | Poll interval in ms |
| `callbacks` | `SovSatsCallbacks` | — | — | `onProcessing`, `onSettled`, `onError` |
| `dev` | `boolean` | — | `false` | Show simulate confirmation button |

---

## Core API (framework agnostic)

```ts
import { createInvoice, pollInvoice, handleWebhook, normalizePaymentMethods } from "sovsats";
```

All core functions are pure async — no framework deps, no globals. Wire them into any HTTP handler.

---

## Who This Is For

Merchants selling in alternative markets who need a real payment stack:
- Kratom / botanical vendors
- CBD and hemp
- Nootropics and supplements  
- Adult products
- Firearms accessories
- Anyone Stripe has terminated

If you're already on BTCPay, you're 4 env vars away from a checkout that doesn't look like an afterthought.

---

## License

MIT — use it, fork it, ship it.

Built by [MEFworks](https://github.com/mefworks). Powered by [BTCPay Server](https://btcpayserver.org).
