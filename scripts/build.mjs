import { build as bundle } from "esbuild";
import { build as viteBuild } from "vite";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
await import("./build-editor.mjs");
await viteBuild({
  build: {
    outDir: "dist/web",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        workspace: path.resolve("index.html"),
      },
    },
  },
});
await bundle({
  entryPoints: ["src/server/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "dist/server/index.js",
  sourcemap: true,
});
await mkdir("dist/extension", { recursive: true });
await bundle({
  entryPoints: [
    "extension/background.ts",
    "extension/content.ts",
    "extension/popup.ts",
  ],
  bundle: true,
  outdir: "dist/extension",
  format: "iife",
  target: "chrome120",
});
await cp("extension/static", "dist/extension", { recursive: true });
await cp("src/site", "dist/site", { recursive: true });
for (const name of ["main", "preload", "companion"]) {
  await bundle({
    entryPoints: [`src/desktop/${name}.ts`],
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    outfile: `dist/desktop/${name}.cjs`,
    target: "node24",
  });
}
console.log(
  "Built desktop app, local workspace, static site, and Chrome extension.",
);
