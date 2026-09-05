---
slug: module-structure
expect: violation
title: Module Structure
section: intro
---
# Module Structure

Every TLA+ specification lives inside a **module**. A module is delimited by a header and a footer:

```
---- MODULE MySpec ----
(* your spec goes here *)
========================
```

## The Header

The header line starts with four or more dashes, followed by `MODULE`, the module name, and four or more dashes:

```
---- MODULE MySpec ----
```

Any text before the header is ignored by TLA+ tools. This is commonly used to provide a description of the specification, what it models, its purpose, or any assumptions.

The module name **must match the filename**. A module named `MySpec` must live in a file called `MySpec.tla`. TLC will report an error if they don't match.

## The Footer

The footer is a line of four or more equals signs:

```
========================
```

Everything after the footer is ignored by TLA+ tools. By convention, this space is used to record **modifications and updates** to the spec - a change log of what was modified and why:

```
========================
Modification History
* Added Bound invariant to detect reaching the limit
* Initial version with basic counter
```

## EXTENDS

The `EXTENDS` keyword imports definitions from other modules. You'll almost always extend at least one standard module:

```
EXTENDS Naturals, Sequences
```

Common standard modules:
- **Naturals** - natural numbers and arithmetic (+, -, *, \div, %)
- **Integers** - integers (adds negative numbers)
- **Sequences** - sequence operations (Append, Head, Tail, Len)
- **FiniteSets** - Cardinality, IsFiniteSet
- **TLC** - TLC-specific operators (Print, Assert)

## Separator Lines

Inside a module, you can use separator lines (four or more dashes) to visually organize your spec:

```
----
```

These have no semantic meaning - they're just for readability.

## Printing with TLC

TLC provides `Print(value, expr)` and `PrintT(value)` to output debug information during model checking. `Print` evaluates to `expr` (so you can inline it in expressions), while `PrintT` simply prints and returns `TRUE`.

```
Next == /\ PrintT(<<"x is", x>>)
        /\ x' = x + 1
```

To use these operators, add `EXTENDS TLC` to your module.

## Try It

The spec on the right shows a module with text before the header and after the footer. It also uses `PrintT` to print the value of `x` on each step. Notice how the module name matches the tab filename. Try modifying it and running TLC to see what happens.

`Spec == Init /\ [][Next]_x` is the conventional temporal form: start in `Init`, then always (`[]`) take a `Next` step or leave `x` unchanged. Such an unchanged step is called **stuttering**. This lesson's configuration uses `INIT Init` and `NEXT Next` directly; `SPECIFICATION Spec` is an alternative.

## Expected Result

TLC reports that `Bound` is violated when `x = 5`. The invariant detects that state; it does not prevent the counter from reaching it. Try changing the limit in `Bound` and following the new trace. Removing `Bound` entirely leaves an unbounded exploration, not a finite successful run.

---TLA_BY_EXAMPLE_SPEC---
A counter that increments until TLC reports an invariant violation.
Demonstrates the basic structure of a TLA+ module.
----------------------------- MODULE MySpec ----------------------------------
(***************************************************************************)
(* A minimal TLA+ module demonstrating the basic structure.                *)
(* A block comment is delimited by (* to *)                                *)
(***************************************************************************)
EXTENDS Naturals, TLC

VARIABLE x

Init == x = 0

Next == /\ PrintT(<<"x is", x>>)
        /\ x' = x + 1

Spec == Init /\ [][Next]_x

\* This is an inline comment
Bound == x < 5

=============================================================================
Modification History
* Initial version with a counter and a bound invariant

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT Bound
