---
slug: safety
expect: violation
title: "Safety - Detecting Deadlocks"
section: blocking-queue
commitSha: "2fa48399"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/2fa48399"
---
Now we add an **invariant** that explicitly expresses deadlock freedom for this model. TLC already detects deadlocks automatically; the invariant gives us a state predicate to study and, in later upstream steps, prove.

## What Changed

The definitions `Invariant` and `TypeInv` were added to the spec and enabled with `INVARIANT` entries in the configuration.

## The Deadlock Invariant

The invariant checks that the system is never in a state where all threads are waiting. If every producer and consumer is in the wait set, nobody can make progress.

## Key Concept: Safety Properties

A **safety property** says "something bad never happens." Invariants are the primary way to express safety in TLA+. TLC checks that the invariant holds in every reachable state.

## TLC Output

The supplied configuration is **p4c3b3**, matching the Java application's defaults. It produces a longer counterexample. The upstream tutorial also shows the shorter **p1c2b1** trace below. To reproduce that example, change only the constants to:

```cfg
CONSTANTS
    BufCapacity = 1
    Producers = {p1}
    Consumers = {c1,c2}
```

Keep `INIT`, `NEXT`, and both `INVARIANT` entries in the configuration.

```text
Error: Invariant Invariant is violated.
State 1: <Initial predicate>
/\ buffer = <<>>
/\ waitSet = {}

State 2:
/\ buffer = <<>>
/\ waitSet = {c1}

State 3:
/\ buffer = <<>>
/\ waitSet = {c1, c2}

State 4:
/\ buffer = <<p1>>
/\ waitSet = {c2}

State 5:
/\ buffer = <<p1>>
/\ waitSet = {p1, c2}

State 6:
/\ buffer = <<>>
/\ waitSet = {p1}

State 7:
/\ buffer = <<>>
/\ waitSet = {p1, c1}

State 8:
/\ buffer = <<>>
/\ waitSet = {p1, c1, c2}
```

Note that the Java app with p2c1b1 usually deadlocks only after thousands of log statements, which is considerably longer than the error trace above. This makes it more difficult to understand the root cause.

## Expected Result

TLC reports that `Invariant` is violated: all producers and consumers are waiting. `TypeInv` still holds, illustrating that well-typed states need not be deadlock-free. Try the smaller configuration above to follow each step of the counterexample.

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE BlockingQueue ---------------------------
EXTENDS Naturals, Sequences, FiniteSets

CONSTANTS Producers,   (* the (nonempty) set of producers                       *)
          Consumers,   (* the (nonempty) set of consumers                       *)
          BufCapacity  (* the maximum number of messages in the bounded buffer  *)

ASSUME Assumption ==
       /\ Producers # {}                      (* at least one producer *)
       /\ Consumers # {}                      (* at least one consumer *)
       /\ Producers \intersect Consumers = {} (* no thread is both consumer and producer *)
       /\ BufCapacity \in (Nat \ {0})         (* buffer capacity is at least 1 *)
       
-----------------------------------------------------------------------------

VARIABLES buffer, waitSet
vars == <<buffer, waitSet>>

RunningThreads == (Producers \cup Consumers) \ waitSet

(* @see java.lang.Object#notify *)       
Notify == IF waitSet # {}
          THEN \E x \in waitSet: waitSet' = waitSet \ {x}
          ELSE UNCHANGED waitSet

(* @see java.lang.Object#wait *)
Wait(t) == /\ waitSet' = waitSet \cup {t}
           /\ UNCHANGED <<buffer>>
           
-----------------------------------------------------------------------------

Put(t, d) ==
   \/ /\ Len(buffer) < BufCapacity
      /\ buffer' = Append(buffer, d)
      /\ Notify
   \/ /\ Len(buffer) = BufCapacity
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

(* Then, pick a thread out of all running threads and have it do its thing. *)
Next == \E t \in RunningThreads: \/ /\ t \in Producers
                                    /\ Put(t, t) \* Add some data to buffer
                                 \/ /\ t \in Consumers
                                    /\ Get(t)

-----------------------------------------------------------------------------

(* TLA+ is untyped, thus lets verify the range of some values in each state. *)
TypeInv == /\ buffer \in Seq(Producers)
           /\ Len(buffer) \in 0..BufCapacity
           /\ waitSet \subseteq (Producers \cup Consumers)

(* No Deadlock *)
Invariant == waitSet # (Producers \cup Consumers)

=============================================================================

---TLA_BY_EXAMPLE_CFG---
\* SPECIFICATION
CONSTANTS
    BufCapacity = 3
    Producers = {p1,p2,p3,p4}
    Consumers = {c1,c2,c3}

INIT Init
NEXT Next

INVARIANT Invariant
INVARIANT TypeInv
