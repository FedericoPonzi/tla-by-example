---
slug: larger-config
expect: violation
title: "Larger Configuration"
section: blocking-queue
commitSha: "7d05fdfa"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/7d05fdfa"
---
We now use a slightly different configuration (1 producer, 2 consumers, buffer capacity 1) which lets us visually spot the deadlock.

## What Changed

Only the configuration changed - the spec is the same. This demonstrates the power of model checking: by exploring different parameter values, we can find bugs that do not appear in simpler configurations.

## Try It

Run TLC and notice how the state space grows compared to v02.

## State Graph

Slightly larger configuration with which we can visually spot the deadlock:

![State graph p1c2b1](/bq-images/p1c2b1.svg)

BlockingQueueDebug.tla/.cfg shows how to interactively explore a state graph with TLC in combination with GraphViz:

![Explore state graph](/bq-images/v03-StateGraph.gif)

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
    Consumers = {c1,c2}

INIT Init
NEXT Next
