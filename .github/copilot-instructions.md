# Copilot Instructions

## Build & Test

```bash
npm run dev        # dev server at localhost:3000
npm run build      # static export to out/
npm test           # all tests
npx jest __tests__/lessons.test.ts              # single test file
npx jest --testNamePattern "unique slugs"       # single test by name
npm run lint       # ESLint via next lint
```

CI runs `npm test` then `npm run build` on Node 20 (ubuntu-latest).

## Architecture

This is a **Next.js 14 static site** (`output: "export"`) that teaches TLA+ through interactive lessons. Each lesson pairs a markdown explanation with a code playground that runs the TLC model checker in the browser.

**Content → Pages → Components flow:**

1. **Lesson definitions** (`src/content/intro/`, `src/content/blocking-queue/`) are Markdown files with YAML frontmatter and spec/config/tab dividers. `src/lib/parse-lesson.ts` converts them into `Lesson` objects. See `dev/lessons.md` for the format.
2. **Dynamic routes** (`src/app/intro/[slug]/page.tsx`, `src/app/blocking-queue/[step]/page.tsx`) use `generateStaticParams()` to pre-build all lesson pages.
3. **LessonLayout** renders a resizable split view: markdown explanation on the left, **Playground** on the right.
4. **Playground** manages tabbed CodeMirror editors (spec/cfg/extra tabs) and runs TLC via CheerpJ.

**In-browser TLC execution** (`src/lib/cheerpj.ts`): TLC runs inside a hidden iframe (`public/tlc-worker.html`) that loads a JAR via CheerpJ. Communication uses `postMessage` with "ready", "progress", "result", and "error" message types. The iframe is recreated after each run to reset JVM state.

**TLA+ syntax highlighting** (`src/lib/tlaplus-lang.ts`): Custom CodeMirror language mode supporting both `.tla` specs and `.cfg` configs, with nested block comments (`(* *)`).

## Conventions

- **Lesson registration**: Intro lessons use the explicit filename list in `src/content/intro/index.ts`; BlockingQueue lessons are automatically discovered and sorted by filename. Keep slugs unique within each section.
- **Runnable examples**: Every lesson with a spec/config declares `expect: success` or `expect: violation` and explains the expected result. Keep default models practical for the browser. `npm run test:e2e` exercises them through CheerpJ.
- **BlockingQueue provenance**: Match each lesson to its historical upstream tutorial step and document browser-specific omissions or adaptations. Do not substitute the latest fixed implementation into the introductory buggy example.
- **`@/` path alias**: Configured in tsconfig and jest for imports from `src/`.
- **No SSR for CodeEditor**: The `CodeEditor` component is loaded with `dynamic(() => import(...), { ssr: false })` because CodeMirror requires browser APIs.
- **Tests validate content integrity**: `__tests__/lessons.test.ts` checks lesson counts, unique slugs, non-empty spec/cfg, and correct section assignments. Update expected counts when adding/removing lessons.
- **Styling**: Tailwind CSS with default config.
