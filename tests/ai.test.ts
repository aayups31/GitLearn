import { beforeEach, expect, it, vi } from "vitest";
const { parse } = vi.hoisted(() => ({ parse: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { parse };
  },
}));
import { describe } from "../src/server/ai";

const context = {
  course: "Python Essentials",
  lesson: "Functions",
  note: "I practiced a greeting function.",
  diff: '+def greet(): return "hello"',
};
const fallback = "course: checkpoint Functions";
beforeEach(() => {
  parse.mockReset();
});
it("uses a local message without any model request when AI is off", async () => {
  expect(
    await describe("unit-test-placeholder", false, context, fallback),
  ).toMatchObject({ message: fallback, aiUsed: false });
  expect(parse).not.toHaveBeenCalled();
});
it("keeps a checkpoint usable when the API is unavailable", async () => {
  parse.mockRejectedValue(new Error("API unavailable"));
  expect(
    await describe("unit-test-placeholder", true, context, fallback),
  ).toMatchObject({ message: fallback, aiUsed: false });
});
it("rejects unsafe model text and keeps the local default", async () => {
  parse.mockResolvedValue({
    output_parsed: { title: "sk-proj-" + "a".repeat(40), bullets: [] },
  });
  expect(
    await describe("unit-test-placeholder", true, context, fallback),
  ).toMatchObject({ message: fallback, aiUsed: false });
});
it("blocks unsafe input before a model request", async () => {
  await expect(
    describe(
      "unit-test-placeholder",
      true,
      { ...context, note: "sk-proj-" + "a".repeat(40) },
      fallback,
    ),
  ).rejects.toThrow("API key");
  expect(parse).not.toHaveBeenCalled();
});
