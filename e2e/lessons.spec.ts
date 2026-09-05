import { test, expect } from "@playwright/test";
import { introLessons } from "@/content/intro";
import { blockingQueueLessons } from "@/content/blocking-queue";
import { runTlcInBrowser, classifyTlcOutput } from "./tlc-runner";

/**
 * This guards against the class of CheerpJ regression where in-browser TLC
 * silently stops after computing initial states and misses counterexamples.
 */

const lessons = [...introLessons, ...blockingQueueLessons].filter((l) => l.spec && l.cfg);

test.describe("Lesson TLC regression", () => {
  test("at least one runnable lesson is registered", () => {
    expect(lessons.length).toBeGreaterThan(0);
  });

  for (const lesson of lessons) {
    test(`${lesson.section}/${lesson.slug} -> ${lesson.expect}`, async ({ page }) => {
      await page.goto("/");
      const output = await runTlcInBrowser(page, lesson.spec, lesson.cfg);
      const { violated, completed } = classifyTlcOutput(output);

      if (lesson.expect === "violation") {
        expect(violated, `expected a counterexample but none was reported:\n${output}`).toBe(true);
      } else {
        expect(violated, `unexpected counterexample:\n${output}`).toBe(false);
        expect(completed, `expected model checking to complete:\n${output}`).toBe(true);
      }
    });
  }

  test("intro/basic-operators rejects a green-to-red transition", async ({ page }) => {
    const lesson = introLessons.find((l) => l.slug === "basic-operators")!;
    const spec = lesson.spec.replace(
      'light = "yellow"',
      'light \\in {"yellow", "green"}'
    );
    expect(spec).not.toBe(lesson.spec);
    await page.goto("/");
    const output = await runTlcInBrowser(page, spec, lesson.cfg);
    expect(output).toMatch(/(?:Action property|Temporal properties).*violated/);
  });
});
