import type { CryptoRow } from "./types";

// ─── Normalize BTCPay Payment Methods ────────────────────────────────────────
// BTCPay returns payment method data in inconsistent shapes depending on
// invoice state and server version. This normalizes all of them into CryptoRow.

export function normalizePaymentMethods(raw: unknown[]): CryptoRow[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((pm): CryptoRow | null => {
      if (!pm || typeof pm !== "object") return null;
      const p = pm as Record<string, unknown>;

      const cryptoCode =
        (p.cryptoCode as string) ||
        (p.paymentMethod as string)?.split("-")[0] ||
        "";

      const address =
        (p.destination as string) ||
        (p.address as string) ||
        "";

      const due =
        (p.due as string) ||
        (p.amount as string) ||
        (p.totalDue as string) ||
        "0";

      const paymentMethod =
        (p.paymentMethod as string) ||
        cryptoCode;

      if (!address || !cryptoCode) return null;

      return {
        cryptoCode,
        address,
        due,
        paymentMethod,
        paymentLink: (p.paymentLink as string) || buildBitcoinUri(address, due),
        paymentType: (p.paymentType as string) || undefined,
      };
    })
    .filter((row): row is CryptoRow => row !== null);
}

export function normalizeCryptoFromInvoice(invoice: Record<string, unknown>): CryptoRow[] {
  // Some invoice objects embed payment methods inline
  const embedded =
    (invoice.paymentMethods as unknown[]) ||
    (invoice.payments as unknown[]) ||
    [];

  if (embedded.length > 0) return normalizePaymentMethods(embedded);
  return [];
}

export function buildBitcoinUri(address: string, amount: string, label?: string): string {
  const params = new URLSearchParams();
  if (amount && amount !== "0") params.set("amount", amount);
  if (label) params.set("label", label);
  const qs = params.toString();
  return `bitcoin:${address}${qs ? `?${qs}` : ""}`;
}

export function formatBtcAmount(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n)) return "0";
  // Show up to 8 decimal places, trim trailing zeros
  return n.toFixed(8).replace(/\.?0+$/, "");
}
