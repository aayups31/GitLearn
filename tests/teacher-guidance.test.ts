import { it, expect } from "vitest";
import {
  teacherGuidance,
  protectsLearnerWork,
  ensureDiagnosticQuestion,
  fallbackTeacherHint,
} from "../src/teacher-guidance";

it("advances hints from a concept to an experiment and inspection, then fades help after actual passing checks", () => {
  const context = {
    hintsRequested: 0,
    latestAttempt: {
      at: "2026-10-13T12:00:00Z",
      passed: false,
      stale: false,
      checks: [{ passed: true }, { passed: false }],
    },
  } as any;
  expect(teacherGuidance(context).stage).toBe("concept");
  context.hintsRequested = 1;
  expect(teacherGuidance(context).stage).toBe("experiment");
  context.hintsRequested = 4;
  expect(teacherGuidance(context).stage).toBe("inspect");
  context.latestAttempt.passed = true;
  expect(teacherGuidance(context)).toMatchObject({ stage: "transfer" });
  expect(teacherGuidance(context).reason).toContain("unverified");
});
it("does not let an old passing attempt conceal a newer failure or incomplete execution", () => {
  const context = {
    hintsRequested: 1,
    latestAttempt: {
      at: "2026-10-13T12:00:00Z",
      passed: true,
      stale: false,
      checks: [],
    },
  } as any;
  const run = { finishedAt: "2026-10-13T12:01:00Z", exitCode: 1 } as any;
  expect(teacherGuidance(context, run).stage).toBe("experiment");
  expect(teacherGuidance(context, { ...run, timedOut: true }).stage).toBe(
    "verify",
  );
  expect(
    teacherGuidance(context, undefined, {
      state: "finished",
      truncated: true,
      exitCode: 0,
    }).stage,
  ).toBe("verify");
  expect(
    teacherGuidance({
      ...context,
      latestAttempt: { ...context.latestAttempt, stale: true },
    }).stage,
  ).toBe("verify");
});
it("labels the initial attempt honestly", () => {
  expect(teacherGuidance().reason).toContain("no recorded execution");
});
it("a rejected replacement remains useful by teaching from the actual failed check or error", () => {
  expect(
    fallbackTeacherHint({
      latestAttempt: {
        checks: [{ label: "Negative prices are rejected", passed: false }],
      },
    } as any),
  ).toContain("Negative prices are rejected");
  const hint = fallbackTeacherHint(undefined, {
    path: "main.js",
    output: "TypeError: Cannot read properties of undefined (reading 'name')",
    exitCode: 1,
  });
  expect(hint).toContain("Which value should exist");
  expect(hint).toContain("Log that value");
  expect(hint).not.toContain("const profile");
});
it("keeps replacement code out of hints and distinguishes a separate explanation example from a rewritten learner script", () => {
  expect(
    protectsLearnerWork("Try this:\n```js\nconsole.log(42);\n```", "hint"),
  ).toBe(false);
  expect(
    protectsLearnerWork(
      "```js\nconst profile = { name: 'A' };\n```",
      "explain",
      "const profile = undefined;",
    ),
  ).toBe(false);
  expect(
    protectsLearnerWork(
      "```js\nconst book = { title: 'Example' };\n```",
      "explain",
      "const profile = undefined;",
    ),
  ).toBe(true);
  expect(
    protectsLearnerWork(
      "```js\nexport function discountedPrice() {}\n```",
      "explain",
      "",
      "discountedPrice",
    ),
  ).toBe(false);
});
it("keeps inline replacement scripts out of explanations and supplies a diagnostic question when a model omits one", () => {
  expect(
    protectsLearnerWork(
      "Set `const profile = { name: 'A' };` to fix it.",
      "explain",
      "const profile = undefined;",
    ),
  ).toBe(false);
  expect(
    protectsLearnerWork(
      "The declaration `const profile = undefined;` explains the error.",
      "explain",
      "const profile = undefined;",
    ),
  ).toBe(true);
  expect(
    ensureDiagnosticQuestion(
      "The negative input failed.",
      "concept",
      "Negative prices are rejected",
    ),
  ).toContain("what result do you predict");
  expect(ensureDiagnosticQuestion("The checks passed.", "transfer")).toContain(
    "requirement changed",
  );
  expect(
    ensureDiagnosticQuestion("What result do you predict?", "concept"),
  ).toBe("What result do you predict?");
});
