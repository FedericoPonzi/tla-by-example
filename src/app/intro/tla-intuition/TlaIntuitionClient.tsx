"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResizableDivider from "@/components/ResizableDivider";
import type { AnimationProps, GraphEdge } from "@/components/StateGraphAnimation";
import type { LessonNavInfo } from "@/lib/lessons";

const StateGraphAnimation = dynamic(
  () => import("@/components/StateGraphAnimation"),
  { ssr: false }
);

type State = [number, number];
const stateKey = (s: State) => `${s[0]},${s[1]}`;

function nextStates(big: number, small: number): { action: string; state: State }[] {
  const results: { action: string; state: State }[] = [];
  const add = (action: string, b: number, s: number) => {
    if (b !== big || s !== small) results.push({ action, state: [b, s] });
  };
  add("FillSmall", big, 3);
  add("FillBig", 5, small);
  add("EmptySmall", big, 0);
  add("EmptyBig", 0, small);
  const nb = Math.min(big + small, 5);
  add("SmallToBig", nb, small - (nb - big));
  const ns = Math.min(big + small, 3);
  add("BigToSmall", big - (ns - small), ns);
  return results;
}

function violatesInvariant(s: State): boolean {
  return s[0] === 4; // NotSolved == big # 4
}

// BFS expansion step: expanding a node may discover new states
interface ExpansionStep {
  from: State;
  discovered: { action: string; state: State }[];
  // Snapshot of BFS state AFTER this expansion
  visited: State[];   // states that have been fully expanded
  queue: State[];     // states waiting to be expanded (front = next)
  allDiscovered: State[]; // all states discovered so far
  allEdges: GraphEdge[];
  violationFound?: State; // if a violation was found in this step
}

// Precompute full BFS, stopping at first invariant violation
function computeFullGraph() {
  const init: State = [0, 0];
  const visitedSet = new Set<string>();
  const discoveredSet = new Set<string>([stateKey(init)]);
  const queue: State[] = [init];
  const allDiscovered: State[] = [init];
  const allEdges: GraphEdge[] = [];
  const edgeSet = new Set<string>();
  const parent: Record<string, { from: State; action: string }> = {};
  const expansionSteps: ExpansionStep[] = [];

  let violationState: State | null = null;

  while (queue.length > 0 && !violationState) {
    const current = queue.shift()!;
    visitedSet.add(stateKey(current));

    const disc: { action: string; state: State }[] = [];

    for (const { action, state: next } of nextStates(current[0], current[1])) {
      const ek = stateKey(current) + "->" + stateKey(next);
      if (!edgeSet.has(ek)) {
        edgeSet.add(ek);
        allEdges.push({ from: current, to: next });
      }

      const tk = stateKey(next);
      if (!discoveredSet.has(tk)) {
        discoveredSet.add(tk);
        queue.push(next);
        allDiscovered.push(next);
        parent[tk] = { from: current, action };
        disc.push({ action, state: next });

        // Check invariant immediately on new state
        if (violatesInvariant(next)) {
          violationState = next;
        }
      }
    }

    expansionSteps.push({
      from: current,
      discovered: disc,
      visited: [...visitedSet].map((k) => {
        const [b, s] = k.split(",").map(Number);
        return [b, s] as State;
      }),
      queue: [...queue],
      allDiscovered: [...allDiscovered],
      allEdges: [...allEdges],
      violationFound: violationState ?? undefined,
    });

    if (violationState) break;
  }

  // Build counterexample trace
  const tracePath: { state: State; action?: string }[] = [];
  if (violationState) {
    const pathStates: State[] = [violationState];
    const pathActions: string[] = [];
    let cur = stateKey(violationState);
    while (parent[cur]) {
      pathActions.unshift(parent[cur].action);
      pathStates.unshift(parent[cur].from);
      cur = stateKey(parent[cur].from);
    }
    for (let i = 0; i < pathStates.length; i++) {
      tracePath.push({
        state: pathStates[i],
        action: i > 0 ? pathActions[i - 1] : undefined,
      });
    }
  }

  return { expansionSteps, tracePath, violationState };
}

const GRAPH = computeFullGraph();

