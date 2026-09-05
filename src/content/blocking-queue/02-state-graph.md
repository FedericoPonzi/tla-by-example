---
slug: state-graph
expect: success
title: "State Graph (Minimum Config)"
section: blocking-queue
commitSha: "9dfadd9d"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/9dfadd9d"
---
This is the first version of the BlockingQueue specification. It models a bounded buffer shared between producers and consumers.

The spec uses a **wait set** pattern: threads that cannot proceed (producer when buffer is full, consumer when buffer is empty) add themselves to a wait set and wait to be notified.

## Key Concepts

- **Producers** add items to a bounded buffer
- **Consumers** remove items from the buffer
- **waitSet** tracks which threads are waiting
- Configuration: 1 producer, 1 consumer, buffer capacity 1

## What to Look For

Run TLC and inspect the output. With this minimal configuration, you can trace through every reachable state by hand using the graph below. The browser does not generate a graph; the image comes from the upstream tutorial.

## State Graph

The model uses the minimal parameters (1 producer, 1 consumer, and a buffer of size one). When TLC generates the state graph, we can visually verify that no deadlock is possible with this configuration:

![State graph p1c1b1](/bq-images/p1c1b1.svg)

## Expected Result

TLC completes without a deadlock and reports 4 distinct states. Try adding a second consumer to see why success for this minimal model does not imply success for every configuration.

---TLA_BY_EXAMPLE_SPEC---
--------------------------- MODULE BlockingQueue ---------------------------
(***************************************************************************)
(* Original problem and spec by Michel Charpentier                         *)
(* http://www.cs.unh.edu/~charpov/programming-tlabuffer.html               *)
(***************************************************************************)
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

=============================================================================

---TLA_BY_EXAMPLE_CFG---
\* SPECIFICATION
CONSTANTS
    BufCapacity = 1
    Producers = {p1}
    Consumers = {c1}

INIT Init
NEXT Next
