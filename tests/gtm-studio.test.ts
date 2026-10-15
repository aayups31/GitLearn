import { it, expect, vi } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
import { CreatorProduction } from "../src/server/creator-production";
import { GTMStudio } from "../src/server/gtm-studio";
it("creates editable multi-channel promotions and real clips directly in GTM, preserving source and exact copy approval", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-promotion-")),
    store = new Store(dir),
    app = new Application(store),
    e = new Expansion(app),
    media = new CreatorProduction(app, () => e.state()),
    studio = new GTMStudio(app, media);
  try {
    const c = e.saveCourse({
        title: "Practical Python",
        audience: "Beginners",
        outcome: "Build reports",
        rightsConfirmed: true,
        lessons: [
          {
            title: "Activity totals",
            objective: "Group minutes by name",
            practice: "Handle repeated names",
            content: "A dictionary stores running totals.",
          },
        ],
        expectedRevision: 0,
      }),
      release = e.release(c.id, { expectedRevision: 1, approve: true });
    const brief = {
      releaseId: release.id,
      lessonIndex: 0,
      title: "A practical launch",
      audience: "Python learners who want to apply collections",
      destination: "https://example.com/course",
      providers: ["youtube", "linkedin", "x", "instagram"],
      mode: "source",
      approveProvider: false,
      rightsConfirmed: true,
    };
    const plan = await studio.create(brief);
    expect(plan.answer.posts).toHaveLength(4);
    expect(plan.provenance).toBe("source_template");
    expect(
      plan.answer.posts.find((p) => p.provider === "x")!.text.length,
    ).toBeLessThan(170);
    const edited = studio.edit(plan.id, {
      expectedRevision: 1,
      posts: plan.answer.posts.map((p) => ({
        ...p,
        text: p.text + " Try it.",
      })),
    });
    expect(edited.revision).toBe(2);
    expect(() => studio.materialize(plan.id, 1)).toThrow(/current/);
    const ready = studio.materialize(plan.id, 2);
    expect(ready.artifacts.every((a) => a.creativeId && a.campaignId)).toBe(
      true,
    );
    expect(e.state().campaigns).toHaveLength(4);
    studio.materialize(plan.id, 2);
    expect(e.state().campaigns).toHaveLength(4);
    expect(() =>
      studio.edit(plan.id, { expectedRevision: 2, posts: plan.answer.posts }),
    ).toThrow(/approved artifacts/);
    expect(studio.design(plan.id, "linkedin").svg).toContain("svg");
    const source = await media.import(
        "fixture.mp4",
        await readFile("src/site/assets/agents-film.mp4"),
        true,
      ),
      render = studio.render(plan.id, {
        provider: "instagram",
        assetId: source.id,
        start: 1,
        end: 2,
        approveRender: true,
      });
    expect(
      studio.render(plan.id, {
        provider: "instagram",
        assetId: source.id,
        start: 1,
        end: 2,
        approveRender: true,
      }).id,
    ).toBe(render.id);
    for (
      let i = 0;
      i < 200 &&
      ["queued", "processing"].includes(
        media.state().jobs.find((j) => j.id === render.id)!.state,
      );
      i++
    )
      await new Promise((r) => setTimeout(r, 100));
    const result = media.state().jobs.find((j) => j.id === render.id)!;
    expect(result.error).toBeUndefined();
    expect(result.state).toBe("ready");
    expect(result.output?.width).toBe(720);
    expect(result.approval).toBeUndefined();
    media.approve(result.id);
    expect(media.approvedExport(result.id).job.output?.hash).toBe(
      result.output?.hash,
    );
    const model = vi
      .spyOn(app.ai, "structured")
      .mockResolvedValue({
        ...plan.answer,
        posts: plan.answer.posts.map((p) => ({
          ...p,
          sourceIds: ["invented"],
        })),
      });
    await expect(
      studio.create({ ...brief, mode: "agent", approveProvider: true }),
    ).rejects.toThrow(/supplied sources/);
    expect(model).toHaveBeenCalledTimes(1);
  } finally {
    vi.restoreAllMocks();
    media.stop();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
}, 45000);