// Phases:
// 0: intro + spec
// 1: initial state, invariant check on (0,0) passes
// 2: expand (0,0), discover (0,3) and (5,0), check invariants — pass
// 3: expand (0,3), discover (5,3) and (3,0), check invariants — pass
// 4: expand (5,0), discover (2,3), check invariant — pass
// 5: auto BFS remaining expansions, stops when (4,3) found — violation!
// 6: counterexample trace
const TOTAL_PHASES = 7;
const MANUAL_STEPS = 3; // expansion steps 0,1,2 are manual (phases 2,3,4)

interface Props {
  description: string;
  spec: string;
  prev?: LessonNavInfo;
  next?: LessonNavInfo;
}

export default function TlaIntuitionClient({ description, spec, prev, next }: Props) {
  const [phase, setPhase] = useState(0);
  const [explanationWidth, setExplanationWidth] = useState(45);
  const [bfsAutoIdx, setBfsAutoIdx] = useState(0);
  const [bfsAutoComplete, setBfsAutoComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const narrativeEndRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((delta: number) => {
    setExplanationWidth((w) => {
      const containerWidth = window.innerWidth;
      const deltaPercent = (delta / containerWidth) * 100;
      return Math.max(25, Math.min(65, w + deltaPercent));
    });
  }, []);

  useEffect(() => {
    narrativeEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [phase, bfsAutoIdx, bfsAutoComplete]);

  // BFS auto-animation (phase 5)
  useEffect(() => {
    if (phase !== 5) return;
    const autoSteps = GRAPH.expansionSteps.slice(MANUAL_STEPS);
    if (bfsAutoIdx < autoSteps.length) {
      const currentStep = autoSteps[bfsAutoIdx];
      if (currentStep.violationFound) {
        // Violation found — pause here
        timerRef.current = setTimeout(() => {
          setBfsAutoIdx((i) => i + 1);
          setBfsAutoComplete(true);
        }, 400);
      } else {
        timerRef.current = setTimeout(() => {
          setBfsAutoIdx((i) => i + 1);
        }, 400);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, bfsAutoIdx, bfsAutoComplete]);

  const animProps = computeAnimProps(phase, bfsAutoIdx, bfsAutoComplete);

  const handleNext = () => {
    if (phase === 5 && !bfsAutoComplete) return;
    if (phase < TOTAL_PHASES - 1) setPhase((p) => p + 1);
  };

  const handleBack = () => {
    if (phase > 0) {
      if (phase === 5 || phase === 6) {
        setBfsAutoIdx(0);
        setBfsAutoComplete(false);
      }
      setPhase((p) => p - 1);
    }
  };

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase(0);
    setBfsAutoIdx(0);
    setBfsAutoComplete(false);
  };

  const current: LessonNavInfo = {
    slug: "tla-intuition",
    title: "The TLA+ / TLC Intuition",
    section: "intro",
  };

  const NextBtn = ({ label = "Next →" }: { label?: string }) => (
    <button
      onClick={handleNext}
      className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
    >
      {label}
    </button>
  );

  const BackBtn = () => (
    <button
      onClick={handleBack}
      className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
    >
      ← Back
    </button>
  );

  const NavButtons = ({ nextLabel = "Next →" }: { nextLabel?: string }) => (
    <div className="flex gap-2 mt-4 mb-2">
      {phase > 0 && <BackBtn />}
      <NextBtn label={nextLabel} />
    </div>
  );

  const Code = ({ children }: { children: React.ReactNode }) => (
    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>
  );

  return (
    <div className="flex flex-col h-screen">
      <Navbar
        breadcrumbs={[
          { label: "How to Write TLA+" },
          { label: current.title },
        ]}
        prev={prev ? { label: prev.title, href: `/intro/${prev.slug}` } : undefined}
        next={next ? { label: next.title, href: `/intro/${next.slug}` } : undefined}
      />

      <div className="flex flex-1 min-h-0">
        {/* Left: narrative */}
        <div
          className="overflow-y-auto bg-white"
          style={{ width: `${explanationWidth}%` }}
        >
          <div className="max-w-none px-8 py-6 prose prose-sm prose-gray">
            {/* Phase 0: Intro + spec */}
            <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-4">
              The TLA+ / TLC Intuition
            </h1>
            <p className="text-gray-700 leading-relaxed mb-3">
              Before diving into TLA+ syntax, let&apos;s build an intuition for
              what TLA+ actually does. In TLA+, every algorithm is modeled as a{" "}
              <strong>state machine</strong>:
            </p>
            <ul className="my-2 space-y-1">
              <li className="ml-4 list-disc text-gray-700">
                A set of <strong>variables</strong> that define the state
              </li>
              <li className="ml-4 list-disc text-gray-700">
                An <strong>initial state</strong> predicate
              </li>
              <li className="ml-4 list-disc text-gray-700">
                A <strong>next-state</strong> relation describing all possible
                transitions
              </li>
              <li className="ml-4 list-disc text-gray-700">
                <strong>Invariants</strong> — properties that must hold in every
                reachable state
              </li>
            </ul>
            <p className="text-gray-700 leading-relaxed mb-3">
              Here&apos;s the DieHard water jugs puzzle as a TLA+ spec. You have
              a 5-gallon jug (<Code>big</Code>) and a 3-gallon jug (<Code>small</Code>),
              and need to measure exactly 4 gallons:
            </p>
            <pre className="bg-gray-100 border border-gray-200 rounded-lg p-4 overflow-x-auto text-sm">
              <code>{spec}</code>
            </pre>
            <p className="text-gray-700 leading-relaxed mb-3">
              Notice the invariant at the bottom: <Code>NotSolved == big # 4</Code>.
              This says &quot;the big jug must never contain exactly 4 gallons.&quot;
              We&apos;ll see how TLC uses this.
            </p>

            {phase === 0 && (
              <NavButtons nextLabel="Let's explore this →" />
            )}

            {/* Phase 1: Initial state + invariant check */}
            {phase >= 1 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  The Initial State
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  TLC starts by computing the initial state from the{" "}
                  <Code>Init</Code> predicate: <Code>big = 0, small = 0</Code>.
                  On the right, this is the{" "}
                  <span className="text-blue-600 font-semibold">blue node</span>{" "}
                  at position (0,0).
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <strong>Immediately</strong>, TLC checks the invariant on this
                  state: <Code>NotSolved == big # 4</Code>. Since{" "}
                  <Code>big = 0 ≠ 4</Code>, the invariant holds. ✓
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  This state goes into the BFS queue. The x-axis represents the{" "}
                  <Code>big</Code> jug (0–5) and the y-axis the{" "}
                  <Code>small</Code> jug (0–3).
                </p>
              </>
            )}
            {phase === 1 && (
              <NavButtons nextLabel="Start exploring →" />
            )}

            {/* Phase 2: Expand (0,0) */}
            {phase >= 2 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  Expanding States (BFS)
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  TLC uses <strong>breadth-first search</strong>. It takes the
                  first state from the queue —{" "}
                  <span className="text-green-600 font-semibold">(0,0)</span>{" "}
                  (shown with a{" "}
                  <span className="text-green-600 font-semibold">green border</span>)
                  — and evaluates every action from the <Code>Next</Code> relation.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  From (0,0), most actions produce the same state (emptying an
                  empty jug does nothing). Two produce <em>new</em> states:
                </p>
                <ul className="my-2 space-y-1">
                  <li className="ml-4 list-disc text-gray-700">
                    <Code>FillSmall</Code> → <strong>(0,3)</strong>
                  </li>
                  <li className="ml-4 list-disc text-gray-700">
                    <Code>FillBig</Code> → <strong>(5,0)</strong>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-3">
                  For each new state, TLC immediately checks the invariant:{" "}
                  <Code>big # 4</Code>. Both <Code>0 ≠ 4</Code> and{" "}
                  <Code>5 ≠ 4</Code>, so no violation. ✓ Both states are added
                  to the queue.
                </p>
              </>
            )}
            {phase === 2 && <NavButtons nextLabel="Expand next state →" />}

            {/* Phase 3: Expand (0,3) */}
            {phase >= 3 && (
              <>
                <p className="text-gray-700 leading-relaxed mb-3">
                  TLC expands{" "}
                  <span className="text-green-600 font-semibold">(0,3)</span> — the
                  next in the queue. It discovers:
                </p>
                <ul className="my-2 space-y-1">
                  <li className="ml-4 list-disc text-gray-700">
                    <Code>FillBig</Code> → <strong>(5,3)</strong>
                  </li>
                  <li className="ml-4 list-disc text-gray-700">
                    <Code>SmallToBig</Code> → <strong>(3,0)</strong>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Invariant check: <Code>5 ≠ 4</Code> ✓ and <Code>3 ≠ 4</Code> ✓.
                  Other actions from (0,3) lead to already-discovered states,
                  so TLC skips them. Notice how BFS explores{" "}
                  <em>layer by layer</em>.
                </p>
              </>
            )}
            {phase === 3 && <NavButtons nextLabel="Expand next state →" />}

            {/* Phase 4: Expand (5,0) */}
            {phase >= 4 && (
              <>
                <p className="text-gray-700 leading-relaxed mb-3">
                  TLC expands{" "}
                  <span className="text-green-600 font-semibold">(5,0)</span>.
                  It discovers:
                </p>
                <ul className="my-2 space-y-1">
                  <li className="ml-4 list-disc text-gray-700">
                    <Code>BigToSmall</Code> → <strong>(2,3)</strong>
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Invariant check: <Code>2 ≠ 4</Code> ✓. The BFS frontier keeps
                  growing — let&apos;s let TLC continue automatically. Watch the
                  Visited and Queue lists below the graph update as it goes.
                </p>
              </>
            )}
            {phase === 4 && (
              <NavButtons nextLabel="Continue BFS →" />
            )}

            {/* Phase 5: Auto BFS → violation */}
            {phase >= 5 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  {!bfsAutoComplete
                    ? "Exploring..."
                    : "Invariant Violation Found!"}
                </h2>
                {!bfsAutoComplete ? (
                  <p className="text-gray-700 leading-relaxed mb-3">
                    TLC continues expanding states and checking the invariant on
                    each new discovery...
                  </p>
                ) : (
                  <>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      TLC discovered state{" "}
                      <span className="text-amber-600 font-semibold">(4,3)</span>{" "}
                      via <Code>BigToSmall</Code> from (5,2). It immediately checks
                      the invariant: <Code>big # 4</Code> — but{" "}
                      <Code>big = 4</Code>!{" "}
                      <strong className="text-red-600">Violation!</strong>
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      TLC stops exploring immediately. It doesn&apos;t need to
                      check every state — it found a reachable state where the
                      invariant is broken. Since <Code>NotSolved</Code> was
                      deliberately written as &quot;the puzzle is not solved,&quot;
                      this violation is actually the <strong>solution</strong>!
                    </p>
                  </>
                )}
              </>
            )}
            {phase === 5 && bfsAutoComplete && (
              <NavButtons nextLabel="Show counterexample →" />
            )}

            {/* Phase 6: Counterexample trace */}
            {phase >= 6 && (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  The Counterexample Trace
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  With one-worker BFS for this invariant, the violation is along a{" "}
                  <strong>shortest path</strong>. TLC reports this as a{" "}
                  <strong>counterexample trace</strong> — the{" "}
                  <span className="text-red-500 font-semibold">red path</span> on
                  the graph:
                </p>
                <ol className="my-2 space-y-1">
                  {GRAPH.tracePath.map((step, i) => (
                    <li
                      key={i}
                      className="ml-4 list-decimal text-gray-700 font-mono text-sm"
                    >
                      big = {step.state[0]}, small = {step.state[1]}
                      {step.action && (
                        <span className="text-gray-500"> ← {step.action}</span>
                      )}
                      {i === 0 && (
                        <span className="text-gray-500"> (initial)</span>
                      )}
                    </li>
                  ))}
                </ol>
                <p className="text-gray-700 leading-relaxed mb-3">
                  This is the solution! Fill the big jug, pour into
                  the small, empty the small, pour again, fill the big again,
                  pour into the small 1 gallon — and
                  you end up with exactly 4 gallons.
                </p>

                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  Why This Matters
                </h2>
                <p className="text-gray-700 leading-relaxed mb-3">
                  Traditional testing samples executions. TLC systematically
                  explores the <strong>reachable state graph</strong> of the
                  configured model. This animation expanded{" "}
                  {GRAPH.expansionSteps.length} states before finding the violation.
                  One-worker BFS gives a <strong>shortest</strong> counterexample
                  for this invariant check; it does not enumerate every path
                  through a graph with cycles.
                </p>
                <p className="text-gray-700 leading-relaxed mb-3">
                  A completed finite exploration establishes the enabled
                  invariants for the chosen model and assumptions. It is not a
                  proof for arbitrary system sizes or for the implementation.
                  Large models can exhaust available resources, and an unbounded
                  state space may never finish.
                </p>
                <div className="flex gap-2 mt-4 mb-2">
                  <BackBtn />
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 rounded border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                  >
                    ↺ Restart
                  </button>
                </div>
              </>
            )}

            <div ref={narrativeEndRef} />
          </div>
        </div>

        <ResizableDivider direction="horizontal" onResize={handleResize} />

        {/* Right: animation */}
        <div className="flex-1 min-w-0">
          <StateGraphAnimation {...animProps} />
        </div>
      </div>

      <Footer />
    </div>
  );
}

