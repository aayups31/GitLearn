import React, { useEffect, useState } from "react";
import { ArrowRight, Check, Download, Flag, Compass } from "lucide-react";
import type { LearningPath } from "../server/learning-path";
type Path = ReturnType<LearningPath["status"]>;
type Api = <T>(route: string, body?: unknown) => Promise<T>;
export function PersonalPath({
  courseId,
  api,
  onCode,
  onRefresh,
  active,
}: {
  courseId: string;
  api: Api;
  onCode: () => void;
  onRefresh: () => Promise<unknown>;
  active: boolean;
}) {
  const [data, setData] = useState<Path>(),
    [goal, setGoal] = useState(""),
    [experience, setExperience] = useState("new"),
    [minutes, setMinutes] = useState(30);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [reflection, setReflection] = useState<Record<string, string>>({}),
    [references, setReferences] = useState<Record<string, string>>({});
  const [impact, setImpact] =
    useState<Awaited<ReturnType<LearningPath["impact"]>>>();
  useEffect(() => {
    let live = true;
    setData(undefined);
    setError("");
    setNotice("");
    setReflection({});
    setReferences({});
    if (courseId)
      api<Path>(`learning-path?courseId=${encodeURIComponent(courseId)}`)
        .then((r) => {
          if (live) {
            setData(r);
            setGoal(r.direction?.goal || "");
            setExperience(r.direction?.experience || "new");
            setMinutes(r.direction?.minutes || 30);
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [courseId]);
  const action = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };
  const ledger = (format: "markdown" | "html") =>
    action(async () => {
      const result = await api<{ content: string }>(
        `learning-ledger?courseId=${encodeURIComponent(courseId)}&format=${format}`,
      );
      const url = URL.createObjectURL(
        new Blob([result.content], {
          type:
            format === "html"
              ? "text/html;charset=utf-8"
              : "text/markdown;charset=utf-8",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `OutClass-Learning-Ledger.${format === "html" ? "html" : "md"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Ledger exported. Review your reflections and source excerpts before sharing it.",
      );
    });
  if (!courseId) return <p>Add a course to create your learning direction.</p>;
  return (
    <div className="personal-path">
      <div className="path-intro">
        <Compass size={23} />
        <div>
          <h2>Make the course lead somewhere.</h2>
          <p>
            Choose something you want to build. Keep the next step small enough
            to try today.
          </p>
        </div>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="path-notice" role="status">
          {notice}
        </p>
      )}
      <form
        className="direction-form"
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            setData(
              await api<Path>("learning-direction", {
                courseId,
                goal,
                experience,
                minutes,
              }),
            );
            setNotice(
              "Direction saved. Practice and contribution preparation now use your goal and time budget.",
            );
          });
        }}
      >
        <label>
          What do you want to build?
          <textarea
            aria-label="Learning goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={600}
            minLength={8}
            required
            placeholder="A useful command-line tool that helps me track my spending…"
          />
        </label>
        <div>
          <label>
            Your experience
            <select
              aria-label="Learning experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            >
              <option value="new">Starting out</option>
              <option value="some">Some experience</option>
              <option value="experienced">Building on existing skills</option>
            </select>
          </label>
          <label>
            Minutes per session
            <input
              aria-label="Session minutes"
              type="number"
              min={10}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Save direction <ArrowRight size={14} />
          </button>
        </div>
      </form>
      {data?.recommendation && (
        <div className="path-next">
          <small>
            A practical next step · {data.recommendation.minutes} minutes
          </small>
          <h3>{data.recommendation.title}</h3>
          <p>{data.recommendation.reason}</p>
          <p>
            {!data.recommendation.fitsSession &&
              "Split this across sessions. You can defer any practice invitation."}
          </p>
        </div>
      )}
      <div className="path-project-heading">
        <div>
          <h2>Your independent project</h2>
          <p>
            Use one course project across lessons. Attach work you actually did;
            these are learner-reported milestones, supported by references.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={busy || !data?.direction}
          onClick={() =>
            void action(async () => {
              if (!data?.projectBound) {
                if (active)
                  throw new Error(
                    "Finish your current session in Code & learn, then create the course project here. Your existing code stays in its folder.",
                  );
                await api("course-project", { courseId, mode: "project" });
                await onRefresh();
                setData(
                  await api<Path>(
                    `learning-path?courseId=${encodeURIComponent(courseId)}`,
                  ),
                );
                setNotice(
                  "Course project created. Open its coding workspace to save your project brief.",
                );
                return;
              }
              if (!active) {
                onCode();
                return;
              }
              await api("learning-project-brief", { courseId });
              setNotice(
                "OUTCLASS-PROJECT.md created in your coding folder. Existing briefs are never overwritten.",
              );
            })
          }
        >
          {!data?.projectBound
            ? "Create course project"
            : active
              ? "Save project brief"
              : "Open workspace"}
        </button>
      </div>
      <div className="path-milestones">
        {data?.milestones.map((m, index) => (
          <details key={m.id} open={data.next === m.id || undefined}>
            <summary>
              <span className={m.record ? "milestone-done" : "milestone-index"}>
                {m.record ? (
                  <Check size={16} />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </span>
              <span>
                {m.title}
                <small>
                  {m.record
                    ? "Recorded with evidence"
                    : `About ${m.minutes} minutes · ${m.evidence === "execution" ? "recorded execution" : "checkpoint"}`}
                </small>
              </span>
              <Flag size={14} />
            </summary>
            <div className="milestone-body">
              <p>{m.brief}</p>
              {m.record && (
                <blockquote>
                  {m.record.reflection}
                  <small>
                    Evidence {m.record.reference.slice(0, 8)} ·{" "}
                    {new Date(m.record.at).toLocaleDateString()}
                  </small>
                </blockquote>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    setData(
                      await api<Path>("learning-milestone", {
                        courseId,
                        milestoneId: m.id,
                        reference: references[m.id],
                        reflection: reflection[m.id] || "",
                      }),
                    );
                    setNotice(
                      "Milestone recorded with your explanation and attached evidence.",
                    );
                  });
                }}
              >
                <label>
                  Attach a recorded result
                  <select
                    aria-label={`Evidence for ${m.title}`}
                    value={references[m.id] || ""}
                    onChange={(e) =>
                      setReferences((v) => ({ ...v, [m.id]: e.target.value }))
                    }
                    required
                  >
                    <option value="">Choose evidence from this course</option>
                    {data.evidence
                      .filter(
                        (e) =>
                          e.passed &&
                          (m.evidence === "execution"
                            ? e.kind !== "checkpoint"
                            : e.kind === "checkpoint"),
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.kind} · {e.label} ·{" "}
                          {new Date(e.at).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Your explanation
                  <textarea
                    aria-label={`Reflection for ${m.title}`}
                    minLength={20}
                    maxLength={4000}
                    required
                    value={reflection[m.id] || ""}
                    onChange={(e) =>
                      setReflection((v) => ({ ...v, [m.id]: e.target.value }))
                    }
                    placeholder="What did you build or check? What remains uncertain?"
                  />
                </label>
                <button className="text-button" disabled={busy}>
                  Record milestone <Check size={14} />
                </button>
              </form>
            </div>
          </details>
        ))}
      </div>
      {active && (
        <section className="path-impact">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void action(async () =>
                setImpact(
                  await api(
                    `learning-impact?courseId=${encodeURIComponent(courseId)}`,
                  ),
                ),
              )
            }
          >
            Review change impact
          </button>
          {impact && (
            <div>
              <h3>
                Changes since{" "}
                {impact.baselineLesson || "your last successful run"}
              </h3>
              <p>
                {impact.changed.length
                  ? impact.changed.join(", ")
                  : "No changed files detected, or no successful baseline recorded yet."}
              </p>
              {impact.dependencies.map((d) => (
                <p key={d.file}>
                  Recheck {d.file}: references {d.references.join(", ")}
                </p>
              ))}
              <pre>{impact.diff}</pre>
              <small>{impact.note}</small>
            </div>
          )}
        </section>
      )}
      <div className="path-ledger">
        <div>
          <h2>Work you can point to.</h2>
          <p>
            Export your project structure, exact reflections, checkpoints, named
            behavior checks, and help use. This is a reviewable learning record;
            it does not certify mastery or an accepted contribution.
          </p>
        </div>
        <div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void ledger("html")}
          >
            <Download size={14} /> HTML ledger
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void ledger("markdown")}
          >
            Markdown ledger
          </button>
        </div>
      </div>
      {!!data?.memory.length && (
        <div className="path-memory">
          <h3>Your recent learning evidence</h3>
          {data.memory.slice(0, 6).map((m) => (
            <details key={m.taskId}>
              <summary>
                {m.title} · {m.transfer ? "changed requirement" : "practice"} ·{" "}
                {m.latest?.passed && !m.latest.stale
                  ? "recorded checks passed"
                  : "keep investigating"}
              </summary>
              <p>{m.reflection || "No reflection recorded yet."}</p>
              <small>{m.help} help requests recorded</small>
              {m.latest && (
                <>
                  <p>
                    Attempt {m.latest.id} · source hash {m.latest.fileVersion}
                  </p>
                  <pre>{m.latest.source}</pre>
                  {m.latest.checks.map((c) => (
                    <p key={c.label}>
                      {c.passed ? "Passed" : "Needs work"}: {c.label}
                    </p>
                  ))}
                </>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
