import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Code2, Folder, RefreshCw } from "lucide-react";
import type { Course, Diagnostics, Status } from "../shared";

export function ContinueLearning({
  state,
  busy,
  onContinue,
  onChooseFolder,
}: {
  state: Status;
  busy: boolean;
  onContinue: (courseId: string) => void;
  onChooseFolder: (course: Course) => void;
}) {
  if (!state.continueItems?.length) return null;
  return (
    <section className="continue-learning" aria-label="Continue learning">
      <div className="section-heading">
        <h2>Continue building</h2>
        <span className="quiet-note">Your place is saved on this device</span>
      </div>
      {state.continueItems.slice(0, 3).map((anchor) => {
        const course = state.courses.find(
          (item) => item.id === anchor.courseId,
        )!;
        const lesson = course.lessons.find(
          (item) => item.id === anchor.lessonId,
        );
        const checkpoint = state.checkpoints.find(
          (item) => item.courseId === course.id,
        );
        const otherSession =
          !!state.session && state.session.courseId !== course.id;
        return (
          <div className="continue-row" key={course.id}>
            <span className="continue-icon">
              <Code2 size={19} />
            </span>
            <div className="continue-copy">
              <strong>{course.title}</strong>
              <p>
                {lesson?.title || "Last lesson"}
                {anchor.file ? ` · ${anchor.file}` : ""}
              </p>
              <small>
                {!anchor.folderAvailable
                  ? "Coding folder is missing. Choose its current location to continue."
                  : !anchor.fileAvailable
                    ? "Last file is missing. Available files will open."
                    : anchor.lastAction === "checkpoint"
                      ? "Last session checkpointed. Ready for your next change."
                      : anchor.lastAction === "paused"
                        ? "Session paused. Pick up where you left off."
                        : "Your last workspace is ready."}
              </small>
              {anchor.note && (
                <p className="continue-note">{anchor.note.slice(0, 220)}</p>
              )}
              {checkpoint && (
                <small>
                  Last checkpoint · {checkpoint.message.split("\n")[0]}
                </small>
              )}
              {otherSession && (
                <small>Finish the current session to switch courses.</small>
              )}
            </div>
            <button
              className="button secondary"
              disabled={busy || otherSession}
              onClick={() =>
                anchor.folderAvailable
                  ? onContinue(course.id)
                  : onChooseFolder({
                      ...course,
                      currentLessonId: anchor.lessonId,
                    })
              }
            >
              {anchor.folderAvailable ? (
                <>
                  Continue <ArrowRight size={14} />
                </>
              ) : (
                <>
                  Choose folder <Folder size={14} />
                </>
              )}
            </button>
          </div>
        );
      })}
    </section>
  );
}

export function SetupDiagnostics({
  api,
}: {
  api: <T>(route: string, body?: unknown) => Promise<T>;
}) {
  const [result, setResult] = useState<Diagnostics>(),
    [error, setError] = useState(""),
    [checking, setChecking] = useState(false);
  const check = async () => {
    setChecking(true);
    setError("");
    try {
      setResult(await api<Diagnostics>("diagnostics"));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not check this device.",
      );
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    void check();
  }, []);
  const rows: [string, boolean, string][] = result
    ? [
        ["JavaScript", true, `Node ${result.nodeVersion} · ready locally`],
        [
          "Web projects",
          result.webToolchainAvailable,
          result.webToolchainAvailable
            ? "Installed Node.js detected · npm/Vite projects can use the project console"
            : "Install Node.js with npm for web projects. Short JavaScript runs work now.",
        ],
        [
          "Python",
          result.pythonAvailable,
          result.pythonAvailable
            ? `Ready · ${result.pythonRuntime}`
            : "Install Python, then restart GitLearn. JavaScript works now.",
        ],
        [
          "Checkpoints",
          result.gitAvailable && result.historyWritable,
          !result.gitAvailable
            ? "Install Git, then restart GitLearn."
            : result.historyWritable
              ? "Git and learning folder are ready"
              : "Choose a writable learning folder below",
        ],
        ...(result.workspaceWritable === null
          ? []
          : [
              [
                "Coding folder",
                result.workspaceWritable,
                result.workspaceWritable
                  ? "Available and writable"
                  : "Folder is missing or read-only. Choose its current location.",
              ] as [string, boolean, string],
            ]),
        [
          "Learning assistant",
          result.hasApiKey && result.assistantEnabled,
          !result.hasApiKey
            ? "Add your API key to enable AI. Coding and checkpoints work locally."
            : result.assistantEnabled
              ? "Key configured · assistant enabled"
              : "Key configured · enable the assistant in Code & Learn",
        ],
        [
          "Udemy extension",
          result.extensionConnected,
          result.extensionConnected
            ? "Paired with this device"
            : "Pair below, or add a course manually",
        ],
      ]
    : [];
  return (
    <section className="setup-card diagnostics" aria-label="Device readiness">
      <div className="setup-heading">
        <span className="setup-icon">
          <Code2 size={22} />
        </span>
        <div>
          <h2>Your device is ready when you are</h2>
          <p>Check the tools GitLearn uses for local learning.</p>
        </div>
        <button className="text-button" disabled={checking} onClick={check}>
          <RefreshCw size={14} className={checking ? "spin" : ""} />
          {checking ? "Checking…" : "Check again"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="diagnostic-list">
        {rows.map(([label, ready, detail]) => (
          <div key={label}>
            <span
              className={ready ? "diagnostic-ready" : "diagnostic-optional"}
            >
              {ready ? <Check size={14} /> : <span className="dot offline" />}
            </span>
            <strong>{label}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
