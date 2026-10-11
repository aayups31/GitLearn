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
            : tabs[
                (tabs.indexOf(tab) +
                  (event.key === "ArrowLeft" ? -1 : 1) +
                  tabs.length) %
                  tabs.length
              ];
      selectTab(next);
      next.focus();
    }
  });
}
// Content is visible before scripts run. MatchMedia reverts every GSAP style
// and trigger when the visitor changes their motion preference or viewport.
if (window.gsap && window.ScrollTrigger && document.querySelector(".hero")) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  let entered = false;
  media.add("(prefers-reduced-motion: no-preference)", () => {
    document.body.classList.add("motion-ready");
    if (!entered && !document.hidden && scrollY < 80) {
      gsap.from(".hero-word", {
        yPercent: 108,
        duration: 1.1,
        stagger: 0.13,
        ease: "power3.out",
        clearProps: "transform",
      });
      gsap.from(".hero-enter", {
        y: 16,
        opacity: 0,
        duration: 0.85,
        stagger: 0.07,
        delay: 0.2,
        ease: "power2.out",
        clearProps: "all",
      });
      entered = true;
    }
    ScrollTrigger.create({
      trigger: ".hero",
      start: "top bottom",
      end: "bottom top",
      toggleClass: { targets: document.body, className: "hero-in-view" },
    });
    gsap.to(".orbit-shell", {
      y: -65,
      rotation: -7,
      ease: "none",
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
      },
    });
    gsap.to(".loop-words", {
      x: 30,
      ease: "none",
      scrollTrigger: {
        trigger: ".problem",
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      },
    });
    for (const el of document.querySelectorAll("[data-reveal]")) {
      gsap.from(el, {
        y: 26,
        opacity: 0.15,
        duration: 0.85,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 92%",
          toggleActions: "play none none reverse",
        },
      });
    }
    // Anchors and keyboard focus must never leave a focus target dimmed.
    const focused = (event) => {
      const el = event.target.closest("[data-reveal]");
      if (el) {
        gsap.killTweensOf(el, "opacity");
        gsap.set(el, { opacity: 1 });
      }
    };
    document.addEventListener("focusin", focused);
    return () => {
      document.body.classList.remove("motion-ready", "hero-in-view");
      document.removeEventListener("focusin", focused);
    };
  });
  media.add(
    "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
    () => {
      gsap.fromTo(
        ".workspace-frame",
        { rotateX: 7, y: 35, scale: 0.96 },
        {
          rotateX: 0,
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".product-proof",
            start: "top 94%",
            end: "top 30%",
            scrub: 0.65,
          },
        },
      );
      gsap.fromTo(
        ".path-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".escape-chapters",
            start: "top 55%",
            end: "bottom 65%",
            scrub: 0.5,
          },
        },
      );
      const nodes = [...document.querySelectorAll(".path-node")];
      const activate = (index) =>
        nodes.forEach((node, i) =>
          node.classList.toggle("is-active", i <= index),
        );
      for (const step of document.querySelectorAll(".escape-step")) {
        ScrollTrigger.create({
          trigger: step,
          start: "top 58%",
          end: "bottom 58%",
          onEnter: () => activate(Number(step.dataset.step)),
          onEnterBack: () => activate(Number(step.dataset.step)),
        });
      }
      return () => nodes.forEach((node) => node.classList.remove("is-active"));
    },
  );
  // The browser handles scrolling. No wheel interception or synthetic scroller.
  window.addEventListener("load", () => ScrollTrigger.refresh(), {
    once: true,
  });
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  document
    .querySelectorAll("details")
    .forEach((el) =>
      el.addEventListener("toggle", () => ScrollTrigger.refresh()),
    );
}
function pauseMotion() {
  document.body.classList.toggle("motion-paused", document.hidden);
}
document.addEventListener("visibilitychange", pauseMotion);
pauseMotion();
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
          `Windows x64 · ${release.productName || "GitLearn"} v${release.version} · ${asset.size || "Preview installer"} · Unsigned preview`;
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
