---
slug: notify-nondeterministic
expect: violation
title: "Non-deterministic Notification"
section: blocking-queue
commitSha: "be91c6d6"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/be91c6d6"
---
Upstream v11 tries an additional, non-deterministically scheduled notification as a workaround for the blocking-queue bug. It is an attempted fix, not the final solution.

## What Changed

`Notify` already used `\E x \in waitSet` to choose any waiting thread. The new choice is in `Next`: notification can now happen as a separate step, without a producer adding an item or a consumer removing one.

## Why This Is Not the Final Fix

As the upstream tutorial explains, we can keep waking the wrong kind of thread, which cannot perform useful work and goes back to waiting. Adding a possible wakeup does not guarantee progress.

There is an important distinction in this version: `Invariant` still forbids all threads being in `waitSet`, but that state is no longer a TLC deadlock. The independent `Notify` step remains enabled and can wake someone. Even when `waitSet` is empty, that step permits an unchanged state.

The supplied invariant checks a state condition, not eventual progress. A liveness claim would require a temporal property and appropriate fairness assumptions; upstream explores these in later lessons.

## Expected Result

TLC reports an `Invariant` violation because all threads can still be waiting. Try removing only `INVARIANT Invariant` from the configuration: TLC completes without a built-in deadlock error, but that does not establish that useful work must continue.

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
Next ==
     \/ Notify /\ UNCHANGED buffer
     \/ \E t \in RunningThreads: \/ /\ t \in Producers
                                    /\ Put(t, t) \* Add some data to buffer
                                 \/ /\ t \in Consumers
                                    /\ Get(t)

-----------------------------------------------------------------------------

(* TLA+ is untyped, thus lets verify the range of some values in each state. *)
TypeInv == /\ buffer \in Seq(Producers)
           /\ Len(buffer) \in 0..BufCapacity
           /\ waitSet \subseteq (Producers \cup Consumers)

(* The original all-waiting invariant, not a deadlock test with this Next. *)
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
