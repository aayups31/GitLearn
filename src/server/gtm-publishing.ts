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
import { SocialImages } from "./social-images.js";
import {
  postComposition,
  postPreflight,
  postText,
  weightedLength,
  type PostComposition,
  type PostImage,
} from "../social-post.js";
const prepared = z
  .object({
    campaignId: z.string().uuid(),
    expectedRevision: z.number().int(),
    provider: z.enum(providers),
    mediaJobId: z.string().uuid().optional(),
    publicMediaUrl: z.string().url().max(2000).optional(),
    publicImageUrls: z.array(z.string().url().max(2000)).max(10).default([]),
    composition: postComposition.optional(),
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
  publicImageUrls?: string[];
  composition?: PostComposition;
  images?: PostImage[];
  thumbnail?: PostImage;
  uploadState?: { ids: string[]; phase: "processing" | "ready" };
  thumbnailState?: "pending" | "confirmed" | "failed";
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
  return weightedLength(postText(copy, "https://example.com"));
}
export class GTMPublishing {
  private active = new Set<string>();
  readonly images: SocialImages;
  constructor(
    private app: Application,
    private expansion: () => ExpansionState,
    private social: SocialConnections,
    private media: CreatorProduction,
    private send: typeof fetch = fetch,
  ) {
    this.images = new SocialImages(app);
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
    const composition =
      input.composition ||
      postComposition.parse({ copy: c.creativeSnapshot.copy, title: c.title });
    const images = composition.imageIds.map((id) => this.images.get(id)),
      thumbnail = composition.thumbnailId
        ? this.images.get(composition.thumbnailId)
        : undefined;
    const video = input.mediaJobId
      ? this.media.approvedExport(input.mediaJobId).job
      : undefined;
    const preflight = postPreflight(
      input.provider,
      composition,
      c.trackedUrl,
      images,
      video?.output,
      thumbnail,
    );
    if (preflight.errors.length)
      throw new UserError(preflight.errors.join(" "));
    if (
      input.provider === "x" &&
      (images.length || video) &&
      !account.scopes.includes("media.write")
    )
      throw new UserError(
        "Reconnect X with media.write permission before attaching media.",
        403,
      );
    const text = preflight.text;
    let mediaHash: string | undefined;
    if (input.mediaJobId) {
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
        this.publicUrl(input.publicMediaUrl);
      }
    }
    if (input.provider === "instagram" && images.length) {
      if (input.publicImageUrls.length !== images.length)
        throw new UserError(
          "Supply one owned public image URL per slide, in the reviewed order.",
        );
      input.publicImageUrls.forEach((url) => this.publicUrl(url));
    } else if (input.publicImageUrls.length)
      throw new UserError(
        "Public image URLs are only used for Instagram photo posts.",
      );
    const payload = {
      ...input,
      revision: c.revision,
      accountId: account.id,
      accountName: account.name,
      text,
      composition,
      images,
      thumbnail,
      title: composition.title,
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
  private publicUrl(value: string) {
    const url = new URL(value),
      allowed = (process.env.OUTCLASS_MEDIA_PUBLIC_HOSTS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !allowed.includes(url.hostname)
    )
      throw new UserError(
        "Use an HTTPS asset URL on your configured owned public media host.",
      );
    return url.href;
  }
  draft(raw: unknown) {
    const input = z
        .object({
          campaignId: z.string().uuid(),
          campaignRevision: z.number().int(),
          provider: z.enum(providers),
          expectedRevision: z.number().int().min(0),
          composition: postComposition,
          mediaJobId: z.string().uuid().optional(),
          publicMediaUrl: z.string().max(2000).default(""),
          publicImageUrls: z.array(z.string().max(2000)).max(10).default([]),
          privacy: z
            .enum(["private", "unlisted", "public"])
            .default("unlisted"),
        })
        .strict()
        .parse(raw),
      key = `gtm:composer:${input.campaignId}:${input.provider}`,
      old = this.app.store.get<{ revision: number }>(key),
      campaign = this.expansion().campaigns.find(
        (c) => c.id === input.campaignId,
      );
    if (
      !campaign ||
      campaign.revision !== input.campaignRevision ||
      (old?.revision || 0) !== input.expectedRevision
    )
      throw new UserError(
        "This draft or campaign changed. Reload before saving.",
        409,
      );
    const draft = { ...input, revision: input.expectedRevision + 1 };
    this.app.store.put(key, draft);
    return draft;
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
  private linkedHeaders() {
    return {
      "Content-Type": "application/json",
      "Linkedin-Version": process.env.OUTCLASS_LINKEDIN_VERSION || "202609",
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }
  private uploadUrl(value: string) {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "www.linkedin.com" ||
      url.username ||
      url.password ||
      !url.pathname.startsWith("/dms-uploads/")
    )
      throw new UserError("LinkedIn returned an untrusted upload URL.");
    return url.href;
  }
  private async videoBytes(row: PublishReview) {
    const { job, file } = this.media.approvedExport(row.mediaJobId!);
    const bytes = await readFile(file);
    if (
      job.output!.hash !== row.mediaHash ||
      createHash("sha256").update(bytes).digest("hex") !== row.mediaHash
    )
      throw new UserError(
        "The reviewed video changed. Prepare a new post.",
        409,
      );
    return bytes;
  }
  private async attachments(
    row: PublishReview,
    session: ReturnType<SocialConnections["account"]>,
  ) {
    const headers = this.linkedHeaders();
    if (row.uploadState?.phase === "processing") {
      if (row.provider === "x") {
        const result = await (
          await this.request(
            `https://api.x.com/2/media/upload?command=STATUS&media_id=${encodeURIComponent(row.uploadState.ids[0])}`,
            session.token,
          )
        ).json();
        const state = result.data?.processing_info?.state;
        if (state === "failed")
          throw new UserError(
            "X rejected video processing. Check the platform before preparing another post.",
          );
        if (state !== "succeeded") return false;
      } else {
        const result = await (
          await this.request(
            `https://api.linkedin.com/rest/videos/${encodeURIComponent(row.uploadState.ids[0])}`,
            session.token,
            { headers },
          )
        ).json();
        if (result.status === "PROCESSING_FAILED")
          throw new UserError("LinkedIn rejected video processing.");
        if (result.status !== "AVAILABLE") return false;
      }
      row.uploadState.phase = "ready";
      this.save(row);
    }
    if (row.uploadState?.phase === "ready") return true;
    const ids = row.uploadState?.ids || [];
    if (row.mediaJobId) {
      const bytes = await this.videoBytes(row);
      if (row.provider === "x") {
        const init = await (
          await this.request(
            "https://api.x.com/2/media/upload/initialize",
            session.token,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                media_type: "video/mp4",
                total_bytes: bytes.length,
                media_category: "tweet_video",
              }),
            },
          )
        ).json();
        const id = init.data?.id;
        if (!id) throw new UserError("X did not return a media ID.");
        for (
          let offset = 0, index = 0;
          offset < bytes.length;
          offset += 4 * 1024 * 1024, index++
        ) {
          const form = new FormData();
          form.set("segment_index", String(index));
          form.set(
            "media",
            new Blob(
              [
                new Uint8Array(
                  bytes.subarray(offset, offset + 4 * 1024 * 1024),
                ),
              ],
              { type: "video/mp4" },
            ),
            "clip.mp4",
          );
          await this.request(
            `https://api.x.com/2/media/upload/${encodeURIComponent(id)}/append`,
            session.token,
            { method: "POST", body: form },
          );
        }
        const done = await (
          await this.request(
            `https://api.x.com/2/media/upload/${encodeURIComponent(id)}/finalize`,
            session.token,
            { method: "POST" },
          )
        ).json();
        if (done.data?.processing_info?.state === "failed")
          throw new UserError("X rejected the video upload.");
        row.uploadState = {
          ids: [String(id)],
          phase:
            done.data?.processing_info &&
            done.data.processing_info.state !== "succeeded"
              ? "processing"
              : "ready",
        };
      } else {
        const init = await (
          await this.request(
            "https://api.linkedin.com/rest/videos?action=initializeUpload",
            session.token,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                initializeUploadRequest: {
                  owner: `urn:li:person:${session.id}`,
                  fileSizeBytes: bytes.length,
                  uploadCaptions: false,
                  uploadThumbnail: false,
                },
              }),
            },
          )
        ).json();
        const value = init.value,
          partIds: string[] = [];
        if (
          !value?.video ||
          !Array.isArray(value.uploadInstructions) ||
          !value.uploadInstructions.length
        )
          throw new UserError("LinkedIn did not return upload instructions.");
        let offset = 0;
        for (const part of value.uploadInstructions) {
          if (
            !Number.isInteger(part.firstByte) ||
            !Number.isInteger(part.lastByte) ||
            part.firstByte !== offset ||
            part.lastByte < offset ||
            part.lastByte >= bytes.length
          )
            throw new UserError("LinkedIn returned invalid upload ranges.");
          const response = await this.request(
            this.uploadUrl(part.uploadUrl),
            session.token,
            {
              method: "PUT",
              headers: { "Content-Type": "application/octet-stream" },
              body: new Blob([
                new Uint8Array(
                  bytes.subarray(part.firstByte, part.lastByte + 1),
                ),
              ]),
            },
          );
          const etag = response.headers.get("etag");
          if (!etag)
            throw new UserError(
              "LinkedIn did not acknowledge the uploaded video part.",
            );
          partIds.push(etag);
          offset = part.lastByte + 1;
        }
        if (offset !== bytes.length)
          throw new UserError("LinkedIn did not request the full video.");
        await this.request(
          "https://api.linkedin.com/rest/videos?action=finalizeUpload",
          session.token,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              finalizeUploadRequest: {
                video: value.video,
                uploadToken: value.uploadToken || "",
                uploadedPartIds: partIds,
              },
            }),
          },
        );
        row.uploadState = { ids: [value.video], phase: "processing" };
      }
      this.save(row);
      return row.uploadState.phase === "ready";
    }
    for (let i = ids.length; i < (row.images?.length || 0); i++) {
      const image = row.images![i],
        bytes = await this.images.bytes(image.id, image.hash);
      if (row.provider === "x") {
        const form = new FormData();
        form.set("media_category", "tweet_image");
        form.set(
          "media",
          new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }),
          "image.jpg",
        );
        const result = await (
          await this.request(
            "https://api.x.com/2/media/upload",
            session.token,
            { method: "POST", body: form },
          )
        ).json();
        if (!result.data?.id)
          throw new UserError("X did not return an image ID.");
        ids.push(String(result.data.id));
        const alt = row.composition?.imageAlts[i];
        if (alt)
          await this.request(
            "https://api.x.com/2/media/metadata",
            session.token,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: String(result.data.id),
                metadata: { alt_text: { text: alt } },
              }),
            },
          );
      } else {
        const init = await (
          await this.request(
            "https://api.linkedin.com/rest/images?action=initializeUpload",
            session.token,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                initializeUploadRequest: {
                  owner: `urn:li:person:${session.id}`,
                },
              }),
            },
          )
        ).json();
        if (!init.value?.image)
          throw new UserError("LinkedIn did not return an image URN.");
        await this.request(
          this.uploadUrl(init.value.uploadUrl),
          session.token,
          {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: new Blob([new Uint8Array(bytes)]),
          },
        );
        ids.push(init.value.image);
      }
      row.uploadState = { ids: [...ids], phase: "processing" };
      this.save(row);
    }
    row.uploadState = { ids, phase: "ready" };
    this.save(row);
    return true;
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
      for (const image of row.images || [])
        await this.images.bytes(image.id, image.hash);
      if (row.mediaJobId) await this.videoBytes(row);
      if (row.thumbnail)
        await this.images.bytes(row.thumbnail.id, row.thumbnail.hash);
      if (
        (row.provider === "x" || row.provider === "linkedin") &&
        (row.images?.length || row.mediaJobId)
      ) {
        writeStarted = true;
        if (!(await this.attachments(row, session))) {
          row.state = "accepted";
          row.error =
            "Video uploaded. Waiting for platform processing before creating the post. Check / finish publication to continue.";
          return row;
        }
      }
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
                title: row.title,
                description: row.text,
                tags: row.composition?.tags || [],
              },
              status: {
                privacyStatus: row.privacy,
                selfDeclaredMadeForKids: row.composition?.madeForKids || false,
              },
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
        this.save(row);
        if (row.thumbnail) {
          row.thumbnailState = "pending";
          this.save(row);
          try {
            await this.request(
              `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(row.postId)}&uploadType=media`,
              session.token,
              {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: new Blob([
                  new Uint8Array(
                    await this.images.bytes(
                      row.thumbnail.id,
                      row.thumbnail.hash,
                    ),
                  ),
                ]),
              },
            );
            row.thumbnailState = "confirmed";
          } catch {
            row.thumbnailState = "failed";
          }
        }
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
              ...(row.uploadState?.ids.length
                ? {
                    content:
                      row.uploadState.ids.length > 1
                        ? {
                            multiImage: {
                              images: row.uploadState.ids.map((id, i) => ({
                                id,
                                altText: row.composition?.imageAlts[i] || "",
                              })),
                            },
                          }
                        : {
                            media: {
                              id: row.uploadState.ids[0],
                              title: row.title,
                              ...(row.images?.length
                                ? {
                                    altText:
                                      row.composition?.imageAlts[0] || "",
                                  }
                                : {}),
                            },
                          },
                  }
                : {}),
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
              body: JSON.stringify({
                text: row.text,
                ...(row.uploadState?.ids.length
                  ? { media: { media_ids: row.uploadState.ids } }
                  : {}),
              }),
            },
          ),
          result = await response.json();
        if (!result.data?.id)
          throw new UserError("X did not return a post ID.");
        row.postId = String(result.data.id);
        row.url = `https://x.com/i/web/status/${encodeURIComponent(row.postId)}`;
      } else {
        const assets = row.images?.length
          ? row.images.map((image, i) => ({
              url: row.publicImageUrls![i],
              hash: image.hash,
              bytes: image.bytes,
            }))
          : [
              {
                url: row.publicMediaUrl!,
                hash: row.mediaHash!,
                bytes: this.media.approvedExport(row.mediaJobId!).job.output!
                  .bytes,
              },
            ];
        for (const asset of assets) {
          this.publicUrl(asset.url);
          const remote = await this.send(asset.url, {
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
            if (bytes > asset.bytes) {
              await reader.cancel();
              throw new UserError(
                "The public asset differs from the approved video.",
              );
            }
            digest.update(part.value);
          }
          if (bytes !== asset.bytes || digest.digest("hex") !== asset.hash)
            throw new UserError(
              "The publicly hosted video does not match the approved export.",
            );
        }
        writeStarted = true;
        const base = `https://graph.instagram.com/v25.0/${encodeURIComponent(session.id)}`;
        const children: string[] = [];
        if ((row.images?.length || 0) > 1) {
          for (let i = 0; i < row.images!.length; i++) {
            const child = await (
              await this.request(base + "/media", session.token, {
                method: "POST",
                body: new URLSearchParams({
                  image_url: row.publicImageUrls![i],
                  is_carousel_item: "true",
                  alt_text: row.composition?.imageAlts[i] || "",
                }),
              })
            ).json();
            if (!child.id)
              throw new UserError(
                "Instagram did not acknowledge a carousel slide.",
              );
            children.push(String(child.id));
          }
        }
        const create = await this.request(base + "/media", session.token, {
            method: "POST",
            body: new URLSearchParams({
              ...(children.length
                ? { media_type: "CAROUSEL", children: children.join(",") }
                : row.images?.length
                  ? {
                      image_url: row.publicImageUrls![0],
                      alt_text: row.composition?.imageAlts[0] || "",
                    }
                  : { media_type: "REELS", video_url: row.publicMediaUrl! }),
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
      row.error =
        row.thumbnailState === "failed"
          ? "YouTube accepted the video, but rejected its custom thumbnail. Open the video in YouTube Studio to set the reviewed thumbnail; do not re-upload the video."
          : undefined;
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
    if (
      row.state === "accepted" &&
      !row.postId &&
      row.uploadState?.phase === "processing"
    ) {
      row.state = "review";
      this.save(row);
      return this.publish(row.id, row.hash);
    }
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
    router.get("/draft/:campaignId/:provider", (req, res) => {
      const id = z.string().uuid().parse(req.params.campaignId),
        provider = z.enum(providers).parse(req.params.provider);
      res.json(this.app.store.get(`gtm:composer:${id}:${provider}`) || null);
    });
    router.post("/draft", (req, res) => res.json(this.draft(req.body)));
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
