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

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Print using the main document (no iframe).
 * Prefer this on **Android** — printing from a hidden iframe can crash or
 * force-close Chrome on some devices (e.g. Xiaomi / MIUI tablets).
 */
function printMainWindow(target: PrintTarget) {
  document.body.classList.remove(
    "print-target-receipt",
    "print-target-analytics",
  );
  document.body.classList.add(
    target === "receipt"
      ? "print-target-receipt"
      : "print-target-analytics",
  );

  const cleanup = () => {
    document.body.classList.remove(
      "print-target-receipt",
      "print-target-analytics",
    );
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 2000);

  document.body.getBoundingClientRect();
  window.focus();
  window.print();
}

/**
 * Print a DOM node by id inside a hidden iframe (better for some iOS/Safari
 * cases where main-window print previews look blank).
 */
function printViaIframe(id: string, target: PrintTarget) {
  const el = document.getElementById(id);
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
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

/**
 * `print()` must stay synchronous with the user's tap — no `await` before it.
 *
 * - **Android**: use main-window print (avoids Chrome/MIUI iframe crashes).
 * - **Other platforms**: iframe print (often better iOS preview).
 */
export function printElementById(id: string, target: PrintTarget) {
  if (!document.getElementById(id)) return;

  if (isAndroid()) {
    printMainWindow(target);
    return;
  }

  printViaIframe(id, target);
}
