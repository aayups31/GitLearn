import { it, expect, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../src/server/store";
import { Application } from "../src/server/application";
import { PublicationQueue } from "../src/server/publication-queue";
import type {
  GTMPublishing,
  PublishReview,
} from "../src/server/gtm-publishing";
import type { SocialConnections } from "../src/server/social-connections";
it("dispatches a consented exact post once, confirms later, blocks account changes and never catches up expired windows", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "outclass-queue-")),
    store = new Store(dir),
    app = new Application(store);
  let clock = Date.UTC(2026, 9, 15, 12),
    account = "owner";
  const rows: PublishReview[] = [];
  const make = () => {
    const row = {
      id: randomUUID(),
      provider: "x",
      campaignId: randomUUID(),
      revision: 1,
      accountId: "owner",
      accountName: "Owner",
      text: "An approved factual post",
      title: "Post",
      privacy: "public",
      hash: "a".repeat(64),
      state: "review",
      createdAt: new Date(clock).toISOString(),
      updatedAt: new Date(clock).toISOString(),
    } as PublishReview;
    rows.push(row);
    return row;
  };
  const publish = vi.fn(async (id: string) => {
      const row = rows.find((r) => r.id === id)!;
      row.state = "accepted";
      row.postId = "real-response-fixture-id";
      return row;
    }),
    confirm = vi.fn(async (id: string) => {
      const row = rows.find((r) => r.id === id)!;
      row.state = "confirmed";
      return row;
    });
  const publishing = {
      rows: () => rows,
      publish,
      confirm,
    } as unknown as GTMPublishing,
    social = {
      account: () => ({ id: account }),
    } as unknown as SocialConnections,
    queue = new PublicationQueue(app, publishing, social, () => clock);
  const schedule = (post: PublishReview, delta: number) => ({
    postId: post.id,
    approvalHash: post.hash,
    runAt: new Date(clock + delta).toISOString(),
    approveScheduledPublish: true,
  });
  try {
    const post = make(),
      input = schedule(post, 10000);
    expect(() =>
      queue.schedule({ ...input, approvalHash: "b".repeat(64) }),
    ).toThrow(/exact/);
    const job = queue.schedule(input);
    expect(queue.schedule(input).id).toBe(job.id);
    expect(() => queue.schedule(schedule(make(), 20000))).toThrow(/one minute/);
    clock += 11000;
    await queue.tick();
    await queue.tick();
    expect(publish).toHaveBeenCalledTimes(1);
    expect(queue.list().find((j) => j.id === job.id)?.state).toBe("accepted");
    clock += 61000;
    await queue.tick();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(queue.list().find((j) => j.id === job.id)?.state).toBe("confirmed");
    const changed = queue.schedule(schedule(make(), 70000));
    account = "another-account";
    clock += 71000;
    await queue.tick();
    expect(queue.list().find((j) => j.id === changed.id)?.state).toBe(
      "blocked",
    );
    expect(publish).toHaveBeenCalledTimes(1);
    account = "owner";
    const late = queue.schedule(schedule(make(), 70000));
    clock += 72000 + 3600000;
    await queue.tick();
    expect(queue.list().find((j) => j.id === late.id)?.state).toBe("blocked");
    expect(publish).toHaveBeenCalledTimes(1);
    const canceled = queue.schedule(schedule(make(), 70000));
    queue.cancel(canceled.id);
    clock += 71000;
    await queue.tick();
    expect(publish).toHaveBeenCalledTimes(1);
    const uncertain = queue.schedule(schedule(make(), 70000));
    const persisted = queue.list();
    persisted.find((j) => j.id === uncertain.id)!.state = "sending";
    store.put("gtm:queue:v1", persisted);
    rows.find((r) => r.id === uncertain.postId)!.state = "publishing";
    const restarted = new PublicationQueue(
      app,
      publishing,
      social,
      () => clock,
    );
    expect(restarted.list().find((j) => j.id === uncertain.id)?.state).toBe(
      "uncertain",
    );
    clock += 71000;
    await restarted.tick();
    expect(publish).toHaveBeenCalledTimes(1);
  } finally {
    queue.stop();
    store.close();
    await rm(dir, { recursive: true, force: true });
  }
});
