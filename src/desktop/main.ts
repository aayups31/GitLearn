import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  safeStorage,
  shell,
  utilityProcess,
} from "electron";
import path from "node:path";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import type { DesktopEnvironment } from "./bridge";

app.setName("GitLearn");
if (process.env.GITLEARN_DESKTOP_USER_DATA)
  app.setPath("userData", process.env.GITLEARN_DESKTOP_USER_DATA);
const root = app.getAppPath();
const extensionSource = app.isPackaged
  ? path.join(process.resourcesPath, "extension")
  : path.join(root, "dist/extension");
const port = Number(process.env.GITLEARN_PORT || "47831");
const origin = `http://127.0.0.1:${port}`;
let window: BrowserWindow | undefined;
let companion: ReturnType<typeof utilityProcess.fork> | undefined;
let savedKey = "";
let quitting = false;
const keyFile = path.join(app.getPath("userData"), "openai-key.encrypted");
const acknowledgements = new Map<string, () => void>();
const allowedExternal = new Set([
  "github.com",
  "git-scm.com",
  "www.python.org",
  "platform.openai.com",
  "chromewebstore.google.com",
  "developer.chrome.com",
]);
function external(url: string) {
  const target = new URL(url);
  if (
    target.origin === origin &&
    target.pathname === "/welcome/" &&
    !target.search &&
    !target.hash
  )
    return shell.openExternal(target.href);
  if (
    target.protocol !== "https:" ||
    !allowedExternal.has(target.hostname) ||
    target.username ||
    target.password
  )
    throw new Error("That link is not an approved GitLearn resource.");
  return shell.openExternal(target.href);
}
async function available(command: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, ["--version"], {
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      child.kill();
      resolve(false);
    }, 4000);
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
  });
}
async function startCompanion() {
  try {
    const response = await fetch(`${origin}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    const health = await response.json();
    if (health.ok && health.name === "GitLearn") {
      if (health.version !== app.getVersion())
        throw new Error(
          "Another GitLearn version is running. Save your files and close it, then open this version again.",
        );
      return;
    }
    throw new Error("The GitLearn port is occupied by another application.");
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("occupied") ||
        error.message.includes("Another GitLearn version"))
    )
      throw error;
  }
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = await readFile(keyFile).catch(() => null);
    if (encrypted) {
      try {
        savedKey = safeStorage.decryptString(encrypted);
      } catch {
        throw new Error(
          "Your saved API key could not be opened. Remove the key file in GitLearn's app data or restore access to your Windows account.",
        );
      }
    }
  }
  if (
    !app.isPackaged &&
    !savedKey &&
    process.env.GITLEARN_DISABLE_DEV_KEY !== "1"
  ) {
    const env = dotenv.config({
      path: path.join(root, ".env"),
      quiet: true,
    }).parsed;
    savedKey = env?.OPENAI_API_KEY || env?.OPEN_AI_API || "";
  }
  companion = utilityProcess.fork(
    path.join(root, "dist/desktop/companion.cjs"),
    [],
    { serviceName: "GitLearn local companion", stdio: "pipe" },
  );
  // Neither the API key nor source contents are written to process logs.
  companion.stderr?.on("data", () => {});
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("The local workspace took too long to start.")),
      20000,
    );
    companion!.on("message", (message) => {
      if (message.type === "ready") {
        clearTimeout(timer);
        resolve();
      }
      if (message.type === "error") {
        clearTimeout(timer);
        reject(new Error(message.message));
      }
      if (message.type === "key-saved") {
        acknowledgements.get(message.id)?.();
        acknowledgements.delete(message.id);
      }
      if (message.type === "focus") {
        if (window?.isMinimized()) window.restore();
        window?.show();
        window?.focus();
      }
    });
    companion!.on("exit", () => {
      clearTimeout(timer);
      reject(new Error("The local workspace stopped unexpectedly."));
      if (!quitting && window)
        dialog.showErrorBox(
          "GitLearn stopped",
          "Reopen GitLearn to reconnect to your local workspace.",
        );
    });
    companion!.postMessage({
      root,
      port,
      apiKey: savedKey,
      dataDirectory:
        process.env.GITLEARN_DATA_DIR ||
        path.join(
          process.env.LOCALAPPDATA || app.getPath("userData"),
          "GitForLearning",
        ),
    });
  });
}
function trusted(event: Electron.IpcMainInvokeEvent) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame ||
    new URL(event.senderFrame.url).origin !== origin
  )
    throw new Error("Use the GitLearn desktop workspace.");
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore();
    window?.show();
    window?.focus();
  });
  app.whenReady().then(async () => {
    try {
      await startCompanion();
      ipcMain.handle("desktop:environment", async (event) => {
        trusted(event);
        return {
          version: app.getVersion(),
          defaultLearningFolder: path.join(
            app.getPath("desktop"),
            "My Learning",
          ),
          gitAvailable: await available("git"),
          keyManaged: !!companion,
          hasSavedKey: !!savedKey,
        } satisfies DesktopEnvironment;
      });
      ipcMain.handle("desktop:folder", async (event) => {
        trusted(event);
        const result = await dialog.showOpenDialog(window!, {
          title: "Choose your parent learning folder",
          defaultPath: app.getPath("desktop"),
          properties: ["openDirectory", "createDirectory"],
        });
        return result.canceled ? null : result.filePaths[0];
      });
      ipcMain.handle("desktop:key", async (event, key: unknown) => {
        trusted(event);
        if (!companion)
          throw new Error(
            "Close the standalone companion and reopen the desktop app to manage your API key here.",
          );
        if (
          typeof key !== "string" ||
          key.length > 500 ||
          (key && !/^sk-[A-Za-z0-9_-]{10,}$/.test(key))
        )
          throw new Error(
            "Enter a valid OpenAI API key, or leave it empty to remove the key.",
          );
        if (key && !safeStorage.isEncryptionAvailable())
          throw new Error(
            "Windows encryption is unavailable. Your API key has not been saved.",
          );
        const id = randomUUID();
        await mkdir(path.dirname(keyFile), { recursive: true });
        if (key)
          await writeFile(keyFile, safeStorage.encryptString(key), {
            mode: 0o600,
          });
        else
          await unlink(keyFile).catch((error) => {
            if (error.code !== "ENOENT") throw error;
          });
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            acknowledgements.delete(id);
            reject(
              new Error(
                "The companion did not confirm the change. Reopen GitLearn.",
              ),
            );
          }, 5000);
          acknowledgements.set(id, () => {
            clearTimeout(timer);
            resolve();
          });
          companion!.postMessage({ type: "key", id, key });
        });
        savedKey = key;
      });
      ipcMain.handle("desktop:external", (event, url) => {
        trusted(event);
        return external(String(url));
      });
      ipcMain.handle("desktop:extension", async (event) => {
        trusted(event);
        // Chrome needs ordinary files. Packaged extension resources stay outside ASAR.
        const { cp } = await import("node:fs/promises");
        const target = path.join(
          app.getPath("userData"),
          "extension",
          app.getVersion(),
        );
        await cp(extensionSource, target, { recursive: true });
        const error = await shell.openPath(target);
        if (error) throw new Error(error);
      });
      window = new BrowserWindow({
        width: 1500,
        height: 1000,
        minWidth: 960,
        minHeight: 660,
        show: false,
        backgroundColor: "#101114",
        title: "GitLearn",
        icon: path.join(extensionSource, "icons/icon-256.png"),
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(root, "dist/desktop/preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        external(url).catch(() => {});
        return { action: "deny" };
      });
      window.webContents.on("will-navigate", (event, url) => {
        if (new URL(url).origin !== origin) {
          event.preventDefault();
          external(url).catch(() => {});
        }
      });
      window.webContents.session.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      window.webContents.on("will-prevent-unload", (event) => {
        if (
          dialog.showMessageBoxSync(window!, {
            type: "question",
            buttons: ["Keep editing", "Leave without saving"],
            defaultId: 0,
            cancelId: 0,
            message: "You have unsaved work",
            detail:
              "Save your files and wait for notes to finish saving before closing GitLearn.",
          }) === 1
        )
          event.preventDefault();
      });
      await window.loadURL(origin);
      if (process.env.GITLEARN_HEADLESS_TEST !== "1") window.show();
    } catch (error) {
      dialog.showErrorBox(
        "GitLearn could not open",
        error instanceof Error ? error.message : "Please reopen GitLearn.",
      );
      app.quit();
    }
  });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (companion && !quitting) {
      event.preventDefault();
      quitting = true;
      companion.postMessage({ type: "shutdown" });
      const timer = setTimeout(() => {
        companion?.kill();
        app.quit();
      }, 3500);
      companion.once("exit", () => {
        clearTimeout(timer);
        app.quit();
      });
    }
  });
}
