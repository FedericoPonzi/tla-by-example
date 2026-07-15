---
slug: platform
expect: violation
title: Welcome
section: intro
---
Welcome to TLA+ By Example! This platform lets you learn TLA+ by reading explanations and running specifications directly in your browser.

## How It Works

On the right side of this page, you'll see the **playground**. It has two tabs:

- **Spec.tla** - the TLA+ specification you're writing
- **Spec.cfg** - the TLC model checker configuration

Click **▶ Run TLC** to model-check the specification. The output will appear in the panel at the bottom of the playground.

## What is TLA+?

TLA+ is a formal specification language developed by Leslie Lamport. It's used to design, model, and verify concurrent and distributed systems. Companies like Amazon, Microsoft, and Intel use TLA+ to find bugs in critical systems before they're built.

A TLA+ specification describes:
- **State**: the variables that define your system
- **Initial state**: how the system starts
- **Next-state relation**: how the system can transition between states
- **Invariants**: properties that must always hold

## What is TLC?

TLC is the **model checker** for TLA+. When you click **▶ Run TLC**, it systematically explores **every reachable state** of your specification by starting from the initial state and following all possible transitions.

At each state, TLC checks your **invariants** - properties you've declared must always be true. If TLC finds a state that violates an invariant, it stops and shows you the exact sequence of steps that led to the violation. If no violations are found, TLC reports that all states satisfy the invariants.

This exhaustive approach means TLC doesn't test random scenarios - it checks **all of them**. That's what makes formal verification more powerful than traditional testing.

## Try It Now

The playground on the right has a classic example: the **DieHard** water jugs puzzle from the movie Die Hard 3. The heroes need exactly 4 gallons using a 5-gallon and a 3-gallon jug.

![youtube](https://www.youtube.com/watch?v=m9F0i-1Jys0)

Click **▶ Run TLC** to see TLC find a solution (it will report an invariant violation - which is actually the solution!).

## Understanding the TLC Output

TLC runs entirely **in your browser** using WebAssembly - nothing is sent to a server. After clicking Run TLC, you'll see output like the following. Here's how to read it:

### Header

```
TLC2 Version 2.20 of Day Month 20??
Running breadth-first search Model-Checking with fp 62
and seed ... with 1 worker on 1 cores with 2048MB heap
```

This tells you the TLC version and that it's using **breadth-first search** - it explores all states at depth 1, then depth 2, and so on. This means when TLC finds a violation, the error trace is always the **shortest possible path** to the error.

### Parsing and Semantic Processing

```
Parsing module DieHard in file /files/DieHard.tla
Parsing module Naturals in file .../Naturals.tla
Semantic processing of module Naturals
Semantic processing of module DieHard
```

TLC loads your spec and any modules it depends on (like `Naturals`), then checks that everything is syntactically and semantically valid.

### Initial States

```
Computing initial states...
Finished computing initial states: 1 distinct state generated
```

TLC evaluates the `Init` predicate to find all possible starting states. In the DieHard example, there's exactly one: both jugs empty.

### Invariant Violation

```
Error: Invariant NotSolved is violated.
```

TLC found a reachable state where `NotSolved` is false - meaning `big = 4`. Since `NotSolved == big # 4`, this is actually the **solution** to the puzzle! We deliberately wrote the invariant as "the puzzle is not yet solved" so that TLC would find the solution as a counterexample.

### Error Trace

```
State 1: <Initial predicate>
/\ big = 0
/\ small = 0

State 2: <FillBigJug line 20, col 18 to line 21, col 34>
/\ big = 5
/\ small = 0

...

State 7: <BigToSmall line 34, col 15 to line 35, col 48>
/\ big = 4
/\ small = 3
```

This is the most useful part. The **error trace** shows the exact sequence of states from `Init` to the violation. Each state shows:
- **Which action** was taken (e.g., `FillBigJug`, `BigToSmall`) with its location in the spec
- **The values** of all variables after that action

Reading this trace, you can follow the solution step by step: fill the big jug, pour into the small jug, empty the small jug, and so on - until exactly 4 gallons remain in the big jug.

### Exit Code

```
TLC finished with exit code: 2110
```

Exit code `2110` means TLC found an invariant violation. An exit code of `0` means all states were checked and no violations were found.

## Follow Along Locally

You can also install the [TLA+ VS Code Extension](https://marketplace.visualstudio.com/items?itemName=alygin.vscode-tlaplus) to write and check specs on your machine.

---TLA_BY_EXAMPLE_SPEC---
----------------------------- MODULE DieHard --------------------------------
(***************************************************************************)
(* The DieHard water jugs puzzle: get exactly 4 gallons using a            *)
(* 5-gallon jug and a 3-gallon jug.                                        *)
(***************************************************************************)
EXTENDS Naturals

VARIABLES big,   \* gallons in the 5-gallon jug
          small  \* gallons in the 3-gallon jug

TypeOK == /\ small \in 0..3
          /\ big   \in 0..5

Init == /\ big = 0
        /\ small = 0

FillSmallJug  == /\ small' = 3
                 /\ big' = big

FillBigJug    == /\ big' = 5
                 /\ small' = small

EmptySmallJug == /\ small' = 0
                 /\ big' = big

EmptyBigJug   == /\ big' = 0
                 /\ small' = small

Min(m,n) == IF m < n THEN m ELSE n

SmallToBig == /\ big'   = Min(big + small, 5)
              /\ small' = small - (big' - big)

BigToSmall == /\ small' = Min(big + small, 3)
              /\ big'   = big - (small' - small)

Next == \/ FillSmallJug
        \/ FillBigJug
        \/ EmptySmallJug
        \/ EmptyBigJug
        \/ SmallToBig
        \/ BigToSmall

NotSolved == big # 4

=============================================================================

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT TypeOK
INVARIANT NotSolved
