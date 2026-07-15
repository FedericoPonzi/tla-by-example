---
slug: basic-operators
expect: success
title: Basic Operators
section: intro
---
# Basic Operators

TLA+ has a rich set of operators. Let's cover the most common ones. 

## Boolean Operators
| Operator | Meaning | Unicode |
|----------|---------|---------|
| `/\` | AND (conjunction) | ∧ |
| `\/` | OR (disjunction) | ∨ |
| `~` | NOT (negation) | ¬ |
| `=>` | IMPLIES | ⇒ |
| `<=>` | EQUIVALENCE | ⟺ |
TLA+ supports both the ASCII version as well as its Unicode equivalent.

## The Init / Next Pattern

Almost every TLA+ spec follows this pattern:

1. **Init** - defines the initial state (conjunction of assignments)
2. **Next** - defines all possible transitions (disjunction of actions)

```
Init == /\ x = 0
        /\ y = 0

Next == \/ ActionA
        \/ ActionB
```

In Init, `/\` means "and" - all conditions must hold.
In Next, `\/` means "or" - any one action can happen.

## Actions and Primed Variables

An **action** describes one kind of state transition. It uses primed variables (`x'`) to refer to the value in the next state:

```
Increment == /\ x' = x + 1
             /\ y' = y       (* y stays the same *)
```

## UNCHANGED

Instead of writing `y' = y`, you can use:

```
Increment == /\ x' = x + 1
             /\ UNCHANGED y
```

For multiple variables: `UNCHANGED <<x, y>>`

## IF / THEN / ELSE

```
Max(a, b) == IF a > b THEN a ELSE b
```

## Try It

The spec demonstrates a simple traffic light with Init/Next pattern and boolean operators.

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE TrafficLight -----------------------------
EXTENDS Naturals

VARIABLE light

TypeOK == light \in {"red", "green", "yellow"}

ToGreen  == /\ light = "red"
            /\ light' = "green"

ToYellow == /\ light = "green"
            /\ light' = "yellow"

ToRed    == /\ light = "yellow"
            /\ light' = "red"


Init == light = "red"

Next == \/ ToGreen
        \/ ToYellow
        \/ ToRed

NeverSkipYellow == (light = "green") => (light' # "red")

=============================================================================

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT TypeOK
