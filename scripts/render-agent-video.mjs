import fs from "node:fs";
import sharp from "sharp";
import { spawnSync } from "node:child_process";
const dir = ".local/landing-refresh/agent-film-frames";
fs.mkdirSync(dir, { recursive: true });
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const text = (x, y, s, size = 18, fill = "#b1c0da", extra = "") =>
  `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="Segoe UI, Arial" ${extra}>${escape(s)}</text>`;
const rect = (x, y, w, h, fill, rx = 12, stroke = "#23334c") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
const ease = (x) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const appear = (at, t, content) =>
  `<g opacity="${ease((t - at) / 0.55)}" transform="translate(0 ${12 * (1 - ease((t - at) / 0.55))})">${content}</g>`;
function frame(time) {
  const architect = time >= 10;
  const t = architect ? time - 10 : time;
  const agent = architect ? "Architect" : "OffCourse";
  const stages = architect
    ? [
        "Connect your idea",
        "Explore the tradeoffs",
        "Choose a first experiment",
      ]
    : [
        "Understand the attempt",
        "Reason through a hint",
        "Make a change. Test it.",
      ];
  const stage = Math.min(2, Math.floor(t / 3.4));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><radialGradient id="bg" cx="70%" cy="0%" r="100%"><stop stop-color="#162b50"/><stop offset="1" stop-color="#080c14"/></radialGradient><linearGradient id="blue"><stop stop-color="#2c62ed"/><stop offset="1" stop-color="#81bdff"/></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="22"/></filter></defs><rect width="1280" height="720" fill="url(#bg)"/><ellipse cx="1000" cy="210" rx="190" ry="120" fill="#2865e9" opacity=".08" filter="url(#glow)"/>`;
  s +=
    text(48, 48, "OutClass", 24, "#eef4ff", 'font-weight="600"') +
    text(164, 47, "/  " + agent, 17, "#8ea9d0") +
    text(
      1232,
      47,
      "ILLUSTRATIVE WORKFLOW",
      11,
      "#758ba9",
      'text-anchor="end" letter-spacing="2"',
    );
  s += text(
    48,
    110,
    architect
      ? "An idea becomes a next step."
      : "A better hint. A stronger understanding.",
    33,
    "#edf4ff",
    'font-weight="600" letter-spacing="-1"',
  );
  s += text(
    48,
    144,
    architect
      ? "Connect selected learning to something worth building."
      : "Your lesson, your code, and your recorded run — in context.",
    16,
    "#8298b8",
  );
  s += rect(48, 184, 546, 420, "#0a101c") + rect(614, 184, 618, 420, "#111c30");
  s +=
    text(70, 216, architect ? "IDEA NOTEBOOK" : "activity.py", 13, "#a9bddc") +
    text(
      570,
      216,
      architect ? "Selected context" : "Local project",
      12,
      "#6f85a5",
      'text-anchor="end"',
    );
  s += `<path d="M48 235h546 M614 250h618" stroke="#23334c"/>`;
  s +=
    rect(640, 204, 30, 30, "#21478c", 9, "#4b70ac") +
    text(648, 226, architect ? "⌘" : "✧", 21, "#b8d9ff") +
    text(683, 226, agent, 16, "#e2edff", 'font-weight="600"');
  s += text(1204, 226, stages[stage], 11, "#8ba7d1", 'text-anchor="end"');
  if (!architect) {
    const lines = [
      "# Track time across student activities",
      "for event in events:",
      '    user = event["user"]',
      t >= 7.2
        ? '    totals[user] += event["minutes"]'
        : '    totals[user] = event["minutes"]',
    ];
    for (let i = 0; i < lines.length; i++) {
      if (i === 3)
        s += rect(
          64,
          356,
          514,
          40,
          t >= 7.2 ? "#163541" : "#352b25",
          4,
          t >= 7.2 ? "#296875" : "#674f32",
        );
      s +=
        text(72, 281 + i * 33, "" + (i + 1), 13, "#415676") +
        text(
          100,
          281 + i * 33,
          lines[i],
          17,
          i === 0
            ? "#627896"
            : i === 3
              ? t >= 7.2
                ? "#92ddcc"
                : "#e2ba86"
              : "#9ebeff",
          'style="font-family:Consolas,monospace"',
        );
    }
    s += appear(
      1,
      t,
      rect(70, 435, 502, 62, "#0c1524", 8) +
        text(88, 460, "Recorded run", 12, "#819abc") +
        text(
          88,
          482,
          t >= 8
            ? "Passed · Total: 45 minutes"
            : "Expected 45 · Received 20 minutes",
          16,
          t >= 8 ? "#88d7bb" : "#e3b383",
        ),
    );
    s += appear(
      1.8,
      t,
      text(640, 287, "Lesson + current file + recorded error", 12, "#85aaf2") +
        text(640, 330, "What happens to the existing total", 23, "#e2edff") +
        text(640, 362, "when the same student appears twice?", 23, "#e2edff"),
    );
    s += appear(
      3.5,
      t,
      text(640, 416, "Trace two events before changing the code.", 17) +
        text(640, 447, "Predict the result. Then run your change.", 17) +
        rect(640, 473, 365, 35, "#172943", 7) +
        text(
          653,
          496,
          "↗ Collections · imported lesson passage",
          12,
          "#92baff",
        ),
    );
    s += appear(
      7.2,
      t,
      text(
        640,
        558,
        "You make the edit. You verify the result.",
        15,
        "#99c4ff",
      ),
    );
  } else {
    s +=
      text(
        76,
        280,
        "“I keep hearing about events after they happen.”",
        18,
        "#c7d8f0",
      ) +
      text(
        76,
        332,
        "Campus activity finder",
        29,
        "#edf4ff",
        'font-weight="600"',
      );
    s += text(76, 371, "A simple way to find something happening nearby.", 16);
    s += appear(
      0.7,
      t,
      rect(76, 415, 128, 34, "#152642", 8) +
        text(90, 438, "API lessons", 12, "#9dbff3") +
        rect(218, 415, 148, 34, "#152642", 8) +
        text(232, 438, "Your reflections", 12, "#9dbff3"),
    );
    s += appear(
      1.5,
      t,
      text(640, 293, "First, narrow the problem.", 24, "#e2edff") +
        text(640, 329, "Who misses out most often?", 18) +
        text(640, 359, "What do they do to find events today?", 18),
    );
    const nodes = [
      ["Understand", "Talk to three students"],
      ["Prototype", "Build one event feed"],
      ["Validate", "Try it with one student"],
    ];
    nodes.forEach(([title, sub], i) => {
      const y = 396 + i * 61;
      s += appear(
        3 + i * 0.9,
        t,
        rect(640, y, 566, 50, "#14243c", 8) +
          text(656, y + 22, title, 14, "#c4ddff", 'font-weight="600"') +
          text(805, y + 22, sub, 14, "#92aacb"),
      );
    });
  }
  s += text(
    48,
    650,
    architect
      ? "You choose what to build. Architect helps you reason about it."
      : "OffCourse guides the reasoning. The learner writes and runs the code.",
    15,
    "#9bb0cd",
  );
  s += text(
    1232,
    650,
    architect ? "02 / 02" : "01 / 02",
    12,
    "#7086a6",
    'text-anchor="end"',
  );
  s +=
    rect(48, 681, 1184, 2, "#1b2b44", 1, "none") +
    `<rect x="48" y="681" width="${Math.max(1, (1184 * time) / 20)}" height="2" fill="url(#blue)"/>`;
  return s + "</svg>";
}
await Promise.all(
  Array.from({ length: 300 }, (_, i) => i).map(async (i) => {
    await sharp(Buffer.from(frame(i / 15)))
      .png()
      .toFile(dir + "/" + String(i).padStart(4, "0") + ".png");
  }),
);
await sharp(Buffer.from(frame(5.5)))
  .webp({ quality: 90 })
  .toFile("src/site/assets/agents-film-poster.webp");
const result = spawnSync(
  process.env.FFMPEG_PATH || "ffmpeg",
  [
    "-y",
    "-framerate",
    "15",
    "-i",
    dir + "/%04d.png",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-an",
    "src/site/assets/agents-film.mp4",
  ],
  { encoding: "utf8" },
);
if (result.status !== 0) throw Error(result.stderr);
console.log(
  "Created 20-second 1280×720 agent film",
  fs.statSync("src/site/assets/agents-film.mp4").size,
);

