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

1. **Init** - a predicate defining the allowed initial states
2. **Next** - defines all possible transitions (disjunction of actions)

```
Init == /\ x = 0
        /\ y = 0

Next == \/ ActionA
        \/ ActionB
```

In Init, `/\` means "and" - all conditions must hold.
In Next, `\/` means "or" - any one action can happen.

These are mathematical predicates, not sequences of assignments. `=` means equality, and all conjuncts hold simultaneously. `==` defines an operator. An initial predicate can allow several states, for example `Init == x \in {0, 1}`.

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

## Quantifiers and Non-deterministic Choice

`\E x \in S : P(x)` means that **there exists** an `x` in `S` for which `P(x)` holds. In a next-state relation, it can describe several possible successors:

```tla
Next == \E n \in 1..3 : x' = n
```

TLC explores all three choices; this is not a random assignment.

`\A x \in S : P(x)` means that **for every** `x` in `S`, `P(x)` holds. For example, `\A n \in {1, 2, 3} : n > 0` is true. `\in` means set membership; the Sets lesson covers it in more detail.

## IF / THEN / ELSE

```
Max(a, b) == IF a > b THEN a ELSE b
```

## Try It

The spec demonstrates a simple traffic light with Init/Next pattern and boolean operators.

`TypeOK` is a **state predicate**: it mentions only the current state. `(light = "green") => (light' # "red")` is an **action predicate**: it relates two consecutive states.

`[A]_light` allows action `A` or a step leaving `light` unchanged (stuttering). Prefixing this with `[]` means "always", giving the temporal safety property `NeverSkipYellow`. TLA+ requires this stuttering form when applying `[]` to an action. The configuration enables the property with `PROPERTY`, not `INVARIANT`.

## Expected Result

TLC completes without errors: the light cycles red, green, yellow, red. Both `TypeOK` and `NeverSkipYellow` are enabled.

Try changing the guard of `ToRed` to `light \in {"yellow", "green"}`. The values remain well-typed, but TLC reports an action-property violation because a green-to-red transition skips yellow.

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

NeverSkipYellow == [][(light = "green") => (light' # "red")]_light

=============================================================================

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT TypeOK
PROPERTY NeverSkipYellow
