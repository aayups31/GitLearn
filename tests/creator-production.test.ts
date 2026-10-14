import { it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
import { CreatorProduction } from "../src/server/creator-production";
it("imports real footage, renders a captioned edit, verifies it and approves its immutable hash", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-render-")),
    store = new Store(path.join(dir, "data")),
    app = new Application(store),
    e = new Expansion(app),
    media = new CreatorProduction(app, () => e.state());
  try {
    const c = e.saveCourse({
        title: "Testing",
        audience: "Developers",
        outcome: "Build tests",
        rightsConfirmed: true,
        lessons: [
          {
            title: "Assertions",
            objective: "Check behavior",
            practice: "Test a function",
            content: "Assertions compare observed and expected results.",
          },
        ],
        expectedRevision: 0,
      }),
      r = e.release(c.id, { expectedRevision: 1, approve: true });
    const cr = e.saveCreative({
      title: "A real demo",
      releaseId: r.id,
      lessonIndex: 0,
      brief: "Explain assertions",
      copy: "Test real behavior",
      brandColor: "#386bfa",
      rightsConfirmed: true,
      expectedRevision: 0,
    });
    e.approveCreative(cr.id, { expectedRevision: 1, approve: true });
    const source = await media.import(
      "fixture.mp4",
      await readFile("src/site/assets/agents-film.mp4"),
      true,
    );
    expect(source.duration).toBeGreaterThan(19);
    expect(source.width).toBe(1280);
    const timeline = {
      creativeId: cr.id,
      expectedRevision: 1,
      expectedTimelineRevision: 0,
      assetId: source.id,
      format: "portrait",
      scenes: [{ start: 1, end: 2, caption: "Saved scene" }],
    };
    expect(media.saveTimeline(timeline).revision).toBe(1);
    expect(() => media.saveTimeline(timeline)).toThrow(/changed/);
    expect(
      new CreatorProduction(app, () => e.state()).state().drafts[0].timeline
        .scenes[0].caption,
    ).toBe("Saved scene");
    expect(() =>
      media.render({
        creativeId: cr.id,
        expectedRevision: 1,
        assetId: source.id,
        format: "portrait",
        scenes: [{ start: 0, end: 100, caption: "Invalid" }],
        approveRender: true,
      }),
    ).toThrow(/ranges/);
    const job = media.render({
      creativeId: cr.id,
      expectedRevision: 1,
      assetId: source.id,
      format: "portrait",
      scenes: [
        { start: 1, end: 2, caption: "Actual clip" },
        { start: 12, end: 13, caption: "A second teaching point" },
      ],
      approveRender: true,
    });
    for (
      let i = 0;
      i < 200 &&
      ["queued", "processing"].includes(
        media.state().jobs.find((j) => j.id === job.id)!.state,
      );
      i++
    )
      await new Promise((r) => setTimeout(r, 100));
    const finished = media.state().jobs.find((j) => j.id === job.id)!;
    expect(finished.error).toBeUndefined();
    expect(finished.state).toBe("ready");
    expect(finished.output?.height).toBe(1280);
    expect(finished.output?.width).toBe(720);
    expect(finished.output?.duration).toBeCloseTo(2, 0);
    expect(media.approve(job.id)?.approval?.hash).toBe(finished.output?.hash);
    expect(media.access(job.id, "export").url).toMatch(
      /^\/creator-media\/[a-f0-9]{48}$/,
    );
    expect(
      await readFile(path.join(media.root, job.id, "captions.srt"), "utf8"),
    ).toContain("00:00:01,000 --> 00:00:02,000");
  } finally {
    media.stop();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 45000);
