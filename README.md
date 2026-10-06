# GitLearn

A local companion that connects a Udemy lesson to your code, notes, and Git history.

## Start

On this Windows machine, double-click **Start GitLearn.cmd**. It starts the companion in the background and opens the app at [http://127.0.0.1:47831](http://127.0.0.1:47831).

The [product page and complete setup guide](http://127.0.0.1:47831/welcome) explain the local workflow, Chrome installation, folders, checkpoint review, and GitHub backup. Open **Product & guide** from any workspace view. The landing page runs on the same companion; it is not publicly hosted.

For development, with Node.js 24+ and Git installed:

```powershell
npm install
npm run build
npm start
```

Use `npm run dev` for the interface and server with development transforms. Double-click **Stop GitLearn.cmd** to stop a launcher-started companion, or stop a foreground server with Ctrl+C. The launcher keeps its process ID and redacted startup logs in `.local/`.

## Your first Udemy session

1. Open **Setup**. Choose an **empty learning-history folder**, then select **Create my workspace**. GitHub and AI are optional and off by default.
2. Add your Udemy lesson manually, or connect the Chrome extension below.
3. Select **Mirror course** to create accessible lesson structure and separate coding workspaces. Discovery is partial; more lessons can be added as you go. Refresh preserves stable lesson paths and your notes.
4. Select **Start lesson**. Create a lesson folder or choose an existing folder containing your own code.
5. Select **Open in VS Code**, watch the video, code, and add a note.
6. Select **Finish & review**, inspect the exact files and message, then **Save checkpoint**.

Code you change after preview stays in your source folder; the commit uses the version you reviewed. GitLearn never changes the Git index or remotes in your existing source workspace.

The learning-history repository is managed by the companion. Avoid editing or staging files directly in it. Write code in the lesson workspace or your linked source folder; GitLearn copies reviewed snapshots into history. The default lesson workspaces live in a sibling `workspaces/` directory.

## Connect Chrome once

1. Run `npm run build` if `dist/extension` is missing.
2. Open `chrome://extensions`, enable **Developer mode**, and select **Load unpacked**.
3. Choose this project's `dist/extension` directory and pin **GitLearn**.
4. In the app's **Setup**, select **Get connection code**. Enter it in the extension popup.
5. Open or reload your Udemy course page.

The extension observes accessible course and lesson titles/links, not videos, transcripts, cookies, or paid lesson prose. It queues context updates while the companion is offline. If a Udemy layout does not expose a title/curriculum reliably, add or select the lesson manually. Only the granted extension can submit course context; repository and workspace actions stay in the local app.

## Optional OpenAI

The companion reads `.env` from the project root. Both `OPENAI_API_KEY` and your existing `OPEN_AI_API` alias work. `OPENAI_API_KEY` takes precedence. No key goes into the extension, frontend, course metadata, Git, or logs.

Enable **AI-assisted commit messages** in Setup to send a small secret-scanned diff, course context, and your note to OpenAI. The default is `gpt-4o-mini`; set `OPENAI_MODEL` to override. Requests use foreground Responses, Structured Outputs, `store: false`, and a short timeout. API failures fall back to a useful deterministic message.

`store: false` is not a zero-retention promise; consult [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). Keep both AI and GitHub disabled for fully local operation. Note cleanup is not automatic in this first build: your original notes are preserved verbatim.

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

Tests use temporary folders and sanitized Udemy fixtures, including a real unpacked-extension pairing/capture/replay check. They do not use your paid course account or make OpenAI/GitHub writes. A separate small synthetic API smoke test may verify the configured key during development.

Stop the running companion before `npm run test:e2e`; the browser suite starts its own isolated instance on the same local port.

## Initial build boundaries

This is a working Windows/Chrome local build. It requires Node 24+ and Git; the runtime is not packaged into an installer yet. It uses authenticated loopback HTTP to simplify setup instead of a native-messaging installer, opens VS Code through its installed CLI instead of requiring a separate VSIX, and uses Node's built-in SQLite (experimental in the tested Node version) to avoid a native database dependency. No hosted backend, account system, broad platform support, or learning-memory AI is required.

Real authenticated Udemy layouts vary and need live validation on your course. The complete workflow is covered by fixtures plus manual fallback. Ignore rules, hard exclusions, and credential patterns reduce leakage risk; they cannot detect every sensitive value. Inspect previews and select only learner-owned source folders.

Portable artifacts live in your chosen Git repository. Session state, grants, pairing credentials, and checkpoint journal live in `%LOCALAPPDATA%/GitForLearning/`, outside the OneDrive project. `GITLEARN_DATA_DIR` overrides this for isolated testing. Never sync the live SQLite database through OneDrive.

See [current build and architecture](docs/current-build.md), the [longer-term architecture](docs/architecture.md), [implementation plan](docs/implementation-plan.md), [frontend design](docs/frontend-design.md), and [original product specification](GIT_FOR_LEARNING_PRODUCT_SPEC.md).
