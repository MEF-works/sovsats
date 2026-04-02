import type { CryptoRow } from "./types";

// ─── Normalize BTCPay Greenfield payment method / invoice payloads ─

function displayLabelForMethod(cryptoCode: string, paymentMethodId: string): string {
  const id = paymentMethodId.toLowerCase();
  if (id.includes("lightning")) {
    return `${cryptoCode} (Lightning)`;
  }
  if (cryptoCode === "LTC") return "Litecoin";
  if (cryptoCode === "BTC") return "Bitcoin";
  return cryptoCode;
}

/** Read first defined key (BTCPay may use camelCase or PascalCase JSON). */
function pick(pm: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (pm[k] !== undefined && pm[k] !== null) return pm[k];
  }
  return undefined;
}

/** On-chain address from destination fields, or parsed from BIP21 / lightning link. */
function addressFromPaymentMethod(pm: Record<string, unknown>): string {
  let destination = String(
    pick(pm, "destination", "Destination", "address", "Address", "destinationAddress", "destination_address") ?? ""
  ).trim();
  if (destination) return destination;

  const linkRaw = pick(pm, "paymentLink", "payment_link", "PaymentLink");
  const link = linkRaw != null ? String(linkRaw).trim() : "";
  if (!link) return "";

  const bitcoin = link.match(/^bitcoin:([^?]+)/i);
  if (bitcoin?.[1]) return decodeURIComponent(bitcoin[1].trim());

  const litecoin = link.match(/^litecoin:([^?]+)/i);
  if (litecoin?.[1]) return decodeURIComponent(litecoin[1].trim());

  if (link.toLowerCase().startsWith("lightning:") || /^lnbc/i.test(link)) {
    return link;
  }

  return "";
}

function dueFromPaymentMethod(pm: Record<string, unknown>): string {
  const dueRaw = pick(pm, "due", "Due", "amount", "Amount", "price", "Price");
  return dueRaw != null && String(dueRaw) !== "" ? String(dueRaw) : "0";
}

/**
 * Normalize BTCPay Server Greenfield invoice payment methods for checkout display.
 */
export function normalizeCryptoFromInvoice(invoice: Record<string, unknown>): CryptoRow[] {
  const rows: CryptoRow[] = [];
  const seen = new Set<string>();

  const push = (row: CryptoRow) => {
    const dest = row.address?.trim() ?? "";
    if (!dest) return;
    const key = `${row.cryptoCode}:${dest}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  const paymentMethodsRaw =
    invoice.paymentMethods ??
    invoice.availablePaymentMethods ??
    invoice["PaymentMethods"];
  if (Array.isArray(paymentMethodsRaw)) {
    for (const pmUntyped of paymentMethodsRaw) {
      if (!pmUntyped || typeof pmUntyped !== "object") continue;
      const raw = pmUntyped as Record<string, unknown>;
      const paymentMethodId = String(
        pick(raw, "paymentMethodId", "payment_method_id", "PaymentMethodId") ?? ""
      );
      const currencyRaw = String(
        (pick(raw, "currency", "Currency") ??
          (paymentMethodId ? paymentMethodId.split("-")[0] : "")) ||
          "BTC"
      );
      const cryptoCode = currencyRaw.toUpperCase() || "BTC";
      const destination = addressFromPaymentMethod(raw);
      const linkRaw = pick(raw, "paymentLink", "payment_link", "PaymentLink");
      const link = linkRaw != null ? String(linkRaw).trim() : undefined;
      const due = dueFromPaymentMethod(raw);
      push({
        cryptoCode,
        address: destination,
        due,
        paymentMethod: displayLabelForMethod(cryptoCode, paymentMethodId),
        paymentLink: link || undefined,
        paymentType: paymentMethodId || undefined,
      });
    }
  }

  const legacy = invoice.cryptoInfo ?? invoice.cryptos;
  if (Array.isArray(legacy)) {
    for (const cUntyped of legacy) {
      if (!cUntyped || typeof cUntyped !== "object") continue;
      const c = cUntyped as Record<string, unknown>;
      const cryptoCode = String(c.cryptoCode ?? c.currency ?? "BTC").toUpperCase();
      let address = String(c.address ?? c.destination ?? "").trim();
      if (!address) {
        address = addressFromPaymentMethod(c);
      }
      const due = String(c.due ?? c.price ?? c.amount ?? "0");
      const paymentTypeHint = String(c.paymentType ?? c.payment_type ?? "");
      const paymentMethod = String(
        c.paymentMethod ?? c.payment_method ?? displayLabelForMethod(cryptoCode, paymentTypeHint)
      );
      const pl = c.paymentLink ?? c.payment_link;
      push({
        cryptoCode,
        address,
        due,
        paymentMethod,
        paymentLink: pl != null ? String(pl) : undefined,
        paymentType: paymentTypeHint || undefined,
      });
    }
  }

  const rank = (code: string) => {
    if (code === "BTC") return 0;
    if (code === "LTC") return 1;
    return 2;
  };
  rows.sort((a, b) => rank(a.cryptoCode) - rank(b.cryptoCode) || a.cryptoCode.localeCompare(b.cryptoCode));
  return rows;
}

/** Normalize raw array from GET …/payment-methods (lazy payment methods). */
export function normalizePaymentMethods(raw: unknown[]): CryptoRow[] {
  if (!Array.isArray(raw)) return [];
  return normalizeCryptoFromInvoice({ paymentMethods: raw as Record<string, unknown>[] });
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
  return n.toFixed(8).replace(/\.?0+$/, "");
}
