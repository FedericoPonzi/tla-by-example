import { introLessons } from "@/content/intro";
import { blockingQueueLessons } from "@/content/blocking-queue";

describe("Lesson data", () => {
  it("has 10 intro lessons", () => {
    expect(introLessons).toHaveLength(10);
  });

  it("has 12 blocking queue lessons", () => {
    expect(blockingQueueLessons).toHaveLength(12);
  });

  it("all intro lessons have unique slugs", () => {
    const slugs = introLessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all blocking queue lessons have unique slugs", () => {
    const slugs = blockingQueueLessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all lessons have non-empty spec and cfg", () => {
    const allLessons = [...introLessons, ...blockingQueueLessons];
    for (const lesson of allLessons) {
      // tla-intuition uses an animation instead of a spec/cfg playground
      if (lesson.slug === "tla-intuition") continue;
      expect(lesson.spec.length).toBeGreaterThan(0);
      expect(lesson.cfg.length).toBeGreaterThan(0);
    }
  });

  it("all blocking queue lessons are in the blocking-queue section", () => {
    for (const lesson of blockingQueueLessons) {
      expect(lesson.section).toBe("blocking-queue");
    }
  });

  it("all intro lessons are in the intro section", () => {
    for (const lesson of introLessons) {
      expect(lesson.section).toBe("intro");
    }
  });

  it("all runnable lessons declare an expected TLC outcome", () => {
    for (const lesson of [...introLessons, ...blockingQueueLessons]) {
      if (!lesson.spec || !lesson.cfg) continue;
      expect({ slug: lesson.slug, outcome: lesson.expect }).toEqual({
        slug: lesson.slug,
        outcome: expect.stringMatching(/^(success|violation)$/),
      });
    }
  });

  it("uses the upstream p2c1b1 configuration for the debugger lesson", () => {
    const lesson = blockingQueueLessons.find((l) => l.slug === "debug-config");
    expect(lesson?.cfg).toMatch(/BufCapacity\s*=\s*1/);
    expect(lesson?.cfg).toMatch(/Producers\s*=\s*\{p1,\s*p2\}/);
    expect(lesson?.cfg).toMatch(/Consumers\s*=\s*\{c1\}/);
  });

  it("starts with the buggy single-condition C implementation", () => {
    const lesson = blockingQueueLessons.find((l) => l.slug === "introduction");
    const source = lesson?.extraTabs?.find((tab) => tab.label === "C")?.content;
    expect(source).toContain("pthread_cond_t modify;");
    expect(source?.match(/pthread_cond_wait\(&modify, &mutex\)/g)).toHaveLength(2);
    expect(source?.match(/pthread_cond_signal\(&modify\)/g)).toHaveLength(2);
  });
});
