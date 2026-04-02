import type {
  SovSatsConfig,
  CreateInvoiceRequest,
  CreateInvoiceResponse,
  CryptoRow,
} from "./types";
import { normalizeCryptoFromInvoice, normalizePaymentMethods } from "./normalize";
import { normalizeInvoiceStatus } from "./invoice-status";

// ─── Create Invoice ───────────────────────────────────────────────────────────
// Pure function — no framework deps. Call from any server-side handler.

export async function createInvoice(
  config: SovSatsConfig,
  req: CreateInvoiceRequest
): Promise<CreateInvoiceResponse> {
  const { btcpayUrl, storeId, apiKey, speedPolicy = "HighSpeed" } = config;

  const {
    amount,
    currency = "USD",
    orderId,
    customerEmail,
    redirectUrl,
    notificationUrl,
    metadata = {},
  } = req;

  const body: Record<string, unknown> = {
    amount: String(amount),
    currency,
    metadata: {
      orderId,
      ...metadata,
    },
    checkout: {
      speedPolicy,
      lazyPaymentMethods: false,
      ...(redirectUrl && { redirectURL: redirectUrl, redirectAutomatically: true }),
      ...(notificationUrl && { notificationUrl }),
    },
  };

  if (customerEmail) {
    (body.metadata as Record<string, unknown>).buyerEmail = customerEmail;
  }

  const res = await fetch(`${btcpayUrl}/api/v1/stores/${storeId}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `token ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`BTCPay createInvoice failed: ${res.status} ${text}`);
  }

  const invoice = (await res.json()) as Record<string, unknown>;
  const invoiceId = invoice.id as string;
  const checkoutLink = (invoice.checkoutLink as string) || "";
  const status = normalizeInvoiceStatus(invoice.status);

  let cryptoInfo = normalizeCryptoFromInvoice(invoice);

  if (cryptoInfo.length === 0) {
    cryptoInfo = await fetchPaymentMethods(config, invoiceId);
  }

  return { invoiceId, checkoutLink, status, cryptoInfo };
}

// ─── Fetch Payment Methods ────────────────────────────────────────────────────

export async function fetchPaymentMethods(
  config: SovSatsConfig,
  invoiceId: string
): Promise<CryptoRow[]> {
  const { btcpayUrl, storeId, apiKey } = config;

  const res = await fetch(
    `${btcpayUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}/payment-methods`,
    {
      headers: { Authorization: `token ${apiKey}` },
    }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return normalizePaymentMethods(Array.isArray(data) ? data : []);
}
