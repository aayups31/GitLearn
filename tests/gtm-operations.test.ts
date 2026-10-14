import { it, expect, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { Expansion } from "../src/server/expansion";
import { SocialConnections, providers } from "../src/server/social-connections";
import { CreatorProduction } from "../src/server/creator-production";
import { GTMPublishing } from "../src/server/gtm-publishing";
import { GTMAnalytics, reportMetrics } from "../src/server/gtm-analytics";
it("uses one-time scoped OAuth and never exposes tokens for all four channels", async () => {
  const transport = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url);
      if (path.includes("token") || path.includes("accessToken"))
        return new Response(
          JSON.stringify({
            access_token: "private-fixture-token",
            expires_in: 3600,
            scope:
              "tweet.read tweet.write users.read w_member_social https://www.googleapis.com/auth/youtube.upload instagram_business_content_publish",
          }),
        );
      if (path.includes("channels"))
        return new Response(
          JSON.stringify({
            items: [{ id: "channel", snippet: { title: "Fixture channel" } }],
          }),
        );
      if (path.includes("userinfo"))
        return new Response(
          JSON.stringify({ sub: "member", name: "Fixture instructor" }),
        );
      if (path.includes("users/me"))
        return new Response(
          JSON.stringify({ data: { id: "user", username: "Fixture" } }),
        );
      return new Response(
        JSON.stringify({ user_id: "instagram", username: "Fixture creator" }),
      );
    },
  );
  try {
    for (const p of providers) {
      vi.stubEnv(`OUTCLASS_${p.toUpperCase()}_CLIENT_ID`, "fixture-client");
      vi.stubEnv(`OUTCLASS_${p.toUpperCase()}_CLIENT_SECRET`, "fixture-secret");
      const social = new SocialConnections(47848, transport as typeof fetch),
        start = social.authorize(p),
        url = new URL(start.url);
      expect(url.protocol).toBe("https:");
      if (p === "x" || p === "youtube")
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
      const state = url.searchParams.get("state")!;
      expect(
        (await social.callback(p, state, "fixture-code"))?.canPublish,
      ).toBe(true);
      expect(JSON.stringify(social.status())).not.toContain(
        "private-fixture-token",
      );
      await expect(social.callback(p, state, "fixture-code")).rejects.toThrow(
        /expired/,
      );
    }
  } finally {
    vi.unstubAllEnvs();
  }
});
it("requires exact post approval, deduplicates retries, confirms provider evidence and keeps unknown metrics unknown", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-growth-")),
    store = new Store(dir),
    app = new Application(store),
    e = new Expansion(app),
    media = new CreatorProduction(app, () => e.state());
  let writes = 0;
  const transport = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("oauth2/token"))
        return new Response(
          JSON.stringify({
            access_token: "fixture",
            scope: "tweet.read tweet.write users.read",
            expires_in: 3600,
          }),
        );
      if (String(url).includes("users/me"))
        return new Response(
          JSON.stringify({ data: { id: "user", username: "owner" } }),
        );
      if (init?.method === "POST") {
        writes++;
        return new Response(JSON.stringify({ data: { id: "post" } }), {
          status: 201,
        });
      }
      return new Response(
        JSON.stringify({
          data: { id: "post", public_metrics: { like_count: 3 } },
        }),
      );
    },
  );
  try {
    vi.stubEnv("OUTCLASS_X_CLIENT_ID", "fixture");
    const social = new SocialConnections(47848, transport as typeof fetch),
      auth = social.authorize("x");
    await social.callback(
      "x",
      new URL(auth.url).searchParams.get("state")!,
      "code",
    );
    const c = e.saveCourse({
        title: "Course",
        audience: "Beginners",
        outcome: "Learn",
        rightsConfirmed: true,
        lessons: [
          {
            title: "Lesson",
            objective: "Build",
            practice: "Try",
            content: "Actual source",
          },
        ],
        expectedRevision: 0,
      }),
      r = e.release(c.id, { expectedRevision: 1, approve: true }),
      cr = e.saveCreative({
        title: "Copy",
        releaseId: r.id,
        lessonIndex: 0,
        brief: "A grounded intro",
        copy: "Learn to build.",
        brandColor: "#386bfa",
        rightsConfirmed: true,
        expectedRevision: 0,
      });
    e.approveCreative(cr.id, { expectedRevision: 1, approve: true });
    const campaign = e.saveCampaign({
        title: "Launch",
        creativeId: cr.id,
        destination: "https://example.com/course",
        source: "x",
        medium: "organic",
        goal: "Observe fit",
        budgetMinor: 0,
        currency: "CAD",
        expectedRevision: 0,
      }),
      publisher = new GTMPublishing(
        app,
        () => e.state(),
        social,
        media,
        transport as typeof fetch,
      ),
      request = { campaignId: campaign.id, expectedRevision: 1, provider: "x" };
    const review = publisher.prepare(request);
    expect(publisher.prepare(request).id).toBe(review.id);
    await expect(publisher.publish(review.id, "wrong")).rejects.toThrow(
      /exact/,
    );
    expect(writes).toBe(0);
    expect((await publisher.publish(review.id, review.hash)).state).toBe(
      "accepted",
    );
    await publisher.publish(review.id, review.hash);
    expect(writes).toBe(1);
    const confirmed = await publisher.confirm(review.id);
    expect(confirmed.state).toBe("confirmed");
    expect(confirmed.metrics?.views).toBeUndefined();
    expect(confirmed.metrics?.likes).toBe(3);
    const analytics = new GTMAnalytics(app, () => e.state()),
      report = {
        campaignId: campaign.id,
        source: "Manual ad report",
        date: "2026-10-14",
        currency: "CAD",
        impressions: 1000,
        clicks: 100,
        spendMinor: 500,
        revenueMinor: 1000,
        refundMinor: 100,
        feeMinor: 200,
        confirmReport: true,
      };
    const observed = analytics.record(report);
    expect(analytics.record(report).id).toBe(observed.id);
    expect(analytics.view(campaign.id).reports[0].metrics.grossROAS).toBe(2);
    expect(
      analytics.view(campaign.id).reports[0].metrics.reportedContributionMinor,
    ).toBe(200);
    expect(reportMetrics({ ...report, clicks: 0 }).cpcMinor).toBeNull();
    expect(
      reportMetrics({ ...report, feeMinor: null }).reportedContributionMinor,
    ).toBeNull();
  } finally {
    vi.unstubAllEnvs();
    media.stop();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
