import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { Plus, X, Maximize2, Minimize2, ChevronDown } from "lucide-react";
import type { TerminalInfo } from "../desktop/bridge";
import { Divider, useWorkspaceLayout } from "./workspace-layout";
import "@xterm/xterm/css/xterm.css";
export function IntegratedTerminal({
  sessionId,
  theme,
}: {
  sessionId: string;
  theme: string;
}) {
  const { layout, update } = useWorkspaceLayout();
  const bridge = window.gitLearnDesktop?.terminals;
  const [sessions, setSessions] = useState<TerminalInfo[]>([]),
    [active, setActive] = useState(""),
    [error, setError] = useState("");
  const [agreed, setAgreed] = useState(
    () => localStorage.getItem("outclass-terminal-consent") === "yes",
  );
  const host = useRef<HTMLDivElement>(null);
  const refresh = async () => {
    if (bridge) {
      const list = await bridge.list();
      setSessions(list);
      setActive((old) =>
        list.some((s) => s.id === old) ? old : list[0]?.id || "",
      );
    }
  };
  useEffect(() => {
    if (bridge)
      void bridge
        .list()
        .then((list) => {
          setSessions(list);
          setActive(list.find((s) => s.sessionId === sessionId)?.id || "");
        })
        .catch((e) => setError(e.message));
  }, [sessionId]);
  async function create() {
    if (!bridge) return;
    try {
      setError("");
      const s = await bridge.create(sessionId);
      await refresh();
      setActive(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start a terminal.");
    }
  }
  useEffect(() => {
    if (!host.current || !active || !bridge || !layout.terminalOpen) return;
    let cancelled = false;
    const style = getComputedStyle(document.documentElement);
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: '"Cascadia Code", Consolas, monospace',
      scrollback: 4000,
      allowProposedApi: false,
      theme: {
        background: style.getPropertyValue("--soft").trim() || "#101114",
        foreground: style.getPropertyValue("--ink").trim() || "#e4e4e7",
        cursor: "#789bff",
        selectionBackground: "#456dc255",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host.current);
    const measure = () => {
      if (cancelled) return;
      try {
        fit.fit();
        void bridge.resize(active, term.cols, term.rows).catch(() => {});
      } catch {}
    };
    const pending: { data: string; sequence: number }[] = [];
    let ready = false;
    const unsubscribe = bridge.subscribe((e) => {
      if (e.id !== active) return;
      if (e.type === "data") {
        if (ready) term.write(e.data);
        else pending.push(e);
      } else {
        term.writeln(`\r\n[Shell exited with code ${e.exitCode}]`);
        void refresh();
      }
    });
    void bridge
      .snapshot(active)
      .then((snapshot) => {
        if (cancelled) return;
        term.write(snapshot.output);
        ready = true;
        for (const e of pending)
          if (e.sequence > snapshot.sequence) term.write(e.data);
        measure();
        term.focus();
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    const input = term.onData((data) => {
      void bridge.input(active, data).catch((e) => setError(e.message));
    });
    const observer = new ResizeObserver(measure);
    observer.observe(host.current);
    measure();
    return () => {
      cancelled = true;
      observer.disconnect();
      unsubscribe();
      input.dispose();
      term.dispose();
    };
  }, [active, theme, layout.terminalOpen]);
  const current = sessions.find((s) => s.id === active);
  return (
    <section
      hidden={!layout.terminalOpen}
      className={`local-terminal ${layout.terminalMax && layout.terminalOpen ? "maximized" : ""}`}
      aria-label="Integrated terminal"
      style={{
        height: layout.terminalOpen
          ? layout.terminalMax
            ? undefined
            : layout.terminal
          : 36,
      }}
    >
      {layout.terminalOpen && !layout.terminalMax && (
        <Divider
          label="Terminal height"
          axis="y"
          reverse
          value={layout.terminal}
          min={140}
          max={650}
          onChange={(terminal) => update({ terminal })}
        />
      )}
      <div className="terminal-tabs">
        <button
          className="terminal-label"
          aria-label={
            layout.terminalOpen ? "Collapse terminal" : "Expand terminal"
          }
          onClick={() => update({ terminalOpen: !layout.terminalOpen })}
        >
          Terminal <ChevronDown size={12} />
        </button>
        {layout.terminalOpen &&
          sessions.map((s) => (
            <button
              key={s.id}
              className={s.id === active ? "selected" : ""}
              onClick={() => setActive(s.id)}
              title={s.cwd}
            >
              {s.shell} · {s.title.slice(0, 22)}
              {!s.running ? " (exited)" : ""}
            </button>
          ))}
        <span className="terminal-spacer" />
        {layout.terminalOpen && agreed && bridge && (
          <button aria-label="New terminal" onClick={() => void create()}>
            <Plus size={13} />
          </button>
        )}
        {layout.terminalOpen && (
          <button
            aria-label={
              layout.terminalMax ? "Restore terminal" : "Maximize terminal"
            }
            onClick={() => update({ terminalMax: !layout.terminalMax })}
          >
            {layout.terminalMax ? (
              <Minimize2 size={12} />
            ) : (
              <Maximize2 size={12} />
            )}
          </button>
        )}
        {layout.terminalOpen && active && (
          <button
            aria-label="Close active terminal"
            onClick={() => {
              if (
                current?.running &&
                !confirm("Stop this shell and its running programs?")
              )
                return;
              void bridge
                ?.close(active)
                .then(refresh)
                .catch((e) => setError(e.message));
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {layout.terminalOpen &&
        (error ? (
          <div className="assistant-alert" role="alert">
            {error}
            <button onClick={() => setError("")}>Dismiss</button>
          </div>
        ) : null)}
      {layout.terminalOpen &&
        (!bridge ? (
          <div className="terminal-empty">
            Open the OutClass desktop application for its integrated terminal.
            Your external editor's terminal also works with the same project.
          </div>
        ) : !agreed ? (
          <div className="terminal-empty">
            <strong>Your computer. Your shell.</strong>
            <p>
              This is a full local terminal with your account's permissions.
              Commands can install software, change files and access the
              network. Programs keep running when you collapse this panel;
              closing OutClass stops its terminal sessions. Shell output is not
              automatically treated as verified learning evidence.
            </p>
            <button
              className="primary"
              onClick={() => {
                localStorage.setItem("outclass-terminal-consent", "yes");
                setAgreed(true);
                void create();
              }}
            >
              Enable my local terminal
            </button>
          </div>
        ) : active ? (
          <div className="terminal-screen" ref={host} />
        ) : (
          <div className="terminal-empty">
            <p>
              Start a shell in this course's project. Run training, development
              servers or interactive programs without Quick Run's time limit.
            </p>
            <button className="primary" onClick={() => void create()}>
              New terminal
            </button>
          </div>
        ))}
      {layout.terminalOpen && current && (
        <div className="terminal-footnote" title={current.cwd}>
          {current.cwd} · full local shell · output stays in this session
        </div>
      )}
    </section>
  );
}
