/// <reference types="vite/client" />
import printCss from "../styles/print.css?raw";

export type PrintTarget = "receipt" | "analytics";

function copyHeadStyles(fromDoc: Document, toDoc: Document) {
  const nodes = Array.from(
    fromDoc.head.querySelectorAll('style, link[rel="stylesheet"]'),
  );
  for (const n of nodes) {
    toDoc.head.insertAdjacentHTML("beforeend", (n as HTMLElement).outerHTML);
  }
}

/**
 * Print a DOM node by id inside a hidden iframe.
 *
 * Important for Android Chrome / tablets: `print()` must run in the **same
 * synchronous turn** as the user's tap. Any `await` / delayed `print()` can
 * look like "Chrome flashes and exits" or a blank preview.
 */
export function printElementById(id: string, target: PrintTarget) {
  const el = document.getElementById(id);
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  // Avoid 0×0 iframes — some WebViews behave badly; keep off-screen instead.
  iframe.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;z-index:-1";

  document.body.appendChild(iframe);

  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument;
  if (!frameWin || !frameDoc) {
    iframe.remove();
    return;
  }

  frameDoc.open();
  frameDoc.write("<!doctype html><html><head></head><body></body></html>");
  frameDoc.close();

  // Receipt print rules (no network wait — avoids async gap before print()).
  const style = frameDoc.createElement("style");
  style.textContent = printCss;
  frameDoc.head.appendChild(style);

  copyHeadStyles(document, frameDoc);

  frameDoc.body.className =
    target === "receipt"
      ? "print-target-receipt"
      : "print-target-analytics";

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  frameDoc.body.appendChild(clone);

  frameDoc.body.getBoundingClientRect();

  frameWin.focus();
  frameWin.print();

  const cleanup = () => {
    frameWin.removeEventListener("afterprint", cleanup);
    iframe.remove();
  };
  frameWin.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 3000);
}
