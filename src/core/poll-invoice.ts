import type { SovSatsConfig, PollInvoiceResponse } from "./types";
import { fetchPaymentMethods } from "./create-invoice";
import { normalizeCryptoFromInvoice } from "./normalize";
import { normalizeInvoiceStatus } from "./invoice-status";

// ─── Poll Invoice ─────────────────────────────────────────────────────────────
// Pure server function. Wire into any GET handler.

export async function pollInvoice(
  config: SovSatsConfig,
  invoiceId: string
): Promise<PollInvoiceResponse> {
  const { btcpayUrl, storeId, apiKey } = config;

  const res = await fetch(`${btcpayUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`, {
    headers: { Authorization: `token ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`BTCPay pollInvoice failed: ${res.status}`);
  }

  const invoice = (await res.json()) as Record<string, unknown>;
  const status = normalizeInvoiceStatus(invoice.status);
  const checkoutLink = (invoice.checkoutLink as string) || undefined;

  const settled = status === "Settled";
  const processing = status === "Processing";

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
