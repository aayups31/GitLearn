import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  FileCode2,
  Folder,
  GitCommitHorizontal,
  Github,
  LayoutGrid,
  LockKeyhole,
  Play,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import "./style.css";

function Brand() {
  return (
    <a className="brand" href="/welcome" aria-label="GitLearn home">
      <svg
        width="24"
        height="28"
        viewBox="0 0 28 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 25V7M6 20c0-9 16-3 16-15"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <circle cx="6" cy="6" r="3" fill="currentColor" />
        <circle cx="6" cy="26" r="3" fill="currentColor" />
        <circle cx="22" cy="5" r="3" fill="currentColor" />
      </svg>
      <span>GitLearn</span>
    </a>
  );
}
function CopyCommand({ value, label }: { value: string; label?: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="command">
      <code>{value}</code>
      <button
        aria-label={label || `Copy ${value}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setMessage("Copied");
          } catch {
            setMessage("Select and copy the text above");
          }
        }}
      >
        {message === "Copied" ? <Check size={15} /> : <Copy size={15} />}
        <span>{message || "Copy"}</span>
      </button>
      <span className="sr-only" role="status">
        {message}
      </span>
    </div>
  );
}
function ProductPreview() {
  return (
    <div className="product-stage">
      <div className="preview-caption">
        <span>
          <span className="blue-dot" /> A place for the work behind the lesson
        </span>
        <span>Example workspace</span>
      </div>
      <div
        className="product-window"
        role="img"
        aria-label="Example GitLearn workspace showing a Udemy lesson, local coding folder, session notes, and a reviewed checkpoint."
      >
        <aside className="preview-sidebar">
          <div className="preview-wordmark">
            <svg width="16" height="20" viewBox="0 0 28 32" fill="none">
              <path
                d="M6 25V7M6 20c0-9 16-3 16-15"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="6" cy="6" r="3" fill="currentColor" />
              <circle cx="6" cy="26" r="3" fill="currentColor" />
              <circle cx="22" cy="5" r="3" fill="currentColor" />
            </svg>
            GitLearn
            <ChevronRight size={12} />
          </div>
          <span className="preview-label">Workspace</span>
          <div className="preview-nav selected">
            <LayoutGrid size={14} /> Overview
          </div>
          <div className="preview-nav">
            <BookOpen size={14} /> My courses
          </div>
          <div className="preview-nav">
            <GitCommitHorizontal size={14} /> Checkpoints
          </div>
          <div className="preview-settings">
            <Settings2 size={14} />
            Settings
          </div>
        </aside>
        <div className="preview-workspace">
          <div className="preview-topbar">
            Workspace <ChevronRight size={12} /> Overview{" "}
            <span>
              <span className="blue-dot" />
              Local first
            </span>
          </div>
          <div className="preview-content">
            <div className="preview-eyebrow">Personal workspace</div>
            <h2>Current session</h2>
            <p>Stay with the lesson. Keep the work that matters.</p>
            <div className="example-session">
              <div className="example-lesson">
                <span className="example-course">
                  <BookOpen size={13} /> AI Engineer · Udemy
                </span>
                <h3>Building your first agent</h3>
                <div className="example-section">03 / Agents & tools</div>
                <div className="example-status">
                  <span className="blue-dot" /> In progress
                </div>
                <div className="example-folder">
                  <Folder size={15} />
                  <div>
                    <small>Coding folder</small>
                    <span>workspaces / first-agent</span>
                  </div>
                  <ArrowUpRight size={14} />
                </div>
              </div>
              <div className="example-notes">
                <span>Session notes</span>
                <p>
                  Give the agent one clear task.
                  <br />
                  Keep tool calls small and explicit.
                  <br />
                  Check the result before moving on.
                </p>
                <div className="example-review">
                  Finish & review <ArrowRight size={14} />
                </div>
              </div>
            </div>
            <div className="example-checkpoint">
              <GitCommitHorizontal size={17} />
              <div>
                <strong>Added a tool for local search</strong>
                <span>Previous checkpoint · 2 files</span>
              </div>
              <span className="example-saved">
                <Check size={12} /> Saved locally
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
const steps = [
  { id: "launch", name: "Start the companion" },
  { id: "archive", name: "Choose your learning folder" },
  { id: "extension", name: "Connect Chrome" },
  { id: "course", name: "Bring in a Udemy course" },
  { id: "code", name: "Watch, code, take notes" },
  { id: "checkpoint", name: "Review and save" },
  { id: "github", name: "Back up to GitHub" },
];
function Step({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  return (
    <article className="guide-step" id={steps[index].id}>
      <span className="step-number">0{index + 1}</span>
      <div>
        <h3>
          {steps[index].name}
          {index === 6 && <span className="optional-label">Optional</span>}
        </h3>
        {children}
      </div>
    </article>
  );
}
function Landing() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#why">Why GitLearn</a>
            <a href="#guide">How to use it</a>
            <a href="#questions">Questions</a>
          </nav>
          <a className="header-cta" href="/">
            Open workspace <ArrowUpRight size={14} />
          </a>
        </div>
      </header>
      <main id="main">
        <section className="hero container">
          <a className="release-note" href="#guide">
            <span className="blue-dot" /> Udemy companion · Local preview{" "}
            <ChevronRight size={13} />
          </a>
          <h1>
            Make learning
            <br />
            <span>part of your craft.</span>
          </h1>
          <p className="hero-copy">
            The video is just the beginning. Give your code, notes, and progress
            a home — from your first Udemy lesson to your next big idea.
          </p>
          <div className="hero-actions">
            <a className="cta primary" href="/?view=setup">
              Set up GitLearn <ArrowRight size={16} />
            </a>
            <a className="text-link" href="#guide">
              Read the setup guide <ChevronRight size={15} />
            </a>
          </div>
          <p className="availability">
            Windows + Chrome. Your files stay local until you choose to sync.
          </p>
          <ProductPreview />
        </section>
        <section className="principles container" id="why">
          <div className="section-intro">
            <span className="section-label">
              Built around the way you learn
            </span>
            <h2>
              Your course ends.
              <br />
              <span>Your work stays.</span>
            </h2>
            <p>
              Keep watching on Udemy. Keep coding in your editor. GitLearn
              connects the two with a history you can come back to.
            </p>
          </div>
          <div className="principle-list">
            <article>
              <BookOpen size={22} />
              <div>
                <h3>A lesson with context.</h3>
                <p>
                  The Chrome extension brings accessible course and lesson
                  details into your workspace. Pick a lesson and start where you
                  left off.
                </p>
              </div>
            </article>
            <article>
              <Code2 size={22} />
              <div>
                <h3>Your tools. Your own code.</h3>
                <p>
                  Use a fresh lesson folder or link an existing project. Work
                  locally in VS Code or any editor, and keep a note alongside
                  the session.
                </p>
              </div>
            </article>
            <article>
              <GitCommitHorizontal size={22} />
              <div>
                <h3>A checkpoint worth keeping.</h3>
                <p>
                  Review your files and commit message before saving. Every
                  checkpoint captures the version you reviewed in your learning
                  archive.
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className="archive-section" id="organization">
          <div className="container archive-inner">
            <div>
              <span className="section-label">One archive. Room to grow.</span>
              <h2>
                Every course.
                <br />
                One place to return to.
              </h2>
              <p>
                Choose a parent folder once. GitLearn creates a folder for each
                course, section, and lesson as you mirror it. No organizing by
                hand.
              </p>
              <p>
                Connect one private GitHub repository to that archive.{" "}
                <strong>Sync now</strong> backs up the saved history across all
                your courses.
              </p>
              <a className="text-link" href="#github">
                See how GitHub fits in <ArrowRight size={15} />
              </a>
            </div>
            <div className="archive-example">
              <div className="archive-example-heading">
                <Github size={16} />
                <span>you / learning</span>
                <span className="private-label">
                  <LockKeyhole size={11} />
                  Private
                </span>
              </div>
              <div className="folder-tree">
                <div>
                  <Folder size={15} />
                  <strong>learning /</strong>
                </div>
                <div className="tree-level">
                  <Folder size={15} />
                  udemy /
                </div>
                <div className="tree-level two">
                  <Folder size={15} />
                  <span>
                    ai-engineer-<small>course-id</small> /
                  </span>
                </div>
                <div className="tree-level three">
                  <Folder size={15} />
                  agents-<small>section-id</small> /
                </div>
                <div className="tree-level four">
                  <Folder size={15} />
                  first-agent-<small>lesson-id</small> /
                </div>
                <div className="tree-level five">
                  <FileCode2 size={15} />
                  agent.py
                </div>
                <div className="tree-level five">
                  <Folder size={15} />
                  session-notes /
                </div>
                <div className="tree-level two second-course">
                  <Folder size={15} />
                  python-basics-<small>course-id</small> /
                </div>
                <div className="tree-level three">
                  <span className="tree-ellipsis">… your next lesson</span>
                </div>
              </div>
              <div className="archive-example-footer">
                <CheckCircle2 size={13} />
                Illustrative structure · Stable IDs keep courses separate
              </div>
            </div>
          </div>
        </section>
        <section className="guide container" id="guide">
          <div className="guide-heading">
            <span className="section-label">
              From setup to your first checkpoint
            </span>
            <h2>
              A little setup.
              <br />
              <span>Then get back to learning.</span>
            </h2>
            <p>
              This build runs on your computer. Follow these steps once; use the
              same workspace for every course.
            </p>
          </div>
          <div className="guide-layout">
            <aside className="guide-index">
              <div className="guide-index-title">Your first session</div>
              <nav aria-label="Setup steps">
                {steps.map((step, i) => (
                  <a key={step.id} href={`#${step.id}`}>
                    <span>0{i + 1}</span>
                    {step.name}
                  </a>
                ))}
              </nav>
              <div className="requirements">
                <ShieldCheck size={17} />
                <h4>Before you start</h4>
                <p>
                  Windows, Chrome, Node.js 24+, and Git. Git needs your name and
                  email configured. GitHub CLI is only needed for remote backup.
                </p>
                <p>
                  This is a local unpacked extension, currently outside the
                  Chrome Web Store.
                </p>
              </div>
            </aside>
            <div className="guide-steps">
              <Step index={0}>
                <p>
                  In your GitLearn project folder, double-click{" "}
                  <strong>Start GitLearn.cmd</strong>. It starts the companion
                  in the background and opens your workspace.
                </p>
                <p>
                  Leave the companion running while you learn. To stop it later,
                  double-click <strong>Stop GitLearn.cmd</strong>.
                </p>
                <details className="technical-detail">
                  <summary>Setting up from source instead?</summary>
                  <p>
                    Install Node.js 24+ and Git, then open a terminal in this
                    project and run each command:
                  </p>
                  <CopyCommand value="npm install" />
                  <CopyCommand value="npm run build" />
                  <CopyCommand value="npm start" />
                  <p>
                    If Git asks for an identity, set your own details first:
                  </p>
                  <CopyCommand
                    value={'git config --global user.name "Your Name"'}
                  />
                  <CopyCommand
                    value={'git config --global user.email "you@example.com"'}
                  />
                  <p>
                    Keep that terminal running. Open this guide at{" "}
                    <code>http://127.0.0.1:47831/welcome</code>.
                  </p>
                </details>
              </Step>
              <Step index={1}>
                <p>
                  Open <a href="/?view=setup">Settings</a>. Choose an{" "}
                  <strong>empty learning history folder</strong> and select{" "}
                  <strong>Create my workspace</strong>. A folder on your Desktop
                  works; you choose the location.
                </p>
                <p>
                  For one parent folder, create <code>Desktop\Learning</code>,
                  then choose its empty <code>history</code> subfolder for the
                  archive. Your courses go inside it automatically. New coding
                  folders are created in a sibling <code>workspaces</code>{" "}
                  folder.
                </p>
                <pre className="small-tree">{`Learning/
  history/      ← the Git archive, all courses
  workspaces/   ← where you write your code`}</pre>
                <p className="guide-note">
                  Code in your workspaces, not directly in the history archive.
                  You can also link existing code without moving it. Once
                  configured, the archive’s location is fixed in this build.
                </p>
              </Step>
              <Step index={2}>
                <p>In Chrome, paste this into the address bar:</p>
                <CopyCommand
                  value="chrome://extensions"
                  label="Copy Chrome extensions address"
                />
                <ol>
                  <li>
                    Turn on <strong>Developer mode</strong>.
                  </li>
                  <li>
                    Choose <strong>Load unpacked</strong> and select{" "}
                    <code>dist\extension</code> inside your GitLearn project
                    folder.
                  </li>
                  <li>
                    Pin <strong>GitLearn</strong> using Chrome’s extensions
                    menu.
                  </li>
                  <li>
                    In GitLearn Settings, choose{" "}
                    <strong>Get connection code</strong>. Enter the six-digit
                    code in the extension popup and select{" "}
                    <strong>Connect</strong>. Codes expire after five minutes.
                  </li>
                </ol>
                <p className="guide-note">
                  Already installed? After rebuilding GitLearn, press Reload on
                  its card in Chrome’s extensions page.
                </p>
              </Step>
              <Step index={3}>
                <p>
                  Open or reload your Udemy course page while signed in to
                  Udemy. The extension sends accessible course titles and lesson
                  context to the companion.
                </p>
                <p>
                  Go to <strong>My courses</strong> and select{" "}
                  <strong>Mirror course</strong>. GitLearn creates the
                  discovered course structure and your coding folders. Expand
                  sections on Udemy and refresh the course structure as more
                  lessons become available.
                </p>
                <p className="guide-note">
                  Some Udemy layouts expose only part of the curriculum. If a
                  lesson is missing, use <strong>Add a course</strong> to enter
                  its Udemy link and details manually. Videos, transcripts, and
                  instructor code are not downloaded.
                </p>
              </Step>
              <Step index={4}>
                <p>
                  Select <strong>Start lesson</strong>. Use the generated lesson
                  workspace or choose an existing folder containing your own
                  code. Select <strong>Start session</strong>.
                </p>
                <p>
                  Choose <strong>Open in VS Code</strong>, or open the displayed
                  folder yourself in your preferred editor. Watch the lesson,
                  write your code locally, and add what you learned to the
                  session notes.
                </p>
                <p className="guide-note">
                  Only the selected coding folder is considered for a
                  checkpoint. Existing project repositories keep their own Git
                  index and remotes.
                </p>
              </Step>
              <Step index={5}>
                <p>
                  Save your files in your editor, then select{" "}
                  <strong>Finish &amp; review</strong>. Inspect the file list,
                  diff, and commit message. Select{" "}
                  <strong>Save checkpoint</strong> to add a local Git commit to
                  your learning history.
                </p>
                <p>
                  The checkpoint contains the exact version you reviewed. Edits
                  made after preview stay in your coding folder for a later
                  checkpoint.
                </p>
                <div className="inline-note">
                  <ShieldCheck size={17} />
                  <p>
                    Environment files, dependencies, and build output are
                    excluded. Secret checks can block a save, but always inspect
                    the preview yourself.
                  </p>
                </div>
              </Step>
              <Step index={6}>
                <p>
                  In <a href="/?view=setup">Settings</a>, find{" "}
                  <strong>One repository. Every course.</strong> Install{" "}
                  <a
                    href="https://cli.github.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub CLI <ArrowUpRight size={12} />
                  </a>{" "}
                  if it is missing. On Windows, you can run:
                </p>
                <CopyCommand value="winget install --id GitHub.cli --exact --source winget" />
                <ol>
                  <li>
                    Choose <strong>Sign in to GitHub</strong>. Complete the
                    GitHub CLI browser sign-in, then return to GitLearn.
                  </li>
                  <li>
                    Choose <strong>Check connection</strong>. Your GitHub
                    username appears when the connection is verified.
                  </li>
                  <li>
                    Enter a name such as <code>learning</code> and select{" "}
                    <strong>Create private repo</strong>. GitLearn creates and
                    connects one private repository in your account.
                    Alternatively, connect the HTTPS URL of an existing{" "}
                    <strong>empty private repository</strong>.
                  </li>
                  <li>
                    After saving a checkpoint, go to{" "}
                    <strong>Checkpoints</strong> and select{" "}
                    <strong>Sync now</strong>. This uploads the archive’s saved
                    history, including all its courses.
                  </li>
                </ol>
                <p className="guide-note">
                  Creating or connecting a repository does not upload your code.
                  Sync is manual. An internet connection is needed for GitHub
                  setup and sync. Failed pushes keep your local checkpoints;
                  divergent histories pause sync.
                </p>
              </Step>
            </div>
          </div>
        </section>
        <section className="faq container" id="questions">
          <div>
            <span className="section-label">A few things to know</span>
            <h2>
              Keep it simple.
              <br />
              <span>Keep it yours.</span>
            </h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>
                Do I need a GitHub repository to start?<span>+</span>
              </summary>
              <p>
                No. GitLearn creates a local Git archive in your chosen folder.
                Connect a private GitHub repository later if you want a remote
                backup. One repository holds multiple courses.
              </p>
            </details>
            <details>
              <summary>
                Does it work when the companion is closed?<span>+</span>
              </summary>
              <p>
                The extension queues course context updates while the companion
                is unavailable. Start GitLearn again and use Retry pending
                updates in the popup. Saving checkpoints requires the companion
                to be running.
              </p>
            </details>
            <details>
              <summary>
                Where does my data go?<span>+</span>
              </summary>
              <p>
                Your code snapshots and notes live in your chosen history
                archive. Working code stays in the selected coding folder. App
                state and extension pairing credentials stay in the companion’s
                local app-data folder. GitHub receives reviewed history only
                when you sync.
              </p>
            </details>
            <details>
              <summary>
                Do I need an OpenAI API key?<span>+</span>
              </summary>
              <p>
                No. Everything in the core learning workflow works without AI.
                If you enable AI-assisted commit messages in Settings, the local
                companion reads your project’s .env and sends a small scanned
                diff, lesson context, and note to OpenAI. Your API key stays on
                the server. API usage may incur charges.
              </p>
            </details>
            <details>
              <summary>
                Can I use this for any learning platform?<span>+</span>
              </summary>
              <p>
                This first build is focused on Udemy and Chrome on Windows. It
                observes accessible lesson context and stores your own work.
                Other platforms and a packaged installer are not included yet.
              </p>
            </details>
          </div>
        </section>
        <section className="closing container">
          <div>
            <span className="section-label">
              Less lost progress. More building.
            </span>
            <h2>
              Your next lesson.
              <br />
              Your next checkpoint.
            </h2>
          </div>
          <a className="cta primary" href="/?view=setup">
            Open your workspace <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <footer className="site-footer container">
        <Brand />
        <span>A personal workspace for the things you learn.</span>
        <a href="#guide">
          Setup guide <ArrowUpRight size={13} />
        </a>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Landing />);
