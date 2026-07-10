import Link from "next/link";
import Footer from "@/components/Footer";
import { introLessons } from "@/content/intro";
import { blockingQueueLessons } from "@/content/blocking-queue";
import { getBeginnerSpecs } from "@/lib/specs";

export default function Home() {
  const beginnerSpecs = getBeginnerSpecs();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            TLA+ By Example
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Learn TLA+ specifications through interactive examples.
            Write specs and run the TLC model checker directly in your browser.
          </p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl px-6 py-12">
        {/* Intro Section */}
        <section id="how-to-write-tla" className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            How to Write TLA+
          </h2>
          <p className="text-gray-600 mb-6">
            A step-by-step introduction to TLA+ syntax, data structures, and model checking.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {introLessons.map((lesson, i) => (
              <Link
                key={lesson.slug}
                href={`/intro/${lesson.slug}`}
                className="group rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-700">
                      {lesson.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* BlockingQueue Section */}
        <section id="blocking-queue-tutorial">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            BlockingQueue Tutorial
          </h2>
          <p className="text-gray-600 mb-2">
            A guided walkthrough of a real-world TLA+ specification: modeling a bounded
            blocking queue with producers and consumers.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Based on{" "}
            <a
              href="https://github.com/lemmy/BlockingQueue"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              lemmy/BlockingQueue
            </a>{" "}
            by Markus Kuppe.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {blockingQueueLessons.map((lesson, i) => (
              <Link
                key={lesson.slug}
                href={`/blocking-queue/${lesson.slug}`}
                className="group rounded-lg border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900 group-hover:text-green-700">
                      {lesson.title}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Community Specifications */}
        <section id="specifications" className="mt-16">
          <h2 id="community-specifications" className="text-2xl font-bold text-gray-900 mb-2">
            Community Specifications
          </h2>
          <p className="text-gray-600 mb-6">
            Beginner-friendly TLA+ specifications from the community. Browse the source,
            read the explanation, and explore the models.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {beginnerSpecs.map((spec) => (
              <Link
                key={spec.slug}
                href={`/specs/${spec.slug}`}
                className="group rounded-lg border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50/50 transition-colors"
              >
                <h3 className="font-medium text-gray-900 group-hover:text-purple-700">
                  {spec.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {spec.authors.join(", ")}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
