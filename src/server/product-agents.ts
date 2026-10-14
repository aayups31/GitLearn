import { randomUUID } from "node:crypto";
import type { Application } from "./application.js";
import type { ExpansionState } from "../expansion-contract.js";
import {
  productAgentAnswer,
  productAgentInstructions,
} from "../product-agent-contract.js";
import { UserError } from "./safety.js";
export type ProductAgentRun = {
  id: string;
  domain: "academy" | "creative" | "growth";
  entityId: string;
  revision: number;
  startedAt: string;
  finishedAt?: string;
  state: "executing" | "completed" | "failed" | "interrupted";
  error?: string;
  sources: { id: string; title: string; text: string }[];
  answer?: ReturnType<typeof productAgentAnswer.parse>;
  maxCalls: 1;
};
export class ProductAgents {
  private active = new Set<string>();
  constructor(
    private app: Application,
    private state: () => ExpansionState,
  ) {}
  context(domain: ProductAgentRun["domain"], entityId: string) {
    const state = this.state();
    const entity =
      domain === "academy"
        ? state.courses.find((c) => c.id === entityId)
        : domain === "creative"
          ? state.creatives.find((c) => c.id === entityId)
          : state.campaigns.find((c) => c.id === entityId);
    if (!entity)
      throw new UserError(
        "Save and select a draft before asking its agent.",
        404,
      );
    const release =
      domain === "creative"
        ? state.releases.find(
            (r) =>
              r.id ===
              state.creatives.find((c) => c.id === entityId)!.releaseId,
          )
        : domain === "growth"
          ? state.releases.find(
              (r) =>
                r.id ===
                state.campaigns.find((c) => c.id === entityId)!.creativeSnapshot
                  .releaseId,
            )
          : undefined;
    const lessons =
      domain === "academy"
        ? state.courses.find((c) => c.id === entityId)!.lessons
        : release?.lessons || [];
    const sources = lessons
      .slice(0, 8)
      .map((l, i) => ({
        id: `lesson:${i}`,
        title: l.title,
        text: `Objective: ${l.objective}\nPractice: ${l.practice}\n${l.content}`.slice(
          0,
          2000,
        ),
      }));
    return {
      entity,
      revision: entity.revision,
      sources,
      provider: this.app.ai.config().mode,
      maxCalls: 1,
      maxOutputTokens: 1800,
    };
  }
  list() {
    const runs =
      this.app.store.get<ProductAgentRun[]>("expansion:agent-runs") || [];
    return runs.map((r) =>
      r.state === "executing" && !this.active.has(r.entityId)
        ? {
            ...r,
            state: "interrupted" as const,
            error: "The app restarted during this run. Retry explicitly.",
          }
        : r,
    );
  }
  private save(record: ProductAgentRun) {
    const runs =
      this.app.store.get<ProductAgentRun[]>("expansion:agent-runs") || [];
    this.app.store.put(
      "expansion:agent-runs",
      [...runs.filter((r) => r.id !== record.id), record].slice(-40),
    );
  }
  async run(
    domain: ProductAgentRun["domain"],
    entityId: string,
    revision: number,
  ) {
    if (this.active.has(entityId) || this.active.size >= 2)
      throw new UserError("Another agent run is in progress.", 409);
    const context = this.context(domain, entityId);
    if (context.revision !== revision)
      throw new UserError("Reload this draft before asking its agent.", 409);
    if (!this.app.ai.ready())
      throw new UserError("Choose an AI connection in Settings first.");
    const record: ProductAgentRun = {
      id: randomUUID(),
      domain,
      entityId,
      revision,
      startedAt: new Date().toISOString(),
      state: "executing",
      sources: context.sources,
      maxCalls: 1,
    };
    this.active.add(entityId);
    this.save(record);
    try {
      const answer = await this.app.ai.structured({
        task: domain,
        schema: productAgentAnswer,
        name: `outclass_${domain}_proposal`,
        instructions: productAgentInstructions[domain],
        context: JSON.stringify({
          draftExcerpt: JSON.stringify(context.entity).slice(0, 8000),
          sources: context.sources,
          request:
            "Propose the next useful revision, with source-grounded editable draft text. The draft excerpt may be truncated.",
        }),
      });
      const ids = new Set(context.sources.map((s) => s.id));
      if (answer.steps.some((s) => s.sourceIds.some((id) => !ids.has(id))))
        throw new UserError(
          "The proposal referenced a source that was not supplied. It was not applied.",
        );
      record.answer = answer;
      record.state = "completed";
    } catch (error) {
      record.state = "failed";
      record.error =
        error instanceof UserError
          ? error.message
          : "This agent could not produce a valid proposal. No draft was changed.";
    } finally {
      this.active.delete(entityId);
      record.finishedAt = new Date().toISOString();
      this.save(record);
    }
    return record;
  }
}