// Compute animation props based on current phase
function computeAnimProps(
  phase: number,
  bfsAutoIdx: number,
  bfsAutoComplete: boolean
): AnimationProps {
  const empty: AnimationProps = {
    discoveredStates: [],
    edges: [],
  };

  if (phase === 0) return empty;

  // Phase 1: just the initial state
  if (phase === 1) {
    return {
      discoveredStates: [[0, 0]],
      edges: [],
      highlightState: [0, 0],
      visitedStates: [],
      queueStates: [[0, 0]],
    };
  }

  // Phases 2-4: manual expansion steps 0-2
  // Phase 5: auto expansion steps 3+
  // Phase 6: counterexample trace

  // Determine how many expansion steps to show
  let expansionCount = 0;
  if (phase === 2) expansionCount = 1; // step 0
  else if (phase === 3) expansionCount = 2; // steps 0-1
  else if (phase === 4) expansionCount = 3; // steps 0-2
  else if (phase >= 5) expansionCount = MANUAL_STEPS + bfsAutoIdx;

  // Clamp to available steps
  expansionCount = Math.min(expansionCount, GRAPH.expansionSteps.length);

  // Get the snapshot from the last completed expansion step
  const lastStep = expansionCount > 0
    ? GRAPH.expansionSteps[expansionCount - 1]
    : null;

  const discovered = lastStep ? [...lastStep.allDiscovered] : [[0, 0] as State];
  const edges = lastStep ? [...lastStep.allEdges] : [];
  const visited = lastStep ? [...lastStep.visited] : [];
  const queue = lastStep ? [...lastStep.queue] : [[0, 0] as State];

  // Determine source state (the one currently being expanded / just expanded)
  let sourceState: State | null = null;
  if (phase >= 2 && phase <= 4) {
    sourceState = GRAPH.expansionSteps[expansionCount - 1]?.from ?? null;
  } else if (phase === 5 && !bfsAutoComplete && expansionCount < GRAPH.expansionSteps.length) {
    // During auto BFS, highlight the next state to be expanded
    sourceState = queue.length > 0 ? queue[0] : null;
  }

  // Violation state
  let violationStates: State[] = [];
  if (bfsAutoComplete && lastStep?.violationFound) {
    violationStates = [lastStep.violationFound];
  }

  // Counterexample trace
  let traceStates: State[] = [];
  let traceEdges: GraphEdge[] = [];
  if (phase >= 6) {
    traceStates = GRAPH.tracePath.map((s) => s.state);
    for (let i = 0; i < GRAPH.tracePath.length - 1; i++) {
      traceEdges.push({
        from: GRAPH.tracePath[i].state,
        to: GRAPH.tracePath[i + 1].state,
      });
    }
    if (GRAPH.violationState) {
      violationStates = [GRAPH.violationState];
    }
  }

  return {
    discoveredStates: discovered,
    edges,
    highlightState: phase === 1 ? [0, 0] : null,
    sourceState,
    violationStates,
    traceStates,
    traceEdges,
    visitedStates: visited,
    queueStates: queue,
  };
}
