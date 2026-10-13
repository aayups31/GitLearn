import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { realpath } from "node:fs/promises";
import path from "node:path";
type Context = {
  course: { id: string; title: string };
  session: { id: string; workspace: string; lessonTitle: string } | null;
  aiReady: boolean;
};
const base = "http://127.0.0.1:47831";
export function activate(context: vscode.ExtensionContext) {
  let view: vscode.WebviewView | undefined,
    busy = false;
  async function request<T>(route: string, body?: unknown): Promise<T> {
    const token = await context.secrets.get("outclass-token");
    if (!token)
      throw new Error(
        "Connect this editor with a code from OutClass → Editors & extensions.",
      );
    const response = await fetch(`${base}/api/${route}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(65000),
    });
    const result = (await response.json()) as any;
    if (!response.ok)
      throw new Error(
        result.error || "Open the OutClass companion and reconnect.",
      );
    return result;
  }
  async function current() {
    if (!vscode.workspace.isTrusted)
      throw new Error(
        "Trust your local project before connecting it to OutClass.",
      );
    const c = await request<Context>("editor-context");
    if (!c.session)
      throw new Error("Start or continue this course in OutClass first.");
    const folders = await Promise.all(
      (vscode.workspace.workspaceFolders || [])
        .filter((f) => f.uri.scheme === "file")
        .map((f) => realpath(f.uri.fsPath)),
    );
    if (
      !folders.some(
        (f) => f.toLowerCase() === c.session!.workspace.toLowerCase(),
      )
    )
      throw new Error(
        "Open the exact course project folder in this editor. OutClass keeps course projects separate.",
      );
    return c;
  }
  async function connect() {
    if (!vscode.workspace.isTrusted)
      throw new Error("Trust the project first.");
    const code = await vscode.window.showInputBox({
      title: "Connect OutClass",
      prompt:
        "Generate an editor connection code in OutClass → Editors & extensions. The companion must be running.",
      validateInput: (v) => (/^\d{6}$/.test(v) ? null : "Enter six digits."),
    });
    if (!code) return;
    const response = await fetch(`${base}/api/editor-pair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(5000),
    });
    const result = (await response.json()) as any;
    if (!response.ok)
      throw new Error(result.error || "The code was not accepted.");
    await context.secrets.store("outclass-token", result.token);
    await current();
    void vscode.window.showInformationMessage(
      "OutClass is connected to this course workspace.",
    );
    await refresh();
  }
  async function refresh() {
    try {
      const c = await current();
      view?.webview.postMessage({
        type: "context",
        title: c.course.title,
        lesson: c.session!.lessonTitle,
        ready: c.aiReady,
      });
    } catch (e) {
      view?.webview.postMessage({
        type: "error",
        text: e instanceof Error ? e.message : String(e),
      });
    }
  }
  async function ask(question?: string) {
    if (busy) return;
    busy = true;
    view?.webview.postMessage({ type: "busy", value: true });
    try {
      const c = await current();
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.isDirty)
        throw new Error(
          "Test your changes first. Save and execute your edited code before asking for another hint.",
        );
      const q =
        question ||
        (await vscode.window.showInputBox({
          title: "Ask OffCourse",
          prompt:
            "Describe your attempt and what you expected. OffCourse gives guidance; you solve the task.",
        }));
      if (!q?.trim()) return;
      let selectedCode: { path: string; content: string } | undefined;
      if (editor?.document.uri.scheme === "file") {
        const relative = path
          .relative(c.session!.workspace, editor.document.uri.fsPath)
          .split(path.sep)
          .join("/");
        if (relative.startsWith("../") || path.isAbsolute(relative))
          throw new Error("Select a file inside this course's project.");
        selectedCode = {
          path: relative,
          content: (editor.selection.isEmpty
            ? editor.document.getText()
            : editor.document.getText(editor.selection)
          ).slice(0, 16000),
        };
      }
      await request("library-index", {
        courseId: c.course.id,
        semantic: false,
      });
      const result = await request<{
        messages: { role: string; text: string }[];
      }>("assistant-chat", {
        courseId: c.course.id,
        question: q.slice(0, 4000),
        mode: "help",
        tutorStyle: "hint",
        selectedCode,
      });
      view?.webview.postMessage({
        type: "messages",
        messages: result.messages.map((m) => ({ role: m.role, text: m.text })),
      });
      if (!view)
        void vscode.window.showInformationMessage(
          result.messages.at(-1)?.text.slice(0, 500) ||
            "Open the OutClass view to read the response.",
        );
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      view?.webview.postMessage({ type: "error", text });
      void vscode.window.showWarningMessage(text);
    } finally {
      busy = false;
      view?.webview.postMessage({ type: "busy", value: false });
    }
  }
  const safe = (fn: () => Promise<unknown>) => () =>
    void fn().catch((e) => vscode.window.showErrorMessage(e.message));
  context.subscriptions.push(
    vscode.commands.registerCommand("outclass.connect", safe(connect)),
    vscode.commands.registerCommand(
      "outclass.ask",
      safe(() => ask()),
    ),
    vscode.commands.registerCommand(
      "outclass.disconnect",
      safe(async () => {
        await context.secrets.delete("outclass-token");
        await refresh();
      }),
    ),
    vscode.commands.registerCommand("outclass.open", () =>
      vscode.env.openExternal(vscode.Uri.parse(`${base}/?view=studio`)),
    ),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("outclass.guide", {
      resolveWebviewView(v) {
        view = v;
        v.webview.options = { enableScripts: true };
        const nonce = randomBytes(16).toString("hex");
        v.webview.html = `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><style nonce="${nonce}">body{font:12px var(--vscode-font-family);padding:14px;color:var(--vscode-foreground)}h2{font-size:17px}p{line-height:1.7}button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:8px 12px;cursor:pointer;margin:4px 5px 4px 0}textarea{box-sizing:border-box;width:100%;min-height:100px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);padding:10px}article{white-space:pre-wrap;overflow-wrap:anywhere;padding:15px 0;border-bottom:1px solid var(--vscode-widget-border);line-height:1.8}.error{color:var(--vscode-errorForeground)}small{opacity:.65}</style></head><body><h2>OffCourse</h2><small>Your course. Your attempt. Your next step.</small><p id="context">Open OutClass and connect this course workspace.</p><button id="connect">Connect</button><button id="refresh">Refresh context</button><button id="open">Open OutClass</button><p id="error" class="error" role="alert"></p><div id="messages" aria-live="polite"></div><textarea id="question" aria-label="Ask OffCourse" placeholder="What have you tried? What did you expect?"></textarea><button id="send">Ask for a hint</button><p><small>Save and test your changes. This guide never edits or executes your code. Uses your selected AI connection and approved course context.</small></p><script nonce="${nonce}">const api=acquireVsCodeApi();for(const id of ['connect','refresh','open'])document.getElementById(id).onclick=()=>api.postMessage({type:id});document.getElementById('send').onclick=()=>api.postMessage({type:'ask',question:document.getElementById('question').value});window.addEventListener('message',({data})=>{if(data.type==='context')document.getElementById('context').textContent=data.title+' · '+data.lesson;if(data.type==='error')document.getElementById('error').textContent=data.text;if(data.type==='busy'){document.getElementById('send').disabled=data.value;if(data.value)document.getElementById('error').textContent='';}if(data.type==='messages'){const root=document.getElementById('messages');root.replaceChildren();for(const m of data.messages){const a=document.createElement('article');a.textContent=(m.role==='user'?'You':'OffCourse')+'\n\n'+m.text;root.append(a);}document.getElementById('question').value='';root.lastElementChild?.scrollIntoView();}});api.postMessage({type:'refresh'});</script></body></html>`;
        context.subscriptions.push(
          v.webview.onDidReceiveMessage(async (message) => {
            if (message?.type === "ask" && typeof message.question === "string")
              await ask(message.question);
            else if (message?.type === "connect") await safe(connect)();
            else if (message?.type === "refresh") await refresh();
            else if (message?.type === "open")
              await vscode.commands.executeCommand("outclass.open");
          }),
        );
      },
    }),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => void refresh()),
  );
}
