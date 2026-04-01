import { useState, useEffect, useRef, useCallback } from "react";
import type { PollInvoiceResponse, SovSatsCallbacks, CryptoRow } from "../core/types";

export type CheckoutStage = "pay" | "waiting" | "done" | "expired" | "error";

export interface UseSovSatsOptions {
  invoiceId: string;
  /** Your server-side poll endpoint, e.g. /api/payments/btcpay */
  pollEndpoint: string;
  /** Poll interval in ms. Default: 5000 */
  pollInterval?: number;
  callbacks?: SovSatsCallbacks;
}

export interface UseSovSatsReturn {
  stage: CheckoutStage;
  setStage: (s: CheckoutStage) => void;
  isPolling: boolean;
  cryptoInfo?: CryptoRow[];
  error?: string;
  startPolling: () => void;
  stopPolling: () => void;
}

export function useSovSats({
  invoiceId,
  pollEndpoint,
  pollInterval = 5000,
  callbacks,
}: UseSovSatsOptions): UseSovSatsReturn {
  const [stage, setStage] = useState<CheckoutStage>("pay");
  const [isPolling, setIsPolling] = useState(false);
  const [cryptoInfo, setCryptoInfo] = useState<CryptoRow[] | undefined>();
  const [error, setError] = useState<string | undefined>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${pollEndpoint}/${invoiceId}`);
      if (!res.ok) throw new Error(`Poll failed: ${res.status}`);

      const data: PollInvoiceResponse = await res.json();

      // Merge crypto info if it appears late
      if (data.cryptoInfo && data.cryptoInfo.length > 0) {
        setCryptoInfo(data.cryptoInfo);
      }

      if (data.processing) {
        // Safe for UX redirect — payment detected, not yet confirmed
        callbacksRef.current?.onProcessing?.(invoiceId);
        setStage("waiting");
      }

      if (data.paid) {
        // Fully settled — safe for order fulfillment
        callbacksRef.current?.onSettled?.(invoiceId);
        setStage("done");
        stopPolling();
      }

      if (data.status === "Expired") {
        setStage("expired");
        stopPolling();
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Poll error");
      callbacksRef.current?.onError?.(e);
      setError(e.message);
    }
  }, [invoiceId, pollEndpoint, stopPolling]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // already polling
    setIsPolling(true);
    poll(); // immediate first poll
    intervalRef.current = setInterval(poll, pollInterval);
  }, [poll, pollInterval]);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  return {
    stage,
    setStage,
    isPolling,
    cryptoInfo,
    error,
    startPolling,
    stopPolling,
  };
}
