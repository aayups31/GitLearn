import React, { useEffect, useState } from "react";
import type { CourseRelease } from "../expansion-contract";
import type { PromotionPlan } from "../server/gtm-studio";
import type { MediaAsset, RenderJob } from "../server/creator-production";
type API = <T>(route: string, body?: unknown) => Promise<T>;
const providers = ["youtube", "linkedin", "x", "instagram"] as const;
export function GTMStudioPanel({
  api,
  releases,
  onCampaign,
  onDirty,
}: {
  api: API;
  releases: CourseRelease[];
  onCampaign: (id: string) => Promise<void>;
  onDirty: (dirty: boolean) => void;
}) {
  const [plans, setPlans] = useState<PromotionPlan[]>([]),
    [selected, setSelected] = useState(""),
    [assets, setAssets] = useState<MediaAsset[]>([]),
    [jobs, setJobs] = useState<RenderJob[]>([]),
    [releaseId, setRelease] = useState(""),
    [lesson, setLesson] = useState(0),
    [title, setTitle] = useState(""),
    [audience, setAudience] = useState(""),
    [destination, setDestination] = useState(""),
    [channels, setChannels] = useState<string[]>(["linkedin", "x"]),
    [mode, setMode] = useState<"source" | "agent">("source"),
    [asset, setAsset] = useState(""),
    [start, setStart] = useState(0),
    [end, setEnd] = useState(15),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [courseRights, setCourseRights] = useState(false);
  const [dirtyPlan, setDirtyPlan] = useState(""),
    [preview, setPreview] = useState<{ url: string; jobId: string }>(),
    [sourceFile, setSourceFile] = useState<File>(),
    [sourceRights, setSourceRights] = useState(false);
  useEffect(() => {
    onDirty(!!dirtyPlan);
    return () => onDirty(false);
  }, [dirtyPlan, onDirty]);
  const plan = plans.find((p) => p.id === selected),
    release = releases.find((r) => r.id === releaseId);
  async function refresh() {
    const [p, m] = await Promise.all([
      api<PromotionPlan[]>("expansion/promotions"),
      api<{ assets: MediaAsset[]; jobs: RenderJob[] }>("expansion/media/state"),
    ]);
    setPlans(p);
    setAssets(m.assets);
    setJobs(m.jobs);
  }
  useEffect(() => {
    let live = true;
    Promise.all([
      api<PromotionPlan[]>("expansion/promotions"),
      api<{ assets: MediaAsset[]; jobs: RenderJob[] }>("expansion/media/state"),
    ])
      .then(([p, m]) => {
        if (live) {
          setPlans(p);
          setSelected(p.at(-1)?.id || "");
          setAssets(m.assets);
          setJobs(m.jobs);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [api]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gtm-studio-panel">
      <div className="product-panel-heading">
        <h2>Promotion studio</h2>
        <span>Course material → channel-ready posts and previews</span>
      </div>
      <p>
        Create your promotion here. GTM uses the shared production engine; you
        do not need to build every asset manually in Creator Studio.
      </p>
      <details open={!plans.length}>
        <summary>New promotion</summary>
        <fieldset disabled={busy}>
          <div className="product-input-row">
            <label>
              Course release
              <select
                aria-label="Promotion course release"
                value={releaseId}
                onChange={(e) => {
                  setRelease(e.target.value);
                  setLesson(0);
                }}
              >
                <option value="">Choose a release</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} · v{r.revision}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source lesson
              <select
                aria-label="Promotion source lesson"
                value={lesson}
                onChange={(e) => setLesson(Number(e.target.value))}
              >
                {release?.lessons.map((l, i) => (
                  <option key={i} value={i}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Promotion title
            <input
              aria-label="Promotion title"
              value={title}
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Audience and intent
            <textarea
              aria-label="Promotion audience"
              value={audience}
              maxLength={1500}
              placeholder="Who should see this, and what should they understand?"
              onChange={(e) => setAudience(e.target.value)}
            />
          </label>
          <label>
            Destination
            <input
              aria-label="Promotion destination"
              value={destination}
              type="url"
              maxLength={2000}
              placeholder="https://your-course-page…"
              onChange={(e) => setDestination(e.target.value)}
            />
          </label>
          <div className="product-actions">
            {providers.map((p) => (
              <label className="product-checkbox" key={p}>
                <input
                  type="checkbox"
                  checked={channels.includes(p)}
                  onChange={(e) =>
                    setChannels(
                      e.target.checked
                        ? [...channels, p]
                        : channels.filter((c) => c !== p),
                    )
                  }
                />
                {p}
              </label>
            ))}
          </div>
          <label className="product-checkbox">
            <input
              type="checkbox"
              checked={courseRights}
              onChange={(e) => setCourseRights(e.target.checked)}
            />
            I have permission to promote this course and use its selected
            material.
          </label>
          <label>
            Drafting approach
            <select
              aria-label="Promotion drafting approach"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="source">Use source facts · no AI charge</option>
              <option value="agent">Ask Growth Strategist · one AI call</option>
            </select>
          </label>
          <button
            className="button primary"
            disabled={
              !releaseId ||
              !title ||
              !audience ||
              !destination ||
              !channels.length ||
              !courseRights ||
              !!dirtyPlan
            }
            onClick={() => {
              if (
                mode === "agent" &&
                !confirm(
                  "Send this course excerpt, audience brief and accepted Growth handoffs to your AI provider for one promotional drafting call?",
                )
              )
                return;
              void act(async () => {
                const p = await api<PromotionPlan>(
                  "expansion/promotions/create",
                  {
                    releaseId,
                    lessonIndex: lesson,
                    title,
                    audience,
                    destination,
                    providers: channels,
                    mode,
                    approveProvider: mode === "agent",
                    rightsConfirmed: true,
                  },
                );
                setSelected(p.id);
              });
            }}
          >
            Create channel drafts
          </button>
        </fieldset>
      </details>
      {plans.length > 0 && (
        <label>
          Saved promotion
          <select
            aria-label="Saved promotion"
            value={selected}
            onChange={(e) => {
              if (
                dirtyPlan &&
                !confirm("Discard unsaved promotional copy changes?")
              )
                return;
              setDirtyPlan("");
              setSelected(e.target.value);
              setPreview(undefined);
            }}
          >
            <option value="">Choose a plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ·{" "}
                {p.provenance === "agent_draft" ? "AI draft" : "source-based"}
              </option>
            ))}
          </select>
        </label>
      )}
      {plan && (
        <>
          <p>{plan.answer.summary}</p>
          <div className="gtm-promotion-grid">
            {plan.answer.posts.map((post) => {
              const artifact = plan.artifacts.find(
                  (a) => a.provider === post.provider,
                ),
                job = jobs.find((j) => j.id === artifact?.renderId);
              return (
                <article key={post.provider}>
                  <span className="product-local">{post.provider}</span>
                  <h3>{post.headline}</h3>
                  {plan.artifacts.length ? (
                    <p className="product-preserve">{post.text}</p>
                  ) : (
                    <label>
                      Editable {post.provider} copy
                      <textarea
                        aria-label={`Promotional copy ${post.provider}`}
                        value={post.text}
                        maxLength={2200}
                        onChange={(e) => {
                          setPlans(
                            plans.map((p) =>
                              p.id === plan.id
                                ? {
                                    ...p,
                                    answer: {
                                      ...p.answer,
                                      posts: p.answer.posts.map((v) =>
                                        v.provider === post.provider
                                          ? { ...v, text: e.target.value }
                                          : v,
                                      ),
                                    },
                                  }
                                : p,
                            ),
                          );
                          setDirtyPlan(plan.id);
                        }}
                      />
                    </label>
                  )}
                  <small>Sources: {post.sourceIds.join(" · ")}</small>
                  {artifact?.campaignId && (
                    <div className="product-actions">
                      <button
                        className="button"
                        disabled={busy}
                        onClick={() =>
                          void act(() => onCampaign(artifact.campaignId!))
                        }
                      >
                        Open {post.provider} campaign
                      </button>
                      <button
                        className="button small"
                        onClick={() =>
                          void act(async () => {
                            const d = await api<{ svg: string }>(
                                `expansion/promotions/${plan.id}/design`,
                                { provider: post.provider },
                              ),
                              url = URL.createObjectURL(
                                new Blob([d.svg], { type: "image/svg+xml" }),
                              ),
                              a = document.createElement("a");
                            a.href = url;
                            a.download = `outclass-${post.provider}.svg`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          })
                        }
                      >
                        Export promotional graphic
                      </button>
                      <button
                        className="button small"
                        disabled={!asset || busy}
                        onClick={() => {
                          if (
                            !confirm(
                              "Render this selected local footage range with the promotional caption? No external upload occurs.",
                            )
                          )
                            return;
                          void act(async () => {
                            await api(
                              `expansion/promotions/${plan.id}/render`,
                              {
                                provider: post.provider,
                                assetId: asset,
                                start,
                                end,
                                approveRender: true,
                              },
                            );
                          });
                        }}
                      >
                        Render {post.provider} preview
                      </button>
                      {job && (
                        <span>
                          {job.stage} · {job.state}
                        </span>
                      )}
                      {job?.state === "ready" && (
                        <button
                          className="button small"
                          disabled={busy}
                          onClick={() =>
                            void act(async () => {
                              const result = await api<{ url: string }>(
                                `expansion/media/${job.id}/access`,
                                { kind: "export" },
                              );
                              setPreview({ url: result.url, jobId: job.id });
                            })
                          }
                        >
                          Review {post.provider} video
                        </button>
                      )}
                      {job?.approval && <span>Exact video approved</span>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {plan.artifacts.filter((a) => a.campaignId).length <
            plan.answer.posts.length && (
            <>
              {dirtyPlan === plan.id && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      await api(`expansion/promotions/${plan.id}/edit`, {
                        expectedRevision: plan.revision,
                        posts: plan.answer.posts,
                      });
                      setDirtyPlan("");
                    })
                  }
                >
                  Save promotional copy
                </button>
              )}
              <button
                className="button primary"
                disabled={busy || dirtyPlan === plan.id}
                onClick={() => {
                  if (
                    !confirm(
                      "Approve this exact promotional copy and prepare its channel campaigns? Nothing is posted by this action.",
                    )
                  )
                    return;
                  void act(async () => {
                    await api(`expansion/promotions/${plan.id}/prepare`, {
                      expectedRevision: plan.revision,
                      approveCopy: true,
                    });
                  });
                }}
              >
                Approve copy & prepare campaigns
              </button>
            </>
          )}
          {preview && (
            <div className="creator-review">
              <video
                controls
                playsInline
                src={preview.url}
                aria-label="Promotional video preview"
              />
              <button
                className="button primary"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Approve this exact reviewed promotional video for distribution?",
                    )
                  )
                    void act(async () => {
                      await api(`expansion/media/${preview.jobId}/approve`, {
                        approveReviewed: true,
                      });
                    });
                }}
              >
                Approve reviewed promotional video
              </button>
            </div>
          )}
          <details>
            <summary>Choose footage for promotional previews</summary>
            <p>
              Import owned footage here or reuse Creator Studio footage. Choose
              a range you have reviewed; the agent does not guess what happens
              at an unseen timestamp.
            </p>
            <label>
              Import promotional footage
              <input
                type="file"
                accept="video/mp4,video/webm,.mov"
                onChange={(e) => setSourceFile(e.target.files?.[0])}
              />
            </label>
            <label className="product-checkbox">
              <input
                type="checkbox"
                checked={sourceRights}
                onChange={(e) => setSourceRights(e.target.checked)}
              />
              I have permission to use this promotional footage.
            </label>
            <button
              className="button"
              disabled={busy || !sourceFile || !sourceRights}
              onClick={() =>
                void act(async () => {
                  if (sourceFile!.size > 80 * 1024 * 1024)
                    throw Error("Use a source video under 80 MB.");
                  const source = await api<MediaAsset>(
                    `expansion/media/import?name=${encodeURIComponent(sourceFile!.name)}&rights=confirmed`,
                    sourceFile,
                  );
                  setAsset(source.id);
                  setEnd(Math.min(15, source.duration));
                })
              }
            >
              Import footage into GTM
            </button>
            <label>
              Owned source footage
              <select
                aria-label="Promotional source footage"
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
              >
                <option value="">Choose footage</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.duration.toFixed(1)}s
                  </option>
                ))}
              </select>
            </label>
            <div className="product-input-row">
              <label>
                Clip start
                <input
                  type="number"
                  min={0}
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value))}
                />
              </label>
              <label>
                Clip end
                <input
                  type="number"
                  min={0}
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              className="button small"
              disabled={!!dirtyPlan}
              onClick={() => void act(async () => {})}
            >
              Refresh render status
            </button>
          </details>
          <p className="product-limit">{plan.answer.limitations.join(" ")}</p>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
