import { useState, useEffect, useRef, useCallback } from "react";
import type { PollInvoiceResponse, SovSatsCallbacks, CryptoRow } from "../core/types";
import { normalizeInvoiceStatus } from "../core/invoice-status";
import { normalizeCryptoFromInvoice } from "../core/normalize";

export type CheckoutStage = "pay" | "waiting" | "done" | "expired" | "error";

export interface UseSovSatsOptions {
  /** BTCPay Greenfield invoice id (same value you pass in the poll URL). */
  invoiceId: string;
  /**
   * Base URL of your GET handler that proxies BTCPay, without trailing slash.
   * The hook requests `{pollEndpoint}/{invoiceId}` (e.g. `/api/btcpay/inv/xyz`).
   */
  pollEndpoint: string;
  /** Interval between polls in ms. Default: 5000 */
  pollInterval?: number;
  callbacks?: SovSatsCallbacks;
  /** When true, skip internal polling; host supplies {@link externalIsPolling} for UI. */
  deferPollingToParent?: boolean;
  /** When deferring, whether the host is actively polling. */
  externalIsPolling?: boolean;
}

export interface UseSovSatsReturn {
  stage: CheckoutStage;
  setStage: (s: CheckoutStage) => void;
  /** True while a poll interval is active (after you call `startPolling`). */
  isPolling: boolean;
  /** Last `cryptoInfo` from the server, if the response included it. */
  cryptoInfo?: CryptoRow[];
  error?: string;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Interprets JSON from GET …/invoices/{id} (Greenfield) or the normalized body
 * returned by this package’s `pollInvoice` (see `PollInvoiceResponse`).
 * All keys are camelCase; Greenfield uses `id` for the invoice id.
 */
function parsePollPayload(raw: Record<string, unknown>, fallbackInvoiceId: string): PollInvoiceResponse {
  const idCandidate = raw.invoiceId ?? raw.id ?? fallbackInvoiceId;
  const invoiceId = String(idCandidate);

  const status = normalizeInvoiceStatus(raw.status);

  const paid =
    typeof raw.paid === "boolean" ? raw.paid : status === "Settled";

  const processing =
    typeof raw.processing === "boolean"
      ? raw.processing
      : status === "Processing";

  let cryptoInfo: CryptoRow[] | undefined;
  if (Array.isArray(raw.cryptoInfo) && raw.cryptoInfo.length > 0) {
    cryptoInfo = raw.cryptoInfo as CryptoRow[];
  } else {
    const pm =
      (Array.isArray(raw.paymentMethods) && raw.paymentMethods) ||
      (Array.isArray(raw.availablePaymentMethods) && raw.availablePaymentMethods) ||
      null;
    if (pm && pm.length > 0) {
      const rows = normalizeCryptoFromInvoice({
        paymentMethods: pm as Record<string, unknown>[],
      });
      if (rows.length > 0) cryptoInfo = rows;
    }
  }

  const checkoutLink =
    raw.checkoutLink != null && String(raw.checkoutLink) !== ""
      ? String(raw.checkoutLink)
      : undefined;

  return {
    invoiceId,
    status,
    paid,
    processing,
    checkoutLink,
    cryptoInfo,
  };
}

export function useSovSats({
  invoiceId,
  pollEndpoint,
  pollInterval = 5000,
  callbacks,
  deferPollingToParent = false,
  externalIsPolling = false,
}: UseSovSatsOptions): UseSovSatsReturn {
  const [stage, setStage] = useState<CheckoutStage>("pay");
  const [isPolling, setIsPolling] = useState(false);
  const [cryptoInfo, setCryptoInfo] = useState<CryptoRow[] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const processingFired = useRef(false);
  const settledFired = useRef(false);

  useEffect(() => {
    processingFired.current = false;
    settledFired.current = false;
  }, [invoiceId]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${pollEndpoint}/${encodeURIComponent(invoiceId)}`);
      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);

      const raw = (await res.json()) as Record<string, unknown>;
      if ("error" in raw && raw.error) {
        throw new Error(String(raw.error));
      }

      const data = parsePollPayload(raw, invoiceId);

      if (data.cryptoInfo && data.cryptoInfo.length > 0) {
        setCryptoInfo(data.cryptoInfo);
      }

      if (data.paid || data.status === "Settled") {
        if (!settledFired.current) {
          settledFired.current = true;
          callbacksRef.current?.onSettled?.(invoiceId);
        }
        setStage("done");
        stopPolling();
        return;
      }

      if (data.status === "Expired") {
        setStage("expired");
        stopPolling();
        return;
      }

      if (data.processing && !processingFired.current) {
        processingFired.current = true;
        callbacksRef.current?.onProcessing?.(invoiceId);
        setStage("waiting");
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Poll error");
      callbacksRef.current?.onError?.(e);
      setError(e.message);
    }
  }, [invoiceId, pollEndpoint, stopPolling]);

  const startPolling = useCallback(() => {
    if (deferPollingToParent) return;
    if (intervalRef.current) return;
    setIsPolling(true);
    void poll();
    intervalRef.current = setInterval(() => void poll(), pollInterval);
  }, [deferPollingToParent, poll, pollInterval]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollingUi = deferPollingToParent ? externalIsPolling : isPolling;

  return {
    stage,
    setStage,
    isPolling: pollingUi,
    cryptoInfo,
    error,
    startPolling,
    stopPolling,
  };
}
