// ─── SovSats Core Types ───────────────────────────────────────────────────────

export interface SovSatsConfig {
  /** Full URL to your BTCPay Server, e.g. https://btcpay.yourdomain.com */
  btcpayUrl: string;
  /** BTCPay Store ID */
  storeId: string;
  /** Greenfield API key — NEVER expose in browser */
  apiKey: string;
  /** Webhook secret for HMAC verification */
  webhookSecret?: string;
  /** How fast to consider a payment settled. Default: HighSpeed (1 confirmation) */
  speedPolicy?: "HighSpeed" | "MediumSpeed" | "LowSpeed" | "LowMediumSpeed";
}

export interface CreateInvoiceRequest {
  /** Amount in fiat (USD by default) */
  amount: number;
  /** Fiat currency code. Default: USD */
  currency?: string;
  /** Your internal order/reference ID */
  orderId: string;
  /** Customer email — used for BTCPay notifications */
  customerEmail?: string;
  /** URL to redirect after payment. Supports {InvoiceId} and {OrderId} placeholders */
  redirectUrl?: string;
  /** URL BTCPay will POST webhook events to */
  notificationUrl?: string;
  /** Any additional metadata to attach to the invoice */
  metadata?: Record<string, unknown>;
}

export interface CreateInvoiceResponse {
  invoiceId: string;
  checkoutLink: string;
  status: InvoiceStatus;
  cryptoInfo?: CryptoRow[];
}

export interface CryptoRow {
  cryptoCode: string;
  address: string;
  /** Exact amount due in crypto */
  due: string;
  paymentMethod: string;
  paymentLink?: string;
  paymentType?: string;
}

/** Same fields as {@link CryptoRow}; kept for backwards compatibility. */
export type BtcpayCryptoRow = CryptoRow;

export type InvoiceStatus =
  | "New"
  | "Processing"
  | "Settled"
  | "Expired"
  | "Invalid";

/**
 * Normalized poll body returned by `pollInvoice()` in this package.
 * Your GET route may return this JSON or forward Greenfield invoice JSON (camelCase);
 * `useSovSats` accepts both.
 */
export interface PollInvoiceResponse {
  invoiceId: string;
  status: InvoiceStatus;
  paid: boolean;
  processing: boolean;
  checkoutLink?: string;
  cryptoInfo?: CryptoRow[];
}

export interface WebhookEvent {
  invoiceId: string;
  type: string;
  storeId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface SovSatsCallbacks {
  /** Invoice reached `Processing` — payment seen; use for UX only, not fulfillment. */
  onProcessing?: (invoiceId: string) => void;
  /** Invoice `Settled` — safe for order fulfillment. */
  onSettled?: (invoiceId: string) => void;
  onError?: (error: Error) => void;
}

// ─── BtcNexusCheckout ─────────────────────────────────────────────────────────

export interface BtcCheckoutProps {
  /** BTCPay Greenfield invoice id. */
  invoiceId: string;
  /**
   * Base URL of your server route that returns invoice JSON (no trailing slash).
   * Must respond to `GET {pollEndpoint}/{invoiceId}`.
   */
  pollEndpoint: string;
  /** Shown in the header; omit to use `NEXT_PUBLIC_STORE_NAME` or hostname from `NEXT_PUBLIC_APP_URL` in Next.js, else `"Store"`. */
  storeName?: string;
  /** Fiat total as you want it displayed (e.g. `"$49.99"` or `"49.99 USD"`). */
  usdTotal: string;
  /** On-chain receive address for this payment (e.g. BTC row from `cryptoInfo`). */
  btcAddress: string;
  /** Exact crypto amount due as a string (e.g. eight decimals for BTC). */
  btcAmount: string;
  /** `bitcoin:` URI (or other wallet link) for “Open wallet”. */
  bitcoinUri: string;
  /** Your order / reference id shown in the UI. */
  orderId: string;
  /** Ms between polls after the customer taps “I’ve sent payment”. Default: 5000. */
  pollInterval?: number;
  /** Optional hooks when status changes (same semantics as settlement table in README). */
  callbacks?: SovSatsCallbacks;
  /** If true, shows a dev-only control to simulate confirmation. Never enable in production. */
  dev?: boolean;
  /**
   * `embed` (default): full width of the parent, for embedding in your page.
   * `page`: centered card on a full-viewport dark background (demos / standalone).
   */
  layout?: "embed" | "page";
  /**
   * When true, the component does not start its own poll interval after “I’ve sent payment”;
   * the host should poll `{pollEndpoint}/{invoiceId}` and handle `onProcessing` / `onSettled` there.
   * Pair with {@link externalIsPolling} for the waiting-state UI.
   */
  deferPollingToParent?: boolean;
  /** When `deferPollingToParent` is true, whether the host is currently polling (spinner copy). */
  externalIsPolling?: boolean;
}
