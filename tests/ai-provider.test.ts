import { it, expect, vi, afterEach } from "vitest";
import { AIProvider, endpoint } from "../src/server/ai-provider";
import { teacherAnswer } from "../src/ai-contract";
function provider() {
  const data = new Map<string, unknown>();
  return new AIProvider({
    apiKey: undefined,
    store: {
      get: (k: string) => data.get(k),
      put: (k: string, v: unknown) => data.set(k, v),
    },
  } as any);
}
afterEach(() => vi.restoreAllMocks());
it("accepts HTTPS hosted services and only loopback local model endpoints", () => {
  expect(endpoint("https://ai.example/")).toBe("https://ai.example");
  expect(endpoint("http://127.0.0.1:11434/v1", true)).toContain("/v1");
  for (const url of [
    "http://external.example",
    "https://user:secret@ai.example",
    "https://ai.example/?token=secret",
  ])
    expect(() => endpoint(url)).toThrow();
  expect(() => endpoint("https://external.example", true)).toThrow();
});
it("routes included AI without a user OpenAI key and never returns session tokens in status", async () => {
  const p = provider();
  p.configure({
    mode: "included",
    service: "https://ai.example",
    localEndpoint: "http://127.0.0.1:11434/v1",
    localModel: "",
  });
  p.session = {
    access_token: "account-token",
    refresh_token: "refresh-token",
    expires_at: Date.now() / 1000 + 600,
    email: "learner@example.com",
  };
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        answer: { answer: "Predict the output first.", citations: [] },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  const answer = await p.structured({
    task: "teacher",
    schema: teacherAnswer,
    name: "teacher",
    instructions: "Teach",
    context: "One lesson",
    history: [],
  });
  expect(answer.answer).toContain("Predict");
  expect(fetch.mock.calls[0][1]?.headers).toMatchObject({
    Authorization: "Bearer account-token",
  });
  expect(JSON.stringify(p.status())).not.toContain("account-token");
  expect(() =>
    p.configure({ ...p.config(), service: "https://another.example" }),
  ).toThrow("Sign out");
});
it("persists verified accounts via the secret vault and removes them on sign out", async () => {
  const p = provider();
  p.configure({
    ...p.config(),
    mode: "included",
    service: "https://ai.example",
  });
  p.persist = vi.fn().mockResolvedValue(undefined);
  const session = {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: Math.floor(Date.now() / 1000) + 600,
    email: "learner@example.com",
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(session)),
  );
  await p.verify(session.email, "123456");
  expect(p.persist).toHaveBeenCalledWith(session);
  expect(p.ready()).toBe(true);
  await p.logout();
  expect(p.persist).toHaveBeenLastCalledWith(null);
  expect(p.ready()).toBe(false);
});
it("fails closed when included AI is unconfigured or allowance is exhausted", async () => {
  const p = provider();
  await expect(p.login("learner@example.com")).rejects.toThrow(
    "not been connected",
  );
  p.configure({
    ...p.config(),
    mode: "included",
    service: "https://ai.example",
  });
  p.session = {
    access_token: "a",
    refresh_token: "r",
    expires_at: Date.now() / 1000 + 600,
    email: "learner@example.com",
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "Your allowance is used up." }), {
      status: 402,
    }),
  );
  await expect(
    p.structured({
      task: "teacher",
      schema: teacherAnswer,
      name: "teacher",
      instructions: "Teach",
      context: "lesson",
    }),
  ).rejects.toThrow("allowance");
});
it("does not restore an account when sign-out occurs during token refresh", async () => {
  const p = provider();
  p.configure({
    ...p.config(),
    mode: "included",
    service: "https://ai.example",
  });
  p.session = {
    access_token: "expired",
    refresh_token: "old",
    expires_at: 1,
    email: "learner@example.com",
  };
  p.persist = vi.fn().mockResolvedValue(undefined);
  let finish!: (response: Response) => void;
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const usage = p.usage();
  const rejected = expect(usage).rejects.toThrow("account changed");
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  await p.logout();
  finish(
    new Response(
      JSON.stringify({
        access_token: "new",
        refresh_token: "new",
        expires_at: Math.floor(Date.now() / 1000) + 600,
        email: "learner@example.com",
      }),
    ),
  );
  await rejected;
  expect(p.session).toBeUndefined();
  expect(p.persist).toHaveBeenCalledTimes(1);
  expect(p.persist).toHaveBeenLastCalledWith(null);
  expect(request).toHaveBeenCalledTimes(1);
});
it("serializes the secret vault so a slow sign-in write cannot survive sign-out", async () => {
  const p = provider();
  p.configure({
    ...p.config(),
    mode: "included",
    service: "https://ai.example",
  });
  const session = {
    access_token: "a",
    refresh_token: "r",
    expires_at: Math.floor(Date.now() / 1000) + 600,
    email: "learner@example.com",
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(session)),
  );
  let finish!: () => void;
  p.persist = vi.fn().mockImplementation((value) =>
    value
      ? new Promise<void>((r) => {
          finish = r;
        })
      : Promise.resolve(),
  );
  const verification = p.verify(session.email, "123456");
  const rejected = expect(verification).rejects.toThrow("signed out");
  await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
  const signout = p.logout();
  finish();
  await signout;
  await rejected;
  expect(p.persist).toHaveBeenLastCalledWith(null);
  expect(p.ready()).toBe(false);
});
it("clears an expired account when its refresh is rejected and reports a recoverable network failure", async () => {
  const p = provider();
  p.configure({
    ...p.config(),
    mode: "included",
    service: "https://ai.example",
  });
  p.session = {
    access_token: "a",
    refresh_token: "r",
    expires_at: 1,
    email: "learner@example.com",
  };
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ error: "Expired" }), { status: 400 }),
  );
  await expect(p.usage()).rejects.toThrow("Sign in again");
  expect(p.session).toBeUndefined();
  vi.mocked(fetch).mockRejectedValue(new TypeError("Network secret error"));
  await expect(p.login("learner@example.com")).rejects.toThrow(
    "could not be reached",
  );
});
