import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { Application } from "./application.js";
import { observationSchema } from "../shared.js";
import { UserError } from "./safety.js";
import { run } from "./git.js";
import { githubStatus, signInGithub } from "./github.js";
import { Workspace } from "./workspace.js";
import { CourseLibrary } from "./library.js";

const text = z.string().max(2000);
function matches(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function createApp(
  application: Application,
  port: number,
  focusDesktop?: () => void,
) {
  const app = express();
  const workspace = new Workspace(application);
  app.locals.stopPrograms = () => workspace.stopAll();
  const library = new CourseLibrary(application);
  app.disable("x-powered-by");
  const localOrigins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ]);
  const pairAttempts = new Map<string, { count: number; at: number }>();
  app.use((req, res, next) => {
    const host = req.headers.host;
    if (!host || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(host)) {
      res.status(403).json({ error: "Invalid host." });
      return;
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    const origin = req.headers.origin;
    const extension = /^chrome-extension:\/\/[a-p]{32}$/.test(origin || "");
    if (origin && !localOrigins.has(origin) && !extension) {
      res
        .status(403)
        .json({ error: "This page cannot access your learning companion." });
      return;
    }
    if (origin && (localOrigins.has(origin) || extension)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, name: "GitLearn", version: "0.3.0" }),
  );
  app.get("/preview/:token", (req, res) => {
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
    );
    res.type("html").send(workspace.previewDocument(req.params.token));
  });
  app.get("/api/bootstrap", (_req, res) =>
    res.status(403).json({ error: "Connect from the local GitLearn page." }),
  );
  app.post("/api/bootstrap", (req, res) => {
    const origin = req.headers.origin;
    const site = req.headers["sec-fetch-site"];
    if (
      !origin ||
      !localOrigins.has(origin) ||
      (site && !["same-origin", "none"].includes(String(site)))
    ) {
      res
        .status(403)
        .json({ error: "Open the local GitLearn page to connect." });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ token: application.store.get("localToken") });
  });
  app.post("/api/pair", (req, res) => {
    const origin = req.headers.origin || "";
    if (!/^chrome-extension:\/\/[a-p]{32}$/.test(origin)) {
      res
        .status(403)
        .json({ error: "Pair from the GitLearn Chrome extension." });
      return;
    }
    const now = Date.now();
    const attempts = pairAttempts.get(origin);
    if (attempts && now - attempts.at < 60000 && attempts.count >= 5) {
      res
        .status(429)
        .json({ error: "Wait one minute before trying another code." });
      return;
    }
    pairAttempts.set(origin, {
      count: attempts && now - attempts.at < 60000 ? attempts.count + 1 : 1,
      at: attempts?.at || now,
    });
    const input = z
      .object({ code: z.string().regex(/^\d{6}$/) })
      .parse(req.body);
    const pair = application.store.get<{ code: string; expires: number }>(
      "pairCode",
    );
    if (!pair || pair.expires < now || !matches(pair.code, input.code)) {
      res.status(401).json({
        error:
          "That connection code has expired or is incorrect. Get a new code in Setup.",
      });
      return;
    }
    const token = randomBytes(32).toString("hex");
    application.store.transaction(() => {
      application.store.put("extensionToken", { origin, token });
      application.store.remove("pairCode");
    });
    res.json({ token });
  });
  app.use("/api", (req, res, next) => {
    const bearer = req.headers.authorization?.replace(/^Bearer /, "") || "";
    const origin = req.headers.origin;
    const extension = application.store.get<{ origin: string; token: string }>(
      "extensionToken",
    );
    // Chrome omits Origin on extension-worker GETs. The paired bearer still
    // authenticates them; requests carrying an Origin must match the pairing.
    const isExtension =
      !!extension &&
      (!origin || origin === extension.origin) &&
      matches(bearer, extension.token);
    const isLocal =
      (!origin || localOrigins.has(origin)) &&
      matches(bearer, application.store.get<string>("localToken")!);
    if (!isLocal && !isExtension) {
      res.status(401).json({ error: "Reconnect to the local companion." });
      return;
    }
    if (
      isExtension &&
      ![
        "/observations",
        "/extension-status",
        "/course-material",
        "/open-desktop",
      ].includes(req.path)
    ) {
      res.status(403).json({
        error: "Use the local app for workspace and repository actions.",
      });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/state", async (_req, res) =>
    res.json(await application.status()),
  );
  app.post("/api/open-desktop", (_req, res) => {
    focusDesktop?.();
    res.json({ opened: !!focusDesktop });
  });
  const fileQuery = z.object({ sessionId: text.min(1), path: text.min(1) });
  app.get("/api/workspace-files", async (req, res) =>
    res.json(await workspace.list(text.min(1).parse(req.query.sessionId))),
  );
  app.get("/api/diagnostics", async (_req, res) =>
    res.json(await workspace.diagnostics()),
  );
  app.get("/api/workspace-runs", async (req, res) =>
    res.json({
      runs: await workspace.runs(text.min(1).parse(req.query.sessionId)),
    }),
  );
  app.post("/api/editor-anchor", async (req, res) => {
    const input = fileQuery
      .extend({ cursor: z.number().int().min(0).max(512000) })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        workspace.editorAnchor(input.sessionId, input.path, input.cursor),
      ),
    );
  });
  app.post("/api/course-project", async (req, res) => {
    const input = z
      .object({
        courseId: text.min(1),
        mode: z.enum(["lesson", "project"]),
        root: text.min(1).optional(),
      })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        application.bindProject(input.courseId, input.mode, input.root),
      ),
    );
  });
  app.post("/api/continue", async (req, res) => {
    const input = z
      .object({ courseId: text.min(1), workspace: text.min(1).optional() })
      .parse(req.body);
    res.json(
      await application.serial(() => {
        const session = application.store.state().session;
        if (input.workspace && session && workspace.isRunning(session.id))
          throw new UserError(
            "Stop the running program before choosing another folder.",
            409,
          );
        return application.continueCourse(input.courseId, input.workspace);
      }),
    );
  });
  app.get("/api/workspace-file", async (req, res) => {
    const input = fileQuery.parse(req.query);
    res.json(await workspace.read(input.sessionId, input.path));
  });
  app.post("/api/workspace-file", async (req, res) => {
    const input = fileQuery
      .extend({
        content: z.string().max(512000),
        version: z.string().length(64).nullable(),
      })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        workspace.save(
          input.sessionId,
          input.path,
          input.content,
          input.version,
        ),
      ),
    );
  });
  app.post("/api/workspace-run", async (req, res) => {
    const input = fileQuery.parse(req.body);
    res.json(await workspace.run(input.sessionId, input.path));
  });
  app.post("/api/workspace-preview", async (req, res) => {
    const input = fileQuery.parse(req.body);
    res.json(await workspace.preview(input.sessionId, input.path));
  });
  app.post("/api/workspace-stop", (req, res) => {
    workspace.stop(text.min(1).parse(req.body.sessionId));
    res.json({ ok: true });
  });
  app.get("/api/library", (req, res) =>
    res.json(library.status(text.min(1).parse(req.query.courseId))),
  );
  app.post("/api/library-index", async (req, res) => {
    const input = z
      .object({ courseId: text.min(1), semantic: z.boolean().default(true) })
      .parse(req.body);
    res.json(await library.index(input.courseId, input.semantic));
  });
  app.post("/api/library-remove", (req, res) => {
    const input = z
      .object({ courseId: text.min(1), documentId: text.min(1) })
      .parse(req.body);
    library.remove(input.courseId, input.documentId);
    res.json(library.status(input.courseId));
  });
  app.post("/api/course-material", async (req, res) => {
    const input = z
      .object({
        courseId: text.min(1),
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(240000),
        kind: z.enum(["material", "transcript"]).default("material"),
        lessonId: text.default(""),
        observation: observationSchema.optional(),
      })
      .parse(req.body);
    if (input.observation) {
      if (input.observation.courseId !== input.courseId)
        throw new UserError("The transcript must match the selected course.");
      await application.serial(async () =>
        application.observe(input.observation!),
      );
    }
    const documentId = library.document(
      input.courseId,
      input.title,
      input.content,
      input.kind,
      input.lessonId,
    );
    res.json({ documentId, ...library.status(input.courseId) });
  });
  app.post("/api/assistant-enable", async (req, res) => {
    const input = z.object({ enabled: z.boolean() }).parse(req.body);
    if (input.enabled && !application.apiKey)
      throw new UserError(
        "Add an OpenAI API key in the desktop app's Workspace settings, or in .env for the source-development companion.",
      );
    res.json(
      await application.serial(async () => {
        const state = application.configured();
        state.settings.assistantEnabled = input.enabled;
        application.store.save(state);
        return state;
      }),
    );
  });
  app.post("/api/assistant-chat", async (req, res) => {
    const input = z
      .object({
        courseId: text.min(1),
        question: z.string().min(1).max(4000),
        mode: z.enum(["help", "course"]),
        runId: z.string().uuid().optional(),
        tutorStyle: z.enum(["hint", "explain"]).default("explain"),
        selectedCode: z
          .object({ path: z.string().max(300), content: z.string().max(16000) })
          .optional(),
      })
      .parse(req.body);
    if (
      input.selectedCode &&
      application.store.state().session?.courseId !== input.courseId
    )
      throw new UserError(
        "Select the active course before attaching your current code.",
      );
    const session = application.store.state().session;
    if (
      input.runId &&
      (input.mode !== "help" || session?.courseId !== input.courseId)
    )
      throw new UserError(
        "Use Code help in the active course to explain a run.",
      );
    const runContext = input.runId
      ? await workspace.runContext(session!.id, input.runId)
      : undefined;
    res.json(
      await library.ask(
        input.courseId,
        input.question,
        input.mode,
        input.selectedCode,
        runContext,
        input.tutorStyle,
      ),
    );
  });
  app.post("/api/assistant-clear", (req, res) => {
    const id = text.min(1).parse(req.body.courseId);
    library.course(id);
    application.store.remove(`chat:${id}`);
    res.json({ messages: [] });
  });
  app.get("/api/extension-status", (_req, res) => {
    const state = application.store.state();
    res.json({
      configured: state.settings.configured,
      session: state.session
        ? {
            courseTitle: state.session.courseTitle,
            lessonTitle: state.session.lessonTitle,
            status: state.session.status,
          }
        : null,
    });
  });
  app.post("/api/observations", async (req, res) => {
    await application.serial(async () =>
      application.observe(observationSchema.parse(req.body)),
    );
    res.json({ received: true });
  });
  app.post("/api/setup", async (req, res) => {
    const input = z
      .object({ repoPath: text.min(1), aiEnabled: z.boolean() })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        application.setup(input.repoPath, input.aiEnabled),
      ),
    );
  });
  app.post("/api/settings", async (req, res) => {
    const input = z.object({ aiEnabled: z.boolean() }).parse(req.body);
    res.json(
      await application.serial(async () => {
        const state = application.configured();
        state.settings.aiEnabled = input.aiEnabled;
        application.store.save(state);
        return state;
      }),
    );
  });
  app.post("/api/mirror", async (req, res) => {
    const input = z.object({ courseId: text }).parse(req.body);
    res.json(
      await application.serial(() => application.mirror(input.courseId)),
    );
  });
  app.post("/api/start", async (req, res) => {
    const input = z
      .object({ courseId: text, lessonId: text, workspace: text.optional() })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        application.start(input.courseId, input.lessonId, input.workspace),
      ),
    );
  });
  app.post("/api/note", async (req, res) => {
    const input = z
      .object({ note: z.string().max(12000), sessionId: text.optional() })
      .parse(req.body);
    res.json(
      await application.serial(() => {
        if (
          input.sessionId &&
          application.store.state().session?.id !== input.sessionId
        )
          throw new UserError(
            "Your session has changed. Reopen the current workspace.",
            409,
          );
        return application.saveNote(input.note);
      }),
    );
  });
  app.post("/api/session", async (req, res) => {
    const input = z
      .object({ action: z.enum(["pause", "resume", "discard"]) })
      .parse(req.body);
    res.json(
      await application.serial(() => application.sessionAction(input.action)),
    );
  });
  app.post("/api/preview", async (_req, res) =>
    res.json(await application.serial(() => application.preview())),
  );
  app.post("/api/commit", async (req, res) => {
    const input = z
      .object({ previewId: text, message: text.min(1) })
      .parse(req.body);
    res.json(
      await application.serial(() =>
        application.commit(input.previewId, input.message),
      ),
    );
  });
  app.post("/api/remote", async (req, res) => {
    const input = z.object({ url: text }).parse(req.body);
    res.json(await application.serial(() => application.remote(input.url)));
  });
  app.post("/api/create-repository", async (req, res) => {
    const input = z
      .object({ name: z.string().min(1).max(100) })
      .parse(req.body);
    res.json(
      await application.serial(() => application.createRemote(input.name)),
    );
  });
  app.post("/api/github-login", async (_req, res) => {
    await signInGithub();
    res.json({ ok: true });
  });
  app.get("/api/github-status", async (_req, res) =>
    res.json(await githubStatus()),
  );
  app.post("/api/sync", async (_req, res) =>
    res.json(await application.serial(() => application.sync())),
  );
  app.post("/api/pair-code", (_req, res) => {
    const code = randomInt(100000, 1000000).toString();
    application.store.put("pairCode", {
      code,
      expires: Date.now() + 5 * 60000,
    });
    res.json({ code });
  });
  app.post("/api/unpair", (_req, res) => {
    application.store.remove("extensionToken");
    res.json({ ok: true });
  });
  app.post("/api/open-workspace", async (_req, res) => {
    const state = application.configured();
    if (!state.session) throw new UserError("Start a lesson session first.");
    // VS Code's Windows command wrapper requires cmd; arguments are restricted to a canonical saved grant.
    const folder = state.session.workspace;
    if (/["\r\n&|<>^%!]/.test(folder))
      throw new UserError(
        "Open this folder manually in VS Code; its path contains special shell characters.",
      );
    if (process.platform === "win32") {
      const { access } = await import("node:fs/promises");
      const cli = path.join(
        process.env.LOCALAPPDATA || "",
        "Programs",
        "Microsoft VS Code",
        "bin",
        "code.cmd",
      );
      await access(cli).catch(() => {
        throw new UserError(
          "VS Code was not found. Open your coding folder in your editor manually.",
        );
      });
      await run("cmd.exe", [
        "/d",
        "/s",
        "/c",
        `""${cli}" --new-window "${folder}""`,
      ]);
    } else await run("code", ["--new-window", folder]);
    res.json({ ok: true });
  });
  app.post("/api/browse", async (_req, res) => {
    if (process.platform !== "win32")
      throw new UserError("Paste your folder path into the field.");
    const result = await run("powershell.exe", [
      "-NoProfile",
      "-STA",
      "-Command",
      'Add-Type -AssemblyName System.Windows.Forms; $picker = New-Object System.Windows.Forms.FolderBrowserDialog; $picker.Description = "Choose your GitLearn folder"; if ($picker.ShowDialog() -eq "OK") { $picker.SelectedPath }',
    ]);
    res.json({ path: result });
  });
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof UserError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error:
            "Some details are missing or too long. Check your inputs and try again.",
        });
        return;
      }
      res.status(500).json({
        error:
          "Something went wrong. Your local work is safe. Try again or restart the companion.",
      });
    },
  );
  return app;
}
