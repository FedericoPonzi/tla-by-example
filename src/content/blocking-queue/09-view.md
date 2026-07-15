---
slug: view
expect: violation
title: "View Abstraction"
section: blocking-queue
commitSha: "02119f46"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/02119f46"
---
Define a **view** that abstracts the buffer into a counter, reducing the state space.

## What Changed

A VIEW directive is added to the configuration. The view maps each state to an abstract state, so TLC treats states with the same abstract view as equivalent.

## Why Views Help

The buffer content does not matter for deadlock checking - only its length does. By abstracting the buffer to its length, we dramatically reduce the state space while preserving the properties we care about.

We exploit the insight that the order of elements in the (fifo) buffer is irrelevant for the correctness of the algorithm. In other words, we can abstract the buffer into a simple counter of elements. With this abstraction, the state-space for the current config shrinks from 2940 to 1797 distinct states.

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
