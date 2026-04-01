import { NextRequest, NextResponse } from "next/server";
import { createInvoice, pollInvoice, handleWebhook } from "../../src/core";
import type { SovSatsConfig, CreateInvoiceRequest } from "../../src/core";

// ─── Next.js App Router Adapters ──────────────────────────────────────────────
// Usage: re-export these from your app/api/payments/btcpay/ route files.
//
// app/api/payments/btcpay/route.ts:
//   export { POST } from "sovsats/adapters/next"
//
// app/api/payments/btcpay/[invoiceId]/route.ts:
//   export { GET } from "sovsats/adapters/next"
//
// app/api/webhooks/btcpay/route.ts:
//   export { WEBHOOK } from "sovsats/adapters/next"

function getConfig(): SovSatsConfig {
  const btcpayUrl = process.env.BTCPAY_SERVER_URL;
  const storeId = process.env.BTCPAY_STORE_ID;
  const apiKey = process.env.BTCPAY_API_KEY;
  const webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET;

  if (!btcpayUrl || !storeId || !apiKey) {
    throw new Error(
      "Missing required env vars: BTCPAY_SERVER_URL, BTCPAY_STORE_ID, BTCPAY_API_KEY"
    );
  }

  return { btcpayUrl, storeId, apiKey, webhookSecret };
}

// POST /api/payments/btcpay
export async function POST(req: NextRequest) {
  try {
    const config = getConfig();
    const body = (await req.json()) as CreateInvoiceRequest;

    if (!body.amount || !body.orderId) {
      return NextResponse.json({ error: "amount and orderId required" }, { status: 400 });
    }

    const result = await createInvoice(config, body);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/payments/btcpay/[invoiceId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const config = getConfig();
    const result = await pollInvoice(config, params.invoiceId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/webhooks/btcpay
export function makeWebhookHandler(options: {
  onProcessing?: (invoiceId: string) => Promise<void>;
  onSettled?: (invoiceId: string) => Promise<void>;
}) {
  return async function WEBHOOK(req: NextRequest) {
    try {
      const config = getConfig();
      if (!config.webhookSecret) {
        return NextResponse.json({ error: "No webhook secret configured" }, { status: 500 });
      }

      const rawBody = await req.text();
      const signature = req.headers.get("btcpay-sig") || "";

      const result = await handleWebhook(rawBody, signature, {
        secret: config.webhookSecret,
        onProcessing: options.onProcessing
          ? (event) => options.onProcessing!(event.invoiceId)
          : undefined,
        onSettled: options.onSettled
          ? (event) => options.onSettled!(event.invoiceId)
          : undefined,
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 400 });
      }

      return NextResponse.json({ received: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  };
}
