---
slug: introduction
expect: success
title: Introduction
section: blocking-queue
commitSha: "cc8acf5c"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/cc8acf5c"
---
Tutorial-style talk **"Weeks of debugging can save you hours of TLA+"**.

This section is an adaptation of the tutorial by Markus Kuppe from the [BlockingQueue GitHub repository](https://github.com/lemmy/BlockingQueue). It was inspired by Michel Charpentier's [An Example of Debugging Java with a Model Checker](http://www.cs.unh.edu/~charpov/programming-tlabuffer.html) and Challenge 14 of the [c2 wiki](http://wiki.c2.com/?ExtremeProgrammingChallengeFourteen).

![State graph p1c1b1](/bq-images/p1c1b1.svg)

The problem we model is a **bounded buffer** (blocking queue) shared between producer and consumer threads. Producers add items to the buffer. Consumers remove items from the buffer. When the buffer is full, producers wait. When the buffer is empty, consumers wait.

## Following the Upstream Tutorial

These lessons follow upstream v01-v08a and v11-v13. The optional trace-animation steps in between are omitted. Each lesson links to its corresponding upstream commit; the upstream history is periodically rewritten, so use the linked revision rather than assuming the latest branch represents that step.

The Java and C tabs are abridged versions of the original v01 implementations. Both use a single wait set/condition and can deadlock; the C tab omits the upstream logging. The playground previews the minimal v02 model because v01 introduces the implementation before the TLA+ spec.

The browser runs standalone specifications, not the desktop debugger or trace animator. The final three lessons omit upstream's animation-only configuration entries while retaining the algorithm and its safety invariants.

## Running the Java Implementation

Run these commands in a new clone with a JDK installed:

```bash
git clone https://github.com/lemmy/BlockingQueue.git
cd BlockingQueue
git switch --detach cc8acf5c8c47eccb6064941937567353b414ddc4
mkdir -p build/classes
javac -d build/classes impl/src/org/kuppe/*.java
java -cp build/classes org.kuppe.App
```

This launches the original application with the default configuration **p4c3b3** (4 producers, 3 consumers, buffer capacity 3). It runs indefinitely and may deadlock; stop it with Ctrl+C. The current upstream branch already includes later fixes, which is why selecting the historical revision matters.

## Running the C Implementation

In the same historical checkout, after stopping Java, use GCC and Make:

```bash
cd impl
make
./producer_consumer 3 4 3
```

This runs the original single-condition C implementation with the same parameters. Stop it with Ctrl+C.

You can follow along using the [TLA+ VS Code extension](https://marketplace.visualstudio.com/items?itemName=alygin.vscode-tlaplus) or via [Gitpod](https://gitpod.io/) / [GitHub Codespaces](https://github.com/features/codespaces).

## Expected Result

The playground's smaller **p1c1b1** model completes without a deadlock. This does not establish that the implementation is safe for the larger **p4c3b3** configuration. Try adding a second consumer to the configuration; the later lessons explain the resulting deadlock.

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

---TLA_BY_EXAMPLE_TAB label="Java"---
// === App.java ===
package org.kuppe;

import java.util.Collection;
import java.util.HashSet;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public class App {
public static void main(String[] args) throws InterruptedException {
        final Configuration conf = new Configuration(args);
final int k = conf.bufCapacity;
final BlockingQueue<String> queue = new BlockingQueue<>(k);
final Collection<Callable<Void>> tasks = new HashSet<>();
for (int i = 0; i < conf.producers; i++) {
tasks.add(new Producer(Integer.toString(tasks.size()), queue));
}
for (int i = 0; i < conf.consumers; i++) {
tasks.add(new Consumer(queue));
}
final ExecutorService pool = Executors.newCachedThreadPool();
pool.invokeAll(tasks);
pool.shutdown();
pool.awaitTermination(Long.MAX_VALUE, TimeUnit.DAYS);
}
private static class Configuration {
public final int bufCapacity;
public final int producers;
public final int consumers;
public Configuration(String args[]) {
if (args.length == 3) {
this.bufCapacity = Integer.parseInt(args[0]);
this.producers = Integer.parseInt(args[1]);
this.consumers = Integer.parseInt(args[2]);
} else {
this.bufCapacity = 3;
this.producers = 4;
this.consumers = 3;
}
}
}
}

// === BlockingQueue.java ===
package org.kuppe;

public final class BlockingQueue<E> {
private final E[] store;
private int head;
private int tail;
private int size;

@SuppressWarnings("unchecked")
public BlockingQueue(final int capacity) {
this.store = (E[]) new Object[capacity];
}

public synchronized void put(final E e) throws InterruptedException {
while (isFull()) {
System.out.println("Buffer full; P waits");
wait();
System.out.println("P notified");
}
notify();
append(e);
}

public synchronized E take() throws InterruptedException {
while (isEmpty()) {
System.out.println("Buffer empty; C waits");
wait();
System.out.println("C notified");
}
notify();
return head();
}

private void append(final E e) {
store[tail] = e;
tail = (tail + 1) % store.length;
size++;
}

private E head() {
final E e = store[head];
store[head] = null;
head = (head + 1) % store.length;
size--;
return e;
}

private boolean isFull() {
return size == store.length;
}

private boolean isEmpty() {
return size == 0;
}
}

// === Producer.java ===
package org.kuppe;

import java.util.Random;
import java.util.concurrent.Callable;

class Producer implements Callable<Void> {
private final int sleepProd = 42;
private final Random rand = new Random();
private final BlockingQueue<String> queue;
private final String name;

public Producer(final String name, final BlockingQueue<String> queue) {
this.name = name;
this.queue = queue;
}

@Override
public Void call() throws Exception {
while (true) {
queue.put(name);
System.out.printf("P put %s\n", name);
Thread.sleep(rand.nextInt(sleepProd));
}
}
}

// === Consumer.java ===
package org.kuppe;

import java.util.Random;
import java.util.concurrent.Callable;

class Consumer implements Callable<Void> {
private static final int sleepCons = 23;
private final Random rand = new Random();
private final BlockingQueue<String> queue;

public Consumer(final BlockingQueue<String> queue) {
this.queue = queue;
}

@Override
public Void call() throws Exception {
while (true) {
final Object take = queue.take();
if (take == null) throw new NullPointerException();
System.out.printf("C took %s\n", take);
Thread.sleep(rand.nextInt(sleepCons));
}
}
}

---TLA_BY_EXAMPLE_TAB label="C"---
// Implementation kindly provided by Aman Jain

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <pthread.h>

uint32_t buff_size, numProducers, numConsumers;
uint32_t *buffer;
uint32_t fillIndex, useIndex, count = 0;

pthread_cond_t modify;
pthread_mutex_t mutex;

void append(uint32_t value) {
buffer[fillIndex] = value;
fillIndex = (fillIndex + 1) % buff_size;
count++;
}

uint32_t head() {
uint32_t tmp = buffer[useIndex];
useIndex = (useIndex + 1) % buff_size;
count--;
return tmp;
}

void *producer (void * arg) {
while(1) {
pthread_mutex_lock(&mutex);
while (count == buff_size) {
    pthread_cond_wait(&modify, &mutex);
}
append(rand() % (10));
pthread_cond_signal(&modify);
        pthread_mutex_unlock(&mutex);
}
}

void *consumer (void * arg) {
uint32_t id = *((uint32_t *) arg);
while(1) {
pthread_mutex_lock(&mutex);
while (count == 0) {
pthread_cond_wait(&modify, &mutex);
}
head();
pthread_cond_signal(&modify);
pthread_mutex_unlock(&mutex);
} 
}

int main(int argc, char * argv[]) {
if (argc < 4) {
printf("Usage: ./producer_consumer <buffer_size> <#producers> <#consumers>\n");
exit(1);
}
srand(999);
buff_size = atoi(argv[1]);
numProducers = atoi(argv[2]);
numConsumers = atoi(argv[3]);

pthread_mutex_init(&mutex, NULL);
pthread_cond_init(&modify, NULL);

buffer = malloc(sizeof(int) * buff_size);
pthread_t prods[numProducers], cons[numConsumers];
uint32_t threadIds[numConsumers];

for (uint32_t i = 0; i < numProducers; i++)
pthread_create(&prods[i], NULL, producer, NULL);
for (uint32_t i = 0; i < numConsumers; i++) {
threadIds[i] = i;
pthread_create(&cons[i], NULL, consumer, &threadIds[i]);
}

for (uint32_t i = 0; i < numProducers; i++) 
pthread_join(prods[i], NULL);
for (uint32_t i = 0; i < numConsumers; i++)
pthread_join(cons[i], NULL);
return 0;
}
