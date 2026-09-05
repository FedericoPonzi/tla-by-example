---
slug: functions
expect: violation
title: Functions
section: intro
---
# Functions

In TLA+, a **function** maps every element of its domain to a value. They're similar to dictionaries or maps in programming languages.

## Defining a Function

```
f == [x \in 1..3 |-> x * 2]
```

This creates a function where `f[1] = 2`, `f[2] = 4`, `f[3] = 6`.

## Function Application

Use square brackets:

```
f[1]     \* returns 2
```

## DOMAIN

The `DOMAIN` operator returns the set of inputs a function is defined on:

```
DOMAIN f    \* returns {1, 2, 3}
```

## Set of All Functions

```
[S -> T]    \* the set of all functions from S to T
```

Example: `[{"a", "b"} -> BOOLEAN]` is the set of all functions mapping "a" and "b" to TRUE or FALSE.

## Updating a Function (EXCEPT)

```
f' = [f EXCEPT ![2] = 10]
```

This creates a new function identical to `f` but with `f'[2] = 10`.

You can use `@` to refer to the old value:

```
f' = [f EXCEPT ![2] = @ + 1]
```

## Try It

The spec models a simple key-value store using TLA+ functions.

## Expected Result

TLC reports that `AllBounded` is violated when a key's value reaches 12. `Put` is bounded, but `Increment` is not; `TypeOK` still holds because 12 is a natural number.

Try adding `store[k] < 11` as a guard in `Increment`. The resulting finite model should complete without violating either invariant.

---TLA_BY_EXAMPLE_SPEC---
---------------------------- MODULE KeyValue ---------------------------------
EXTENDS Naturals

CONSTANT Keys

VARIABLE store

TypeOK == store \in [Keys -> Nat]

Init == store = [k \in Keys |-> 0]

Put(k, v) == /\ v \in 0..10
             /\ store' = [store EXCEPT ![k] = v]

Increment(k) == store' = [store EXCEPT ![k] = @ + 1]

Next == \E k \in Keys :
          \/ \E v \in 0..10 : Put(k, v)
          \/ Increment(k)

AllBounded == \A k \in Keys : store[k] <= 11

=============================================================================

---TLA_BY_EXAMPLE_CFG---
CONSTANT Keys = {k1, k2}
INIT Init
NEXT Next
INVARIANT TypeOK
INVARIANT AllBounded
