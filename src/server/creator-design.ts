import type { Creative } from "../expansion-contract.js";
export function designExport(creative: Creative, format: "square" | "wide") {
  const width = 1200,
    height = format === "square" ? 1200 : 675;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const wrap = (text: string, max: number) => {
    const rows: string[] = [];
    for (const word of text
      .split(/\s+/)
      .flatMap((w) => w.match(new RegExp(".{1," + max + "}", "gu")) || [])) {
      if (!rows.length || rows.at(-1)!.length + word.length + 1 > max)
        rows.push(word);
      else rows[rows.length - 1] += " " + word;
    }
    return rows;
  };
  const headline = wrap(creative.title, 24).slice(0, 3),
    copy = wrap(creative.copy, 60).slice(0, format === "square" ? 7 : 3);
  const layers = [
    ...headline.map((text, i) => ({
      type: "text",
      text,
      x: 80,
      y: 160 + i * 82,
      size: 68,
      color: "#eaf2ff",
    })),
    ...copy.map((text, i) => ({
      type: "text",
      text,
      x: 80,
      y: format === "square" ? 560 + i * 43 : 420 + i * 39,
      size: 27,
      color: "#a7bfdf",
    })),
  ];
  const scene = {
    schemaVersion: 1,
    creativeId: creative.id,
    revision: creative.revision,
    format,
    width,
    height,
    background: "#080d17",
    accent: creative.brandColor,
    layers,
    sourceRelease: creative.releaseId,
    sourceLesson: creative.lessonIndex,
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="light"><stop stop-color="${creative.brandColor}" stop-opacity=".22"/><stop offset="1" stop-color="#080d17"/></linearGradient></defs><rect width="100%" height="100%" fill="#080d17"/><rect width="100%" height="100%" fill="url(#light)"/><rect x="80" y="80" width="56" height="4" rx="2" fill="${creative.brandColor}"/>${layers.map((l) => `<text x="${l.x}" y="${l.y}" font-family="Arial,sans-serif" font-size="${l.size}" fill="${l.color}" letter-spacing="${l.size === 68 ? -2 : 0}">${escape(l.text)}</text>`).join("")}<path d="M80 ${height - 75}h1040" stroke="#395477"/><text x="80" y="${height - 40}" font-family="Arial,sans-serif" font-size="18" fill="#7999c6">${escape("Course-grounded creative · " + creative.title)}</text></svg>`;
  return { scene, svg };
}
