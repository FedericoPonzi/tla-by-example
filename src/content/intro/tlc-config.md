---
slug: tlc-config
expect: success
title: TLC Configuration
section: intro
---
# TLC Configuration

The `.cfg` file tells TLC **how** to check your specification. Let's look at what goes in it.

## INIT and NEXT

The most basic configuration specifies which definitions are the initial state and next-state relation:

```
INIT Init
NEXT Next
```

## INVARIANT

Properties that must hold in **every** reachable state:

```
INVARIANT TypeOK
INVARIANT NoDeadlock
```

If TLC finds a state where an invariant is FALSE, it reports an error with a trace showing how it got there.

## CONSTANT

Assign values to the constants declared in your spec:

```
CONSTANT N = 3
CONSTANT Procs = {p1, p2, p3}
```

## PROPERTY (Temporal Properties)

For liveness checks (things that must **eventually** happen):

```
PROPERTY Liveness
```

## SYMMETRY

When constants represent interchangeable processes, symmetry reduces the state space:

```
CONSTANT Procs = {p1, p2, p3}
SYMMETRY Perms
```

Where `Perms` is defined as `Permutations(Procs)` in your spec.

## CHECK_DEADLOCK

By default, TLC checks for deadlocks (states with no successor). You can disable this:

```
CHECK_DEADLOCK FALSE
```

## Try It

Try editing the configuration on the right. Change the constant `Size` to different values and see how the state space changes.

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE ConfigDemo --------------------------------
EXTENDS Naturals

CONSTANT Size

VARIABLE counter

TypeOK == counter \in 0..Size

Init == counter = 0

Inc == /\ counter < Size
       /\ counter' = counter + 1

Dec == /\ counter > 0
       /\ counter' = counter - 1

Next == Inc \/ Dec

=============================================================================

---TLA_BY_EXAMPLE_CFG---
CONSTANT Size = 5
INIT Init
NEXT Next
INVARIANT TypeOK
