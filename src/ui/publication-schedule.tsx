import React, { useState, useEffect } from "react";
import type { PublishReview } from "../server/gtm-publishing";
import type { ScheduledPublication } from "../server/publication-queue";
type API = <T>(route: string, body?: unknown) => Promise<T>;
function localTime() {
  const value = new Date(Date.now() + 300000);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function PublicationSchedule({
  api,
  post,
}: {
  api: API;
  post: PublishReview;
}) {
  const [time, setTime] = useState(localTime),
    [jobs, setJobs] = useState<ScheduledPublication[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const refresh = async () => {
    const data = await api<{ jobs: ScheduledPublication[] }>("expansion/queue");
    setJobs(data.jobs.filter((j) => j.postId === post.id));
  };
  useEffect(() => {
    let live = true;
    const get = () => {
      void api<{ jobs: ScheduledPublication[] }>("expansion/queue")
        .then((r) => {
          if (live) setJobs(r.jobs.filter((j) => j.postId === post.id));
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    };
    get();
    const timer = setInterval(get, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [api, post.id]);
  async function act(fn: () => Promise<unknown>) {
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
    <div className="publication-schedule">
      {post.state === "review" && (
        <>
          <label>
            Scheduled time · your local timezone
            <input
              aria-label={`Scheduled time ${post.id}`}
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
          <button
            className="button"
            disabled={
              busy || !time || jobs.some((j) => j.state === "scheduled")
            }
            onClick={() => {
              const date = new Date(time);
              if (!Number.isFinite(date.getTime())) {
                setError("Choose a valid local time.");
                return;
              }
              if (
                !confirm(
                  `Authorize automatic submission of this exact reviewed post to ${post.accountName} on ${post.provider} at ${date.toLocaleString()}? OutClass must remain running and connected. This includes completing an Instagram media container when applicable and up to 12 confirmation/metrics checks; platform API quotas may apply. No paid ads are created.`,
                )
              )
                return;
              void act(() =>
                api("expansion/queue/schedule", {
                  postId: post.id,
                  approvalHash: post.hash,
                  runAt: date.toISOString(),
                  approveScheduledPublish: true,
                }),
              );
            }}
          >
            Schedule automatic publishing
          </button>
        </>
      )}
      {jobs.map((job) => (
        <div className="publication-queue-row" key={job.id}>
          <strong>
            {job.state} · {new Date(job.runAt).toLocaleString()}
          </strong>
          <small>
            Dispatch attempts: {job.attempts} · confirmation checks:{" "}
            {job.checks}
          </small>
          {job.note && <p>{job.note}</p>}
          {job.state === "scheduled" && (
            <button
              className="button small"
              disabled={busy}
              onClick={() =>
                void act(() => api(`expansion/queue/${job.id}/cancel`, {}))
              }
            >
              Cancel scheduled post
            </button>
          )}
        </div>
      ))}
      <small>
        Local queue: the app must be running. A missed one-hour dispatch window
        requires explicit rescheduling.
      </small>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
