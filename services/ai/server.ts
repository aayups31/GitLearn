import { createRuntime } from "./runtime.js";
try {
  const { app, pool, config } = await createRuntime();
  const server = app.listen(config.port, "0.0.0.0", () =>
    console.log("OutClass included AI service started."),
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () => server.close(() => void pool.end()));
} catch {
  console.error(
    "Configure the OutClass AI service and apply its database migration before starting.",
  );
  process.exitCode = 1;
}
