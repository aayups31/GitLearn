import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Application } from "./application.js";
import type { GTMPublishing } from "./gtm-publishing.js";
import type { SocialConnections } from "./social-connections.js";
import { UserError } from "./safety.js";
export type ScheduledPublication = {
  id: string;
  postId: string;
  postHash: string;
  accountId: string;
  provider: string;
  runAt: string;
  expiresAt: string;
  consentedAt: string;
  state:
    | "scheduled"
    | "sending"
    | "accepted"
    | "confirmed"
    | "uncertain"
    | "blocked"
    | "canceled";
  attempts: number;
  checks: number;
  nextCheckAt?: string;
  note?: string;
  updatedAt: string;
};
const key = "gtm:queue:v1";
export class PublicationQueue {
  private timer?: ReturnType<typeof setInterval>;
  private busy = false;
  private stopped = false;
  constructor(
    private app: Application,
    private publishing: GTMPublishing,
    private social: SocialConnections,
    private clock = () => Date.now(),
  ) {
    const rows = this.list();
    for (const row of rows)
      if (row.state === "sending") {
        const post = publishing.rows().find((p) => p.id === row.postId);
        row.state =
          post?.state === "review"
            ? "blocked"
            : post?.state === "confirmed"
              ? "confirmed"
              : post?.state === "accepted"
                ? "accepted"
                : "uncertain";
        row.note =
          "The app restarted during dispatch. Inspect the platform before rescheduling; no automatic repost was attempted.";
      }
    this.app.store.put(key, rows);
  }
  list() {
    return this.app.store.get<ScheduledPublication[]>(key) || [];
  }
  private save(value: ScheduledPublication) {
    this.app.store.put(key, [
      ...this.list().filter((r) => r.id !== value.id),
      value,
    ]);
  }
  schedule(raw: unknown) {
    const input = z
        .object({
          postId: z.string().uuid(),
          approvalHash: z.string().length(64),
          runAt: z.iso.datetime(),
          approveScheduledPublish: z.literal(true),
        })
        .strict()
        .parse(raw),
      now = this.clock(),
      time = Date.parse(input.runAt),
      post = this.publishing.rows().find((p) => p.id === input.postId);
    if (!post || post.hash !== input.approvalHash || post.state !== "review")
      throw new UserError(
        "Prepare and review the exact unsubmitted post before scheduling.",
        409,
      );
    if (time < now + 5000 || time > now + 30 * 86400000)
      throw new UserError(
        "Choose a time at least five seconds ahead and within 30 days.",
      );
    const account = this.social.account(post.provider, true);
    if (account.id !== post.accountId)
      throw new UserError(
        "The connected account changed. Prepare another review.",
        409,
      );
    const rows = this.list(),
      existing = rows.find(
        (r) =>
          r.postId === post.id && !["canceled", "blocked"].includes(r.state),
      );
    if (existing) {
      if (existing.postHash === post.hash && existing.runAt === input.runAt)
        return existing;
      throw new UserError("This post already has an active schedule.", 409);
    }
    if (rows.length >= 200)
      throw new UserError("The local queue history limit has been reached.");
    const day = input.runAt.slice(0, 10),
      scheduled = rows.filter(
        (r) =>
          r.accountId === account.id &&
          !["blocked", "canceled"].includes(r.state),
      );
    if (scheduled.filter((r) => r.runAt.slice(0, 10) === day).length >= 10)
      throw new UserError(
        "This local release limits an account to ten scheduled posts per UTC day.",
      );
    if (scheduled.some((r) => Math.abs(Date.parse(r.runAt) - time) < 60000))
      throw new UserError(
        "Leave at least one minute between posts to this account.",
      );
    const value: ScheduledPublication = {
      id: randomUUID(),
      postId: post.id,
      postHash: post.hash,
      accountId: account.id,
      provider: post.provider,
      runAt: input.runAt,
      expiresAt: new Date(time + 3600000).toISOString(),
      consentedAt: new Date(now).toISOString(),
      state: "scheduled",
      attempts: 0,
      checks: 0,
      updatedAt: new Date(now).toISOString(),
    };
    this.save(value);
    return value;
  }
  cancel(id: string) {
    const row = this.list().find((r) => r.id === id);
    if (!row || row.state !== "scheduled")
      throw new UserError(
        "Only an undispatched scheduled post can be canceled.",
        409,
      );
    row.state = "canceled";
    row.updatedAt = new Date(this.clock()).toISOString();
    row.note = "Canceled before dispatch.";
    this.save(row);
    return row;
  }
  start() {
    if (this.timer) return;
    this.stopped = false;
    this.timer = setInterval(() => {
      void this.tick().catch(() => {});
    }, 15000);
    this.timer.unref();
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const now = this.clock(),
        row = this.list()
          .filter((r) => r.state === "scheduled" && Date.parse(r.runAt) <= now)
          .sort((a, b) => a.runAt.localeCompare(b.runAt))[0];
      if (row) {
        if (now > Date.parse(row.expiresAt)) {
          row.state = "blocked";
          row.note =
            "The scheduled window expired while the app was unavailable. Review and reschedule explicitly.";
          this.save(row);
          return;
        }
        const post = this.publishing.rows().find((p) => p.id === row.postId);
        if (!post || post.hash !== row.postHash || post.state !== "review") {
          row.state =
            post?.state === "confirmed"
              ? "confirmed"
              : post?.state === "accepted"
                ? "accepted"
                : "blocked";
          row.note =
            "The prepared post changed or was already submitted. No duplicate dispatch.";
          this.save(row);
          return;
        }
        try {
          const account = this.social.account(post.provider, true);
          if (account.id !== row.accountId)
            throw new UserError("The connected account changed.");
        } catch (error) {
          row.state = "blocked";
          row.note =
            error instanceof UserError
              ? error.message
              : "Reconnect the approved account before rescheduling.";
          this.save(row);
          return;
        }
        row.state = "sending";
        row.attempts = 1;
        row.updatedAt = new Date(now).toISOString();
        this.save(row);
        try {
          const result = await this.publishing.publish(
            row.postId,
            row.postHash,
          );
          row.state =
            result.state === "confirmed"
              ? "confirmed"
              : result.state === "accepted"
                ? "accepted"
                : result.state === "review"
                  ? "blocked"
                  : "uncertain";
          row.note = result.error;
          row.nextCheckAt = new Date(now + 60000).toISOString();
        } catch (error) {
          const latest = this.publishing
            .rows()
            .find((p) => p.id === row.postId);
          row.state = latest?.state === "review" ? "blocked" : "uncertain";
          row.note =
            error instanceof UserError
              ? error.message
              : "Dispatch outcome needs manual reconciliation.";
        }
        row.updatedAt = new Date(this.clock()).toISOString();
        this.save(row);
        return;
      }
      const accepted = this.list().find(
        (r) =>
          r.state === "accepted" &&
          r.provider !== "linkedin" &&
          r.checks < 12 &&
          Date.parse(r.nextCheckAt || r.updatedAt) <= now &&
          now <= Date.parse(r.expiresAt),
      );
      if (accepted) {
        accepted.checks++;
        accepted.nextCheckAt = new Date(now + 300000).toISOString();
        this.save(accepted);
        const result = await this.publishing.confirm(accepted.postId);
        accepted.state =
          result.state === "confirmed"
            ? "confirmed"
            : result.state === "uncertain"
              ? "uncertain"
              : "accepted";
        accepted.note = result.error;
        accepted.updatedAt = new Date(this.clock()).toISOString();
        this.save(accepted);
      }
    } finally {
      this.busy = false;
    }
  }
  routes() {
    const router = Router();
    router.get("/", (_req, res) =>
      res.json({
        jobs: this.list(),
        worker: "local_app_must_be_running",
        limits: { postsPerAccountPerUTCDay: 10, maxConfirmationChecks: 12 },
      }),
    );
    router.post("/schedule", (req, res) => res.json(this.schedule(req.body)));
    router.post("/:id/cancel", (req, res) => {
      z.object({}).strict().parse(req.body);
      res.json(this.cancel(req.params.id));
    });
    return router;
  }
}
