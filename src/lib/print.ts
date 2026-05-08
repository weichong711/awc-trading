/// <reference types="vite/client" />
import printFrameCss from "../styles/print-frame.css?raw";
import { printToBluetoothPrinter, getSavedBluetoothDevice } from "./bluetooth-print";

export type PrintTarget = "receipt" | "analytics" | "stock-report";

interface PrintConfig {
  paperWidth?: number; // in mm
  printerType?: "browser" | "bluetooth" | "network";
  deviceId?: string; // Bluetooth device ID
  networkIp?: string; // IP address for network printer
  networkPort?: number; // Port for network printer (default 9100)
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
  // Multiple attempts to ensure print dialog opens
  const attemptPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print attempt failed:", e);
    }
  };

  // Try immediately
  attemptPrint();

  // Try again after a short delay (for slower browsers)
  setTimeout(() => attemptPrint(), 100);
  
  // Final attempt after content is fully loaded
  setTimeout(() => attemptPrint(), 500);
}

/**
 * Print to Bluetooth receipt printer using ESC/POS commands
 */
async function printToBluetooth(deviceId: string | undefined, content: string): Promise<void> {
  try {
    await printToBluetoothPrinter(content, deviceId);
  } catch (error) {
    console.error("Bluetooth print error:", error);
    throw new Error("Failed to print to Bluetooth printer");
  }
}

/**
 * Print a DOM node by id using a **minimal document** (no main-app Tailwind):
 * - First tries silent printing via print server (no dialog, no new tab)
 * - Falls back to browser print if print server is not available
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
          deviceId: savedConfig.deviceId,
          networkIp: savedConfig.networkIp,
          networkPort: savedConfig.networkPort || 9100,
        };
      }
    } catch {
      // Use defaults
      finalConfig = { paperWidth: 80, printerType: "browser" };
    }
  }

  // Get text content for printing
  const content = el.innerText || el.textContent || '';

  // Try Bluetooth printing first if configured
  if (finalConfig.printerType === "bluetooth") {
    try {
      await printToBluetooth(finalConfig.deviceId, content);
      console.log('✅ Printed via Bluetooth');
      return; // Success!
    } catch (error) {
      console.error('Bluetooth printing failed:', error);
      // Fall through to other methods
    }
  }

  // Try network printing if configured
  if (finalConfig.printerType === "network" && finalConfig.networkIp) {
    try {
      const printServerAvailable = await fetch('http://localhost:3001/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      }).then(res => res.ok).catch(() => false);

      if (printServerAvailable) {
        const response = await fetch('http://localhost:3001/print/network', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            ip: finalConfig.networkIp,
            port: finalConfig.networkPort || 9100,
          }),
        });

        if (response.ok) {
          console.log(`✅ Printed to network printer ${finalConfig.networkIp}`);
          return; // Success!
        } else {
          const error = await response.json();
          console.error('Network print failed:', error);
        }
      }
    } catch (error) {
      console.log('Network printing failed, falling back to browser print:', error);
    }
  }

  // Try serial port printing (COM7) if print server is available
  try {
    const printServerAvailable = await fetch('http://localhost:3001/health', {
      method: 'GET',
      signal: AbortSignal.timeout(1000), // 1 second timeout
    }).then(res => res.ok).catch(() => false);

    if (printServerAvailable && finalConfig.printerType !== "network" && finalConfig.printerType !== "bluetooth") {
      const response = await fetch('http://localhost:3001/print/serial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          port: 'COM7',
          baudRate: 9600,
        }),
      });

      if (response.ok) {
        console.log('✅ Printed silently via print server');
        return; // Success! No dialog, no new tab
      }
    }
  } catch (error) {
    console.log('Print server not available, falling back to browser print');
  }

  // Fallback to browser print if all else failed
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.removeAttribute("hidden");

  const paperWidth = finalConfig.paperWidth || 80;
  const title = target === "receipt" ? "Receipt" : target === "stock-report" ? "Stock Report" : "Analytics summary";

  // Browser print - auto-trigger print dialog
  const html = buildPrintHtml(title, clone.outerHTML, paperWidth);

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const w = window.open(blobUrl, "_blank");
  if (w) {
    // Set onload handler immediately
    w.onload = () => {
      setTimeout(() => {
        printWhenReady(w);
      }, 250);
    };
    
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
    
    // Also cleanup if window is closed manually
    const checkClosed = setInterval(() => {
      if (w.closed) {
        clearInterval(checkClosed);
        revoke();
      }
    }, 1000);
    
    window.setTimeout(() => {
      clearInterval(checkClosed);
      if (!w.closed) {
        revoke();
      }
    }, 60_000);

    const startPrint = () => {
      // Wait a bit for content to render, then trigger print
      setTimeout(() => {
        printWhenReady(w);
      }, 250); // Small delay to ensure content is rendered
    };

    // Try to print as soon as possible
    if (w.document.readyState === "complete") {
      startPrint();
    } else {
      w.addEventListener("load", startPrint, { once: true });
      // Fallback: also try after DOMContentLoaded
      w.addEventListener("DOMContentLoaded", startPrint, { once: true });
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
