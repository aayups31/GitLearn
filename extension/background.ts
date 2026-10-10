import { observationSchema, type Observation } from "../src/shared";
const origin = "http://127.0.0.1:47831";
let flushing: Promise<void> | undefined;
let storageQueue: Promise<unknown> = Promise.resolve();
function stored<T>(action: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(action);
  storageQueue = result.catch(() => {});
  return result;
}
function outbox(value: unknown): Observation[] {
  return Array.isArray(value) ? value : [];
}
async function send(route: string, body?: unknown) {
  const { token } = await chrome.storage.local.get("token");
  const response = await fetch(`${origin}/api/${route}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(typeof token === "string"
        ? { Authorization: `Bearer ${token}` }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Open the companion to reconnect.");
  return result;
}
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const snapshot = await stored(() =>
      chrome.storage.local.get(["token", "outbox"]),
    );
    if (!snapshot.token) return;
    for (const item of outbox(snapshot.outbox)) {
      await send("observations", item);
      await stored(async () => {
        const current = await chrome.storage.local.get("outbox");
        await chrome.storage.local.set({
          outbox: outbox(current.outbox).filter(
            (event) => event.eventId !== item.eventId,
          ),
        });
      });
    }
    const remaining = await chrome.storage.local.get("outbox");
    await chrome.action.setBadgeText({
      text: outbox(remaining.outbox).length ? "•" : "",
    });
  })()
    .catch(async () => {
      await chrome.action.setBadgeText({ text: "•" });
      await chrome.action.setBadgeBackgroundColor({ color: "#c49651" });
    })
    .finally(() => {
      flushing = undefined;
    });
  return flushing;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    message.type === "observation" &&
    sender.tab?.url &&
    /^https:\/\/(?:[a-z0-9-]+\.)*udemy\.com\/course\//.test(sender.tab.url)
  ) {
    const parsed = observationSchema.safeParse(message.payload);
    if (!parsed.success) {
      respond({ ok: false });
      return false;
    }
    stored(async () => {
      const snapshot = await chrome.storage.local.get("outbox");
      const current = outbox(snapshot.outbox);
      if (current.length >= 100) {
        await chrome.storage.local.set({
          queueNotice:
            "Too many pending observations. Open the companion before continuing.",
        });
        return false;
      }
      await chrome.storage.local.set({
        outbox: [...current, parsed.data],
        latest: parsed.data,
        queueNotice: "",
      });
      return true;
    }).then(
      (ok) => {
        respond({ ok });
        void flush();
      },
      () => respond({ ok: false }),
    );
    return true;
  }
  if (
    sender.id !== chrome.runtime.id ||
    (sender.tab && !sender.url?.startsWith(chrome.runtime.getURL("")))
  )
    return false;
  (async () => {
    if (message.type === "open-workspace") return send("open-desktop", {});
    if (message.type === "capture-transcript") {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs.find(
        (item) =>
          item.id &&
          /^https:\/\/(?:[a-z0-9-]+\.)*udemy\.com\/course\//.test(
            item.url || "",
          ),
      );
      if (!tab?.id)
        throw new Error("Open your Udemy lesson in the current tab first.");
      const result = await chrome.tabs
        .sendMessage(tab.id, { type: "read-transcript" })
        .catch(() => {
          throw new Error(
            "Reload your Udemy course after updating the extension, then open its Transcript panel.",
          );
        });
      if (result.error) throw new Error(result.error);
      const observation = observationSchema.parse(result.observation);
      await send("course-material", {
        courseId: observation.courseId,
        title: result.title,
        content: result.content,
        kind: "transcript",
        lessonId: result.lessonId || "",
        observation,
      });
      return { ok: true };
    }
    if (message.type === "pair") {
      const result = await send("pair", { code: message.code });
      await stored(() => chrome.storage.local.set({ token: result.token }));
      await flush();
      return { ok: true };
    }
    if (message.type === "status") {
      const local = await chrome.storage.local.get([
        "latest",
        "outbox",
        "token",
        "queueNotice",
      ]);
      let companion = null;
      try {
        companion = await send("extension-status");
      } catch {}
      return { ...local, token: !!local.token, companion };
    }
    if (message.type === "retry") {
      await flush();
      return { ok: true };
    }
    if (message.type === "disconnect") {
      await chrome.storage.local.remove("token");
      return { ok: true };
    }
    throw new Error("Unknown action");
  })().then(
    (result) => respond(result),
    (error) =>
      respond({
        error: error.message || "Open the local companion and try again.",
      }),
  );
  return true;
});
chrome.alarms.create("flush", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(() => void flush());
chrome.runtime.onStartup.addListener(() => void flush());
