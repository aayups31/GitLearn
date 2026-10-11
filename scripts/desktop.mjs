import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const electronPath = createRequire(import.meta.url)("electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electronPath, ["."], {
  env,
  stdio: "inherit",
  windowsHide: true,
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
child.on("error", () => {
  console.error("OutClass could not start. Run npm run build first.");
  process.exitCode = 1;
});
