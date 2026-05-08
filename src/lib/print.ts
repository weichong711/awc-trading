/// <reference types="vite/client" />
import printFrameCss from "../styles/print-frame.css?raw";

export type PrintTarget = "receipt" | "analytics" | "stock-report";

interface PrintConfig {
  paperWidth?: number; // in mm
  printerType?: "browser" | "bluetooth";
  bluetoothDevice?: BluetoothDevice;
}

function buildPrintHtml(title: string, bodyHtml: string, paperWidth: number = 80) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=${paperWidth}mm, initial-scale=1"/>
<title>${title}</title>
<style>
${printFrameCss}
@page {
  size: ${paperWidth}mm auto;
  margin: 5mm;
}
body {
  width: ${paperWidth}mm;
  margin: 0 auto;
  font-family: 'Courier New', monospace;
}
</style>
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
 * Print to Bluetooth receipt printer using ESC/POS commands
 */
async function printToBluetooth(device: BluetoothDevice, content: string): Promise<void> {
  try {
    const server = await device.gatt?.connect();
    if (!server) throw new Error("Failed to connect to GATT server");

    // Thermal printer service UUID
    const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
    const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

    // Convert content to ESC/POS commands
    const encoder = new TextEncoder();
    
    // Initialize printer
    const init = new Uint8Array([0x1B, 0x40]); // ESC @
    await characteristic.writeValue(init);

    // Write content line by line
    const lines = content.split('\n');
    for (const line of lines) {
      const data = encoder.encode(line + '\n');
      await characteristic.writeValue(data);
    }

    // Feed paper and cut
    const feed = new Uint8Array([0x1B, 0x64, 0x03]); // ESC d 3 (feed 3 lines)
    await characteristic.writeValue(feed);

    const cut = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 (full cut)
    await characteristic.writeValue(cut);

    server.disconnect();
  } catch (error) {
    console.error("Bluetooth print error:", error);
    throw new Error("Failed to print to Bluetooth printer");
  }
}

/**
 * Print a DOM node by id using a **minimal document** (no main-app Tailwind):
 * - Prefer `Blob` URL + new tab (mobile Chrome often prints the SPA if we print the main window).
 * - Do **not** use `noopener` on `window.open` — with `noopener`, many browsers return `null`
 *   to the opener, so `document.write` never runs and the user only sees `about:blank`.
 * - Fallback: hidden iframe print.
 * - Supports custom paper width and Bluetooth printing.
 * - Auto-loads printer config from localStorage if not provided.
 */
export async function printElementById(
  id: string, 
  target: PrintTarget, 
  config?: PrintConfig
): Promise<void> {
  const el = document.getElementById(id);
  if (!el) return;

  // Load printer config from localStorage if not provided
  let finalConfig = config || {};
  if (!config) {
    try {
      const saved = localStorage.getItem("printerConfig");
      if (saved) {
        const savedConfig = JSON.parse(saved);
        finalConfig = {
          paperWidth: savedConfig.paperWidth || 80,
          printerType: savedConfig.printerType || "browser",
        };
      }
    } catch {
      // Use defaults
      finalConfig = { paperWidth: 80, printerType: "browser" };
    }
  }

  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.removeAttribute("hidden");

  const paperWidth = finalConfig.paperWidth || 80;
  const title = target === "receipt" ? "Receipt" : target === "stock-report" ? "Stock Report" : "Analytics summary";

  // If Bluetooth printer is configured, use it
  if (finalConfig.printerType === "bluetooth" && finalConfig.bluetoothDevice) {
    try {
      const textContent = clone.innerText || clone.textContent || "";
      await printToBluetooth(finalConfig.bluetoothDevice, textContent);
      return;
    } catch (error) {
      console.error("Bluetooth print failed, falling back to browser print:", error);
      // Fall through to browser print
    }
  }

  // Browser print - auto-trigger print dialog
  const html = buildPrintHtml(title, clone.outerHTML, paperWidth);

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
    target === "receipt" ? "Print receipt" : target === "stock-report" ? "Print stock report" : "Print summary",
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
