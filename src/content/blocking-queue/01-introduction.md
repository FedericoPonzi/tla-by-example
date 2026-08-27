---
slug: introduction
expect: success
title: Introduction
section: blocking-queue
commitSha: "11410864"
commitUrl: "https://github.com/lemmy/BlockingQueue/commit/11410864"
---
Tutorial-style talk **"Weeks of debugging can save you hours of TLA+"**.

This section is an adaptation of the tutorial by Markus Kuppe from the [BlockingQueue GitHub repository](https://github.com/lemmy/BlockingQueue). It was inspired by Michel Charpentier's [An Example of Debugging Java with a Model Checker](http://www.cs.unh.edu/~charpov/programming-tlabuffer.html) and Challenge 14 of the [c2 wiki](http://wiki.c2.com/?ExtremeProgrammingChallengeFourteen).

![State graph p1c1b1](/bq-images/p1c1b1.svg)

The problem we model is a **bounded buffer** (blocking queue) shared between producer and consumer threads. Producers add items to the buffer. Consumers remove items from the buffer. When the buffer is full, producers wait. When the buffer is empty, consumers wait.

## Running the Java Implementation

```
git clone https://github.com/lemmy/BlockingQueue.git
cd BlockingQueue
java -cp impl/src/ org.kuppe.App
```

This launches the application with the default configuration **p4c3b3** (4 producers, 3 consumers, buffer capacity 3). The application may deadlock - that is the bug we will investigate with TLA+.

## Running the C Implementation

```
cd impl
make
./producer_consumer 3 4 3
```

This is a C implementation of the same blocking buffer problem.

You can follow along using the [TLA+ VS Code extension](https://marketplace.visualstudio.com/items?itemName=alygin.vscode-tlaplus) or via [Gitpod](https://gitpod.io/) / [GitHub Codespaces](https://github.com/features/codespaces).

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

		// The set of executing tasks.
		final Collection<Callable<Void>> tasks = new HashSet<>();
		for (int i = 0; i < conf.producers; i++) {
			tasks.add(new Producer(Integer.toString(tasks.size()), queue));
		}
		for (int i = 0; i < conf.consumers; i++) {
			tasks.add(new Consumer(queue));
		}
		
		// Run all tasks concurrently.
		final ExecutorService pool = Executors.newCachedThreadPool();
		pool.invokeAll(tasks);
		
		// This will never be reached.
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

import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.ReentrantLock;

import org.kuppe.App2TLA.BufferDeqEvent;
import org.kuppe.App2TLA.BufferEnqEvent;
import org.kuppe.App2TLA.BufferWaitEvent;

public final class BlockingQueue<E> {

	private final E[] store;
	
	private final ReentrantLock lock;
	private final Condition waitC;
	private final Condition waitP;
	
	private int head;
	private int tail;
	private int size;

	@SuppressWarnings("unchecked")
	public BlockingQueue(final int capacity) {
		this.store = (E[]) new Object[capacity];
		
		// see BlockingQueueSplit.tla
		this.lock = new ReentrantLock();
		this.waitC = lock.newCondition();
		this.waitP = lock.newCondition();
	}

	/**
	 * Add the given element to this queue waiting if necessary for space to become
	 * available.
	 * 
	 * @see {@link BlockingQueue#take()}.
	 */
	public void put(final E e) throws InterruptedException {
		final ReentrantLock lock = this.lock;
		lock.lock();
		try {
			while (isFull()) {
				new BufferWaitEvent("p").commit();
				System.out.println("Buffer full; P waits");
				waitP.await();
				System.out.println("P notified");
			}
			waitC.signal();

			// Add e and do bookkeeping.
			new BufferEnqEvent().commit();
			append(e);
		} finally {
			lock.unlock();
		}
	}

	/**
	 * Remove an element E from this queue, waiting if necessary until an element
	 * becomes available.
	 * 
	 * @see {@link BlockingQueue#put(Object)}.
	 */
	public E take() throws InterruptedException {
        final ReentrantLock lock = this.lock;
        lock.lock();
        try {
    		while (isEmpty()) {
    			new BufferWaitEvent("c").commit();
    			System.out.println("Buffer empty; C waits");
    			waitC.await();
    			System.out.println("C notified");
    		}
    		waitP.signal();
    		
    		// Remove e and do bookkeeping.
    		new BufferDeqEvent().commit();
    		return head();
        } finally {
            lock.unlock();
        }
	}
	
	
	//****** auxiliary methods ******//

	private void append(final E e) {
		store[tail] = e;
		tail = next(tail);
		size++;
	}

	private E head() {
		final E e = store[head];
		store[head] = null;
		head = next(head);
		size--;
		return e;
	}

	private int next(final int x) {
		return (x + 1) % store.length;
	}

	/**
	 * @return true if this buffer has reached its capacity defined during
	 *         instantiation.
	 */
	private boolean isFull() {
		return size == this.store.length;
	}

	/**
	 * @return true iff this buffer contains no elements E.
	 */
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
			if (take == null) {
				throw new NullPointerException();
			}
			System.out.printf("C took %s\n", take);
			Thread.sleep(rand.nextInt(sleepCons));
		}
	}
}

