---
slug: debug-config
expect: violation
title: "Debug State Graph"
section: blocking-queue
commitSha: "0f777ce3"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/0f777ce3"
---
A debug configuration with 2 producers, 1 consumer, and buffer capacity 1.

## What Changed

Upstream v04 adds an interactive debugger using `TLCExt!PickSuccessor` in `BlockingQueueDebug.tla`. Its debug configuration is p2c1b1. The playground uses those same constants with the base `BlockingQueue` spec, without the desktop-only interactive action constraint.

The upstream debugger lets us explore both deadlock states for p2c1b1:

![PickSuccessor](/bq-images/v04-PickSuccessor.gif)

To reproduce the debugger rather than the browser run, use the linked upstream revision's `BlockingQueueDebug.tla/.cfg` and the [CommunityModules](https://github.com/tlaplus/CommunityModules) library containing `TLCExt`.

## Expected Result

The browser reports **Deadlock reached** and stops at the first deadlock. Unlike the recording, it does not prompt you to choose a successor. Try returning to p1c1b1 to see the deadlock disappear.

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
    Producers = {p1,p2}
    Consumers = {c1}

INIT Init
NEXT Next
