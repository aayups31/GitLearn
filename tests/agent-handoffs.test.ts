import { it, expect, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
import { ProductAgents } from "../src/server/product-agents";
import { AgentHandoffs } from "../src/server/agent-handoffs";
it("passes reviewed source-pinned proposals between specialists and keeps analytics separate from promotional claims", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-handoff-")),
    store = new Store(dir),
    app = new Application(store, "fixture-not-a-real-key"),
    e = new Expansion(app),
    agents = new ProductAgents(app, () => e.state()),
    handoffs = new AgentHandoffs(app);
  const draft = {
    title: "Python reports",
    audience: "Beginners",
    outcome: "Build a report",
    rightsConfirmed: true,
    lessons: [
      {
        title: "Collections",
        objective: "Group records",
        practice: "Build a total",
        content: "A dictionary holds values.",
      },
    ],
  };
  try {
    const c = e.saveCourse({ ...draft, expectedRevision: 0 }),
      release = e.release(c.id, { expectedRevision: 1, approve: true }),
      reply = {
        summary: "Add an empty-input example",
        steps: [
          {
            title: "Review",
            detail: "Add an acceptance criterion",
            sourceIds: ["lesson:0"],
          },
        ],
        draftText: "Explain the accumulator with real examples.",
        limitations: ["No execution claimed"],
      };
    const model = vi.spyOn(app.ai, "structured").mockResolvedValue(reply),
      run = await agents.run("academy", c.id, 1);
    const offered = handoffs.offer(run.id, "creative");
    expect(offered.releaseHash).toBe(release.hash);
    expect(handoffs.sources("creative", release.id)).toEqual([]);
    expect(() => handoffs.accept(offered.id, "0".repeat(64))).toThrow(/exact/);
    handoffs.accept(offered.id, offered.hash);
    expect(handoffs.offer(run.id, "creative").id).toBe(offered.id);
    const creative = e.saveCreative({
      title: "Explain totals",
      releaseId: release.id,
      lessonIndex: 0,
      brief: "A teaching demo",
      copy: "Accumulate values",
      brandColor: "#386bfa",
      rightsConfirmed: true,
      expectedRevision: 0,
    });
    expect(
      agents
        .context("creative", creative.id)
        .sources.some((s) => s.id === `handoff:${offered.id}`),
    ).toBe(true);
    e.approveCreative(creative.id, { expectedRevision: 1, approve: true });
    const campaign = e.saveCampaign({
      title: "Report course launch",
      creativeId: creative.id,
      destination: "https://example.com/course",
      source: "linkedin",
      medium: "organic",
      goal: "Understand interest",
      budgetMinor: 0,
      currency: "CAD",
      expectedRevision: 0,
    });
    store.put("gtm:publication:v1", [
      {
        id: "observed-post",
        campaignId: campaign.id,
        provider: "x",
        state: "confirmed",
        metrics: {
          source: "platform",
          observedAt: new Date().toISOString(),
          likes: 3,
        },
      },
    ]);
    store.put("chat:private-learner", [{ text: "private student attempt" }]);
    expect(
      agents
        .context("analytics", campaign.id)
        .sources.some((s) => s.id === "observation:observed-post"),
    ).toBe(true);
    await agents.run("analytics", campaign.id, 1);
    expect(model.mock.calls.at(-1)?.[0].task).toBe("analytics");
    expect(model.mock.calls.at(-1)?.[0].context).not.toContain(
      "private student attempt",
    );
    e.saveCourse({ ...draft, id: c.id, expectedRevision: 1 });
    expect(() => handoffs.offer(run.id, "growth")).toThrow(/changed/);
  } finally {
    vi.restoreAllMocks();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
