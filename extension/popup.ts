const statusEl = document.getElementById("status")!;
const details = document.getElementById("details")!;
async function update() {
  const result = await chrome.runtime.sendMessage({ type: "status" });
  statusEl.textContent = result.companion
    ? "Companion connected"
    : "Open your local companion";
  statusEl.className = result.companion ? "connected" : "disconnected";
  document.getElementById("pairing")!.hidden = !!result.companion;
  const latest = result.latest;
  details.replaceChildren();
  if (latest) {
    const label = document.createElement("small");
    label.textContent = "UDEMY";
    const heading = document.createElement("h2");
    heading.textContent = latest.title;
    const lesson = document.createElement("p");
    lesson.textContent =
      latest.lessons.find(
        (item: { id: string }) => item.id === latest.currentLessonId,
      )?.title || `${latest.lessons.length} lessons discovered`;
    details.append(label, heading, lesson);
  } else {
    const heading = document.createElement("h2");
    heading.textContent = "Your lesson, connected.";
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Open a Udemy course. We’ll send the lesson context to your local workspace.";
    details.append(heading, paragraph);
  }
  document.getElementById("pending")!.textContent =
    result.queueNotice ||
    (result.outbox?.length
      ? `${result.outbox.length} course updates waiting for the companion.`
      : "");
}
document
  .getElementById("pair-form")!
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await chrome.runtime.sendMessage({
      type: "pair",
      code: (document.getElementById("code") as HTMLInputElement).value,
    });
    document.getElementById("error")!.textContent = result.error || "";
    await update();
  });
document
  .getElementById("open")!
  .addEventListener("click", async () => {
    const result = await chrome.runtime.sendMessage({ type: "open-workspace" }).catch(() => null);
    if (!result?.opened) await chrome.tabs.create({ url: "http://127.0.0.1:47831" });
  });
document.getElementById("retry")!.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "retry" });
  await update();
});
document.getElementById("transcript")!.addEventListener("click", async () => {
  const button = document.getElementById("transcript") as HTMLButtonElement;
  button.disabled = true;
  document.getElementById("error")!.textContent = "";
  try {
    const result = await chrome.runtime.sendMessage({
      type: "capture-transcript",
    });
    if (result.error) throw new Error(result.error);
    document.getElementById("transcript-status")!.textContent =
      "Transcript saved. Open GitLearn → Code & learn → Sources.";
  } catch (error) {
    document.getElementById("error")!.textContent =
      error instanceof Error
        ? error.message
        : "Could not import this transcript.";
  } finally {
    button.disabled = false;
  }
});
update().catch(() => {
  statusEl.textContent = "Reload the extension to reconnect.";
});
