import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const names = [
  `OutClass-Setup-${version}.exe`,
  `OutClass-Chrome-${version}.zip`,
  `OutClass-Editor-${version}.vsix`,
];
const lines = [];
for (const name of names)
  lines.push(
    `${createHash("sha256")
      .update(await readFile("dist/releases/" + name))
      .digest("hex")}  ${name}`,
  );
await writeFile("dist/releases/SHA256SUMS.txt", lines.join("\n") + "\n");
console.log("Generated checksums for installer and Chrome extension.");
