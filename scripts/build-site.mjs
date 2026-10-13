import { cp } from "node:fs/promises";
await cp("src/site", "dist/site", { recursive: true });
console.log(
  "Built OutClass landing page in dist/site. The desktop workspace stays local.",
);
