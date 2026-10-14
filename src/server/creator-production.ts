import express, { Router } from "express";
import { z } from "zod";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import type { Application } from "./application.js";
import type { ExpansionState } from "../expansion-contract.js";
import { productionProcess, stopProduction } from "./production-process.js";
import { UserError } from "./safety.js";
const timeline = z
  .object({
    creativeId: z.string().uuid(),
    expectedRevision: z.number().int(),
    assetId: z.string().uuid(),
    format: z.enum(["landscape", "portrait"]),
    scenes: z
      .array(
        z
          .object({
            start: z.number().finite().min(0),
            end: z.number().finite().positive(),
            caption: z.string().max(150),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    approveRender: z.literal(true),
  })
  .strict();
export type VideoTimeline = z.infer<typeof timeline>;
export type MediaAsset = {
  id: string;
  name: string;
  mime: string;
  hash: string;
  bytes: number;
  duration: number;
  width: number;
  height: number;
  audio: boolean;
  rightsConfirmed: true;
  importedAt: string;
};
export type RenderJob = {
  id: string;
  timeline: VideoTimeline;
  creativeHash: string;
  sourceHash: string;
  state: "queued" | "processing" | "ready" | "failed" | "canceled";
  stage: string;
  createdAt: string;
  finishedAt?: string;
  error?: string;
  output?: {
    duration: number;
    width: number;
    height: number;
    bytes: number;
    hash: string;
    audio: boolean;
  };
  approval?: { hash: string; approvedAt: string };
};
type MediaState = { assets: MediaAsset[]; jobs: RenderJob[] };
const key = "creator:production:v1",
  now = () => new Date().toISOString();
const digest = (v: Buffer | string) =>
  createHash("sha256").update(v).digest("hex");
const srtTime = (t: number) => {
  const ms = Math.round(t * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
};
export class CreatorProduction {
  readonly root: string;
  private active?: { id: string; child?: ChildProcess };
  private stopped = false;
  private tokens = new Map<
    string,
    { file: string; mime: string; expires: number }
  >();
  constructor(
    private app: Application,
    private expansion: () => ExpansionState,
  ) {
    this.root = path.join(app.store.directory, "creator-production");
    const state = this.state();
    for (const job of state.jobs)
      if (["processing", "queued"].includes(job.state)) {
        job.state = "failed";
        job.stage = "Interrupted";
        job.error = "OutClass restarted. Review the timeline and render again.";
        job.finishedAt = now();
      }
    this.save(state);
  }
  state(): MediaState {
    return this.app.store.get<MediaState>(key) || { assets: [], jobs: [] };
  }
  private save(state: MediaState) {
    this.app.store.put(key, state);
  }
  private file(id: string, name: string) {
    return path.join(this.root, id, name);
  }
  async probe(file: string) {
    const result = await productionProcess(
      process.env.OUTCLASS_FFPROBE || "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-show_format",
        "-show_streams",
        "-of",
        "json",
        file,
      ],
      this.root,
      10000,
    );
    if (result.code !== 0)
      throw new UserError(
        "The media could not be decoded. Import a valid MP4, MOV or WebM file.",
      );
    const value = JSON.parse(result.stdout),
      video = value.streams?.find((s: any) => s.codec_type === "video"),
      duration = Number(value.format?.duration);
    if (
      !video ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 3600 ||
      video.width > 8192 ||
      video.height > 8192 ||
      !/(mov|mp4|matroska|webm)/.test(value.format?.format_name || "")
    )
      throw new UserError(
        "Use a supported video under one hour and at most 8192 pixels per edge.",
      );
    return {
      duration,
      width: Number(video.width),
      height: Number(video.height),
      audio: !!value.streams?.some((s: any) => s.codec_type === "audio"),
    };
  }
  async import(name: string, buffer: Buffer, rights: boolean) {
    if (!rights)
      throw new UserError("Confirm your rights to this source video.");
    if (
      !/\.(mp4|mov|webm)$/i.test(name) ||
      name.length > 200 ||
      /[\\/\r\n]/.test(name)
    )
      throw new UserError(
        "Choose an MP4, MOV or WebM filename without path components.",
      );
    const state = this.state();
    if (
      state.assets.length >= 12 ||
      state.assets.reduce((n, a) => n + a.bytes, 0) + buffer.length >
        320 * 1024 * 1024
    )
      throw new UserError(
        "The local source library limit is 12 files or 320 MB.",
      );
    const id = randomUUID(),
      dir = path.join(this.root, id);
    await mkdir(dir, { recursive: true });
    const file = this.file(id, "source.video");
    try {
      await writeFile(file, buffer, { flag: "wx" });
      const info = await this.probe(file);
      const asset: MediaAsset = {
        id,
        name,
        mime: /\.webm$/i.test(name) ? "video/webm" : "video/mp4",
        bytes: buffer.length,
        hash: digest(buffer),
        ...info,
        rightsConfirmed: true,
        importedAt: now(),
      };
      const latest = this.state();
      latest.assets.push(asset);
      this.save(latest);
      return asset;
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
  }
  render(raw: unknown) {
    const input = timeline.parse(raw),
      state = this.state(),
      asset = state.assets.find((a) => a.id === input.assetId),
      creative = this.expansion().creatives.find(
        (c) => c.id === input.creativeId,
      );
    if (
      !asset ||
      !creative?.approval ||
      creative.revision !== input.expectedRevision
    )
      throw new UserError(
        "Select a source video and the current approved creative revision.",
        409,
      );
    const duration = input.scenes.reduce(
      (total, s) => total + s.end - s.start,
      0,
    );
    if (
      input.scenes.some(
        (s) => s.end <= s.start || s.end > asset.duration + 0.05,
      ) ||
      duration > 90 ||
      duration < 0.5
    )
      throw new UserError(
        "Use valid clip ranges with a total duration between 0.5 and 90 seconds.",
      );
    if (
      state.jobs.length >= 40 ||
      state.jobs.filter((j) => ["queued", "processing"].includes(j.state))
        .length >= 4
    )
      throw new UserError("The local render queue is full.");
    const job: RenderJob = {
      id: randomUUID(),
      timeline: input,
      creativeHash: creative.approval.hash,
      sourceHash: asset.hash,
      state: "queued",
      stage: "Queued",
      createdAt: now(),
    };
    state.jobs.push(job);
    this.save(state);
    void this.drain();
    return job;
  }
  private update(id: string, change: Partial<RenderJob>) {
    const state = this.state(),
      job = state.jobs.find((j) => j.id === id);
    if (job) {
      Object.assign(job, change);
      this.save(state);
    }
    return job;
  }
  private async drain() {
    if (this.active || this.stopped) return;
    const job = this.state().jobs.find((j) => j.state === "queued");
    if (!job) return;
    this.active = { id: job.id };
    const asset = this.state().assets.find(
      (a) => a.id === job.timeline.assetId,
    )!;
    const dir = path.join(this.root, job.id),
      [width, height] =
        job.timeline.format === "portrait" ? [720, 1280] : [1280, 720];
    try {
      await mkdir(dir, { recursive: true });
      this.update(job.id, { state: "processing", stage: "Preparing clips" });
      const execute = async (args: string[]) => {
        if (
          this.state().jobs.find((j) => j.id === job.id)?.state === "canceled"
        )
          throw new UserError("Render canceled.");
        const result = await productionProcess(
          process.env.OUTCLASS_FFMPEG || "ffmpeg",
          args,
          dir,
          60000,
          (child) => {
            if (this.active) this.active.child = child;
          },
        );
        if (result.code !== 0)
          throw new UserError(
            "FFmpeg could not render this timeline. Check the source and installed codecs.",
          );
      };
      let offset = 0,
        captions = "";
      for (const [i, scene] of job.timeline.scenes.entries()) {
        this.update(job.id, {
          stage: `Rendering clip ${i + 1} of ${job.timeline.scenes.length}`,
        });
        await execute([
          "-y",
          "-nostdin",
          "-v",
          "error",
          "-protocol_whitelist",
          "file,pipe",
          "-ss",
          String(scene.start),
          "-i",
          this.file(asset.id, "source.video"),
          "-t",
          String(scene.end - scene.start),
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-vf",
          `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=24`,
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-threads",
          "2",
          "-filter_threads",
          "1",
          "-c:a",
          "aac",
          "-ar",
          "48000",
          "-pix_fmt",
          "yuv420p",
          `clip-${i}.mp4`,
        ]);
        captions += `${i + 1}\n${srtTime(offset)} --> ${srtTime(offset + scene.end - scene.start)}\n${scene.caption.replace(/[<>\r\n]/g, " ")}\n\n`;
        offset += scene.end - scene.start;
      }
      await writeFile(
        path.join(dir, "clips.txt"),
        job.timeline.scenes.map((_, i) => `file 'clip-${i}.mp4'`).join("\n"),
      );
      await writeFile(path.join(dir, "captions.srt"), captions);
      await writeFile(
        path.join(dir, "timeline.json"),
        JSON.stringify({ schemaVersion: 1, ...job }, null, 2),
      );
      this.update(job.id, { stage: "Composing captions and export" });
      await execute([
        "-y",
        "-nostdin",
        "-v",
        "error",
        "-f",
        "concat",
        "-safe",
        "1",
        "-i",
        "clips.txt",
        "-vf",
        "subtitles=captions.srt:force_style='FontName=Arial,FontSize=20,Outline=1,MarginV=24'",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-threads",
        "2",
        "-filter_threads",
        "1",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        "export.mp4",
      ]);
      const file = this.file(job.id, "export.mp4"),
        info = await this.probe(file);
      if (
        info.width !== width ||
        info.height !== height ||
        Math.abs(info.duration - offset) > 0.35
      )
        throw new UserError("Export dimensions or duration failed media QA.");
      const { readFile } = await import("node:fs/promises"),
        bytes = await readFile(file);
      if (this.state().jobs.find((j) => j.id === job.id)?.state !== "canceled")
        this.update(job.id, {
          state: "ready",
          stage: "Ready for review",
          finishedAt: now(),
          output: { ...info, bytes: bytes.length, hash: digest(bytes) },
        });
    } catch (error) {
      if (this.state().jobs.find((j) => j.id === job.id)?.state !== "canceled")
        this.update(job.id, {
          state: "failed",
          stage: "Failed",
          finishedAt: now(),
          error:
            error instanceof UserError
              ? error.message
              : "Production failed. The source video is preserved.",
        });
    } finally {
      this.active = undefined;
      void this.drain();
    }
  }
  cancel(id: string) {
    const job = this.state().jobs.find((j) => j.id === id);
    if (!job) throw new UserError("Render job not found.", 404);
    if (!["queued", "processing"].includes(job.state))
      throw new UserError("This job has already finished.");
    this.update(id, {
      state: "canceled",
      stage: "Canceled",
      finishedAt: now(),
    });
    if (this.active?.id === id && this.active.child)
      stopProduction(this.active.child);
    return this.state();
  }
  approve(id: string) {
    const job = this.state().jobs.find((j) => j.id === id);
    if (job?.state !== "ready" || !job.output)
      throw new UserError("Review a successful export before approving it.");
    return this.update(id, {
      approval: { hash: job.output.hash, approvedAt: now() },
    });
  }
  access(id: string, kind: "source" | "export" | "captions" | "manifest") {
    const state = this.state(),
      asset = state.assets.find((a) => a.id === id),
      job = state.jobs.find((j) => j.id === id);
    if (kind === "source" ? !asset : job?.state !== "ready")
      throw new UserError("Media artifact not available.", 404);
    const names = {
      source: "source.video",
      export: "export.mp4",
      captions: "captions.srt",
      manifest: "timeline.json",
    };
    const token = randomBytes(24).toString("hex");
    for (const [k, v] of this.tokens)
      if (v.expires < Date.now()) this.tokens.delete(k);
    if (this.tokens.size > 100)
      this.tokens.delete(this.tokens.keys().next().value!);
    this.tokens.set(token, {
      file: this.file(id, names[kind]),
      mime:
        kind === "source"
          ? asset!.mime
          : kind === "export"
            ? "video/mp4"
            : kind === "manifest"
              ? "application/json"
              : "text/plain",
      expires: Date.now() + 900000,
    });
    return { url: `/creator-media/${token}` };
  }
  stop() {
    this.stopped = true;
    if (this.active?.child) stopProduction(this.active.child);
  }
  publicRoutes() {
    const router = Router();
    router.get("/:token", (req, res) => {
      const item = this.tokens.get(req.params.token);
      if (!item || item.expires < Date.now())
        throw new UserError(
          "Media preview expired. Open it again from Creator Studio.",
          404,
        );
      res.setHeader("Cache-Control", "no-store");
      res.type(item.mime).sendFile(item.file);
    });
    return router;
  }
  routes() {
    const router = Router();
    router.get("/state", (_req, res) => res.json(this.state()));
    router.post(
      "/import",
      express.raw({ type: "application/octet-stream", limit: "80mb" }),
      async (req, res) => {
        if (!Buffer.isBuffer(req.body))
          throw new UserError("Upload a video file.");
        const query = z
          .object({ name: z.string().max(200), rights: z.literal("confirmed") })
          .parse(req.query);
        res.json(await this.import(query.name, req.body, true));
      },
    );
    router.post("/render", (req, res) => res.json(this.render(req.body)));
    router.post("/:id/cancel", (req, res) =>
      res.json(this.cancel(req.params.id)),
    );
    router.post("/:id/approve", (req, res) => {
      z.object({ approveReviewed: z.literal(true) })
        .strict()
        .parse(req.body);
      res.json(this.approve(req.params.id));
    });
    router.post("/:id/access", (req, res) =>
      res.json(
        this.access(
          req.params.id,
          z
            .enum(["source", "export", "captions", "manifest"])
            .parse(req.body.kind),
        ),
      ),
    );
    return router;
  }
}
