import { Router } from "express";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Application } from "./application.js";
import type { ExpansionState } from "../expansion-contract.js";
import {
  SocialConnections,
  providers,
  type SocialProvider,
} from "./social-connections.js";
import { CreatorProduction } from "./creator-production.js";
import { UserError } from "./safety.js";
import { recordProviderObservation } from "./gtm-analytics.js";
const prepared = z
  .object({
    campaignId: z.string().uuid(),
    expectedRevision: z.number().int(),
    provider: z.enum(providers),
    mediaJobId: z.string().uuid().optional(),
    publicMediaUrl: z.string().url().max(2000).optional(),
    privacy: z.enum(["private", "unlisted", "public"]).default("unlisted"),
  })
  .strict();
export type PublishReview = {
  id: string;
  provider: SocialProvider;
  campaignId: string;
  revision: number;
  accountId: string;
  accountName: string;
  text: string;
  title: string;
  mediaJobId?: string;
  mediaHash?: string;
  publicMediaUrl?: string;
  privacy: "private" | "unlisted" | "public";
  hash: string;
  state:
    "review" | "publishing" | "accepted" | "confirmed" | "failed" | "uncertain";
  createdAt: string;
  updatedAt: string;
  postId?: string;
  url?: string;
  error?: string;
  metrics?: {
    observedAt: string;
    source: "platform";
    views?: number;
    likes?: number;
    comments?: number;
  };
};
const key = "gtm:publication:v1",
  now = () => new Date().toISOString(),
  hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Conservative v3 weighting for copy; the known appended HTTPS link uses t.co's
