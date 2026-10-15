import React, { useEffect, useState } from "react";
import { Link2, ArrowUpRight, BarChart3, CheckCircle2 } from "lucide-react";
import type { Campaign } from "../expansion-contract";
import type { PublishReview } from "../server/gtm-publishing";
import type { RenderJob } from "../server/creator-production";
import type {
  ReportSnapshot,
  reportMetrics,
  GTMAnalytics,
} from "../server/gtm-analytics";
import { PublicationSchedule } from "./publication-schedule";
import { SocialComposer } from "./social-composer";
import { SocialPostPreview } from "./social-post-preview";
type API = <T>(route: string, body?: unknown) => Promise<T>;
type Channel = {
  provider: "youtube" | "linkedin" | "x" | "instagram";
  configured: boolean;
  connected: boolean;
  canPublish: boolean;
  account: { name: string } | null;
  note: string;
};
const titles = {
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
};
export function GTMOperations({
  api,
  campaign,
  dirty,
  onDirty,
}: {
  api: API;
  campaign?: Campaign;
  dirty: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const [channels, setChannels] = useState<Channel[]>([]),
    [posts, setPosts] = useState<PublishReview[]>([]),
    [media, setMedia] = useState<RenderJob[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [authLink, setAuthLink] = useState("");
  const [reports, setReports] = useState<
      (ReportSnapshot & { metrics: ReturnType<typeof reportMetrics> })[]
    >([]),
    [values, setValues] = useState({
      source: "",
      date: new Date().toISOString().slice(0, 10),
      impressions: "",
      clicks: "",
      spendMinor: "",
      revenueMinor: "",
      refundMinor: "",
      feeMinor: "",
    });
  const [trends, setTrends] = useState<
    ReturnType<GTMAnalytics["view"]>["trends"]
  >([]);
  const refresh = async () => {
    const [accounts, rows, production] = await Promise.all([
      api<Channel[]>("expansion/social"),
      api<PublishReview[]>("expansion/publishing"),
      api<{ jobs: RenderJob[] }>("expansion/media/state"),
    ]);
    setChannels(accounts);
    setPosts(rows);
    setMedia(production.jobs);
    if (campaign) {
      const data = await api<{
        reports: typeof reports;
        trends: typeof trends;
      }>(`expansion/analytics/${campaign.id}`);
      setReports(data.reports);
      setTrends(data.trends || []);
    }
  };
  useEffect(() => {
    let active = true;
    const get = async () => {
      try {
        const [accounts, rows, production] = await Promise.all([
          api<Channel[]>("expansion/social"),
          api<PublishReview[]>("expansion/publishing"),
          api<{ jobs: RenderJob[] }>("expansion/media/state"),
        ]);
        if (active) {
          setChannels(accounts);
          setPosts(rows);
          setMedia(production.jobs);
        }
        if (campaign) {
          const data = await api<{
            reports: typeof reports;
            trends: typeof trends;
          }>(`expansion/analytics/${campaign.id}`);
          if (active) {
            setReports(data.reports);
            setTrends(data.trends || []);
          }
        }
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Connection failed.");
      }
    };
    void get();
    const timer = setInterval(get, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [api, campaign?.id]);
  async function act(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This operation failed.");
    } finally {
      setBusy(false);
    }
  }
  const money = (n: number | null) =>
    n === null
      ? "Not supplied"
      : new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: campaign?.currency || "CAD",
        }).format(n / 100);
  return (
    <section className="gtm-operations">
      <div className="product-panel-heading">
        <h2>
          <Link2 size={18} /> Channels & distribution
        </h2>
        <span>Approval before every public action</span>
      </div>
      {error && (
        <p className="product-message error" role="alert">
          {error}
        </p>
      )}
      <div className="gtm-channel-grid">
        {channels.map((c) => (
          <article key={c.provider}>
            <h3>{titles[c.provider]}</h3>
            <strong>{c.account?.name || "Not connected"}</strong>
            <p>{c.note}</p>
            <small>
              {c.connected
                ? c.canPublish
                  ? "Publishing scope confirmed by authorization"
                  : "Publishing scope not confirmed"
                : "Account authorization required"}
            </small>
            <div className="product-actions">
              <button
                className="button small"
                disabled={busy || !c.configured}
                onClick={() =>
                  void act(async () => {
                    const result = await api<{ url: string }>(
                        `expansion/social/${c.provider}/connect`,
                        {},
                      ),
                      url = new URL(result.url);
                    if (
                      url.protocol !== "https:" ||
                      ![
                        "accounts.google.com",
                        "www.linkedin.com",
                        "x.com",
                        "www.instagram.com",
                      ].includes(url.hostname)
                    )
                      throw Error("Authorization URL was not trusted.");
                    setAuthLink(url.href);
                  })
                }
              >
                {c.connected ? "Reconnect" : "Connect account"}
              </button>
              {c.account && (
                <button
                  className="button small"
                  onClick={() =>
                    void act(() =>
                      api(`expansion/social/${c.provider}/disconnect`, {}),
                    )
                  }
                >
                  Disconnect locally
                </button>
              )}
            </div>
            {!c.configured && (
              <small>
                Developer-app credentials required on the companion.{" "}
                <a
                  href="https://github.com/aayups31/OutClass/blob/main/docs/social-publishing.md#create-the-developer-apps"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Setup instructions ↗
                </a>
              </small>
            )}
          </article>
        ))}
      </div>
      {authLink && (
        <a
          className="button"
          href={authLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (window.gitLearnDesktop) {
              e.preventDefault();
              void window.gitLearnDesktop.openExternal(authLink);
            }
          }}
        >
          Continue platform authorization <ArrowUpRight size={14} />
        </a>
      )}
      {campaign && !dirty && (
        <SocialComposer
          api={api}
          campaign={campaign}
          channels={channels}
          media={media}
          onPrepared={refresh}
          onDirty={onDirty}
        />
      )}
      {posts
        .filter((p) => p.campaignId === campaign?.id)
        .map((post) => (
          <article className="gtm-post-review" key={post.id}>
            <div className="product-panel-heading">
              <h3>
                {titles[post.provider]} · {post.accountName}
              </h3>
              <span>{post.state}</span>
            </div>
            <SocialPostPreview
              api={api}
              provider={post.provider}
              accountName={post.accountName}
              text={post.text}
              title={post.title}
              images={post.images}
              imageAlts={post.composition?.imageAlts}
              mediaJobId={post.mediaJobId}
              thumbnail={post.thumbnail}
              privacy={post.privacy}
            />
            {post.thumbnailState && (
              <small>Custom thumbnail: {post.thumbnailState}</small>
            )}
            {post.mediaHash && (
              <small>
                Approved video hash: {post.mediaHash.slice(0, 16)} ·{" "}
                {post.privacy}
              </small>
            )}
            {post.error && <p>{post.error}</p>}
            <div className="product-actions">
              {post.state === "review" && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        `Approve posting this exact content to ${post.accountName} on ${titles[post.provider]}? Video visibility: ${post.privacy}. This makes a real external API write and may consume platform quota or API credits.`,
                      )
                    )
                      void act(() =>
                        api(`expansion/publishing/${post.id}/publish`, {
                          approvalHash: post.hash,
                          approvePublicAction: true,
                        }),
                      );
                  }}
                >
                  Approve & submit to platform
                </button>
              )}
              {(post.postId || post.uploadState?.phase === "processing") && (
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      post.provider !== "instagram" ||
                      confirm(
                        "Check this Instagram container and finish the previously approved publication if processing is complete?",
                      )
                    )
                      void act(() =>
                        api(`expansion/publishing/${post.id}/confirm`, {
                          approvePendingPublish: true,
                        }),
                      );
                  }}
                >
                  Check / finish publication
                </button>
              )}
              {post.url && (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button"
                >
                  Open platform result ↗
                </a>
              )}
            </div>
            <PublicationSchedule api={api} post={post} />
            {post.metrics && (
              <p>
                Platform observation ·{" "}
                {new Date(post.metrics.observedAt).toLocaleString()} · Views{" "}
                {post.metrics.views ?? "unavailable"} · Likes{" "}
                {post.metrics.likes ?? "unavailable"} · Comments{" "}
                {post.metrics.comments ?? "unavailable"}
              </p>
            )}
          </article>
        ))}
      <div className="product-panel-heading gtm-report-heading">
        <h2>
          <BarChart3 size={18} /> Evidence & economics
        </h2>
        <span>Reports are not verified financial orders</span>
      </div>
      {trends.map((trend) => (
        <article
          className="platform-evidence"
          key={trend.current.publicationId}
        >
          <h3>
            {titles[trend.current.provider as keyof typeof titles] ||
              trend.current.provider}{" "}
            · platform evidence
          </h3>
          <small>
            Observed {new Date(trend.current.observedAt).toLocaleString()}
          </small>
          <p>
            Views: {trend.current.views ?? "unavailable"} · Likes:{" "}
            {trend.current.likes ?? "unavailable"} · Comments:{" "}
            {trend.current.comments ?? "unavailable"}
          </p>
          {trend.previousObservedAt && (
            <p>
              Reported count change since{" "}
              {new Date(trend.previousObservedAt).toLocaleString()}: views{" "}
              {trend.reportedCountChanges.views ?? "unavailable"}, likes{" "}
              {trend.reportedCountChanges.likes ?? "unavailable"}, comments{" "}
              {trend.reportedCountChanges.comments ?? "unavailable"}. Counts can
              be corrected by the platform; these are not unique learners or
              sales.
            </p>
          )}
        </article>
      ))}
      <p>
        Record actual channel reports for this campaign. Leave unavailable
        fields blank. Calculations stay separate per source and date, so
        overlapping platform conversions are not added together.
      </p>
      <div className="product-input-row">
        <label>
          Report source
          <input
            aria-label="Report source"
            value={values.source}
            maxLength={100}
            placeholder="YouTube analytics export · manual entry"
            onChange={(e) => setValues({ ...values, source: e.target.value })}
          />
        </label>
        <label>
          Report date
          <input
            aria-label="Report date"
            type="date"
            value={values.date}
            onChange={(e) => setValues({ ...values, date: e.target.value })}
          />
        </label>
      </div>
      <div className="product-input-row">
        {(
          [
            ["impressions", "Reported impressions"],
            ["clicks", "Reported clicks"],
            ["spendMinor", "Reported spend · cents"],
            ["revenueMinor", "Reported revenue · cents"],
            ["refundMinor", "Reported refunds · cents"],
            ["feeMinor", "Reported variable fees · cents"],
          ] as const
        ).map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              aria-label={label}
              type="number"
              min="0"
              step="1"
              value={values[field]}
              onChange={(e) =>
                setValues({ ...values, [field]: e.target.value })
              }
            />
          </label>
        ))}
      </div>
      <button
        className="button"
        disabled={busy || !campaign || !values.source}
        onClick={() =>
          void act(() =>
            api("expansion/analytics/record", {
              campaignId: campaign!.id,
              currency: campaign!.currency,
              source: values.source,
              date: values.date,
              ...Object.fromEntries(
                [
                  "impressions",
                  "clicks",
                  "spendMinor",
                  "revenueMinor",
                  "refundMinor",
                  "feeMinor",
                ].map((k) => [
                  k,
                  values[k as keyof typeof values] === ""
                    ? null
                    : Number(values[k as keyof typeof values]),
                ]),
              ),
              confirmReport: true,
            }),
          )
        }
      >
        Record supplied report
      </button>
      <div className="gtm-report-grid">
        {reports.map((r) => (
          <article key={r.id}>
            <h3>{r.source}</h3>
            <small>
              {r.date} · Manually supplied report · {r.currency}
            </small>
            <dl>
              <div>
                <dt>Reported CTR</dt>
                <dd>
                  {r.metrics.ctr === null
                    ? "Unavailable"
                    : r.metrics.ctr.toFixed(2) + "%"}
                </dd>
              </div>
              <div>
                <dt>Reported CPC</dt>
                <dd>{money(r.metrics.cpcMinor)}</dd>
              </div>
              <div>
                <dt>Gross reported ROAS</dt>
                <dd>
                  {r.metrics.grossROAS === null
                    ? "Unavailable"
                    : r.metrics.grossROAS.toFixed(2) + "×"}
                </dd>
              </div>
              <div>
                <dt>Reported contribution</dt>
                <dd>{money(r.metrics.reportedContributionMinor)}</dd>
              </div>
            </dl>
            <p>
              Contribution = reported revenue − refunds − fees − spend. No
              payment provider has verified this report.
            </p>
          </article>
        ))}
      </div>
      <p className="product-limit">
        Verified course-order attribution and advertising-account ingestion are
        separate integrations. These reports do not prove causation or financial
        settlement.
      </p>
    </section>
  );
}
