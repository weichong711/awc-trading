/// <reference types="vite/client" />
import printFrameCss from "../styles/print-frame.css?raw";

export type PrintTarget = "receipt" | "analytics";

function buildPrintHtml(title: string, bodyHtml: string) {
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
</body>
</html>`;
}

function printWhenReady(win: Window) {
  try {
    win.focus();
  } catch {
    // ignore
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        win.print();
      } catch {
        // ignore
      }
    });
  });
}

/**
 * Print a DOM node by id using a **minimal document** (no main-app Tailwind):
 * - Prefer `Blob` URL + new tab (mobile Chrome often prints the SPA if we print the main window).
 * - Do **not** use `noopener` on `window.open` — with `noopener`, many browsers return `null`
 *   to the opener, so `document.write` never runs and the user only sees `about:blank`.
 * - Fallback: hidden iframe print.
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

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const w = window.open(blobUrl, "_blank");
  if (w) {
    const revoke = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {
        // ignore
      }
    };

    const cleanup = () => {
      revoke();
      try {
        w.close();
      } catch {
        // ignore
      }
    };

    w.addEventListener("afterprint", () => cleanup(), { once: true });
    window.setTimeout(() => {
      if (!w.closed) {
        revoke();
      }
    }, 60_000);

    const startPrint = () => {
      printWhenReady(w);
    };

    if (w.document.readyState === "complete") {
      startPrint();
    } else {
      w.addEventListener("load", startPrint, { once: true });
    }

    return;
  }

  URL.revokeObjectURL(blobUrl);

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

  if (frameDoc.readyState === "complete") {
    printWhenReady(frameWin);
  } else {
    frameWin.addEventListener("load", () => printWhenReady(frameWin), {
      once: true,
    });
  }
}
