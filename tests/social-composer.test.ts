import { it, expect, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { postComposition, postPreflight, postText, weightedLength, type PostProvider } from "../src/social-post";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
import { CreatorProduction, type RenderJob } from "../src/server/creator-production";
import { GTMPublishing } from "../src/server/gtm-publishing";
import { type SocialConnections } from "../src/server/social-connections";
import { productionProcess } from "../src/server/production-process";
import { readFile } from "node:fs/promises";

it("counts real X URLs and compound emoji and blocks invalid platform formats", () => {
  expect(weightedLength("👨‍👩‍👧‍👦 https://example.com/a-very-long-link")).toBe(26);
  const composition = postComposition.parse({copy: "A grounded lesson", title: "Title"});
  expect(postPreflight("x", {...composition, copy: "界".repeat(140)}, "https://example.com", []).errors.length).toBeGreaterThan(0);
  expect(postPreflight("instagram", composition, "https://example.com", []).errors.join(" ")).toMatch(/photo/);
  expect(postPreflight("youtube", composition, "https://example.com", []).errors.join(" ")).toMatch(/approved video/);
  expect(postPreflight("linkedin", composition, "https://example.com", []).errors).toEqual([]);
});

async function fixture(provider: PostProvider, transport: typeof fetch) {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-post-composer-")), store = new Store(dir), app = new Application(store), e = new Expansion(app), media = new CreatorProduction(app, () => e.state());
  const course = e.saveCourse({title: "Real course", audience: "Beginners", outcome: "Build a report", rightsConfirmed: true, expectedRevision: 0, lessons: [{title: "Lesson", objective: "Group records", practice: "Handle empty input", content: "Use a dictionary."}]}), release = e.release(course.id, {expectedRevision: 1, approve: true}), creative = e.saveCreative({title: "Lesson preview", releaseId: release.id, lessonIndex: 0, brief: "An honest preview", copy: "Build a report from real inputs.", brandColor: "#386bfa", rightsConfirmed: true, expectedRevision: 0});
  e.approveCreative(creative.id, {expectedRevision: 1, approve: true});
  const campaign = e.saveCampaign({title: "Launch", creativeId: creative.id, destination: "https://example.com/course", source: provider, medium: "organic", goal: "Explain the lesson", budgetMinor: 0, currency: "CAD", expectedRevision: 0});
  const social = {account: () => ({id: "owner", name: "Author", scopes: ["media.write", "tweet.write", "w_member_social"], token: "fixture-token"})} as unknown as SocialConnections;
  const publisher = new GTMPublishing(app, () => e.state(), social, media, transport);
  const composition = postComposition.parse({copy: "The exact reviewed copy. 👨‍👩‍👧‍👦", title: "The exact video title"});
  const prepare = (extra = {}) => publisher.prepare({campaignId: campaign.id, expectedRevision: campaign.revision, provider, composition, ...extra});
  const close = async () => { media.stop(); store.close(); const target = path.resolve(dir); if (!target.startsWith(path.resolve(tmpdir()) + path.sep)) throw Error("Invalid cleanup target"); await rm(target, {recursive: true, force: true}); };
  async function image() {
    const file = path.join(dir, "fixture.png");
    const result = await productionProcess("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=1280x720", "-frames:v", "1", file], dir);
    if (result.code) throw Error("Image fixture failed");
    return publisher.images.import("course-thumbnail.png", await readFile(file));
  }
  async function video() {
    const id = randomUUID(), bytes = Buffer.from("fixture video bytes"), hash = createHash("sha256").update(bytes).digest("hex");
    const job: RenderJob = {id, creativeHash: campaign.creativeHash, sourceHash: "fixture", state: "ready", stage: "Ready", createdAt: new Date().toISOString(), timeline: {creativeId: creative.id, expectedRevision: 1, assetId: randomUUID(), format: "landscape", scenes: [{start: 0, end: 5, caption: "Preview"}], approveRender: true}, output: {duration: 5, width: 1280, height: 720, bytes: bytes.length, hash, audio: true}, approval: {hash, approvedAt: new Date().toISOString()}};
    store.put("creator:production:v1", {...media.state(), jobs: [job]});
    await mkdir(path.join(media.root, id), {recursive: true});
    await writeFile(path.join(media.root, id, "export.mp4"), bytes);
    return job;
  }
  return {store, campaign, composition, publisher, prepare, image, video, close};
}