---TLA_BY_EXAMPLE_TAB label="C"---
// Implementation kindly provided by Aman Jain (https://www.linkedin.com/in/aman-jain-334a49110/).

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <pthread.h>

uint32_t buff_size, numProducers, numConsumers;
uint32_t *buffer;
uint32_t fillIndex, useIndex, count = 0;

// See https://stackoverflow.com/a/2087046/6291195 to relate this to the Java impl.
pthread_cond_t empty, full; 
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
		pthread_mutex_lock(&mutex);   // acquire the lock	
		while (count == buff_size) {   // check if the buffer is full
			#ifdef TRACE
			printf("w#p#-1\n");	fflush(stdout);
			#endif

		    pthread_cond_wait(&empty, &mutex);
		}
		
		append(rand() % (10));        // produce!
		#ifdef TRACE
		printf("e#p#-1\n"); fflush(stdout);
		#endif

		pthread_cond_signal(&full); // broadcast that the buffer is full
        pthread_mutex_unlock(&mutex); // release the lock
	}
}

void *consumer (void * arg) {
	uint32_t id = *((uint32_t *) arg);
	long report = 0;
	while(1) {
		pthread_mutex_lock(&mutex);   // acquire the lock

		while (count == 0) {           // check if the buffer is empty
			#ifdef TRACE
			printf("w#c#%d\n", id); fflush(stdout);
			#endif

			pthread_cond_wait(&full, &mutex); // wait for the buffer to be filled
		}

		head();                       // consume (we don't care about the value)!
		#ifdef TRACE
		printf("d#c#%d\n", id);  fflush(stdout);
		#endif
		
		pthread_cond_signal(&empty); // signal that the buffer is empty
		pthread_mutex_unlock(&mutex); // release the lock
		
		#ifndef TRACE 
		if (report++ % 10000 == 0) {
    		printf("\n%ld values consumed by %d", report, id);
		}
		#endif
	} 
}

int main(int argc, char * argv[]) {
	if (argc < 4) {
		printf ("Usage: ./producer_consumer <buffer_size> <#_of_producers> <#_of_consumers> \n");
		exit(1);
	}

	srand(999);

	/* Process arguments */
	buff_size = atoi(argv[1]);
	numProducers = atoi(argv[2]);
	numConsumers = atoi(argv[3]);

	#ifndef TRACE 
	printf("Buffer size = %d, # Producers = %d, # Consumers = %d\n", buff_size, numProducers, numConsumers);
	#endif

	pthread_mutex_init(&mutex, NULL);
	pthread_cond_init(&empty, NULL);
	pthread_cond_init(&full, NULL);

	/* Allocate space for the buffer */
	buffer = malloc(sizeof(int) * buff_size);
	pthread_t prods[numProducers], cons[numConsumers];
	uint32_t threadIds[numConsumers];

	uint32_t i;
	/* Create the producer */
	for (i = 0; i < numProducers ; i++) {
		pthread_create(&prods[i], NULL, producer, NULL);
	}

	/* Create the consumers */
	for (i = 0; i < numConsumers; i++) {
		threadIds[i] = i;
		pthread_create(&cons[i], NULL, consumer, &threadIds[i]);
	}

	/* Wait for all threads to finish */
	for (i = 0; i < numProducers ; i++) 
		pthread_join(prods[i], NULL);	

	for (i = 0; i < numConsumers; i++)
		pthread_join(cons[i], NULL);

	return 0;
}
