import { expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { extractUdemy } from "../extension/content";
it("extracts accessible lesson context and sanitizes source URLs without collecting lesson prose", () => {
  const dom = new JSDOM(
    '<h1 data-purpose="course-header-title">C++ Masterclass</h1><section data-purpose="section-panel" data-section-id="8"><h2 data-purpose="section-title">Pointers</h2><a href="/course/cpp/learn/lecture/42"><span data-purpose="item-title">Dynamic memory</span><span>7 min</span></a><a href="/course/cpp/learn/lecture/43"><span data-purpose="item-title">Smart pointers</span></a></section><article>Paid lesson prose should stay on the page.</article>',
  );
  const result = extractUdemy(
    dom.window.document,
    "https://www.udemy.com/course/cpp/learn/lecture/42?auth=remove#overview",
  );
  expect(result?.title).toBe("C++ Masterclass");
  expect(result?.currentLessonId).toBe("42");
  expect(result?.lessons[0]).toMatchObject({
    id: "42",
    title: "Dynamic memory",
    section: "Pointers",
  });
  expect(result?.url).toBe("https://www.udemy.com/course/cpp/learn/lecture/42");
  expect(JSON.stringify(result)).not.toContain("Paid lesson prose");
});
it("does not invent curriculum or completion when context is unavailable", () => {
  const dom = new JSDOM(
    "<title>Udemy</title><div>No accessible curriculum</div>",
  );
  const result = extractUdemy(
    dom.window.document,
    "https://www.udemy.com/course/cpp/learn/lecture/42",
  );
  expect(result?.lessons).toEqual([]);
  expect(
    extractUdemy(dom.window.document, "https://www.udemy.com/home/"),
  ).toBeNull();
});
