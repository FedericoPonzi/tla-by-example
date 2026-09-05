---
slug: variables-constants
expect: violation
title: "Variables & Constants"
section: intro
---
# Variables & Constants

TLA+ has two kinds of declarations for values that appear in your spec:

## VARIABLE (or VARIABLES)

Variables represent the **state** of your system. They change over time as the system transitions between states.

```
VARIABLES x, y, z
```

You can also write `VARIABLE x` for a single variable. Both keywords work the same.

In the **next-state relation**, you refer to the value of a variable in the next state using a prime (`'`):

```
Next == x' = x + 1
```

## CONSTANT (or CONSTANTS)

Constants are values that are **fixed** for a given model run. They're set in the TLC configuration file.

```
CONSTANTS N, MaxVal
```

Constants let you parameterize your spec. For example, you might define a buffer size as a constant so you can model-check with different sizes.

## TypeOK Invariant

TLA+ formulas are **untyped** - there is no built-in type system that restricts what values a variable can hold. A common pattern is to define a **type-correctness invariant** called `TypeOK` that specifies the expected types and ranges of all variables:

```
TypeOK == /\ x \in Nat
          /\ y \in 1..N
```

Since TLA+ has no types, `TypeOK` is just a formula like any other. When enabled with `INVARIANT TypeOK` in the configuration, TLC checks it at every reachable state. Merely defining an operator named `TypeOK` does not enable a check.

## Try It

The spec on the right uses both variables and constants. Check the `VarsAndConsts.cfg` tab to see how the constant `N` is assigned a value.

## Expected Result

With `N = 3`, TLC reports **Deadlock reached** at `count = 2, total = 5`. `Increment` requires `total < 5`, while `Reset` requires `count = N`, so neither is enabled. `TypeOK` still holds: type correctness does not imply that the system can keep making progress.

Try changing `Reset` so it also sets `total' = 0`. The counters can then cycle without reaching this deadlock.

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE VarsAndConsts ----------------------------
EXTENDS Naturals

CONSTANT N

VARIABLES count, total

TypeOK == /\ count \in 0..N
          /\ total \in 0..5

Init == /\ count = 0
        /\ total = 0

Increment == /\ count < N
             /\ total < 5
             /\ count' = count + 1
             /\ total' = total + 1

Reset == /\ count = N
         /\ count' = 0
         /\ total' = total

Next == Increment \/ Reset

=============================================================================

---TLA_BY_EXAMPLE_CFG---
CONSTANT N = 3
INIT Init
NEXT Next
INVARIANT TypeOK
