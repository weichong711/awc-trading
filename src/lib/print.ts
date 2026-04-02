export type PrintTarget = "receipt" | "analytics";

function copyHeadStyles(fromDoc: Document, toDoc: Document) {
  const nodes = Array.from(
    fromDoc.head.querySelectorAll('style, link[rel="stylesheet"]'),
  );
  for (const n of nodes) {
    // Some browsers may block adopting nodes across documents; clone instead.
    toDoc.head.insertAdjacentHTML("beforeend", (n as HTMLElement).outerHTML);
  }
}

function waitForStylesheetLoad(doc: Document, timeoutMs: number) {
  return new Promise<void>((resolve) => {
    const links = Array.from(
      doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    );
    if (links.length === 0) {
      resolve();
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const t = window.setTimeout(finish, timeoutMs);
    let remaining = links.length;

    for (const link of links) {
      const onDone = () => {
        remaining -= 1;
        if (remaining <= 0) {
          window.clearTimeout(t);
          finish();
        }
      };
      link.addEventListener("load", onDone, { once: true });
      link.addEventListener("error", onDone, { once: true });
    }
  });
}

export async function printElementById(id: string, target: PrintTarget) {
  const el = document.getElementById(id);
  if (!el) return;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-1";

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

  copyHeadStyles(document, frameDoc);
  frameDoc.body.className = target === "receipt" ? "print-target-receipt" : "print-target-analytics";

  // Clone the printable node into the iframe.
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  frameDoc.body.appendChild(clone);

  // Allow styles to load + layout to settle before printing.
  await waitForStylesheetLoad(frameDoc, 1200);
  frameDoc.body.getBoundingClientRect();

  // Keep print call synchronous with the user gesture as much as possible.
  // (This function should be invoked directly in the click handler.)
  frameWin.focus();
  frameWin.print();

  // Cleanup after printing (some mobile browsers never fire afterprint).
  const cleanup = () => {
    frameWin.removeEventListener("afterprint", cleanup);
    iframe.remove();
  };
  frameWin.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 2000);
}

