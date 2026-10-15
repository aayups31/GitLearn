import express, { Router } from "express";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, readFile, stat, rm } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Application } from "./application.js";
import type { PostImage } from "../social-post.js";
import { productionProcess } from "./production-process.js";
import { UserError } from "./safety.js";
export class SocialImages {
  private tokens = new Map<string, { id: string; expires: number }>();
  private importing = false;
  readonly root: string;
  constructor(private app: Application) {
    this.root = path.join(app.store.directory, "social-images");
  }
  list() {
    return this.app.store.get<PostImage[]>("gtm:images:v1") || [];
  }
  get(id: string) {
    const image = this.list().find((i) => i.id === id);
    if (!image) throw new UserError("Post image not found.", 404);
    return image;
  }
  async bytes(id: string, expectedHash: string) {
    const image = this.get(id),
      bytes = await readFile(path.join(this.root, id, "image.jpg"));
    if (
      image.hash !== expectedHash ||
      createHash("sha256").update(bytes).digest("hex") !== expectedHash
    )
      throw new UserError(
        "The reviewed image changed. Prepare a new post.",
        409,
      );
    return bytes;
  }
  async import(name: string, bytes: Buffer) {
    if (this.importing)
      throw new UserError("Wait for the current image import.", 409);
    if (this.list().length >= 200)
      throw new UserError("The local post image limit has been reached.");
    if (
      !bytes.length ||
      bytes.length > 10 * 1024 * 1024 ||
      !(
        bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
    )
      throw new UserError("Choose a JPEG or PNG under 10 MB.");
    this.importing = true;
    const id = randomUUID(),
      dir = path.join(this.root, id);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "input"), bytes);
      const probe = await productionProcess(
        process.env.OUTCLASS_FFPROBE || "ffprobe",
        ["-v", "error", "-show_streams", "-of", "json", "input"],
        dir,
      );
      const info = JSON.parse(probe.stdout).streams?.[0];
      if (
        probe.code ||
        !info ||
        !["png", "mjpeg"].includes(info.codec_name) ||
        info.width * info.height > 32000000 ||
        info.width < 16 ||
        info.height < 16
      )
        throw new UserError("Use a valid still image up to 32 megapixels.");
      // Re-encode one frame, strip metadata, flatten alpha; these exact bytes are previewed and uploaded.
      const render = await productionProcess(
        process.env.OUTCLASS_FFMPEG || "ffmpeg",
        [
          "-v",
          "error",
          "-i",
          "input",
          "-frames:v",
          "1",
          "-vf",
          "scale='min(1440,iw)':-2",
          "-map_metadata",
          "-1",
          "-q:v",
          "3",
          "image.jpg",
        ],
        dir,
      );
      if (render.code) throw new UserError("Image preparation failed.");
      const file = await readFile(path.join(dir, "image.jpg")),
        out = await productionProcess(
          process.env.OUTCLASS_FFPROBE || "ffprobe",
          ["-v", "error", "-show_streams", "-of", "json", "image.jpg"],
          dir,
        ),
        dimensions = JSON.parse(out.stdout).streams[0];
      if ((await stat(path.join(dir, "image.jpg"))).size > 5 * 1024 * 1024)
        throw new UserError(
          "Prepared image exceeds 5 MB. Use a smaller image.",
        );
      const image: PostImage = {
        id,
        name: path.basename(name).slice(0, 200),
        hash: createHash("sha256").update(file).digest("hex"),
        bytes: file.length,
        width: dimensions.width,
        height: dimensions.height,
        mime: "image/jpeg",
        createdAt: new Date().toISOString(),
      };
      await rm(path.join(dir, "input"));
      this.app.store.put("gtm:images:v1", [...this.list(), image]);
      return image;
    } catch (error) {
      if (path.resolve(dir).startsWith(path.resolve(this.root) + path.sep))
        await rm(dir, { recursive: true, force: true });
      throw error;
    } finally {
      this.importing = false;
    }
  }
  access(id: string) {
    this.get(id);
    for (const [t, v] of this.tokens)
      if (v.expires < Date.now()) this.tokens.delete(t);
    if (this.tokens.size > 300)
      this.tokens.delete(this.tokens.keys().next().value!);
    const token = randomBytes(24).toString("hex");
    this.tokens.set(token, { id, expires: Date.now() + 900000 });
    return { url: `/social-image/${token}` };
  }
  publicRoutes() {
    const router = Router();
    router.get("/:token", (req, res) => {
      const entry = this.tokens.get(req.params.token);
      if (!entry || entry.expires < Date.now())
        throw new UserError("Image preview expired. Reopen the composer.", 404);
      res.setHeader("Cache-Control", "no-store");
      res
        .type("image/jpeg")
        .sendFile(path.join(this.root, entry.id, "image.jpg"));
    });
    return router;
  }
  routes() {
    const router = Router();
    router.get("/", (_req, res) => res.json(this.list()));
    router.post(
      "/import",
      express.raw({ type: "application/octet-stream", limit: "10mb" }),
      async (req, res) => {
        const query = z
          .object({ name: z.string().max(200), rights: z.literal("confirmed") })
          .parse(req.query);
        if (!Buffer.isBuffer(req.body))
          throw new UserError("Upload an image file.");
        res.json(await this.import(query.name, req.body));
      },
    );
    router.post("/:id/access", (req, res) =>
      res.json(this.access(req.params.id)),
    );
    return router;
  }
}
