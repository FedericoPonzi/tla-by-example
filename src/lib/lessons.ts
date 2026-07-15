export interface ExtraTab {
  label: string;
  content: string;
  language?: string;
}

export interface Lesson {
  slug: string;
  title: string;
  section: "intro" | "blocking-queue";
  description: string;
  spec: string;
  cfg: string;
  tabs?: ("spec" | "cfg")[];
  extraTabs?: ExtraTab[];
  commitSha?: string;
  commitUrl?: string;
  /**
   * Expected TLC outcome when running this lesson's spec+cfg in the playground.
   * Consumed by the browser regression suite (e2e/lessons.spec.ts).
   * Omit for lessons that are not meant to be model-checked standalone
   * (e.g. animation-only lessons or lessons without a spec/cfg).
   */
  expect?: TlcExpectation;
}

/**
 * `success`   - TLC explores the whole state space and finds no error
 *               ("Model checking completed").
 * `violation` - TLC finds a counterexample: an invariant violation or a
 *               deadlock ("is violated" / "Deadlock reached"). In this tutorial
 *               a violation is often the intended teaching outcome
 *               (e.g. DieHard, or the BlockingQueue deadlock bug stages).
 */
export type TlcExpectation = "success" | "violation";

export interface LessonNavInfo {
  slug: string;
  title: string;
  section: "intro" | "blocking-queue";
}
