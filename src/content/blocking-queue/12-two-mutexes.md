---
slug: two-mutexes
title: "Two Mutexes"
section: blocking-queue
commitSha: "a400b585"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/a400b585"
---
The final bugfix: using (logically) two separate mutexes for producers and consumers.

## What Changed

Instead of a single wait set for all threads, we separate waiting producers from waiting consumers.

## Why This Matters

With a single mutex/condition variable, notifyAll() wakes up ALL threads - including those that definitely cannot proceed. With separate conditions for "buffer not full" and "buffer not empty," we can be more precise.

## Summary of the Bugfix Journey

1. **v11**: Model the real non-deterministic behavior of notify()
2. **v12**: Fix with notifyAll() - correct but inefficient
3. **v13**: Optimize with separate condition variables - correct AND efficient

This is exactly the kind of bug that TLA+ excels at finding: subtle concurrency issues that only manifest in specific interleavings.

Remove notifyAll and instead introduce two mutexes (one for Producers and one for Consumers). A Consumer will notify the subset of Producers waiting on the Producer mutex (vice versa for a Producer).

The spec does not have to introduce two mutexes. Instead, we can just pick the right thread type from the set of waiting threads. This fix completely solves the bug, but are we fully satisfied yet?

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

NotifyOther(Others) == 
    IF waitSet \cap Others # {}
    THEN \E t \in waitSet \cap Others : waitSet' = waitSet \ {t}
    ELSE UNCHANGED waitSet

(* @see java.lang.Object#wait *)
Wait(t) == /\ waitSet' = waitSet \cup {t}
           /\ UNCHANGED <<buffer>>
           
-----------------------------------------------------------------------------

Put(t, d) ==
   \/ /\ Len(buffer) < BufCapacity
      /\ buffer' = Append(buffer, d)
      /\ NotifyOther(Consumers)
   \/ /\ Len(buffer) = BufCapacity
      /\ Wait(t)
      
Get(t) ==
   \/ /\ buffer # <<>>
      /\ buffer' = Tail(buffer)
      /\ NotifyOther(Producers)
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
