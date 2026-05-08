/// <reference types="vite/client" />
import printFrameCss from "../styles/print-frame.css?raw";
import { printToBluetoothPrinter, getSavedBluetoothDevice } from "./bluetooth-print";
import { formatReceiptForThermal } from "./thermal-format";
import { toast } from "sonner";

export type PrintTarget = "receipt" | "analytics" | "stock-report";

interface PrintConfig {
  paperWidth?: number; // in mm
  printerType?: "browser" | "bluetooth" | "network" | "serial";
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
  const attemptPrint = () => {
    try {
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print attempt failed:", e);
    }
  };

  attemptPrint();
  setTimeout(() => attemptPrint(), 100);
  setTimeout(() => attemptPrint(), 500);
}

async function printToBluetooth(deviceId: string | undefined, content: string): Promise<void> {
  try {
    await printToBluetoothPrinter(content, deviceId);
  } catch (error) {
    console.error("Bluetooth print error:", error);
    throw new Error("Failed to print to Bluetooth printer");
  }
}

/**
 * Print a DOM node by id - CLOUD/VERCEL COMPATIBLE
 * Works with Bluetooth printing (no server needed!)
 * Also supports browser print dialog as fallback
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
      finalConfig = { paperWidth: 80, printerType: "browser" };
    }
  }

  // Format content for thermal printer
  const thermalContent = formatReceiptForThermal(el);

  // BLUETOOTH PRINTING (Works on Vercel/cloud!)
  if (finalConfig.printerType === "bluetooth") {
    try {
      toast.loading("Connecting to Bluetooth printer...", { id: "print-status" });
      await printToBluetooth(finalConfig.deviceId, thermalContent);
      toast.success("✅ Printed successfully!", { id: "print-status" });
      return;
    } catch (error) {
      console.error('Bluetooth printing failed:', error);
      toast.error("Bluetooth printing failed. Check printer connection.", { id: "print-status" });
      return;
    }
  }

  // BROWSER PRINT (Works everywhere, shows dialog)
  console.log('Using browser print');
  
  const clone = el.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.removeAttribute("hidden");

  const paperWidth = finalConfig.paperWidth || 80;
  const title = target === "receipt" ? "Receipt" : target === "stock-report" ? "Stock Report" : "Analytics summary";

  const html = buildPrintHtml(title, clone.outerHTML, paperWidth);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  const w = window.open(blobUrl, "_blank");
  if (w) {
    w.onload = () => {
      setTimeout(() => {
        printWhenReady(w);
      }, 250);
    };
    
    const revoke = () => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    };

    const cleanup = () => {
      revoke();
      try {
        w.close();
      } catch {}
    };

    w.addEventListener("afterprint", () => cleanup(), { once: true });
    
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
      setTimeout(() => {
        printWhenReady(w);
      }, 250);
    };

    if (w.document.readyState === "complete") {
      startPrint();
    } else {
      w.addEventListener("load", startPrint, { once: true });
      w.addEventListener("DOMContentLoaded", startPrint, { once: true });
    }

    return;
  }

  URL.revokeObjectURL(blobUrl);

  // Fallback to iframe
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", target === "receipt" ? "Print receipt" : "Print summary");
  iframe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1";
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
    frameWin.addEventListener("load", () => printWhenReady(frameWin), { once: true });
  }
}
