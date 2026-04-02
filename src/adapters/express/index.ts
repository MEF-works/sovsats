import { Router } from "express";
import type { Request, Response } from "express";
import { createInvoice, pollInvoice, handleWebhook } from "../../core";
import type { SovSatsConfig, CreateInvoiceRequest } from "../../core";

// ─── Express Adapters ─────────────────────────────────────────────────────────
// app.use("/api/payments/btcpay", makeBtcpayRouter(config))

export function makeBtcpayRouter(config: SovSatsConfig) {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    try {
      const body = req.body as CreateInvoiceRequest;
      if (!body.amount || !body.orderId) {
        return res.status(400).json({ error: "amount and orderId required" });
      }
      const result = await createInvoice(config, body);
      return res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).json({ error: msg });
    }
  });

  router.get("/:invoiceId", async (req: Request, res: Response) => {
    try {
      const result = await pollInvoice(config, req.params.invoiceId);
      return res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).json({ error: msg });
    }
  });

  return router;
}

export function makeWebhookRouter(
  config: SovSatsConfig,
  options: {
    onProcessing?: (invoiceId: string) => Promise<void>;
    onSettled?: (invoiceId: string) => Promise<void>;
  }
) {
  const router = Router();

  router.post("/", async (req: Request, res: Response) => {
    if (!config.webhookSecret) {
      return res.status(500).json({ error: "No webhook secret configured" });
    }

    const rawBody = req.body as string;
    const signature = (req.headers["btcpay-sig"] as string) || "";

    const result = await handleWebhook(rawBody, signature, {
      secret: config.webhookSecret,
      onProcessing: options.onProcessing
        ? (event) => options.onProcessing!(event.invoiceId)
        : undefined,
      onSettled: options.onSettled ? (event) => options.onSettled!(event.invoiceId) : undefined,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.reason });
    }

    return res.json({ received: true });
  });

  return router;
}
