---
slug: sets
expect: success
title: Sets
section: intro
---
# Sets

Sets are one of the most fundamental data structures in TLA+. Unlike programming languages, TLA+ is built on set theory.

For finite set operations like `Cardinality` and `IsFiniteSet`, TLA+ provides the [`FiniteSets`](https://github.com/tlaplus/tlaplus/blob/master/tlatools/org.lamport.tlatools/src/tla2sany/StandardModules/FiniteSets.tla) standard module.

## Set Literals and Membership

| Syntax | Meaning | Unicode |
|--------|---------|---------|
| `{1, 2, 3}` | A set of numbers | |
| `{"a", "b", "c"}` | A set of strings | |
| `{}` | The empty set | |
| `x \in S` | x is a member of S | `x ∈ S` |
| `x \notin S` | x is NOT a member of S | `x ∉ S` |

## Set Operators

| Operator | Meaning | Unicode |
|----------|---------|---------|
| `S \union T` | Union - elements in S or T | `S ∪ T` |
| `S \intersect T` | Intersection - elements in both | `S ∩ T` |
| `S \ T` | Set difference - elements in S but not T | |
| `SUBSET S` | Power set - all subsets of S | |
| `S \subseteq T` | S is a subset of T | `S ⊆ T` |

## FiniteSets Module

To use these operators, add `EXTENDS FiniteSets` to your module.

| Operator | Meaning |
|----------|---------|
| `IsFiniteSet(S)` | TRUE if S is a finite set |
| `Cardinality(S)` | Number of elements in a finite set S |

## Set Comprehension (Filtering)

```
{x \in S : P(x)}   \* elements of S satisfying predicate P
```

Example: `{x \in 1..10 : x > 5}` gives `{6, 7, 8, 9, 10}`

## Set Mapping

```
{f(x) : x \in S}   \* apply f to each element of S
```

Example: `{x * 2 : x \in 1..3}` gives `{2, 4, 6}`

## Ranges

```
1..5               \* the set {1, 2, 3, 4, 5}
```

## Try It

The spec on the right demonstrates various set operations. Run TLC to verify the invariants.

## Expected Result

TLC completes without errors and finds 8 distinct states: all subsets of the three colors. Try adding a fourth color to `Colors`; the model then has 16 distinct states.

---TLA_BY_EXAMPLE_SPEC---
------------------------------- MODULE Sets ----------------------------------
EXTENDS Naturals, FiniteSets

VARIABLE picked

Colors == {"red", "green", "blue"}

Init == picked = {}

AddColor == /\ Cardinality(picked) < Cardinality(Colors)
            /\ \E c \in Colors :
                 /\ c \notin picked
                 /\ picked' = picked \union {c}

RemoveColor == /\ picked # {}
               /\ \E c \in picked :
                    picked' = picked \ {c}

Next == AddColor \/ RemoveColor

TypeOK == picked \subseteq Colors

AlwaysSmall == Cardinality(picked) <= Cardinality(Colors)

=============================================================================

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT TypeOK
INVARIANT AlwaysSmall
