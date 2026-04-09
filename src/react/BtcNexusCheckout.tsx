"use client";

import { useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSovSats } from "./useSovSats";
import type { BtcCheckoutProps } from "../core/types";

function defaultStoreLabel(): string {
  if (typeof process === "undefined" || !process.env) return "Store";
  const explicit = process.env.NEXT_PUBLIC_STORE_NAME?.trim();
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (base) {
    try {
      const host = new URL(base).hostname.replace(/^www\./, "");
      if (host) return host;
    } catch {
      // ignore
    }
  }
  return "Store";
}

export default function BtcNexusCheckout({
  invoiceId,
  pollEndpoint,
  storeName,
  usdTotal,
  btcAddress,
  btcAmount,
  bitcoinUri,
  orderId,
  pollInterval = 5000,
  callbacks,
  dev = false,
  layout = "embed",
  deferPollingToParent = false,
  externalIsPolling = false,
}: BtcCheckoutProps) {
  const fiatLabel = usdTotal.trim();
  const label = storeName?.trim() || defaultStoreLabel();

  const [copied, setCopied] = useState(false);
  const [amtCopied, setAmtCopied] = useState(false);
  const [pulseAddr, setPulseAddr] = useState(false);

  const { stage, setStage, startPolling, isPolling } = useSovSats({
    invoiceId,
    pollEndpoint,
    pollInterval,
    callbacks,
    deferPollingToParent,
    externalIsPolling,
  });

  const copyAddress = () => {
    void navigator.clipboard.writeText(btcAddress);
    setCopied(true);
    setPulseAddr(true);
    setTimeout(() => setCopied(false), 3000);
    setTimeout(() => setPulseAddr(false), 400);
  };

  const copyAmount = () => {
    void navigator.clipboard.writeText(btcAmount);
    setAmtCopied(true);
    setTimeout(() => setAmtCopied(false), 2000);
  };

  const openWallet = () => {
    window.location.href = bitcoinUri;
  };

  const handleSent = () => {
    setStage("waiting");
    startPolling();
  };

  const shortAddress = `${btcAddress.slice(0, 10)}...${btcAddress.slice(-6)}`;

  const waitingSub = isPolling
    ? "We'll send you to the thank you page as soon as it's detected."
    : "Starting payment watch…";

  const rootStyle: CSSProperties =
    layout === "page"
      ? {
          minHeight: "100vh",
          background: "#080808",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }
      : {
          width: "100%",
          fontFamily: "system-ui, -apple-system, sans-serif",
        };

  return (
    <div style={rootStyle}>
      <AnimatePresence mode="wait">
        {stage === "pay" && (
          <motion.div key="pay" {...fade} style={s.card}>
            <div style={s.header}>
              <div>
                <p style={s.headerLabel}>PAYING TO</p>
                <p style={s.storeName}>{label}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={s.headerLabel}>TOTAL</p>
                <p style={s.headerAmount}>{fiatLabel}</p>
              </div>
            </div>

            <div style={s.body}>
              <div style={s.btcRow}>
                <span style={s.btcIcon}>₿</span>
                <span style={s.btcAmt}>{btcAmount} BTC</span>
                <span style={s.btcNote}>≈ {fiatLabel}</span>
              </div>

              <p style={s.instructions}>
                Open your Bitcoin wallet and send the exact amount to this address:
              </p>

              <motion.button
                type="button"
                style={{
                  ...s.addressBox,
                  background: pulseAddr ? "#1a0e00" : "#111",
                  borderColor: copied ? "#f7931a" : "#222",
                }}
                onClick={copyAddress}
                whileTap={{ scale: 0.985 }}
              >
                <div style={s.addrInner}>
                  <p style={s.addrLabel}>{copied ? "✓  COPIED!" : "PRESS TO COPY ADDRESS"}</p>
                  <p style={s.addrText}>{btcAddress}</p>
                </div>
                <div
                  style={{
                    ...s.copyChip,
                    background: copied ? "#1a0e00" : "#1a1a1a",
                    border: copied ? "1px solid #f7931a" : "1px solid #222",
                  }}
                >
                  {copied ? (
                    <span style={{ color: "#f7931a", fontSize: 13 }}>✓</span>
                  ) : (
                    <CopyIcon />
                  )}
                </div>
              </motion.button>

              <motion.button
                type="button"
                style={{
                  ...s.amountBox,
                  borderColor: amtCopied ? "#f7931a" : "#1c1c1c",
                }}
                onClick={copyAmount}
                whileTap={{ scale: 0.985 }}
              >
                <span style={s.amountLabel}>{amtCopied ? "✓  AMOUNT COPIED" : "PRESS TO COPY AMOUNT"}</span>
                <span style={s.amountVal}>{btcAmount} BTC</span>
              </motion.button>

              <motion.button type="button" style={s.walletBtn} onClick={openWallet} whileTap={{ scale: 0.97 }}>
                <WalletIcon />
                Open My Crypto Wallet
              </motion.button>

              <p style={s.walletHint}>
                Opens Coinbase, Trust Wallet, or any Bitcoin app on your phone
              </p>

              <div style={s.divider}>
                <div style={s.divLine} />
                <span style={s.divText}>AFTER SENDING</span>
                <div style={s.divLine} />
              </div>

              <motion.button type="button" style={s.sentBtn} onClick={handleSent} whileTap={{ scale: 0.98 }}>
                I&apos;ve Sent Payment →
              </motion.button>

              <p style={s.footNote}>Send exactly {btcAmount} BTC · Do not send from an exchange</p>
            </div>
          </motion.div>
        )}

        {stage === "waiting" && (
          <motion.div key="waiting" {...fade} style={s.card}>
            <div style={s.waitBody}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                style={s.spinner}
              />
              <p style={s.waitTitle}>Watching for your payment</p>
              <p style={s.waitSub}>{waitingSub}</p>

              <div style={s.summaryCard}>
                <SRow label="Order" val={orderId} />
                <SRow label="Address" val={shortAddress} />
                <SRow label="Amount" val={`${btcAmount} BTC`} orange />
              </div>

              <p style={s.waitNote}>Keep this page open. Confirmation happens automatically.</p>

              {dev && (
                <button type="button" style={s.demoBtn} onClick={() => setStage("done")}>
                  [DEV] Simulate Confirmation
                </button>
              )}
            </div>
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div key="done" {...fade} style={s.card}>
            <div style={s.doneBody}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                style={s.checkWrap}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f7931a" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
              <p style={s.doneTitle}>Payment Confirmed</p>
              <p style={s.doneSub}>{orderId}</p>
              <p style={s.doneAmt}>{fiatLabel}</p>
            </div>
          </motion.div>
        )}

        {stage === "expired" && (
          <motion.div key="expired" {...fade} style={s.card}>
            <div style={s.doneBody}>
              <p style={{ ...s.doneTitle, color: "#555" }}>Invoice Expired</p>
              <p style={s.waitSub}>This payment window has closed.</p>
              <button type="button" style={s.demoBtn} onClick={() => setStage("pay")}>
                Start Over
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SRow({ label, val, orange }: { label: string; val: string; orange?: boolean }) {
  return (
    <div style={s.summaryRow}>
      <span style={s.summaryLabel}>{label}</span>
      <span style={{ ...s.summaryVal, color: orange ? "#f7931a" : "#777", fontFamily: "monospace" }}>{val}</span>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const s: Record<string, CSSProperties> = {
  card: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    background: "#0d0d0d",
    border: "1px solid #1c1c1c",
    borderRadius: 18,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    padding: "18px 20px",
    borderBottom: "1px solid #161616",
    background: "#101010",
  },
  headerLabel: { fontSize: 9, color: "#3a3a3a", letterSpacing: 2, margin: "0 0 4px" },
  storeName: { fontSize: 16, color: "#eee", fontWeight: 600, margin: 0 },
  headerAmount: { fontSize: 22, color: "#fff", fontWeight: 700, margin: 0, letterSpacing: -0.5 },
  body: { padding: 20 },
  btcRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    padding: "10px 14px",
    background: "#111",
    borderRadius: 10,
    border: "1px solid #1a1a1a",
  },
  btcIcon: { fontSize: 16, color: "#f7931a" },
  btcAmt: { fontSize: 15, color: "#fff", fontWeight: 600, fontFamily: "monospace" },
  btcNote: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginLeft: "auto" },
  instructions: { fontSize: 13, color: "rgba(255,255,255,0.88)", margin: "0 0 14px", lineHeight: 1.6 },
  addressBox: {
    width: "100%",
    border: "1px solid #222",
    borderRadius: 12,
    padding: "14px",
    marginBottom: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    transition: "border-color 0.25s, background 0.25s",
    boxSizing: "border-box",
    textAlign: "left",
  },
  addrInner: { flex: 1, minWidth: 0 },
  addrLabel: { fontSize: 9, color: "#f7931a", letterSpacing: 2, margin: "0 0 7px", fontFamily: "monospace" },
  addrText: { fontSize: 12, color: "#bbb", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6, margin: 0 },
  copyChip: {
    flexShrink: 0,
    width: 30,
    height: 30,
    borderRadius: 7,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s",
  },
  amountBox: {
    width: "100%",
    background: "#111",
    border: "1px solid #1c1c1c",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 14,
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
    transition: "border-color 0.25s",
  },
  amountLabel: { fontSize: 9, color: "rgba(255,255,255,0.72)", letterSpacing: 2, fontFamily: "monospace" },
  amountVal: { fontSize: 14, color: "#f7931a", fontFamily: "monospace", fontWeight: 600 },
  walletBtn: {
    width: "100%",
    background: "#f7931a",
    border: "none",
    borderRadius: 12,
    padding: "15px",
    fontSize: 15,
    fontWeight: 700,
    color: "#000",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 8,
    boxSizing: "border-box",
  },
  walletHint: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", margin: "0 0 18px", lineHeight: 1.5 },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "0 0 14px" },
  divLine: { flex: 1, height: 1, background: "rgba(255,255,255,0.18)" },
  divText: { fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: 2, whiteSpace: "nowrap" },
  sentBtn: {
    width: "100%",
    background: "#22c55e",
    border: "1px solid #16a34a",
    borderRadius: 12,
    padding: "14px",
    fontSize: 14,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    marginBottom: 14,
    boxSizing: "border-box",
  },
  footNote: { fontSize: 11, color: "rgba(255,255,255,0.62)", textAlign: "center", lineHeight: 1.6 },
  waitBody: { display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 20px 28px" },
  spinner: {
    width: 36,
    height: 36,
    border: "2px solid #1a1a1a",
    borderTop: "2px solid #f7931a",
    borderRadius: "50%",
    marginBottom: 16,
  },
  waitTitle: { fontSize: 17, color: "#fff", fontWeight: 600, margin: "0 0 6px" },
  waitSub: { fontSize: 13, color: "#555", margin: "0 0 24px", textAlign: "center", lineHeight: 1.5 },
  summaryCard: {
    width: "100%",
    background: "#111",
    border: "1px solid #1c1c1c",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "11px 16px",
    borderBottom: "1px solid #161616",
  },
  summaryLabel: { fontSize: 11, color: "#3a3a3a" },
  summaryVal: { fontSize: 12 },
  waitNote: { fontSize: 11, color: "#2e2e2e", textAlign: "center", marginBottom: 20 },
  demoBtn: {
    background: "transparent",
    border: "1px solid #1c1c1c",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 11,
    color: "#2e2e2e",
    cursor: "pointer",
  },
  doneBody: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px 40px" },
  checkWrap: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "#0d0800",
    border: "1px solid #2a1800",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    boxShadow: "0 0 48px rgba(247,147,26,0.1)",
  },
  doneTitle: { fontSize: 22, color: "#fff", fontWeight: 700, margin: "0 0 8px" },
  doneSub: { fontSize: 12, color: "#3a3a3a", fontFamily: "monospace", margin: "0 0 4px" },
  doneAmt: { fontSize: 28, color: "#f7931a", fontWeight: 700, margin: "8px 0 28px", letterSpacing: -1 },
};
