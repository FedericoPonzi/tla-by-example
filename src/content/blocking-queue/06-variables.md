---
slug: variables
expect: violation
title: "Constants to Variables"
section: blocking-queue
commitSha: "2c9d8870"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/2c9d8870"
---
In this step, we convert some constants into variables to explore a wider range of configurations automatically.

## What Changed

The constants now bound the choices for three new variables: `producers`, `consumers`, and `bufCapacity`. `Init` chooses nonempty subsets of the process sets and a capacity in `1..BufCapacity`. `Next` leaves these variables unchanged, so each behavior uses one fixed configuration rather than changing its configuration while running.

## Key Insight

Converting constants to variables is a powerful technique: it lets TLC explore configurations you might not have thought to check manually.

As Michel Charpentier points out, BlockingQueue is deadlock-free under some configurations. TLC can supply data points from finite models to help us infer a general relationship, but those data points are not a proof for unbounded parameters.

## Expected Result

The browser still reports an `Invariant` violation and stops at the first counterexample. There are 315 initial states for the supplied bounds. Try reducing the sets or capacity bound to see how many initial configurations remain.

The complete state space has **57254 distinct states**, as reported upstream. To explore it past invariant violations, save this lesson's editors as `BlockingQueue.tla` and `BlockingQueue.cfg` alongside a local `tla2tools.jar`, then run:

```bash
java -jar tla2tools.jar -workers 1 -deadlock -continue BlockingQueue
```

`-continue` continues after invariant violations; `-deadlock` disables the separate built-in deadlock check so it does not stop the run. The invariant still reports all-waiting states. These options are not exposed by the browser playground, whose partial state count will be smaller.

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
Invariant == waitSet # (producers \cup consumers)

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
