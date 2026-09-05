---
slug: view
expect: violation
title: "View Abstraction"
section: blocking-queue
commitSha: "e4911b6d"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/e4911b6d"
---
Define a **view** that abstracts the buffer into a counter, reducing the state space.

## What Changed

A VIEW directive is added to the configuration. The view maps each state to an abstract state, so TLC treats states with the same abstract view as equivalent.

## Why Views Help

The buffer content does not matter for deadlock checking - only its length does. By abstracting the buffer to its length, we dramatically reduce the state space while preserving the properties we care about.

The order and identity of elements in the FIFO buffer are irrelevant to this **deadlock-freedom** question. They would matter for a property about which item is returned, such as FIFO ordering. A view is not automatically safe for every property.

With this abstraction, the **complete** state space for the current configuration shrinks from 2940 to 1797 distinct states, as reported upstream.

## Expected Result

The browser still reports an `Invariant` violation and stops at the first counterexample. Try removing `VIEW View` to compare the partial exploration counts.

To reproduce the complete totals, save this lesson's spec and configuration as `BlockingQueue.tla/.cfg` alongside `tla2tools.jar`, then run:

```bash
java -jar tla2tools.jar -workers 1 -deadlock -continue BlockingQueue
```

This continues after invariant violations and disables the separate built-in deadlock stopping condition. Compare runs with and without `VIEW View`; leave `SYMMETRY Sym` enabled in both.

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
Invariant == IF waitSet # (producers \cup consumers)
             THEN TRUE \* Inv not violated.
             ELSE PrintT(<<"InvVio", bufCapacity, Cardinality(producers \cup consumers)>>) /\ FALSE

(* The Permutations operator is defined in the TLC module. *)
Sym == Permutations(Producers) \union Permutations(Consumers)

View == <<Len(buffer), waitSet, producers, consumers, bufCapacity>>
=============================================================================

---TLA_BY_EXAMPLE_CFG---
\* SPECIFICATION
CONSTANTS
    BufCapacity = 3
    Producers = {p1,p2,p3,p4}
    Consumers = {c1,c2,c3,c4}

INIT Init
NEXT Next

SYMMETRY Sym
VIEW View

INVARIANT Invariant
INVARIANT TypeInv
