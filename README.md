# TLA+ By Example

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

An interactive website for learning TLA+ through guided examples with an in-browser model checker.

**Live at:** [tlabyexample.com](https://tlabyexample.com)

## What is this

A Next.js static site that teaches TLA+ specifications through two sections:

1. **Intro to TLA+** — step-by-step lessons on syntax, data structures, and TLC configuration
2. **BlockingQueue Tutorial** — an adaptation of [Markus Kuppe's BlockingQueue](https://github.com/lemmy/BlockingQueue) tutorial, walking through a concurrent bounded buffer spec commit by commit

Each lesson has a split layout: explanation on the left, interactive playground on the right. The playground runs the TLC model checker directly in the browser via [CheerpJ](https://cheerpj.com/) (TLA+ tools compiled to a JAR, executed in-browser).

## Development

```bash
npm install
npm run dev       # start dev server at http://localhost:3000
npm test          # run jest tests
npm run build     # static export to out/
```

Requires Node.js 20+.

See [the lesson authoring guide](dev/lessons.md) for the Markdown format, lesson registration, expected outcomes, and BlockingQueue source alignment.
