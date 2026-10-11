import { cp } from "node:fs/promises";
await cp("src/site", "dist/site", { recursive: true });
console.log(
  "Built standalone OutClass site in dist/site. No workspace or API is hosted.",
);
