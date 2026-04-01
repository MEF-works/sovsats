import type { WebhookEvent } from "./types";

// ─── Webhook Handler ──────────────────────────────────────────────────────────
// Framework agnostic — takes raw body string + signature header.
// Wire into any HTTP handler.

export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const hashHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // BTCPay sends "sha256=<hash>" or just "<hash>"
    const expected = signatureHeader.replace(/^sha256=/, "");
    return hashHex === expected;
  } catch {
    return false;
  }
}

export interface WebhookHandlerOptions {
  secret: string;
  /** Called when payment is processing (1+ confirmations depending on speedPolicy) */
  onProcessing?: (event: WebhookEvent) => Promise<void> | void;
  /** Called when invoice is fully settled */
  onSettled?: (event: WebhookEvent) => Promise<void> | void;
  /** Called on any webhook event — for logging, custom logic */
  onAny?: (event: WebhookEvent) => Promise<void> | void;
}

export async function handleWebhook(
  rawBody: string,
  signatureHeader: string,
  options: WebhookHandlerOptions
): Promise<{ ok: boolean; reason?: string }> {
  const { secret, onProcessing, onSettled, onAny } = options;

  // Verify signature
  const valid = await verifyWebhookSignature(rawBody, signatureHeader, secret);
  if (!valid) {
    return { ok: false, reason: "Invalid signature" };
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return { ok: false, reason: "Invalid JSON" };
  }

  // Fire callbacks
  if (onAny) await onAny(event);

  if (event.type === "InvoiceProcessing" && onProcessing) {
    await onProcessing(event);
  }

  if (event.type === "InvoiceSettled" && onSettled) {
    await onSettled(event);
  }

  return { ok: true };
}
