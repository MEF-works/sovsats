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

export type InvoiceStatus =
  | "New"
  | "Processing"
  | "Settled"
  | "Expired"
  | "Invalid";

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
  /** Fires when payment is detected (Processing state) — safe for UX redirect */
  onProcessing?: (invoiceId: string) => void;
  /** Fires when payment is fully settled — safe for order fulfillment */
  onSettled?: (invoiceId: string) => void;
  /** Fires on any poll or API error */
  onError?: (error: Error) => void;
}

// ─── React Component Props ───────────────────────────────────────────────────

export interface BtcCheckoutProps {
  /** Invoice ID from your create-invoice endpoint */
  invoiceId: string;
  /** Your proxy poll endpoint, e.g. /api/payments/btcpay */
  pollEndpoint: string;
  /** Store/merchant display name */
  storeName?: string;
  /** Display total in fiat */
  usdTotal: string;
  /** BTC address from invoice */
  btcAddress: string;
  /** Exact BTC amount due */
  btcAmount: string;
  /** bitcoin: URI for deep linking to wallet apps */
  bitcoinUri: string;
  /** Order ID for display */
  orderId: string;
  /** Poll interval in ms. Default: 5000 */
  pollInterval?: number;
  callbacks?: SovSatsCallbacks;
  /** Show demo simulate button (dev only) */
  dev?: boolean;
}
