import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import type { Application } from "./application.js";
import { assertClean, UserError } from "./safety.js";
import type { AIUsage } from "../ai-contract.js";
export type AIConfig = {
  mode: "personal" | "included" | "local";
  service: string;
  localEndpoint: string;
  localModel: string;
};
export type AccountSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
};
const defaults: AIConfig = {
  mode: "personal",
  service: process.env.OUTCLASS_AI_SERVICE || "",
  localEndpoint: "http://127.0.0.1:11434/v1",
  localModel: "",
};
export function endpoint(value: string, local = false) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UserError("Enter a valid AI service URL.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (local && !loopback) ||
    (!local &&
      url.protocol !== "https:" &&
      !(loopback && url.protocol === "http:")) ||
    (local && !["http:", "https:"].includes(url.protocol))
  )
    throw new UserError(
      local
        ? "Local models must use a localhost endpoint without credentials."
        : "Included AI requires an HTTPS service URL without credentials.",
    );
  return url.href.replace(/\/$/, "");
}
export class AIProvider {
  session?: AccountSession;
  persist?: (session: AccountSession | null) => Promise<void>;
  private refreshPromise?: Promise<void>;
  constructor(private app: Application) {}
  config(): AIConfig {
    return { ...defaults, ...this.app.store.get<AIConfig>("ai:config") };
  }
  ready() {
    const c = this.config();
    return c.mode === "personal"
      ? !!this.app.apiKey
      : c.mode === "local"
        ? !!c.localModel
        : !!(c.service && this.session);
  }
  status() {
    const c = this.config();
    return {
      ...c,
      ready: this.ready(),
      account: this.session ? { email: this.session.email } : null,
      securePersistence: !!this.persist,
    };
  }
  configure(input: AIConfig) {
    input.service = input.service ? endpoint(input.service) : "";
    input.localEndpoint = endpoint(input.localEndpoint, true);
    assertClean(input.localModel, "model name");
    if (input.service !== this.config().service && this.session)
      throw new UserError("Sign out before changing the included AI service.");
    this.app.store.put("ai:config", input);
    return this.status();
  }
  private async request(route: string, body?: unknown, authenticated = false) {
    const c = this.config();
    if (!c.service)
      throw new UserError(
        "Included AI has not been connected to a hosted service yet. Use a personal key or local model meanwhile.",
      );
    if (authenticated) await this.refresh();
    const response = await fetch(`${endpoint(c.service)}/v1/${route}`, {
      method: body === undefined ? "GET" : "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(authenticated && this.session
          ? { Authorization: `Bearer ${this.session.access_token}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(35000),
    });
    const result = await response.json();
    if (!response.ok)
      throw new UserError(
        typeof result.error === "string"
          ? result.error.slice(0, 300)
          : "The AI service could not complete this request.",
        response.status,
      );
    return result;
  }
  async login(email: string) {
    await this.request("auth/email", { email });
    return { sent: true };
  }
  async verify(email: string, code: string) {
    const session = await this.request("auth/verify", { email, code });
    await this.saveSession(session);
    return this.status();
  }
  private async saveSession(input: unknown) {
    const parsed = z
      .object({
        access_token: z.string().min(1).max(12000),
        refresh_token: z.string().min(1).max(12000),
        expires_at: z.number().int(),
        email: z.string().email(),
      })
      .parse(input);
    if (this.persist) await this.persist(parsed);
    this.session = parsed;
  }
  async logout() {
    if (this.persist) await this.persist(null);
    this.session = undefined;
    return this.status();
  }
  private async refresh() {
    if (!this.session) throw new UserError("Sign in to use included AI.", 401);
    if (this.session.expires_at > Date.now() / 1000 + 60) return;
    if (!this.refreshPromise)
      this.refreshPromise = this.request("auth/refresh", {
        refreshToken: this.session.refresh_token,
      })
        .then((s) => this.saveSession(s))
        .finally(() => {
          this.refreshPromise = undefined;
        });
    await this.refreshPromise;
  }
  async usage(): Promise<AIUsage> {
    return this.request("usage", undefined, true);
  }
  async checkout() {
    return this.request("checkout", {}, true) as Promise<{ url: string }>;
  }
  async structured<T extends z.ZodType>(options: {
    task: "teacher" | "architect" | "checkpoint";
    schema: T;
    name: string;
    instructions: string;
    context: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }): Promise<z.infer<T>> {
    const { task, schema, name, instructions, context, history = [] } = options;
    assertClean(context + JSON.stringify(history), "AI context");
    const c = this.config();
    if (!this.ready())
      throw new UserError("Choose an AI connection in Settings first.");
    let output: unknown;
    if (c.mode === "included") {
      const response = await this.request(
        "answer",
        { task, context, history },
        true,
      );
      output = response.answer;
    } else if (c.mode === "local") {
      const client = new OpenAI({
        apiKey: "local-model",
        baseURL: endpoint(c.localEndpoint, true),
        timeout: 60000,
        maxRetries: 0,
      });
      const response = await client.chat.completions.create({
        model: c.localModel,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${instructions}\nReturn JSON matching this schema: ${JSON.stringify(z.toJSONSchema(schema))}`,
          },
          ...history,
          { role: "user", content: context },
        ],
      });
      output = JSON.parse(response.choices[0]?.message.content || "{}");
    } else {
      const client = new OpenAI({
        apiKey: this.app.apiKey,
        timeout: 25000,
        maxRetries: 0,
      });
      const response = await client.responses.parse({
        model:
          process.env.OPENAI_CHAT_MODEL ||
          process.env.OPENAI_MODEL ||
          "gpt-4o-mini",
        store: false,
        max_output_tokens: task === "checkpoint" ? 250 : 1800,
        instructions,
        input: [...history, { role: "user", content: context }],
        text: { format: zodTextFormat(schema, name) },
      });
      output = response.output_parsed;
    }
    const parsed = schema.parse(output);
    assertClean(JSON.stringify(parsed), "AI response");
    return parsed;
  }
}
