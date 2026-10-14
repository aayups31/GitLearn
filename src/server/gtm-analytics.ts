import { Router } from "express";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import type { Application } from "./application.js";
import type { ExpansionState } from "../expansion-contract.js";
import { UserError } from "./safety.js";
const count = z.number().int().min(0).max(1000000000).nullable();
const input = z
  .object({
    campaignId: z.string().uuid(),
    source: z.string().trim().min(1).max(100),
    date: z.iso.date(),
    currency: z.enum(["CAD", "USD", "EUR", "GBP"]),
    impressions: count,
    clicks: count,
    spendMinor: count,
    revenueMinor: count,
    refundMinor: count,
    feeMinor: count,
    confirmReport: z.literal(true),
  })
  .strict();
export type ReportSnapshot = z.infer<typeof input> & {
  id: string;
  hash: string;
  recordedAt: string;
  provenance: "manual_report";
};
export function reportMetrics(
  r: Pick<
    ReportSnapshot,
    | "impressions"
    | "clicks"
    | "spendMinor"
    | "revenueMinor"
    | "refundMinor"
    | "feeMinor"
  >,
) {
  const ratio = (a: number | null, b: number | null, m = 1) =>
    a === null || b === null || b === 0 ? null : (a / b) * m;
  return {
    ctr: ratio(r.clicks, r.impressions, 100),
    cpcMinor: ratio(r.spendMinor, r.clicks),
    cpmMinor: ratio(r.spendMinor, r.impressions, 1000),
    grossROAS: ratio(r.revenueMinor, r.spendMinor),
    reportedContributionMinor: [
      r.revenueMinor,
      r.refundMinor,
      r.feeMinor,
      r.spendMinor,
    ].some((n) => n === null)
      ? null
      : r.revenueMinor! - r.refundMinor! - r.feeMinor! - r.spendMinor!,
  };
}
export class GTMAnalytics {
  constructor(
    private app: Application,
    private expansion: () => ExpansionState,
  ) {}
  rows() {
    return this.app.store.get<ReportSnapshot[]>("gtm:reports:v1") || [];
  }
  view(campaignId: string) {
    const rows = this.rows().filter((r) => r.campaignId === campaignId),
      latest = new Map<string, ReportSnapshot>();
    for (const row of rows) latest.set(row.source + ":" + row.date, row);
    return {
      reports: [...latest.values()].map((r) => ({
        ...r,
        metrics: reportMetrics(r),
      })),
      historyCount: rows.length,
      financialTruth: "unverified_manual_reports",
      attribution: "not_connected",
      note: "Calculations use the supplied report only. Reports from multiple channels are not combined into sales or revenue; platform attribution may overlap.",
    };
  }
  record(raw: unknown) {
    const value = input.parse(raw),
      campaign = this.expansion().campaigns.find(
        (c) => c.id === value.campaignId,
      );
    if (!campaign) throw new UserError("Select a saved campaign.");
    if (campaign.currency !== value.currency)
      throw new UserError(
        "Keep the campaign's original currency. Currency conversion is not inferred.",
      );
    const digest = createHash("sha256")
        .update(JSON.stringify(value))
        .digest("hex"),
      rows = this.rows();
    const old = rows.find((r) => r.hash === digest);
    if (old) return old;
    if (rows.length >= 1000)
      throw new UserError("The local report history limit has been reached.");
    const row: ReportSnapshot = {
      ...value,
      id: randomUUID(),
      hash: digest,
      recordedAt: new Date().toISOString(),
      provenance: "manual_report",
    };
    this.app.store.put("gtm:reports:v1", [...rows, row]);
    return row;
  }
  routes() {
    const router = Router();
    router.get("/:id", (req, res) => res.json(this.view(req.params.id)));
    router.post("/record", (req, res) => res.json(this.record(req.body)));
    return router;
  }
}
