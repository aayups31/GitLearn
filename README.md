# GitLearn

A local learning workspace that connects a Udemy lesson to your code, sourced AI help, notes, and Git history.

## Start

**Windows desktop preview:** download the installer from [GitHub Releases](https://github.com/aayups31/GitLearn/releases), open GitLearn, and follow its first-run setup. Choose one parent learning folder; GitLearn creates practice and history folders for each course automatically. JavaScript's runtime is bundled. Git for Windows is required for checkpoints; Python is optional for Python lessons. VS Code and GitHub remain optional.

The public website is now the independently deployable static `dist/site` build. The actual editor, courses, RAG assistant, and setup live in the Windows desktop app. See [desktop architecture and packaging](docs/desktop-release.md) and [Chrome store preparation](docs/chrome-web-store.md). Keep GitLearn for the first release; the Chrome listing is still pending.

On this Windows machine, double-click **Start GitLearn.cmd**. It starts the companion in the background and opens the app at [http://127.0.0.1:47831](http://127.0.0.1:47831).

The [product page and complete setup guide](http://127.0.0.1:47831/welcome/) explain the local workflow, Chrome installation, folders, checkpoint review, and GitHub backup. Open **Product & guide** from any workspace view. `npm run preview:site` previews the separate public site at http://127.0.0.1:47832. Public hosting is configured separately from the local app.

For development, with Node.js 24+ and Git installed:

```powershell
npm install
npm run build
npm start
```

Use `npm run dev` for the interface and server with development transforms. Double-click **Stop GitLearn.cmd** to stop a launcher-started companion, or stop a foreground server with Ctrl+C. The launcher keeps its process ID and redacted startup logs in `.local/`.

## Your first Udemy session

1. Follow desktop setup and choose a **parent learning folder**. GitLearn creates history and practice folders inside it. In the developer browser version, choose an empty learning-history folder in **Setup**. GitHub and AI are optional and off by default.
2. Add your Udemy lesson manually, or connect the Chrome extension below.
3. Select **Mirror course** to create accessible lesson structure and separate coding workspaces. Discovery is partial; more lessons can be added as you go. Refresh preserves stable lesson paths and your notes.
4. Select **Start lesson**. Create a lesson folder or choose an existing folder containing your own code.
5. Open **Code & learn**. Select or create a file, write code, and **Run** JavaScript or Python locally. Python needs an installed interpreter; JavaScript uses GitLearn’s Node runtime. **Preview** supports a single HTML file with inline CSS and JavaScript. Ctrl/Cmd+S saves; Ctrl/Cmd+Enter runs. VS Code remains optional. Notes save as you type.
6. Select **Checkpoint** in the editor (or **Finish & review** in Overview), inspect the exact files and message, then **Save checkpoint**.

Code you change after preview stays in your source folder; the commit uses the version you reviewed. GitLearn never changes the Git index or remotes in your existing source workspace.

The learning-history repository is managed by the companion. Avoid editing or staging files directly in it. Write code in the lesson workspace or your linked source folder; GitLearn copies reviewed snapshots into history. The default lesson workspaces live in a sibling `workspaces/` directory.

## Connect Chrome once

1. Run `npm run build` if `dist/extension` is missing.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Choose this project's `dist/extension` directory and pin **GitLearn**.
4. In the app's **Setup**, select **Get connection code**. Enter it in the extension popup.
5. Open or reload your Udemy course page.

The extension automatically observes accessible course and lesson titles/links. It queues context updates while the companion is offline. **Import visible transcript** explicitly imports text from an open Udemy transcript panel into the selected course’s local index. It does not download videos or read browser credentials. If Udemy does not expose a transcript, paste/import it in GitLearn’s **Sources**. Transcript imports require a running companion; metadata updates have a durable offline queue. Only the granted extension can submit course context/material; editor, repository, and AI actions stay in the local app. Reload the unpacked extension and the Udemy tab after rebuilding.

## Coding and course-aware help

The left sidebar selects courses, the center edits real files in the active lesson folder, and the right panel holds a course-specific conversation and sources. Saves check whether another editor changed the file and preserve those external edits. Running uses saved code, a bounded output buffer, and a ten-second limit. Python prefers an existing `.venv` or `venv` in the selected folder, falling back to the installed `python` command. **Stop** terminates the tracked program and its child processes. Programs run with your computer’s permissions; the runner excludes the companion’s API credential environment. HTML previews use a restricted frame and do not load external assets or companion APIs. This is a focused learning editor, not a full shell or package manager.

1. In **Sources**, paste text or import TXT, MD, SRT, or VTT transcripts/resources. Imports stay local and become keyword-searchable immediately.
2. Explicitly **Enable learning assistant** with a configured API key. This is independent of AI commit messages.
3. Select **Refresh index** to embed uncached passages with `text-embedding-3-small`. Automatic refreshes only update local keyword search; they do not send source batches to OpenAI.
4. **Code help** combines retrieved course passages, local notes/code, and optionally the selected file or code selection. **Ask the course** retrieves only imported transcript/resource passages and reports missing context when it cannot find relevant material.
5. Click an answer’s source to see the actual retrieved excerpt and line numbers. Course conversations and cited passage snapshots persist locally.

Retrieval combines SQLite FTS5 with locally stored 384-dimensional embeddings and course-scoped ranking. Generation uses a bounded context and structured citation output. Default chat model is `gpt-4o-mini`; `OPENAI_CHAT_MODEL` overrides it, otherwise `OPENAI_MODEL` applies. Each course supports 120 sources and 2,000 passages, with 240,000 characters per import. A semantic refresh handles up to 320 pending passages; repeat it for a larger collection. Current code/notes and reviewed checkpoints are indexed for code help, never treated as evidence of the instructor’s lecture.

## Optional OpenAI

In the installed app, add your own key during setup or in Settings. It is encrypted with your Windows account and passed privately to the companion. The developer companion can read `.env` from the project root; both `OPENAI_API_KEY` and the `OPEN_AI_API` alias work, with `OPENAI_API_KEY` taking precedence. Packaged apps never read the developer `.env`. No key goes into the extension, frontend, course metadata, Git, or logs.

Enable **AI-assisted commit messages** in Setup to send a small secret-scanned diff, course context, and your note to OpenAI. The default is `gpt-4o-mini`; set `OPENAI_MODEL` to override. Requests use foreground Responses, Structured Outputs, `store: false`, and a short timeout. API failures fall back to a useful deterministic message.

Assistant questions, retrieved excerpts, selected code, and semantic-indexing excerpts go to OpenAI only after the assistant is enabled. Its generation also uses Responses, Structured Outputs, `store: false`, and bounded requests. Chat and the retrieval index stay in the companion’s SQLite database. `store: false` is not a zero-retention promise; consult [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Keep the assistant, AI commit messages, and GitHub disabled for fully local operation. Original notes are preserved verbatim.

## Optional GitHub

Choose one learning-history folder and optionally connect **one private GitHub repository** to it. Mirroring each course creates its own course/section/lesson folders inside the archive. New coding workspaces live alongside the archive; existing coding folders stay where they are. A sync pushes saved history across all courses together. You do not create a repository per course.

1. Install [GitHub CLI](https://cli.github.com/) if missing. On Windows: `winget install --id GitHub.cli --exact --source winget`. The companion also detects the standard Windows installation without needing a PATH refresh.
2. In **Settings → One repository. Every course.**, select **Sign in to GitHub**. Complete the CLI browser sign-in and return to GitLearn.
3. Select **Check connection** to verify the signed-in account. Repository actions become available after verification and local workspace setup.
4. Enter a name such as `learning` and select **Create private repo**, or connect the HTTPS URL of an existing **empty private** repository. GitLearn verifies its visibility and configures Git to use your GitHub CLI authentication. No token is entered in the app.
5. Save a checkpoint, then select **Sync now** in **Checkpoints**. Connecting a repository alone does not upload files.

GitLearn creates a repository only when you click that action. Sync is manual, scans outgoing history, never force-pushes, and pauses on divergent remote history. If a push fails, the local commit stays safe. GitHub setup and sync require internet access; you can continue saving locally while disconnected.

## Verification

```powershell
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

Tests use temporary folders and sanitized Udemy fixtures, including a real unpacked-extension pairing/capture/transcript-import/replay check. Editor checks run real saved JavaScript and Python. RAG tests mock OpenAI responses and embeddings to verify course isolation, citation validation, fallback, and semantic retrieval. They do not use your paid course account or make OpenAI/GitHub writes.

Stop the running companion before `npm run test:e2e`; the browser suite starts its own isolated instance on the same local port.

## Preview boundaries

This is a working unsigned Windows x64/Chrome preview with a downloadable installer. The desktop app bundles its JavaScript runtime; Git is required for checkpoints, and Python is needed for Python execution. Running from source requires Node 24+. It uses authenticated loopback HTTP, an embedded CodeMirror editor, optional VS Code CLI integration, and Node's built-in SQLite. No hosted backend, account system, or separate vector database is required. Interactive terminal input, dependency installation, multi-file HTML serving, debuggers, and language-server integration remain outside this focused editor.

Real authenticated Udemy layouts vary and need live validation on your course. The complete workflow is covered by fixtures plus manual fallback. Ignore rules, hard exclusions, and credential patterns reduce leakage risk; they cannot detect every sensitive value. Inspect previews and select only learner-owned source folders.

Portable artifacts live in your chosen Git repository. Session state, grants, pairing credentials, and checkpoint journal live in `%LOCALAPPDATA%/GitForLearning/`, outside the OneDrive project. `GITLEARN_DATA_DIR` overrides this for isolated testing. Never sync the live SQLite database through OneDrive.

See [current build and architecture](docs/current-build.md), the [longer-term architecture](docs/architecture.md), [implementation plan](docs/implementation-plan.md), [frontend design](docs/frontend-design.md), and [original product specification](GIT_FOR_LEARNING_PRODUCT_SPEC.md).
