import type { Observation } from "../src/shared";
export function seekUdemyAnchor(document: Document, href: string) {
  const url = new URL(href);
  if (
    url.protocol !== "https:" ||
    !/^(?:[a-z0-9-]+\.)*udemy\.com$/.test(url.hostname) ||
    !/\/course\/[^/]+\/learn\/lecture\/\d+/.test(url.pathname) ||
    !url.searchParams.has("outclassTime")
  )
    return false;
  const seconds = Number(url.searchParams.get("outclassTime")),
    video = document.querySelector("video");
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    seconds > 86400 ||
    !video ||
    !Number.isFinite(video.duration) ||
    video.duration <= 0
  )
    return false;
  video.pause();
  video.currentTime = Math.min(seconds, video.duration);
  return true;
}

export function extractTranscript(document: Document) {
  const panel = document.querySelector(
    '[data-purpose="transcript-panel"], [data-purpose="transcript-container"], [class*="transcript--transcript-panel"], [class*="transcript--transcript-container"]',
  );
  if (!panel || panel.closest('[hidden], [aria-hidden="true"]')) return "";
  let node: Element | null = panel;
  while (node) {
    const style = document.defaultView?.getComputedStyle(node);
    if (style?.display === "none" || style?.visibility === "hidden") return "";
    node = node.parentElement;
  }
  const cues = panel.querySelectorAll(
    '[data-purpose="transcript-cue"], [data-purpose="transcript-cue-container"], [class*="transcript--cue-container"]',
  );
  const result = cues.length
    ? [...cues].map((cue) => cue.textContent?.trim() || "").join("\n")
    : panel.textContent || "";
  return result.trim().slice(0, 240000);
}

function text(element: Element | null) {
  return element?.textContent?.replace(/\s+/g, " ").trim() || "";
}
export function extractUdemy(
  document: Document,
  href: string,
): Omit<Observation, "eventId"> | null {
  const url = new URL(href);
  const courseMatch = url.pathname.match(/^\/course\/([^/]+)/);
  if (!courseMatch) return null;
  const titleElement = document.querySelector(
    '[data-purpose="course-header-title"], [data-purpose="course-title"], a[href*="/course/"][class*="course-title"], h1',
  );
  const metaTitle =
    document
      .querySelector('meta[property="og:title"]')
      ?.getAttribute("content") || "";
  const title = (text(titleElement) || metaTitle || document.title)
    .replace(/\s*[|–-]\s*Udemy.*$/i, "")
    .trim();
  if (!title) return null;
  const currentLessonId = url.pathname.match(/\/lecture\/(\d+)/)?.[1];
  const lessons: Observation["lessons"] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll(
    'a[href*="/lecture/"], [data-purpose="curriculum-item-link"][data-lecture-id], [data-purpose="curriculum-item"][data-id]',
  );
  anchors.forEach((anchor, index) => {
    const target = anchor.getAttribute("href") || "";
    const id =
      target.match(/\/lecture\/(\d+)/)?.[1] ||
      anchor.getAttribute("data-lecture-id") ||
      anchor.getAttribute("data-id");
    const lessonTitle =
      text(
        anchor.querySelector(
          '[data-purpose="item-title"], [data-purpose="lecture-title"], [class*="item-title"]',
        ),
      ) || text(anchor);
    if (!id || !lessonTitle || seen.has(id)) return;
    const sectionElement = anchor.closest(
      '[data-purpose="section-panel"], [data-purpose="curriculum-section-container"], [data-purpose="course-section"]',
    );
    const sectionTitle =
      text(
        sectionElement?.querySelector(
          '[data-purpose="section-title"], [class*="section-title"], h2, h3',
        ) || null,
      ) || "Lessons";
    seen.add(id);
    lessons.push({
      id,
      title: lessonTitle.slice(0, 300),
      section: sectionTitle.slice(0, 300),
      sectionId: sectionElement?.getAttribute("data-section-id") || undefined,
      order: index,
    });
  });
  if (currentLessonId && !seen.has(currentLessonId)) {
    const active = document.querySelector(
      '[data-purpose="lecture-title"], [data-purpose="current-lecture-title"], [aria-current="true"] [data-purpose="item-title"], [class*="lecture-title"]',
    );
    const lessonTitle = text(active);
    if (lessonTitle)
      lessons.push({
        id: currentLessonId,
        title: lessonTitle.slice(0, 300),
        section: "Lessons",
        order: lessons.length,
      });
  }
  return {
    courseId: courseMatch[1],
    title: title.slice(0, 300),
    url: `${url.origin}${url.pathname}`,
    currentLessonId,
    videoSeconds: (() => {
      const video = document.querySelector("video");
      return video && Number.isFinite(video.currentTime)
        ? Math.floor(video.currentTime)
        : undefined;
    })(),
    lessons: lessons.slice(0, 500),
  };
}

if (
  typeof chrome !== "undefined" &&
  chrome.runtime?.id &&
  typeof document !== "undefined"
) {
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type !== "read-transcript") return;
    const observation = extractUdemy(document, location.href);
    const content = extractTranscript(document);
    if (!observation || content.length < 40) {
      respond({
        error:
          "Open the Transcript panel in your Udemy lesson first. If Udemy does not expose it, paste or import the transcript in GitLearn Sources.",
      });
      return;
    }
    const lesson = observation.lessons.find(
      (item) => item.id === observation.currentLessonId,
    );
    respond({
      observation: { ...observation, eventId: crypto.randomUUID() },
      content,
      title: `Udemy transcript · ${lesson?.title || observation.title}`.slice(
        0,
        200,
      ),
      lessonId: lesson ? lesson.id : "",
    });
  });
  let previous = "";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observe = () => {
    const result = extractUdemy(document, location.href);
    if (!result) return;
    const signature = JSON.stringify(result);
    if (signature === previous) return;
    previous = signature;
    chrome.runtime
      .sendMessage({
        type: "observation",
        payload: { ...result, eventId: crypto.randomUUID() },
      })
      .then((result) => {
        if (!result?.ok) previous = "";
      })
      .catch(() => {
        previous = "";
      });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(observe, 1200);
  };
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  setInterval(observe, 3000);
  observe();
  // A user-opened checkpoint link seeks only the visible, authorized player.
  // No playback starts and no video or protected course content is downloaded.
  const seconds = Number(
    new URL(location.href).searchParams.get("outclassTime"),
  );
  if (
    new URL(location.href).searchParams.has("outclassTime") &&
    Number.isFinite(seconds) &&
    seconds >= 0 &&
    seconds <= 86400
  ) {
    let tries = 0;
    const seek = setInterval(() => {
      if (seekUdemyAnchor(document, location.href)) {
        clearInterval(seek);
      } else if (++tries >= 60) clearInterval(seek);
    }, 500);
  }
}
