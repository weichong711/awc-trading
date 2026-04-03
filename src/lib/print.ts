/// <reference types="vite/client" />
import printFrameCss from "../styles/print-frame.css?raw";

export type PrintTarget = "receipt" | "analytics";

function buildPrintHtml(title: string, bodyHtml: string) {
  // Use an inline script so the new window/iframe prints ONLY after layout.
  // Some mobile browsers show a blank tab if `print()` is called too early.
  const script = `
    (function () {
      function doPrint() {
        try {
          window.focus();
        } catch {}
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            try {
              window.print();
            } catch {}
          });
        });
      }
      if (document.readyState === "complete") doPrint();
      else window.addEventListener("load", doPrint, { once: true });
    })();
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=80mm, initial-scale=1"/>
<title>${title}</title>
<style>${printFrameCss}</style>
</head>
<body>
<div class="receipt-root">${bodyHtml}</div>
<script>${script}<\/script>
</body>
</html>`;
}

/**
 * Print a DOM node by id inside a **minimal iframe** that contains only:
 * - Embedded 80mm receipt CSS (no main-app Tailwind)
 * - Cloned receipt HTML
 *
 * This avoids blank multi-page output from:
 * - `window.print()` on the full SPA (visibility hacks + min-height layout)
 * - Copying all parent stylesheets into an iframe (conflicting rules / extra pages)
 *
 * Used for **all** platforms (Android, iOS, tablets, desktop).
 */
export function printElementById(id: string, target: PrintTarget) {
  const el = document.getElementById(id);
  if (!el) return;

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.removeAttribute("hidden");

  const title = target === "receipt" ? "Receipt" : "Analytics summary";
  const html = buildPrintHtml(title, clone.outerHTML);

  // Prefer a new window/tab for mobile printing: many Android browsers ignore iframe-print
  // and end up printing the whole SPA (background UI included).
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (w && w.document) {
    try {
      w.document.open();
      w.document.write(html);
      w.document.close();

      const cleanup = () => {
        w.removeEventListener("afterprint", cleanup);
        w.close();
      };
      w.addEventListener("afterprint", cleanup, { once: true });
      // Printing is triggered inside the child document after load/layout.
      return;
    } catch {
      // If anything fails (or popup is restricted), fall back to iframe.
      try {
        w.close();
      } catch {
        // ignore
      }
    }
  }

  // Fallback: minimal hidden iframe print (works well on desktop / iOS Safari).
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute(
    "title",
    target === "receipt" ? "Print receipt" : "Print summary",
  );
  iframe.style.cssText =
    "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  frameDoc.body.getBoundingClientRect();

  const cleanup = () => {
    frameWin.removeEventListener("afterprint", cleanup);
    iframe.remove();
  };
  frameWin.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(() => {
    if (iframe.parentNode) iframe.remove();
  }, 8000);
  // Printing is triggered inside the iframe document after load/layout.
}
