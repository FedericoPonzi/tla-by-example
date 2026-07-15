import type { Page } from "@playwright/test";

/**
 * Drives the real in-browser TLC worker (`public/tlc-worker.html`) — the same
 * CheerpJ runtime + jar the app uses — from within the app origin.
 *
 * `page` must already be navigated to the app (e.g. `await page.goto("/")`) so
 * that the worker iframe is same-origin. Returns the raw TLC output string.
 *
 * A fresh Playwright page should be used per call: CheerpJ does not reliably
 * support many runtime initialisations within a single page.
 */
export async function runTlcInBrowser(page: Page, spec: string, cfg: string): Promise<string> {
  return page.evaluate(
    ({ spec, cfg }) =>
      new Promise<string>((resolve) => {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        let done = false;
        function onMsg(ev: MessageEvent) {
          if (ev.source !== iframe.contentWindow) return; // ignore the app's own worker
          const d = ev.data;
          if (!d || !d.type) return;
          if (d.type === "ready") {
            iframe.contentWindow!.postMessage(
              { type: "run", spec, cfg, workers: 1, checkDeadlock: true, extraModules: [] },
              "*",
            );
          } else if (d.type === "result") {
            if (done) return;
            done = true;
            window.removeEventListener("message", onMsg);
            iframe.remove();
            resolve(d.output as string);
          } else if (d.type === "error") {
            if (done) return;
            done = true;
            window.removeEventListener("message", onMsg);
            iframe.remove();
            resolve("INIT ERROR: " + d.message);
          }
        }
        window.addEventListener("message", onMsg);
        iframe.src = "/tlc-worker.html";
        document.body.appendChild(iframe);
      }),
    { spec, cfg },
  );
}

/** Classify a raw TLC output string into the outcome dimensions the suite asserts on. */
export function classifyTlcOutput(output: string): { violated: boolean; completed: boolean } {
  return {
    // A counterexample: an invariant/property violation or a deadlock.
    violated: /is violated|Deadlock reached/.test(output),
    // A clean, exhaustive exploration with no error.
    completed: /Model checking completed/.test(output),
  };
}
