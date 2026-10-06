import type { Observation } from "../src/shared";

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
    lessons: lessons.slice(0, 500),
  };
}

if (
  typeof chrome !== "undefined" &&
  chrome.runtime?.id &&
  typeof document !== "undefined"
) {
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
  setInterval(observe, 15000);
  observe();
}
