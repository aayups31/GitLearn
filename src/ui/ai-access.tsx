import React, { useEffect, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import type { AIConfig } from "../server/ai-provider";
import type { AIUsage } from "../ai-contract";
type Api = <T>(route: string, body?: unknown) => Promise<T>;
type Access = AIConfig & {
  ready: boolean;
  account: { email: string } | null;
  securePersistence: boolean;
};
export function AIAccessSettings({
  api,
  onRefresh,
  enabled,
}: {
  api: Api;
  onRefresh: () => Promise<unknown>;
  enabled: boolean;
}) {
  const [access, setAccess] = useState<Access>(),
    [savedAccess, setSavedAccess] = useState<Access>(),
    [usage, setUsage] = useState<AIUsage>(),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [pendingEmail, setPendingEmail] = useState(""),
    [usageNotice, setUsageNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const load = async () => {
    const a = await api<Access>("ai-access");
    setAccess(a);
    setSavedAccess(a);
    setUsage(undefined);
    setUsageNotice("");
    if (a.mode === "included" && a.account) {
      try {
        setUsage(await api<AIUsage>("ai-usage"));
      } catch (e) {
        setUsageNotice(
          e instanceof Error ? e.message : "Allowance could not be refreshed.",
        );
      }
    }
  };
  useEffect(() => {
    void load().catch((e) => setNotice(e.message));
  }, []);
  const act = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setNotice("");
    try {
      await action();
      await load();
      await onRefresh();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "This connection is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!access)
    return (
      <section className="setup-card ai-access">
        <h2>AI connections</h2>
        <p role="status">{notice || "Loading your saved connection…"}</p>
        {notice && (
          <button
            className="button secondary"
            onClick={() => void act(load)}
            disabled={busy}
          >
            Retry connection settings
          </button>
        )}
      </section>
    );
  const saved =
    !!savedAccess &&
    access.mode === savedAccess.mode &&
    access.service === savedAccess.service &&
    access.localEndpoint === savedAccess.localEndpoint &&
    access.localModel === savedAccess.localModel;
  const connected = saved && !!savedAccess?.ready;
  return (
    <section className="setup-card ai-access">
      <div className="setup-heading">
        <span className="setup-icon">
          <Sparkles size={23} />
        </span>
        <div>
          <h2>OffCourse & the Architect</h2>
          <p>
            Choose how your learning guides connect. Your projects and execution
            stay local.
          </p>
        </div>
      </div>
      <div
        className={`ai-connection-state ${connected && enabled ? "ready" : ""}`}
        role="status"
      >
        <span />
        {!saved
          ? "Unsaved connection changes"
          : connected
            ? enabled
              ? "AI guides are on"
              : "Connected · guides are off"
            : access.mode === "included" && !access.service
              ? "Included AI is awaiting public setup"
              : "Finish connecting your AI"}
      </div>
      <div className="ai-options" role="group" aria-label="AI connection type">
        {(
          [
            ["included", "Included AI"],
            ["personal", "My API key"],
            ["local", "Local model"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            className={access.mode === mode ? "selected" : ""}
            disabled={busy}
            aria-pressed={access.mode === mode}
            onClick={() => {
              setAccess({ ...access, mode });
              setSent(false);
              setCode("");
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {access.mode === "included" ? (
        <>
          <p>
            Sign in without owning an AI provider key. The hosted service
            receives the relevant context you send with each question.
          </p>
          <details
            className="ai-service-details"
            open={!access.service || undefined}
          >
            <summary>Advanced service connection</summary>
            <label>
              Included AI service
              <input
                type="url"
                value={access.service}
                onChange={(e) =>
                  setAccess({ ...access, service: e.target.value })
                }
                placeholder="https://your-outclass-ai-service.example"
                disabled={busy || !!access.account || sent}
              />
            </label>
          </details>
          {!access.service && (
            <p className="hint">
              Public included AI is awaiting account setup. Personal keys and
              local models work now.
            </p>
          )}
          {access.account ? (
            <>
              <p>
                <Check size={13} /> Signed in as {access.account.email}
              </p>
              {usage && (
                <p>
                  {usage.remaining} of {usage.limit} answers remaining ·{" "}
                  {usage.plan} plan · resets monthly ({usage.period})
                </p>
              )}
              {usageNotice && (
                <p role="status" className="hint">
                  {usageNotice}
                </p>
              )}
              <div className="onboarding-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void act(() => api("ai-sign-out", {}))}
                >
                  Sign out
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void act(load)}
                >
                  Refresh allowance
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      const r = await api<{ url: string }>("ai-checkout", {});
                      const u = new URL(r.url);
                      if (
                        u.protocol !== "https:" ||
                        !["checkout.stripe.com", "billing.stripe.com"].includes(
                          u.hostname,
                        ) ||
                        u.username ||
                        u.password
                      )
                        throw new Error("The billing link was not valid.");
                      if (window.gitLearnDesktop)
                        await window.gitLearnDesktop.openExternal(u.href);
                      else window.open(u.href, "_blank", "noopener,noreferrer");
                    })
                  }
                >
                  Manage upgrade
                </button>
              </div>
            </>
          ) : (
            <>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={busy || sent}
                />
              </label>
              <button
                className="button secondary"
                disabled={busy || !email || !access.service}
                onClick={() =>
                  void act(async () => {
                    await api("ai-config", access);
                    const address = email.trim();
                    await api("ai-sign-in", { email: address });
                    setPendingEmail(address);
                    setSent(true);
                    setNotice(
                      `A sign-in code was requested for ${address}. Check your email, including spam.`,
                    );
                  })
                }
              >
                {sent ? "Resend sign-in code" : "Email a sign-in code"}
              </button>
              {sent && (
                <>
                  <label>
                    Email verification code
                    <input
                      value={code}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      disabled={busy}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, ""))
                      }
                    />
                  </label>
                  <button
                    className="button primary"
                    disabled={busy || !/^\d{6,8}$/.test(code)}
                    onClick={() =>
                      void act(async () => {
                        await api("ai-verify", { email: pendingEmail, code });
                        await api("assistant-enable", { enabled: true });
                        setCode("");
                        setSent(false);
                        setNotice(
                          "Signed in. OffCourse and the Architect are ready in your workspace.",
                        );
                      })
                    }
                  >
                    Sign in & enable AI guides
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      setCode("");
                    }}
                  >
                    Use a different email
                  </button>
                </>
              )}
            </>
          )}
        </>
      ) : access.mode === "local" ? (
        <>
          <p>
            Use a model served on this computer by an OpenAI-compatible local
            server, such as Ollama. Install and start the model yourself; speed
            and answer quality depend on your device.
          </p>
          <label>
            Local endpoint
            <input
              value={access.localEndpoint}
              onChange={(e) =>
                setAccess({ ...access, localEndpoint: e.target.value })
              }
            />
          </label>
          <label>
            Installed model name
            <input
              value={access.localModel}
              onChange={(e) =>
                setAccess({ ...access, localModel: e.target.value })
              }
              placeholder="The exact model name on your local server"
            />
          </label>
        </>
      ) : (
        <p>
          Use your personal key below. OpenAI bills your API account directly.
          Included AI and local models do not require a personal key.
        </p>
      )}
      <div className="onboarding-actions">
        <button
          className="button primary"
          disabled={busy}
          onClick={() => void act(() => api("ai-config", access))}
        >
          {busy ? <Loader2 size={14} className="spin" /> : null} Save connection
        </button>
        <button
          className="button secondary"
          disabled={busy || (!connected && !enabled)}
          onClick={() =>
            void act(() => api("assistant-enable", { enabled: !enabled }))
          }
        >
          {enabled ? "Disable AI guides" : "Enable AI guides"}
        </button>
        <button
          className="button secondary"
          disabled={busy || !connected}
          onClick={() =>
            void act(async () => {
              const r = await api<{ message: string }>("ai-check", {});
              setNotice(r.message);
            })
          }
        >
          Check AI connection
        </button>
      </div>
      <p className="hint">
        Save the connection before enabling it. Only submitted questions,
        relevant excerpts and explicitly shared project notes are sent. Local
        retrieval and notebooks remain available without AI.
      </p>
      {notice && (
        <p role="status" className="hint">
          {notice}
        </p>
      )}
    </section>
  );
}
