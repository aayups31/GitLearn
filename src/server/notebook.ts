import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import type { Application } from "./application.js";
import { assertClean, UserError } from "./safety.js";
import { architectAnswer, architectInstructions } from "../ai-contract.js";

export type NotebookNote = {
  id: string;
  text: string;
  at: string;
  updatedAt: string;
  kind: "idea" | "decision" | "reflection";
  origin: "learner" | "checkpoint";
  sourceId?: string;
  courseId?: string;
  lessonId?: string;
};
export type ArchitectMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: string;
  mode: "ai" | "local";
};
export type ProjectIdea = {
  id: string;
  title: string;
  problem: string;
  courseIds: string[];
  shareWithOffCourse: boolean;
  notes: NotebookNote[];
  suppressedSources: string[];
  messages: ArchitectMessage[];
  review?: {
    at: string;
    text: string;
    mode: "ai" | "local";
    connections: { noteId: string; courseId: string; explanation: string }[];
  };
  updatedAt: string;
};
export const projectIdeaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  problem: z.string().max(3000).default(""),
  courseIds: z.array(z.string().min(1).max(200)).max(12).default([]),
  shareWithOffCourse: z.boolean().default(false),
});
type Notebook = {
  launchPrompt: boolean;
  automaticNotes: boolean;
  projects: ProjectIdea[];
};
export class IdeaNotebook {
  private busy = new Set<string>();
  constructor(private app: Application) {}
  private data(): Notebook {
    return (
      this.app.store.get<Notebook>("notebook:v1") || {
        launchPrompt: true,
        automaticNotes: false,
        projects: [],
      }
    );
  }
  private save(data: Notebook) {
    this.app.store.put("notebook:v1", data);
  }
  private clearSharedHistory(id: string) {
    for (const c of this.app.store.state().courses) {
      const key = `chat:${c.id}`,
        messages = this.app.store.get<{ projectId?: string }[]>(key);
      if (messages)
        this.app.store.put(
          key,
          messages.filter((m) => m.projectId !== id),
        );
    }
  }
  private courseIds(ids: string[]) {
    const courses = this.app.configured().courses;
    if (ids.some((id) => !courses.some((c) => c.id === id)))
      throw new UserError("Link only courses in your workspace.");
    return [...new Set(ids)];
  }
  private project(data: Notebook, id: string) {
    const p = data.projects.find((p) => p.id === id);
    if (!p) throw new UserError("This idea project no longer exists.", 404);
    return p;
  }
  status() {
    const data = this.data(),
      state = this.app.store.state();
    if (data.automaticNotes) {
      let changed = false;
      for (const p of data.projects)
        for (const c of state.checkpoints) {
          if (
            !p.courseIds.includes(c.courseId) ||
            !c.reflection?.trim() ||
            p.notes.some((n) => n.sourceId === c.id) ||
            p.suppressedSources.includes(c.id) ||
            p.notes.length >= 300
          )
            continue;
          p.notes.push({
            id: randomUUID(),
            text: c.reflection,
            kind: "reflection",
            origin: "checkpoint",
            sourceId: c.id,
            courseId: c.courseId,
            lessonId: c.lessonId,
            at: c.timestamp,
            updatedAt: c.timestamp,
          });
          p.updatedAt = new Date().toISOString();
          delete p.review;
          changed = true;
        }
      if (changed) this.save(data);
    }
    return {
      ...data,
      aiReady:
        this.app.ai.ready() &&
        !!this.app.store.state().settings.assistantEnabled,
      reviewDue: data.projects
        .filter(
          (p) =>
            p.notes.length &&
            Date.now() - Date.parse(p.review?.at || p.notes[0].at) >=
              3 * 86400000,
        )
        .map((p) => p.id),
    };
  }
  preferences(input: { launchPrompt: boolean; automaticNotes: boolean }) {
    const d = this.data();
    this.save({ ...d, ...input });
    return this.status();
  }
  create(input: z.infer<typeof projectIdeaSchema>) {
    const d = this.data();
    if (d.projects.length >= 100)
      throw new UserError(
        "Archive or delete an idea before adding another (100 maximum).",
      );
    assertClean(input.title + input.problem, "idea notebook");
    const p: ProjectIdea = {
      ...input,
      courseIds: this.courseIds(input.courseIds),
      id: randomUUID(),
      notes: [],
      suppressedSources: [],
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    d.projects.unshift(p);
    this.save(d);
    return p;
  }
  update(id: string, input: z.infer<typeof projectIdeaSchema>) {
    const d = this.data(),
      p = this.project(d, id);
    assertClean(input.title + input.problem, "idea notebook");
    Object.assign(p, input, {
      courseIds: this.courseIds(input.courseIds),
      updatedAt: new Date().toISOString(),
    });
    // Remove derived context after sharing/link changes, including previously shared conversations.
    p.messages = [];
    delete p.review;
    this.clearSharedHistory(id);
    this.save(d);
    return p;
  }
  remove(id: string) {
    const d = this.data();
    this.project(d, id);
    d.projects = d.projects.filter((p) => p.id !== id);
    this.clearSharedHistory(id);
    this.save(d);
    return this.status();
  }
  note(
    id: string,
    input: { text: string; kind: NotebookNote["kind"]; noteId?: string },
  ) {
    const d = this.data(),
      p = this.project(d, id);
    assertClean(input.text, "idea note");
    const at = new Date().toISOString();
    if (input.noteId) {
      const note = p.notes.find((n) => n.id === input.noteId);
      if (!note) throw new UserError("This note no longer exists.", 404);
      note.text = input.text;
      note.kind = input.kind;
      note.updatedAt = at;
    } else {
      if (p.notes.length >= 300)
        throw new UserError(
          "This project has 300 notes. Remove older notes before adding more.",
        );
      p.notes.push({
        id: randomUUID(),
        text: input.text,
        kind: input.kind,
        origin: "learner",
        at,
        updatedAt: at,
      });
    }
    p.updatedAt = at;
    p.messages = [];
    delete p.review;
    this.clearSharedHistory(id);
    this.save(d);
    return p;
  }
  removeNote(id: string, noteId: string) {
    const d = this.data(),
      p = this.project(d, id),
      note = p.notes.find((n) => n.id === noteId);
    if (!note) throw new UserError("This note no longer exists.", 404);
    if (note.sourceId) p.suppressedSources.push(note.sourceId);
    p.notes = p.notes.filter((n) => n.id !== noteId);
    p.messages = [];
    delete p.review;
    this.clearSharedHistory(id);
    this.save(d);
    return p;
  }
  clearChat(id: string) {
    const d = this.data(),
      p = this.project(d, id);
    p.messages = [];
    this.save(d);
    return p;
  }
  context(id: string, courseId?: string) {
    const p = this.project(this.data(), id);
    if (courseId && (!p.shareWithOffCourse || !p.courseIds.includes(courseId)))
      throw new UserError(
        "Enable sharing and link this course before attaching its project notebook.",
      );
    return {
      id: p.id,
      revision: createHash("sha256")
        .update(
          JSON.stringify({
            title: p.title,
            problem: p.problem,
            notes: p.notes,
            courseIds: p.courseIds,
            share: p.shareWithOffCourse,
          }),
        )
        .digest("hex"),
      title: p.title,
      problem: p.problem,
      notes: p.notes.slice(-20).map((n) => ({
        id: n.id,
        text: n.text.slice(0, 2000),
        kind: n.kind,
        origin: n.origin,
        courseId: n.courseId,
        sourceId: n.sourceId,
      })),
      courses: p.courseIds.map((id) => {
        const c = this.app.store.state().courses.find((c) => c.id === id);
        return {
          id,
          title: c?.title,
          direction: this.app.store.get(`direction:${id}`),
          recordedCheckpoints: this.app.store
            .state()
            .checkpoints.filter((cp) => cp.courseId === id).length,
        };
      }),
    };
  }
  async ask(id: string, question: string, review = false) {
    if (this.busy.has(id))
      throw new UserError(
        "The Architect is working on this project. Please wait.",
        409,
      );
    assertClean(question, "architect question");
    this.busy.add(id);
    try {
      const d = this.data(),
        p = this.project(d, id),
        version = JSON.stringify(p),
        context = this.context(id);
      let answer: z.infer<typeof architectAnswer>,
        mode: "ai" | "local" = "local";
      if (
        this.app.ai.ready() &&
        this.app.store.state().settings.assistantEnabled
      ) {
        answer = await this.app.ai.structured({
          task: "architect",
          schema: architectAnswer,
          name: "architecture_review",
          instructions: architectInstructions,
          context: JSON.stringify({ project: context, question, review }),
          history: p.messages
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) })),
        });
        mode = "ai";
        if (
          answer.connections.some(
            (c) =>
              !context.notes.some((n) => n.id === c.noteId) ||
              !p.courseIds.includes(c.courseId),
          )
        )
          throw new UserError(
            "The Architect returned an unsupported connection. Retry with a narrower question.",
          );
      } else {
        answer = {
          answer: `Start with one useful outcome for **${p.title}**.\n\n${p.problem ? `You described: ${p.problem}\n\n` : ""}Who has this problem, and how do they handle it today? Choose one person to ask, then describe a single behavior your smallest prototype should support. Record the answer as a decision before choosing more infrastructure.\n\n${p.notes.length ? `You have ${p.notes.length} dated notes. Review your most recent idea and name one assumption you could test in a short experiment.` : "Capture your first idea or constraint in the notebook."}\n\nThis is a local planning checklist. Connect AI in Settings for a tailored architecture conversation.`,
          connections: [],
        };
      }
      // A note edit, deletion or privacy change during inference invalidates the result.
      const latest = this.data(),
        current = this.project(latest, id);
      if (JSON.stringify(current) !== version)
        throw new UserError(
          "The notebook changed during this answer. Ask again using its current notes.",
          409,
        );
      const at = new Date().toISOString();
      if (review)
        current.review = {
          at,
          text: answer.answer,
          mode,
          connections: answer.connections,
        };
      else
        current.messages = [
          ...current.messages,
          { id: randomUUID(), role: "user", text: question, at, mode },
          {
            id: randomUUID(),
            role: "assistant",
            text: answer.answer,
            at,
            mode,
          },
        ].slice(-40) as ArchitectMessage[];
      current.updatedAt = at;
      this.save(latest);
      return current;
    } finally {
      this.busy.delete(id);
    }
  }
}
