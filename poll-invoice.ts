import type { SovSatsConfig, PollInvoiceResponse, InvoiceStatus } from "./types";
import { fetchPaymentMethods, } from "./create-invoice";
import { normalizeCryptoFromInvoice } from "./normalize";

// ─── Poll Invoice ─────────────────────────────────────────────────────────────
// Pure server function. Wire into any GET handler.

export async function pollInvoice(
  config: SovSatsConfig,
  invoiceId: string
): Promise<PollInvoiceResponse> {
  const { btcpayUrl, storeId, apiKey } = config;

  const res = await fetch(
    `${btcpayUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`,
    {
      headers: { Authorization: `token ${apiKey}` },
    }
  );

  if (!res.ok) {
    throw new Error(`BTCPay pollInvoice failed: ${res.status}`);
  }

  const invoice = (await res.json()) as Record<string, unknown>;
  const status = (invoice.status as InvoiceStatus) || "New";
  const checkoutLink = (invoice.checkoutLink as string) || undefined;

  const settled = status === "Settled";
  const processing = status === "Processing";

  // Try to get crypto info — fetch separately if not in invoice body
  let cryptoInfo = normalizeCryptoFromInvoice(invoice);
  if (cryptoInfo.length === 0 && (status === "New" || status === "Processing")) {
    cryptoInfo = await fetchPaymentMethods(config, invoiceId);
  }

  return {
    invoiceId,
    status,
    paid: settled,
    processing,
    checkoutLink,
    cryptoInfo: cryptoInfo.length > 0 ? cryptoInfo : undefined,
  };
}
