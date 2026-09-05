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
```

`TypeOK` must be defined in the spec. Defining it does not enable the check by itself. If TLC finds a state where an enabled invariant is FALSE, it reports an error with a trace showing how it got there.

## CONSTANT

Assign values to the constants declared in your spec:

```
CONSTANT N = 3
CONSTANT Procs = {p1, p2, p3}
```

## PROPERTY (Temporal Properties)

`PROPERTY` enables a temporal formula defined in the spec. These can express safety as well as liveness. For example, define:

```tla
AlwaysNonnegative == [](counter >= 0)
```

Then enable it in the configuration:

```cfg
PROPERTY AlwaysNonnegative
```

`[]` means "always", so this is a safety property. `<>` means "eventually" and is used for liveness properties. Eventual progress often requires explicit fairness assumptions; `INIT` and `NEXT` alone do not guarantee it. The Basic Operators lesson also uses `PROPERTY` for a condition on every transition.

## SYMMETRY

When constants represent interchangeable processes, symmetry reduces the state space:

```
CONSTANT Procs = {p1, p2, p3}
SYMMETRY Perms
```

Here `Procs` must be declared as a constant, and `Perms == Permutations(Procs)` must be defined in the spec. `Permutations` comes from the `TLC` module, so add `TLC` to `EXTENDS`.

Only use symmetry when the specification and checked properties are invariant under renaming those process identities. TLC does not verify that assumption, and symmetry should not be used for liveness checking.

## CHECK_DEADLOCK

By default, TLC checks for deadlocks (states with no successor). You can disable this:

```
CHECK_DEADLOCK FALSE
```

This is a built-in check, not an invariant named `NoDeadlock`. Disable it only when terminal states are intentional; it does not make an infinite model finite.

## Try It

Try editing the configuration on the right. Change the constant `Size` to different values and see how the state space changes.

## Expected Result

With `Size = 5`, TLC completes without errors and finds 6 distinct states (`counter` from 0 to 5). Try `Size = 0`: the initial state is well-typed, but neither `Inc` nor `Dec` is enabled, so TLC reports a deadlock.

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