// fixed 23-character allowance. Complex emoji sequences may be overcounted.
// https://github.com/twitter/twitter-text/blob/master/config/v3.json
export function xPostLength(copy: string) {
  return Array.from((copy + "\n\n").normalize("NFC")).reduce((n, c) => {
    const p = c.codePointAt(0)!;
    return (
      n +
      (/\p{Extended_Pictographic}/u.test(c)
        ? 2
        : p <= 4351 ||
            (p >= 8192 && p <= 8205) ||
            (p >= 8208 && p <= 8223) ||
            (p >= 8242 && p <= 8247)
          ? 1
          : 2)
    );
  }, 23);
}
export class GTMPublishing {
  private active = new Set<string>();
  constructor(
    private app: Application,
    private expansion: () => ExpansionState,
    private social: SocialConnections,
    private media: CreatorProduction,
    private send: typeof fetch = fetch,
  ) {
    const rows = this.rows();
    for (const row of rows)
      if (row.state === "publishing") {
        row.state = "uncertain";
        row.error =
          "The app restarted during a write. Reconcile with the platform before retrying.";
      }
    this.app.store.put(key, rows);
  }
  rows() {
    return this.app.store.get<PublishReview[]>(key) || [];
  }
  private save(row: PublishReview) {
    this.app.store.put(key, [
      ...this.rows().filter((r) => r.id !== row.id),
      row,
    ]);
    recordProviderObservation(this.app, row);
  }
  prepare(raw: unknown) {
    const input = prepared.parse(raw),
      c = this.expansion().campaigns.find((c) => c.id === input.campaignId),
      account = this.social.account(input.provider, true);
    if (!c || c.revision !== input.expectedRevision)
      throw new UserError(
        "Reload the current campaign revision before preparing a post.",
        409,
      );
    if (this.rows().length >= 100)
      throw new UserError(
        "The local publication history limit has been reached.",
      );
    const text = c.creativeSnapshot.copy + "\n\n" + c.trackedUrl;
    if (input.provider === "x" && xPostLength(c.creativeSnapshot.copy) > 280)
      throw new UserError(
        "Edit an X-specific copy variant to fit 280 weighted characters including its link. Complex emoji are counted conservatively.",
      );
    if (input.provider === "linkedin" && text.length > 3000)
      throw new UserError("LinkedIn copy must fit 3000 characters.");
    if (input.provider === "instagram" && text.length > 2200)
      throw new UserError("Instagram copy must fit 2200 characters.");
    let mediaHash: string | undefined;
    if (["youtube", "instagram"].includes(input.provider)) {
      if (!input.mediaJobId)
        throw new UserError("This channel requires an approved video export.");
      const { job } = this.media.approvedExport(input.mediaJobId);
      if (job.creativeHash !== c.creativeHash)
        throw new UserError(
          "This video belongs to a different approved creative version.",
        );
      mediaHash = job.output!.hash;
      if (input.provider === "instagram") {
        if (!input.publicMediaUrl)
          throw new UserError(
            "Instagram requires a publicly hosted copy of this approved export.",
          );
        const url = new URL(input.publicMediaUrl),
          allowed = (process.env.OUTCLASS_MEDIA_PUBLIC_HOSTS || "")
            .split(",")
            .filter(Boolean);
        if (
          url.protocol !== "https:" ||
          url.username ||
          url.password ||
          !allowed.includes(url.hostname)
        )
          throw new UserError(
            "Configure your owned public media host and use its HTTPS export URL before Instagram publishing.",
          );
      }
    }
    const payload = {
      ...input,
      revision: c.revision,
      accountId: account.id,
      accountName: account.name,
      text,
      title: c.title,
      mediaHash,
    };
    const existing = this.rows().find((r) => r.hash === hash(payload));
    if (existing) return existing;
    const review: PublishReview = {
      ...payload,
      id: randomUUID(),
      hash: hash(payload),
      state: "review",
      createdAt: now(),
      updatedAt: now(),
    };
    this.save(review);
    return review;
  }
  private async request(url: string, token: string, options: RequestInit = {}) {
    const response = await this.send(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new UserError(
        `The platform rejected the request (HTTP ${response.status}). Check scopes, app approval and media requirements.`,
        response.status === 429 ? 429 : 403,
      );
    return response;
  }
  async publish(id: string, approvalHash: string) {
    const row = this.rows().find((r) => r.id === id);
    if (!row || row.hash !== approvalHash)
      throw new UserError("Review and approve the exact posting payload.", 409);
    if (row.state !== "review") return row;
    const session = this.social.account(row.provider, true);
    if (session.id !== row.accountId)
      throw new UserError(
        "The connected account changed. Prepare a new review.",
        409,
      );
    if (this.active.has(id)) return row;
    this.active.add(id);
    row.state = "publishing";
    row.updatedAt = now();
    this.save(row);
    let writeStarted = false;
    try {
      if (row.provider === "youtube") {
        const { job, file } = this.media.approvedExport(row.mediaJobId!);
        const bytes = await readFile(file);
        if (
          job.output!.hash !== row.mediaHash ||
          createHash("sha256").update(bytes).digest("hex") !== row.mediaHash
        )
          throw new UserError(
            "The approved video changed. Render and review it again.",
          );
        writeStarted = true;
        const begin = await this.request(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
          session.token,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Upload-Content-Type": "video/mp4",
              "X-Upload-Content-Length": String(bytes.length),
            },
            body: JSON.stringify({
              snippet: {
                title: row.title.slice(0, 100),
                description: row.text,
              },
              status: { privacyStatus: row.privacy },
            }),
          },
        );
        const location = begin.headers.get("location");
        if (
          !location ||
          new URL(location).hostname !== "www.googleapis.com" ||
          new URL(location).protocol !== "https:"
        )
          throw new UserError(
            "YouTube did not return a trusted upload session.",
          );
        const complete = await this.request(location, session.token, {
          method: "PUT",
          headers: { "Content-Type": "video/mp4" },
          body: new Blob([new Uint8Array(bytes)]),
        });
        const result = await complete.json();
        if (!result.id)
          throw new UserError("YouTube did not return a video ID.");
        row.postId = String(result.id);
        row.url = `https://www.youtube.com/watch?v=${encodeURIComponent(row.postId)}`;
      } else if (row.provider === "linkedin") {
        writeStarted = true;
        const response = await this.request(
          "https://api.linkedin.com/rest/posts",
          session.token,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Linkedin-Version":
                process.env.OUTCLASS_LINKEDIN_VERSION || "202605",
              "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
              author: `urn:li:person:${session.id}`,
              commentary: row.text,
              visibility: "PUBLIC",
              distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: [],
              },
              lifecycleState: "PUBLISHED",
              isReshareDisabledByAuthor: false,
            }),
          },
        );
        const post = response.headers.get("x-restli-id");
        if (!post)
          throw new UserError(
            "LinkedIn accepted the request but omitted a post identifier.",
          );
        row.postId = post;
        row.url = `https://www.linkedin.com/feed/update/${encodeURIComponent(post)}/`;
      } else if (row.provider === "x") {
        writeStarted = true;
        const response = await this.request(
            "https://api.x.com/2/tweets",
            session.token,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: row.text }),
            },
          ),
          result = await response.json();
        if (!result.data?.id)
          throw new UserError("X did not return a post ID.");
        row.postId = String(result.data.id);
        row.url = `https://x.com/i/web/status/${encodeURIComponent(row.postId)}`;
      } else {
        const { job } = this.media.approvedExport(row.mediaJobId!);
        if (job.output!.hash !== row.mediaHash)
          throw new UserError("The export hash changed.");
        const remote = await this.send(row.publicMediaUrl!, {
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        });
        if (!remote.ok || !remote.body)
          throw new UserError("The public video URL is not downloadable.");
        const digest = createHash("sha256"),
          reader = remote.body.getReader();
        let bytes = 0;
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.length;
          if (bytes > job.output!.bytes) {
            await reader.cancel();
            throw new UserError(
              "The public asset differs from the approved video.",
            );
          }
          digest.update(part.value);
        }
        if (digest.digest("hex") !== row.mediaHash)
          throw new UserError(
            "The publicly hosted video does not match the approved export.",
          );
        writeStarted = true;
        const base = `https://graph.instagram.com/v25.0/${encodeURIComponent(session.id)}`;
        const create = await this.request(base + "/media", session.token, {
            method: "POST",
            body: new URLSearchParams({
              media_type: "REELS",
              video_url: row.publicMediaUrl!,
              caption: row.text,
            }),
          }),
          container = await create.json();
        if (!container.id)
          throw new UserError("Instagram did not return a media container.");
        // Container processing can outlive an HTTP call. Persist the ID and let the user confirm it later.
        row.postId = `container:${container.id}`;
      }
      row.state = "accepted";
      row.error = undefined;
    } catch (error) {
      row.state = writeStarted ? "uncertain" : "failed";
      row.error =
        error instanceof UserError
          ? error.message
          : "The channel request failed. Reconcile with the platform before retrying.";
    } finally {
      this.active.delete(id);
      row.updatedAt = now();
      this.save(row);
    }
    return row;
  }
  async confirm(id: string) {
    const row = this.rows().find((r) => r.id === id);
    if (!row) throw new UserError("Publication not found.", 404);
    if (this.active.has(id)) return row;
    if (row.state === "uncertain" && row.postId?.startsWith("container:"))
      throw new UserError(
        "Reconcile this uncertain Instagram publication in the platform before another write.",
        409,
      );
    this.active.add(id);
    try {
      return await this.performConfirm(id);
    } catch (error) {
      const latest = this.rows().find((r) => r.id === id)!;
      if (latest.state === "publishing") latest.state = "uncertain";
      latest.error =
        error instanceof UserError
          ? error.message
          : "The confirmation request failed. Check the platform before retrying.";
      latest.updatedAt = now();
      this.save(latest);
      return latest;
    } finally {
      this.active.delete(id);
    }
  }
  private async performConfirm(id: string) {
    const row = this.rows().find((r) => r.id === id);
    if (!row?.postId)
      throw new UserError(
        "No platform ID is available. Check the account manually before retrying.",
      );
    const session = this.social.account(row.provider);
    if (session.id !== row.accountId)
      throw new UserError("Reconnect the original account.");
    if (row.provider === "youtube") {
      const result = await (
          await this.request(
            `https://www.googleapis.com/youtube/v3/videos?part=status,statistics&id=${encodeURIComponent(row.postId)}`,
            session.token,
          )
        ).json(),
        video = result.items?.[0];
      if (
        video?.status?.uploadStatus === "processed" &&
        video.status.privacyStatus === row.privacy
      ) {
        row.state = "confirmed";
        row.metrics = {
          source: "platform",
          observedAt: now(),
          views:
            video.statistics?.viewCount === undefined
              ? undefined
              : Number(video.statistics.viewCount),
          likes:
            video.statistics?.likeCount === undefined
              ? undefined
              : Number(video.statistics.likeCount),
          comments:
            video.statistics?.commentCount === undefined
              ? undefined
              : Number(video.statistics.commentCount),
        };
      } else
        row.error =
          "YouTube processing or the requested visibility is not yet confirmed. API projects may be restricted to private uploads.";
    } else if (row.provider === "x") {
      const result = await (
        await this.request(
          `https://api.x.com/2/tweets/${encodeURIComponent(row.postId)}?tweet.fields=public_metrics`,
          session.token,
        )
      ).json();
      if (result.data?.id === row.postId) {
        row.state = "confirmed";
        const m = result.data.public_metrics;
        if (m)
          row.metrics = {
            source: "platform",
            observedAt: now(),
            views: m.impression_count,
            likes: m.like_count,
            comments: m.reply_count,
          };
      }
    } else if (row.provider === "instagram") {
      if (row.postId.startsWith("container:")) {
        const containerId = row.postId.slice(10),
          status = await (
            await this.request(
              `https://graph.instagram.com/v25.0/${encodeURIComponent(containerId)}?fields=status_code`,
              session.token,
            )
          ).json();
        if (status.status_code !== "FINISHED") {
          row.error =
            "Instagram is still processing this container, or has rejected it.";
          this.save(row);
          return row;
        }
        row.state = "publishing";
        row.updatedAt = now();
        this.save(row);
        const result = await (
          await this.request(
            `https://graph.instagram.com/v25.0/${encodeURIComponent(session.id)}/media_publish`,
            session.token,
            {
              method: "POST",
              body: new URLSearchParams({ creation_id: containerId }),
            },
          )
        ).json();
        if (!result.id)
          throw new UserError("Instagram did not confirm publication.");
        row.postId = String(result.id);
        row.state = "accepted";
        this.save(row);
      }
      const result = await (
        await this.request(
          `https://graph.instagram.com/v25.0/${encodeURIComponent(row.postId)}?fields=id,permalink,like_count,comments_count`,
          session.token,
        )
      ).json();
      if (String(result.id) === row.postId) {
        row.state = "confirmed";
        const link = new URL(result.permalink);
        if (
          link.protocol !== "https:" ||
          !(
            link.hostname === "instagram.com" ||
            link.hostname.endsWith(".instagram.com")
          ) ||
          link.username ||
          link.password
        )
          throw new UserError("Instagram returned an untrusted result URL.");
        row.url = link.href;
        row.metrics = {
          source: "platform",
          observedAt: now(),
          likes: result.like_count,
          comments: result.comments_count,
        };
      }
    } else
      row.error =
        "LinkedIn returned a post ID. Public visibility and member analytics require additional API permissions; check its link manually.";
    row.updatedAt = now();
    this.save(row);
    return row;
  }
  routes() {
    const router = Router();
    router.get("/", (_req, res) => res.json(this.rows()));
    router.post("/prepare", (req, res) => res.json(this.prepare(req.body)));
    router.post("/:id/publish", async (req, res) => {
      const input = z
        .object({
          approvalHash: z.string().regex(/^[a-f0-9]{64}$/),
          approvePublicAction: z.literal(true),
        })
        .strict()
        .parse(req.body);
      res.json(await this.publish(req.params.id, input.approvalHash));
    });
    router.post("/:id/confirm", async (req, res) => {
      z.object({ approvePendingPublish: z.literal(true) })
        .strict()
        .parse(req.body);
      res.json(await this.confirm(req.params.id));
    });
    return router;
  }
}
