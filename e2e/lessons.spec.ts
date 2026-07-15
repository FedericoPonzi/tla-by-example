import { test, expect } from "@playwright/test";
import { introLessons } from "@/content/intro";
import { blockingQueueLessons } from "@/content/blocking-queue";
import { runTlcInBrowser, classifyTlcOutput } from "./tlc-runner";

/**
 * Pluggable, per-lesson in-browser TLC regression suite.
 *
 * Every lesson that declares an `expect` field in its markdown frontmatter
 * (see src/lib/lessons.ts) is model-checked in a real browser via the CheerpJ
 * worker, and its outcome is asserted:
 *
 *   expect: success    -> TLC completes with no error
 *   expect: violation  -> TLC reports a counterexample (invariant / deadlock)
 *
 * To add coverage for a lesson, add `expect: success` or `expect: violation`
 * to its frontmatter — no test code changes required. Lessons without an
 * `expect` (e.g. animation-only lessons, lessons with no spec/cfg, or very
 * large models such as `intro/records` whose state space is impractical to
 * explore in-browser) are skipped automatically.
 *
 * This guards against the class of CheerpJ regression where in-browser TLC
 * silently stops after computing initial states and misses counterexamples.
 */

const lessons = [...introLessons, ...blockingQueueLessons].filter((l) => l.expect);

test.describe("Lesson TLC regression", () => {
  test("at least one lesson declares an expected outcome", () => {
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
});
