import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Application } from "./application.js";
import type { ExpansionState } from "../expansion-contract.js";
import type { ProductAgentRun } from "./product-agents.js";
import { UserError } from "./safety.js";
export const agentDomain = z.enum([
  "academy",
  "creative",
  "growth",
  "analytics",
]);
export type AgentDomain = z.infer<typeof agentDomain>;
export type AgentHandoff = {
  id: string;
  runId: string;
  from: AgentDomain;
  to: AgentDomain;
  releaseId: string;
  releaseHash: string;
  courseDraftId: string;
  sourceRevision: number;
  summary: string;
  proposal: string;
  hash: string;
  createdAt: string;
  acceptedAt?: string;
};
export class AgentHandoffs {
  constructor(private app: Application) {}
  list() {
    return this.app.store.get<AgentHandoff[]>("suite:handoffs:v1") || [];
  }
  offer(runId: string, to: AgentDomain) {
    const runs =
        this.app.store.get<ProductAgentRun[]>("expansion:agent-runs") || [],
      run = runs.find((r) => r.id === runId),
      state = this.app.store.get<ExpansionState>("expansion:v1");
    if (!run?.answer || run.state !== "completed" || !state)
      throw new UserError("Choose a completed agent proposal.");
    if (run.domain === to)
      throw new UserError("Choose a different specialist.");
    const entity =
      run.domain === "academy"
        ? state.courses.find((c) => c.id === run.entityId)
        : run.domain === "creative"
          ? state.creatives.find((c) => c.id === run.entityId)
          : state.campaigns.find((c) => c.id === run.entityId);
    if (entity?.revision !== run.revision)
      throw new UserError(
        "The source draft changed. Ask its agent again before sharing this proposal.",
        409,
      );
    const release =
      run.domain === "academy"
        ? state.releases.find(
            (r) => r.courseId === run.entityId && r.revision === run.revision,
          )
        : run.domain === "creative"
          ? state.releases.find(
              (r) =>
                r.id ===
                state.creatives.find((c) => c.id === run.entityId)?.releaseId,
            )
          : state.releases.find(
              (r) =>
                r.id ===
                state.campaigns.find((c) => c.id === run.entityId)
                  ?.creativeSnapshot.releaseId,
            );
    if (!release)
      throw new UserError(
        "Release this course revision locally before handing it to another specialist.",
      );
    const existing = this.list().find((h) => h.runId === runId && h.to === to);
    if (existing) return existing;
    if (this.list().length >= 200)
      throw new UserError("The local handoff history limit has been reached.");
    const content = {
      runId,
      from: run.domain,
      to,
      releaseId: release.id,
      releaseHash: release.hash,
      courseDraftId: release.courseId,
      sourceRevision: run.revision,
      summary: run.answer.summary,
      proposal: run.answer.draftText,
    };
    const handoff: AgentHandoff = {
      ...content,
      id: randomUUID(),
      hash: createHash("sha256").update(JSON.stringify(content)).digest("hex"),
      createdAt: new Date().toISOString(),
    };
    this.app.store.put("suite:handoffs:v1", [...this.list(), handoff]);
    return handoff;
  }
  accept(id: string, hash: string) {
    const rows = this.list(),
      value = rows.find((h) => h.id === id);
    if (!value || value.hash !== hash)
      throw new UserError(
        "Review the exact shared proposal before accepting it.",
        409,
      );
    if (!value.acceptedAt) {
      value.acceptedAt = new Date().toISOString();
      this.app.store.put("suite:handoffs:v1", rows);
    }
    return value;
  }
  sources(to: AgentDomain, releaseId?: string, courseDraftId?: string) {
    return this.list()
      .filter(
        (h) =>
          h.acceptedAt &&
          h.to === to &&
          (h.releaseId === releaseId ||
            (to === "academy" && h.courseDraftId === courseDraftId)),
      )
      .slice(-4)
      .map((h) => ({
        id: `handoff:${h.id}`,
        title: `${h.from} → ${h.to}; pinned release ${h.releaseId}`,
        text: JSON.stringify({
          sourceRevision: h.sourceRevision,
          releaseHash: h.releaseHash,
          summary: h.summary,
          proposal: h.proposal,
        }).slice(0, 2000),
      }));
  }
}
