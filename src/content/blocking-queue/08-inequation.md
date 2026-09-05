---
slug: inequation
expect: violation
title: "Deadlock-Free Inequation"
section: blocking-queue
commitSha: "80b23f9e"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/80b23f9e"
---
Now we infer the **inequation** under which the system is deadlock-free.

## What Changed

The spec and config are extended to systematically check when the deadlock invariant holds and when it does not.

## Key Insight

The relationship stated in the upstream tutorial is that the original single-wait-set algorithm is deadlock-free if and only if:

```tla
2 * BufCapacity >= Cardinality(Producers \cup Consumers)
```

For example, two producers and two consumers need capacity at least two. In this lesson's multi-configuration model, apply the relationship to the chosen variables `bufCapacity`, `producers`, and `consumers`, not just to their upper-bound constants.

We infer this relationship from finite data points. Model checking these bounds is not, by itself, a mathematical proof for all process counts and capacities.

## Collecting the Data Locally

Save this lesson's spec and configuration as `BlockingQueue.tla/.cfg` alongside `tla2tools.jar`, then use the upstream workflow:

```bash
java -jar tla2tools.jar -workers 1 -deadlock -continue BlockingQueue | grep InvVio | sort | uniq
```

`-continue` keeps exploring after invariant violations. `-deadlock` disables the separate built-in deadlock check; our invariant still identifies the all-waiting states. Each `InvVio` record contains the chosen capacity and total thread count.

![ContinueInequation](/bq-images/ContinueInequation.svg)

Collecting even more data, we can correlate the length of the error trace with the constants:

![TraceLengthCorrelation](/bq-images/TraceLengthCorrelation.svg)

## Expected Result

The browser reports the first `Invariant` violation and prints an `InvVio` record. It does not expose `-continue`, so it will not collect all the data shown in the upstream plots. Try the local command to collect all violating configurations within the supplied bounds.

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

INVARIANT Invariant
INVARIANT TypeInv
