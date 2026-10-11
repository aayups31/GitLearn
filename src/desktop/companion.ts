import path from "node:path";
import express from "express";
import { Store } from "../server/store";
import { Application } from "../server/application";
import { createApp } from "../server/http";
const parentPort = process.parentPort;

parentPort!.once("message", async ({ data }) => {
  const { root, dataDirectory, port, apiKey } = data;
  const store = new Store(dataDirectory);
  const application = new Application(store, apiKey || undefined);
  await application.recover();
  const web = createApp(application, port, () =>
    parentPort.postMessage({ type: "focus" }),
  );
  web.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    );
    next();
  });
  web.use("/welcome", express.static(path.join(root, "dist/site")));
  web.use(express.static(path.join(root, "dist/web")));
  web.get("/{*splat}", (_req, res) =>
    res.sendFile(path.join(root, "dist/web/index.html")),
  );
  const server = web.listen(port, "127.0.0.1", () =>
    parentPort!.postMessage({ type: "ready" }),
  );
  server.on("error", () => {
    parentPort!.postMessage({
      type: "error",
      message:
        "GitLearn's local port is in use. Close the other companion and reopen GitLearn.",
    });
    store.close();
    process.exit(1);
  });
  parentPort!.on("message", async ({ data: message }) => {
    if (message.type === "key") {
      application.apiKey = message.key || undefined;
      parentPort!.postMessage({ type: "key-saved", id: message.id });
    }
    if (message.type === "shutdown") {
      await web.locals.stopPrograms();
      server.close(() => {
        store.close();
        process.exit(0);
      });
      server.closeAllConnections();
    }
  });
});
