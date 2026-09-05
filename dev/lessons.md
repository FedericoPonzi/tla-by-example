# Lesson File Format

Lessons are written as Markdown files with YAML frontmatter and custom divider tags.

## Structure

```markdown
---
slug: my-lesson
title: "My Lesson Title"
section: intro
expect: success
commitSha: "abc123"
commitUrl: "https://github.com/..."
---
Description content goes here (Markdown).

---TLA_BY_EXAMPLE_SPEC---
---- MODULE MySpec ----
EXTENDS Naturals
...
======================

---TLA_BY_EXAMPLE_CFG---
INIT Init
NEXT Next
INVARIANT TypeOK

---TLA_BY_EXAMPLE_TAB label="Java"---
// Java source code...

---TLA_BY_EXAMPLE_TAB label="C"---
// C source code...
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `slug` | Yes | URL-friendly identifier for the lesson |
| `title` | Yes | Display title |
| `section` | Yes | `"intro"` or `"blocking-queue"` |
| `expect` | For runnable lessons | `"success"` for a completed run without errors, or `"violation"` for an intended invariant/property violation or deadlock |
| `commitSha` | No | Upstream Git commit SHA associated with the lesson |
| `commitUrl` | No | Link to the commit on GitHub |

## Divider Tags

Content is split into sections using divider tags on their own line:

- `---TLA_BY_EXAMPLE_SPEC---` - Everything after this tag (until the next tag) is the TLA+ specification shown in the Spec editor tab.
- `---TLA_BY_EXAMPLE_CFG---` - Everything after this tag (until the next tag) is the TLC configuration shown in the Cfg editor tab.
- `---TLA_BY_EXAMPLE_TAB label="Name"---` - Everything after this tag (until the next tab tag or end of file) is shown as an extra read-only tab with the given label. Multiple tab tags can be used for multiple extra tabs.

## File Naming and Ordering

BlockingQueue lesson files are discovered automatically and sorted alphabetically by filename. Use numeric prefixes to control their order:

```
01-introduction.md
02-state-graph.md
03-larger-config.md
```

Intro lessons instead use the explicit `mdFiles` list in `src/content/intro/index.ts`. Add a new filename to that list at the appropriate position; alphabetical naming alone will not register it.

## Adding a New Lesson

1. Create a new `.md` file in the appropriate `src/content/` subdirectory
2. Add frontmatter with `slug`, `title`, `section`, and the expected outcome in `expect`
3. Write the description in Markdown, including an **Expected Result** section that explains the default outcome and a small exercise
4. Add `---TLA_BY_EXAMPLE_SPEC---` followed by the TLA+ spec
5. Add `---TLA_BY_EXAMPLE_CFG---` followed by the TLC config
6. Optionally add `---TLA_BY_EXAMPLE_TAB label="..."---` sections for extra tabs
7. For intro lessons, register the filename in `src/content/intro/index.ts`; BlockingQueue lessons are automatically discovered
8. Update the lesson counts in `__tests__/lessons.test.ts` when adding or removing a lesson

Use ordinary Markdown backticks and single backslashes for TLA+ operators inside code spans/fences. Do not preserve TypeScript string escaping in Markdown files.

Runnable lessons must have a finite, practical default exploration or a deliberately reachable counterexample. Explain whether a reported error is an invariant violation, a deadlock, or a temporal-property violation. The browser regression suite (`npm run test:e2e`) runs every lesson with a spec and configuration; animation-only lessons omit both and need no `expect`.

## BlockingQueue Source Alignment

Follow the historical steps in [lemmy/BlockingQueue](https://github.com/lemmy/BlockingQueue), not the latest implementation for every page. Keep `commitSha` and `commitUrl` aligned with the corresponding upstream step. Upstream periodically rewrites its history; map revisions by their tutorial step when refreshing references.

Document browser adaptations explicitly: the introduction previews the v02 model beside abridged v01 implementations, the debugger lesson uses the upstream debug constants without its interactive constraint, and the final three configurations omit desktop animation directives. Keep algorithm semantics consistent with the relevant upstream version.

Quoted state-space totals must specify whether they describe the browser's first-counterexample run or a complete local exploration with `-deadlock -continue`. Include matching constants for any worked trace.
