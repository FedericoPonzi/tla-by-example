---
slug: symmetry
expect: violation
title: "Symmetry Sets"
section: blocking-queue
commitSha: "2a624e22"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/2a624e22"
---
We declare Producers and Consumers as **symmetry sets** to dramatically reduce the state space.

## What Changed

The configuration now uses `SYMMETRY` to tell TLC that consistently renaming producers among themselves, or consumers among themselves, preserves the model and its properties. This does not discard relationships such as whether the same producer appears twice in the buffer.

## Why Symmetry Matters

Without symmetry, TLC treats "p1 waiting, p2 running" and "p2 waiting, p1 running" as different states. With symmetry, they are equivalent. This can reduce the state space by orders of magnitude.

TLC reduces the **complete** state space from 57254 to 1647 distinct states. These are the upstream totals for exploration with `-deadlock -continue`, not the partial counts shown by the browser before it stops at the first violation.

An expression is symmetric for a set S if and only if interchanging any two values of S does not change the value of the expression. You should declare a set S of model values to be a symmetry set only if the specification and all properties you are checking are symmetric for S. Note that symmetry sets should not be used when checking liveness properties.

TLC does not verify that your symmetry declaration is sound. An incorrect declaration can hide errors.

## Expected Result

The browser still reports an `Invariant` violation, but explores fewer distinct states than the previous lesson. Try removing `SYMMETRY Sym` to compare the runs.

To reproduce the full 1647-state total, save this lesson's spec and configuration locally as `BlockingQueue.tla/.cfg`, place `tla2tools.jar` alongside them, and run:

```bash
java -jar tla2tools.jar -workers 1 -deadlock -continue BlockingQueue
```

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE BlockingQueue ---------------------------
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS Producers,   (* the (nonempty) set of producers                       *)
          Consumers,   (* the (nonempty) set of consumers                       *)
          BufCapacity  (* the maximum number of messages in the bounded buffer  *)

ASSUME Assumption ==
       /\ Producers # {}                      (* at least one producer *)
       /\ Consumers # {}                      (* at least one consumer *)
       /\ Producers \intersect Consumers = {} (* no thread is both consumer and producer *)
       /\ BufCapacity \in (Nat \ {0})         (* buffer capacity is at least 1 *)
       
-----------------------------------------------------------------------------

VARIABLES buffer, waitSet, producers, consumers, bufCapacity
vars == <<buffer, waitSet, producers, consumers, bufCapacity>>

RunningThreads == (producers \cup consumers) \ waitSet

(* @see java.lang.Object#notify *)       
Notify == IF waitSet # {}
          THEN \E x \in waitSet: waitSet' = waitSet \ {x}
          ELSE UNCHANGED waitSet

(* @see java.lang.Object#wait *)
Wait(t) == /\ waitSet' = waitSet \cup {t}
           /\ UNCHANGED <<buffer>>
           
-----------------------------------------------------------------------------

Put(t, d) ==
   \/ /\ Len(buffer) < bufCapacity
      /\ buffer' = Append(buffer, d)
      /\ Notify
   \/ /\ Len(buffer) = bufCapacity
      /\ Wait(t)
      
Get(t) ==
   \/ /\ buffer # <<>>
      /\ buffer' = Tail(buffer)
      /\ Notify
   \/ /\ buffer = <<>>
      /\ Wait(t)

-----------------------------------------------------------------------------

(* Initially, the buffer is empty and no thread is waiting. *)
Init == /\ buffer = <<>>
        /\ waitSet = {}
        /\ producers \in (SUBSET Producers) \ {{}}
        /\ consumers \in (SUBSET Consumers) \ {{}}
        /\ bufCapacity \in 1..BufCapacity

(* Then, pick a thread out of all running threads and have it do its thing. *)
Next == 
    /\  UNCHANGED <<producers, consumers, bufCapacity>>
    /\ \E t \in RunningThreads: \/ /\ t \in producers
                                    /\ Put(t, t) \* Add some data to buffer
                                 \/ /\ t \in consumers
                                    /\ Get(t)

-----------------------------------------------------------------------------

(* TLA+ is untyped, thus lets verify the range of some values in each state. *)
TypeInv == /\ buffer \in Seq(Producers)
           /\ Len(buffer) \in 0..bufCapacity
           /\ waitSet \subseteq (producers \cup consumers)

(* No Deadlock *)
Invariant == waitSet # (producers \cup consumers)

(* The Permutations operator is defined in the TLC module. *)
Sym == Permutations(Producers) \union Permutations(Consumers)

=============================================================================

---TLA_BY_EXAMPLE_CFG---
\* SPECIFICATION
CONSTANTS
    BufCapacity = 3
    Producers = {p1,p2,p3,p4}
    Consumers = {c1,c2,c3}

INIT Init
NEXT Next

SYMMETRY Sym

INVARIANT Invariant
INVARIANT TypeInv
