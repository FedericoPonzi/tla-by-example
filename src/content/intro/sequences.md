---
slug: sequences
expect: success
title: Sequences
section: intro
---
# Sequences

Sequences are ordered lists of elements in TLA+. In TLA+, sequences are simply functions whose domain is `1..n`, but because this pattern occurs so frequently, TLA+ provides dedicated syntax for them.

For sequence operators, TLA+ provides the [`Sequences`](https://github.com/tlaplus/tlaplus/blob/master/tlatools/org.lamport.tlatools/src/tla2sany/StandardModules/Sequences.tla) standard module. Add `EXTENDS Sequences` to your module to use them.

## Sequence Literals and Access

| Syntax | Meaning |
|--------|---------|
| `<<1, 2, 3>>` | A sequence of three elements |
| `<<>>` | The empty sequence |
| `<<"hello">>` | A sequence with one element |
| `s[1]` | First element (1-indexed) |
| `s[Len(s)]` | Last element |

## Sequence Operators

| Operator | Meaning | Unicode |
|----------|---------|---------|
| `Seq(S)` | The set of all finite sequences of elements in S | |
| `Len(s)` | Length of sequence s | |
| `Head(s)` | First element of s | |
| `Tail(s)` | All elements except the first | |
| `Append(s, e)` | Add e to the end of s | |
| `s \o t` | Concatenate sequences s and t | `s ∘ t` |
| `SubSeq(s, m, n)` | Subsequence from index m to n | |
| `SelectSeq(s, Test)` | Subsequence of elements where Test is TRUE | |

## Sequences as Functions

A sequence is actually a function from `1..n` to values. So `DOMAIN s = 1..Len(s)`.

## Common Patterns

**Stack (LIFO):**
```
Push(s, e) == <<e>> \o s
Pop(s)     == Tail(s)
Peek(s)    == Head(s)
```

**Queue (FIFO):**
```
Enqueue(s, e) == Append(s, e)
Dequeue(s)    == Tail(s)
Front(s)      == Head(s)
```

## Try It

The spec on the right models a simple bounded stack.

## Expected Result

TLC completes without errors. `Push` is enabled only below `MaxSize`, and `Pop` only for a nonempty stack. Try removing the size guard from `Push`; TLC will report a violated invariant when the stack exceeds `MaxSize`.

---TLA_BY_EXAMPLE_SPEC---
------------------------------ MODULE Stack ----------------------------------
EXTENDS Naturals, Sequences

CONSTANT MaxSize

VARIABLE stack

TypeOK == /\ stack \in Seq(Nat)
          /\ Len(stack) <= MaxSize

Init == stack = <<>>

Push == /\ Len(stack) < MaxSize
        /\ \E val \in 1..5 :
             stack' = <<val>> \o stack

Pop == /\ Len(stack) > 0
       /\ stack' = Tail(stack)

Next == Push \/ Pop

NeverOverflows == Len(stack) <= MaxSize

=============================================================================

---TLA_BY_EXAMPLE_CFG---
CONSTANT MaxSize = 3
INIT Init
NEXT Next
INVARIANT TypeOK
INVARIANT NeverOverflows
