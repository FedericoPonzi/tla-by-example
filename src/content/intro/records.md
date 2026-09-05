---
slug: records
expect: success
title: Records
section: intro
---
# Records

Records are like structs or objects - they group named fields together. In TLA+, records are simply functions whose domain is a set of strings (the field names), but because this pattern occurs so frequently, TLA+ provides dedicated syntax for them.

## Creating Records

```
[name |-> "Alice", age |-> 30]
```

## Accessing Fields

Use dot notation:

```
person.name      \* "Alice"
person.age       \* 30
```

## Record Types (Sets of Records)

```
[name: {"Alice", "Bob"}, age: 0..120]
```

This is the **set of all records** with a `name` field from the given set and an `age` field from 0..120. Useful for `TypeOK` invariants.

## Updating Records (EXCEPT)

Just like functions, use `EXCEPT`:

```
person' = [person EXCEPT !.age = @ + 1]
```

## Records Are Functions

Under the hood, a record is a function from field names (strings) to values:

```
[name |-> "Alice", age |-> 30]
```

is the same as:

```
[x \in {"name", "age"} |-> IF x = "name" THEN "Alice" ELSE 30]
```

## Try It

The spec models user accounts with a small maximum balance so the reachable state space is finite. `Deposit` checks the limit before changing a balance; a type invariant alone would only detect an out-of-range balance, not prevent it.

When every account is inactive, `Finished` permits an unchanged terminal state. This deliberate stuttering step models a completed system rather than an unexpected deadlock.

## Expected Result

TLC completes without errors for two users and `MaxBalance = 3`. Try removing the upper-bound guard from `Deposit`; `TypeOK` then fails when a balance exceeds `MaxBalance`.

---TLA_BY_EXAMPLE_SPEC---
----------------------------- MODULE Records ---------------------------------
EXTENDS Naturals

CONSTANTS Users, MaxBalance

VARIABLE accounts

TypeOK == accounts \in [Users -> [balance: 0..MaxBalance, active: BOOLEAN]]

Init == accounts = [u \in Users |-> [balance |-> MaxBalance, active |-> TRUE]]

Deposit(u, amt) ==
    /\ accounts[u].active
    /\ amt \in 1..MaxBalance
    /\ accounts[u].balance + amt <= MaxBalance
    /\ accounts' = [accounts EXCEPT ![u].balance = @ + amt]

Withdraw(u, amt) ==
    /\ accounts[u].active
    /\ amt \in 1..accounts[u].balance
    /\ accounts' = [accounts EXCEPT ![u].balance = @ - amt]

Deactivate(u) ==
    /\ accounts[u].active
    /\ accounts' = [accounts EXCEPT ![u].active = FALSE]

Finished == /\ \A u \in Users : ~accounts[u].active
            /\ UNCHANGED accounts

Next == \/ \E u \in Users :
             \/ \E amt \in 1..MaxBalance : Deposit(u, amt)
             \/ \E amt \in 1..MaxBalance : Withdraw(u, amt)
             \/ Deactivate(u)
        \/ Finished

NoNegativeBalances == \A u \in Users : accounts[u].balance >= 0

=============================================================================

---TLA_BY_EXAMPLE_CFG---
CONSTANT Users = {alice, bob}
CONSTANT MaxBalance = 3
INIT Init
NEXT Next
INVARIANT TypeOK
INVARIANT NoNegativeBalances
