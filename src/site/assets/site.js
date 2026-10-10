const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(tab) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute("aria-controls")).hidden =
      !selected;
  }
}
for (const tab of tabs) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? tabs[0]
          : event.key === "End"
            ? tabs.at(-1)
            : tabs[(tabs.indexOf(tab) + 1) % tabs.length];
      selectTab(next);
      next.focus();
    }
  });
}
const motion = matchMedia("(prefers-reduced-motion: reduce)");
function updateMotion() {
  document.body.classList.toggle("reveal-ready", !motion.matches);
}
motion.addEventListener("change", updateMotion);
updateMotion();
fetch(
  new URL(
    "release.json",
    document.currentScript?.src || new URL("assets/site.js", location.href),
  ),
)
  .then((response) => {
    if (!response.ok) throw Error();
    return response.json();
  })
  .then((release) => {
    for (const [id, asset] of [
      ["windows", release.windows],
      ["extension", release.extension],
    ]) {
      if (!asset?.url) continue;
      const url = new URL(asset.url);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "github.com" ||
        !url.pathname.startsWith("/aayups31/GitLearn/releases/download/")
      )
        continue;
      document.getElementById(`${id}-download`).href = url.href;
      if (id === "windows")
        document.getElementById("windows-status").textContent =
          `Windows x64 · v${release.version} · ${asset.size || "Preview installer"} · Unsigned preview`;
    }
    if (release.chromeStoreUrl) {
      const url = new URL(release.chromeStoreUrl);
      if (
        url.protocol === "https:" &&
        url.hostname === "chromewebstore.google.com"
      ) {
        document.getElementById("extension-download").href = url.href;
        document.getElementById("extension-status").textContent =
          "Install from the Chrome Web Store, then pair in the app.";
      }
    }
  })
  .catch(() => {});
