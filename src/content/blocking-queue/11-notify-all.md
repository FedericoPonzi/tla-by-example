---
slug: notify-all
expect: success
title: "Notify All"
section: blocking-queue
commitSha: "8ab5eb37"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/8ab5eb37"
---
Upstream v12 replaces `notify()` with `notifyAll()` on successful queue operations.

## What Changed

Instead of notifying one thread, successful `Put` and `Get` operations notify **all** waiting threads. The independent notification step from the previous attempted fix is removed.

## Waking the Wrong Kind of Thread

With notify(), the JVM might wake up a thread that cannot make progress (e.g., waking a producer when the buffer is already full). That thread goes back to waiting, and the actual thread that could make progress is never woken - leading to deadlock.

## The Fix

`notifyAll()` makes all waiters eligible to reacquire the shared lock and recheck their conditions. This fixes the modeled deadlock, but waking threads that cannot proceed can add contention. It does not by itself guarantee fair scheduling or freedom from starvation.

As a bonus exercise, check if it is necessary to notify all waiting threads in both Put and Get.

The upstream tutorial notes that using `notifyAll()` in just one of the two operations suffices for this deadlock fix. Try keeping `NotifyAll` in one operation and restoring the earlier single-thread `Notify` in the other. The next lesson avoids waking the wrong kind of thread in the first place.

## Expected Result

TLC completes without a deadlock or invariant violation for the supplied p4c3b3 model. This is a finite-model result, not a proof for every configuration or a liveness guarantee.

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

NotifyAll == waitSet' = {}

(* @see java.lang.Object#wait *)
Wait(t) == /\ waitSet' = waitSet \cup {t}
           /\ UNCHANGED <<buffer>>
           
-----------------------------------------------------------------------------

Put(t, d) ==
   \/ /\ Len(buffer) < BufCapacity
      /\ buffer' = Append(buffer, d)
      /\ NotifyAll
   \/ /\ Len(buffer) = BufCapacity
      /\ Wait(t)
      
Get(t) ==
   \/ /\ buffer # <<>>
      /\ buffer' = Tail(buffer)
      /\ NotifyAll
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
