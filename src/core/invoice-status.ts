import type { InvoiceStatus } from "./types";

/** BTCPay / proxies may return PascalCase, lowercase, or mixed. */
export function normalizeInvoiceStatus(raw: unknown): InvoiceStatus {
  const x = String(raw ?? "New").trim().toLowerCase();
  switch (x) {
    case "settled":
      return "Settled";
    case "processing":
      return "Processing";
    case "expired":
      return "Expired";
    case "invalid":
      return "Invalid";
    case "new":
    default:
      return "New";
  }
}
