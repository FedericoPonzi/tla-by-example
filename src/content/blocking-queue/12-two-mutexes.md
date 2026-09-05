---
slug: two-mutexes
expect: success
title: "(Logically) Two Mutexes"
section: blocking-queue
commitSha: "fe230e23"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/fe230e23"
---
Upstream v13 calls this fix **"(Logically) two mutexes"**: separate the waiting producers from the waiting consumers so each operation notifies the other kind of thread.

## What Changed

The abstract spec keeps one `waitSet`. `NotifyOther(Consumers)` selects a waiting consumer after a put, and `NotifyOther(Producers)` selects a waiting producer after a get. There is no need to represent two separate wait sets at this level.

## Why This Matters

With a single condition, `notifyAll()` wakes up all waiters, including those that cannot proceed. Separate conditions for "buffer not full" and "buffer not empty" let us signal only the relevant group.

The upstream title describes the logical separation of waiters, not a recommendation to protect shared buffer updates with unrelated locks. Its later Java implementation uses **one `ReentrantLock` and two `Condition` objects**; its C implementation likewise uses one mutex and two condition variables. Both producers and consumers must still synchronize access to the shared buffer.

## Summary of the Bugfix Journey

1. **v11**: Try independently scheduled notifications; the all-waiting invariant still fails.
2. **v12**: Fix the modeled deadlock with `notifyAll()`, at the cost of unnecessary wakeups.
3. **v13**: Notify only the opposite kind of waiter, avoiding those unnecessary wakeups.

This is exactly the kind of bug that TLA+ excels at finding: subtle concurrency issues that only manifest in specific interleavings.

## Expected Result

TLC completes without a deadlock or invariant violation for the supplied model. Try different positive capacities and nonempty producer/consumer sets.

Are we fully satisfied? As upstream v14 points out, finite runs alone cannot prove the fix for arbitrary parameters. The upstream tutorial continues with TLAPS proofs and, later, starvation and fairness. Those topics are beyond this shortened walkthrough.

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
