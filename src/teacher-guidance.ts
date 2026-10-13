import type { Practice } from "./server/practice.js";
import type { RunContext } from "./shared.js";

export function fallbackTeacherHint(
  practice?: ReturnType<Practice["context"]>,
  run?: Pick<RunContext, "path" | "output" | "exitCode">,
  command?: { command: string; output: string; exitCode: number | null },
) {
  const failed = practice?.latestAttempt?.checks.find((check) => !check.passed);
  if (failed)
    return `Your recorded check “${failed.label}” did not pass. Which input or condition would you inspect first, and what result do you predict?\n\nRun that case on its own and compare your prediction with the output before making another change.`;
  const output = run?.output || command?.output || "";
  if (/Cannot read (?:properties|property).*?(?:undefined|null)/i.test(output))
    return "The recorded run tried to read a property from an undefined or null value. Which value should exist at that point, and where should it be created?\n\nLog that value immediately before the failing expression, then rerun and compare it with your prediction.";
  if (
    /(?:ReferenceError|NameError).*?(?:not defined|is not defined)/i.test(
      output,
    )
  )
    return "The recorded run could not find a name when it was used. Where do you expect that name to be created, and is it in the same scope?\n\nTrace the declarations and imports before the failing line, then test one small case.";
  return "Let's work through your approach. Which input or check is failing, and what do you expect it to return?\n\nRun the smallest case that demonstrates the problem, then explain the difference between your prediction and its actual output.";
}

export function protectsLearnerWork(
  text: string,
  style: "hint" | "explain",
  selectedCode?: string,
  taskFunction?: string,
) {
  const fenced = /```/.test(text);
  if (
    fenced &&
    (style === "hint" || (taskFunction && text.includes(taskFunction)))
  )
    return false;
  const declarations = [
    ...(selectedCode || "").matchAll(
      /(?:\b(?:function|class|def|const|let|var)\s+)([A-Za-z_$][\w$]*)/g,
    ),
  ].map((m) => m[1]);
  const blocks = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(
    (m) => m[1],
  );
  if (
    blocks.some((block) =>
      declarations.some((name) =>
        new RegExp(`\\b${name.replace(/[$]/g, "\\$")}\\b`).test(block),
      ),
    )
  )
    return false;
  const inline = [...text.matchAll(/(?<!`)`(?!`)([^`\n]+)`(?!`)/g)].map(
    (m) => m[1],
  );
  return !inline.some(
    (block) =>
      !(selectedCode || "").includes(block) &&
      declarations.some((name) =>
        new RegExp(
          `\\b(?:function|class|def|const|let|var)\\s+${name.replace(/[$]/g, "\\$")}\\b`,
        ).test(block),
      ),
  );
}

export function ensureDiagnosticQuestion(
  text: string,
  stage: string,
  failedCheck?: string,
) {
  if (text.includes("?")) return text;
  const question =
    stage === "transfer"
      ? "What would your approach do if the requirement changed, and why?"
      : stage === "verify"
        ? "Which smaller local check could you run to confirm where execution stops?"
        : stage === "experiment"
          ? "Which single input would confirm or disprove your hypothesis?"
          : failedCheck
            ? `For “${failedCheck}”, what result do you predict before running that case?`
            : "What do you expect to observe when you test this locally?";
  return `${text.slice(0, 13800)}\n\n${question}`;
}

// Evidence selects the teaching stage. It never establishes general mastery.
export function teacherGuidance(
  practice?: ReturnType<Practice["context"]>,
  run?: RunContext,
  command?: {
    exitCode: number | null;
    state: string;
    truncated: boolean;
    finishedAt?: string;
  },
) {
  const attempt = practice?.latestAttempt;
  const hints = practice?.hintsRequested || 0;
  const incomplete =
    run &&
    (run.stopped ||
      run.timedOut ||
      run.outputTruncated ||
      run.changedDuringRun ||
      run.stale);
  if (
    attempt?.stale ||
    incomplete ||
    (command && (command.state !== "finished" || command.truncated))
  )
    return {
      stage: "verify",
      reason:
        "The available execution evidence is incomplete or changed during execution.",
      next: "Explain the evidence limit and suggest a bounded local check. Do not claim a diagnosis or success.",
    };
  const newerFailure =
    attempt &&
    ((run && run.finishedAt > attempt.at && run.exitCode !== 0) ||
      (command?.finishedAt &&
        command.finishedAt > attempt.at &&
        command.exitCode !== 0));
  if (attempt?.passed && !newerFailure)
    return {
      stage: "transfer",
      reason:
        "The recorded task checks passed; understanding beyond those cases is unverified.",
      next: "Ask the learner to explain a choice or predict a changed requirement before offering help.",
    };
  return {
    stage: hints === 0 ? "concept" : hints === 1 ? "experiment" : "inspect",
    reason: attempt
      ? `${attempt.checks.filter((c) => c.passed).length}/${attempt.checks.length} recorded checks passed. ${hints} help requests are recorded for this task.`
      : run || command
        ? "Use the actual execution result; no behavioral task checks are attached."
        : "There is no recorded execution for this attempt yet.",
    next:
      hints === 0
        ? "Ask for a prediction and connect one relevant concept to the learner's approach."
        : hints === 1
          ? "Propose one small diagnostic input or observation, then ask what the learner expects."
          : "Point to one relevant condition or operation to inspect; leave the edit to the learner.",
  };
}
