---
slug: notify-all
title: "Notify All"
section: blocking-queue
commitSha: "a81e4914"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/a81e4914"
---
Another bugfix: switch from notify() to notifyAll() - always wake up all waiting threads.

## What Changed

Instead of non-deterministically notifying one thread, we now notify **all** waiting threads. This is the standard fix for the lost-wakeup problem.

## The Lost Wakeup Problem

With notify(), the JVM might wake up a thread that cannot make progress (e.g., waking a producer when the buffer is already full). That thread goes back to waiting, and the actual thread that could make progress is never woken - leading to deadlock.

## The Fix

notifyAll() ensures every waiting thread gets a chance to check whether it can proceed.

As a bonus exercise, check if it is necessary to notify all waiting threads in both Put and Get.

Note that this is the proposed solution to the bug in Challenge 14 of the c2 extreme programming wiki. To the best of my knowledge, not a single comment mentions that just one notifyAll suffices. Neither does anybody mention a more elegant fix that has no performance implications (see next step).

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
