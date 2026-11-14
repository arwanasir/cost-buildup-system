const express = require("express");
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3001;
const inventoryReceipts = new Map();
const inventoryAdjustments = new Map();
const financeEntries = new Map();

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "erp-mock" });
});

// SRS 7.1: Receive inventory values when a GRN is confirmed.
app.post("/inventory/postings", (req, res) => {
  if (process.env.FAIL_MODE === "true") {
    return res.status(500).json({
      status: "error",
      message: "Simulated ERP inventory posting failure",
    });
  }

  const payload = req.body || {};
  const items = payload.items;
  const grnId = items?.[0]?.grn_id;
  if (!grnId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "At least one item with a GRN number is required",
    });
  }

  let receipt = inventoryReceipts.get(grnId);
  if (!receipt) {
    receipt = {
      status: "posted",
      inventory_transaction_id: `INV-TXN-${Date.now()}`,
      grn_id: grnId,
      items,
    };
    inventoryReceipts.set(grnId, receipt);
  }
  console.log(
    "[ERP MOCK] Received Inventory Posting:",
    JSON.stringify(payload),
  );
  return res.status(201).json(receipt);
});

// Correct inventory valuation only after the related finance adjustment is
// approved. adjustment_id is stable so the mock safely handles request retries.
app.post("/inventory/adjustments", (req, res) => {
  if (process.env.FAIL_MODE === "true") {
    return res.status(500).json({
      status: "error",
      message: "Simulated ERP inventory adjustment failure",
    });
  }

  const { adjustment_id: adjustmentId, grn_id: grnId, items } = req.body || {};
  if (!adjustmentId || !grnId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "adjustment_id, grn_id, and at least one item are required",
    });
  }

  let adjustment = inventoryAdjustments.get(adjustmentId);
  if (!adjustment) {
    adjustment = {
      status: "posted",
      inventory_transaction_id: `INV-ADJ-${Date.now()}`,
      adjustment_id: adjustmentId,
      grn_id: grnId,
      items,
    };
    inventoryAdjustments.set(adjustmentId, adjustment);
  }
  console.log(
    "[ERP MOCK] Received Inventory Adjustment:",
    JSON.stringify(adjustment),
  );
  return res.status(201).json(adjustment);
});

app.get("/inventory/adjustments/:adjustmentId", (req, res) => {
  const adjustment = inventoryAdjustments.get(req.params.adjustmentId);
  if (!adjustment) {
    return res.status(404).json({ message: "Adjustment not found" });
  }
  return res.json(adjustment);
});

// Financial accounting journal entries are idempotent by journal_id, which is
// important when a retry follows a partial external-system failure.
app.post("/finance/journal-entries", (req, res) => {
  if (process.env.FAIL_MODE === "true") {
    return res.status(500).json({
      status: "error",
      message: "Simulated ERP journal entry failure",
    });
  }

  const payload = req.body || {};
  const journalId = payload.journal_id;
  if (!journalId) {
    return res
      .status(400)
      .json({ status: "error", message: "journal_id is required" });
  }

  let entry = financeEntries.get(journalId);
  if (!entry) {
    entry = {
      status: "posted",
      journal_entry_id: `JE-TXN-${Date.now()}`,
      journal_id: journalId,
    };
    financeEntries.set(journalId, entry);
  }
  console.log("[ERP MOCK] Received Journal Entry:", JSON.stringify(payload));
  return res.status(201).json(entry);
});

app.listen(PORT, () => {
  console.log(`ERP Mock service listening on port ${PORT}`);
});