it.each(["x", "linkedin"] as const)("uploads the exact reviewed image bytes and attaches them to %s without duplicate posts", async provider => {
  let writes = 0, uploaded: Blob | undefined, payload: any;
  const transport = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const address = String(url);
    if (address.includes("/2/media/upload")) { uploaded = (init!.body as FormData).get("media") as Blob; return Response.json({data: {id: "12345"}}); }
    if (address.includes("images?action")) return Response.json({value: {image: "urn:li:image:fixture", uploadUrl: "https://www.linkedin.com/dms-uploads/fixture"}});
    if (address.includes("/dms-uploads/")) { uploaded = init!.body as Blob; return new Response(null, {status: 201}); }
    if (address.endsWith("/2/tweets") || address.endsWith("/rest/posts")) { writes++; payload = JSON.parse(init!.body as string); return Response.json({data: {id: "post"}}, {status: 201, headers: {"x-restli-id": "urn:li:share:post"}}); }
    return Response.json({});
  });
  const f = await fixture(provider, transport as typeof fetch);
  try {
    const image = await f.image(), composition = {...f.composition, imageIds: [image.id], imageAlts: []}, review = f.prepare({composition});
    expect((await f.publisher.publish(review.id, review.hash)).state).toBe("accepted");
    expect(createHash("sha256").update(Buffer.from(await uploaded!.arrayBuffer())).digest("hex")).toBe(image.hash);
    expect(provider === "x" ? payload.text : payload.commentary).toBe(postText(composition.copy, f.campaign.trackedUrl));
    expect(provider === "x" ? payload.media.media_ids : payload.content.media.id).toEqual(provider === "x" ? ["12345"] : "urn:li:image:fixture");
    await f.publisher.publish(review.id, review.hash);
    expect(writes).toBe(1);
    const changed = f.prepare({composition: {...composition, copy: "Edited after review"}});
    expect(changed.hash).not.toBe(review.hash);
  } finally { await f.close(); }
});

it("persists post drafts with revision conflicts and blocks changed approved image bytes", async () => {
  const transport = vi.fn(async () => Response.json({})), f = await fixture("x", transport as typeof fetch);
  try {
    const input = {campaignId: f.campaign.id, campaignRevision: 1, provider: "x", expectedRevision: 0, composition: f.composition};
    expect(f.publisher.draft(input).revision).toBe(1);
    expect(() => f.publisher.draft(input)).toThrow(/changed/);
    const image = await f.image(), review = f.prepare({composition: {...f.composition, imageIds: [image.id]}});
    await writeFile(path.join(f.publisher.images.root, image.id, "image.jpg"), "changed");
    expect((await f.publisher.publish(review.id, review.hash)).state).toBe("failed");
    expect(transport).not.toHaveBeenCalled();
  } finally { await f.close(); }
});

it("uploads YouTube title, description, audience, tags and exact thumbnail without silently truncating", async () => {
  let metadata: any, thumbnail: Blob | undefined;
  const transport = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).includes("videos?uploadType")) { metadata = JSON.parse(init!.body as string); return new Response(null, {status: 200, headers: {location: "https://www.googleapis.com/upload/session"}}); }
    if (String(url).includes("thumbnails/set")) { thumbnail = init!.body as Blob; return Response.json({items: [{}]}); }
    return Response.json({id: "video-post"});
  });
  const f = await fixture("youtube", transport as typeof fetch);
  try {
    const image = await f.image(), video = await f.video(), composition = {...f.composition, thumbnailId: image.id, tags: ["python", "practice"], madeForKids: false}, review = f.prepare({composition, mediaJobId: video.id, privacy: "private"});
    const result = await f.publisher.publish(review.id, review.hash);
    expect(result.state).toBe("accepted");
    expect(result.thumbnailState).toBe("confirmed");
    expect(metadata.snippet.title).toBe(composition.title);
    expect(metadata.snippet.description).toBe(review.text);
    expect(metadata.snippet.tags).toEqual(composition.tags);
    expect(metadata.status).toEqual({privacyStatus: "private", selfDeclaredMadeForKids: false});
    expect(createHash("sha256").update(Buffer.from(await thumbnail!.arrayBuffer())).digest("hex")).toBe(image.hash);
  } finally { await f.close(); }
});

it("resumes X video processing without reuploading or creating the post twice", async () => {
  let uploads = 0, posts = 0;
  const transport = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const address = String(url);
    if (address.endsWith("initialize")) { uploads++; return Response.json({data: {id: "123"}}); }
    if (address.includes("/append")) return Response.json({});
    if (address.includes("/finalize")) return Response.json({data: {processing_info: {state: "pending"}}});
    if (address.includes("command=STATUS")) return Response.json({data: {processing_info: {state: "succeeded"}}});
    if (address.endsWith("/tweets")) { posts++; expect(JSON.parse(init!.body as string).media.media_ids).toEqual(["123"]); return Response.json({data: {id: "post"}}); }
    return Response.json({});
  });
  const f = await fixture("x", transport as typeof fetch);
  try {
    const video = await f.video(), review = f.prepare({mediaJobId: video.id});
    const pending = await f.publisher.publish(review.id, review.hash);
    expect(pending.postId).toBeUndefined(); expect(pending.uploadState?.phase).toBe("processing");
    expect((await f.publisher.confirm(review.id)).postId).toBe("post");
    await f.publisher.publish(review.id, review.hash);
    expect(uploads).toBe(1); expect(posts).toBe(1);
  } finally { await f.close(); }
});

it("rejects an Instagram public image that differs from the reviewed file before creating a container", async () => {
  const transport = vi.fn(async () => new Response("different public bytes")), f = await fixture("instagram", transport as typeof fetch);
  vi.stubEnv("OUTCLASS_MEDIA_PUBLIC_HOSTS", "media.example.com");
  try {
    const image = await f.image();
    // Use a supported 16:9 image with a verified owned host.
    const review = f.prepare({composition: {...f.composition, imageIds: [image.id]}, publicImageUrls: ["https://media.example.com/photo.jpg"]});
    const result = await f.publisher.publish(review.id, review.hash);
    expect(result.state).toBe("failed"); expect(result.postId).toBeUndefined();
    expect(transport.mock.calls).toHaveLength(1);
  } finally { vi.unstubAllEnvs(); await f.close(); }
});
