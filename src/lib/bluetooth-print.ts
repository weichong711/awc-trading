// src/utils/bluetoothPrinter.ts

export async function printReceipt(receiptData: Uint8Array) {
  try {
    // 1. Request the device using your specific Service UUID
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['0000ff00-0000-1000-8000-00805f9b34fb'] }]
    });

    // 2. Connect to the GATT Server
    const server = await device.gatt?.connect();
    if (!server) throw new Error("Could not connect to GATT Server");

    // 3. Access the service and the WRITE characteristic
    const service = await server.getPrimaryService('0000ff00-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('0000ff02-0000-1000-8000-00805f9b34fb');

    // 4. Send the data in chunks (512 bytes is a safe limit for BLE)
    const CHUNK_SIZE = 512;
    for (let i = 0; i < receiptData.length; i += CHUNK_SIZE) {
      const chunk = receiptData.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
    }

    // 5. Clean up connection
    device.gatt?.disconnect();
    console.log("Receipt printed successfully!");
    return true;

  } catch (error) {
    console.error("Bluetooth printing failed:", error);
    return false;
  }
}

// A simple ESC/POS formatter function
export function formatReceiptData(cartItems: any[], total: number): Uint8Array {
  const encoder = new TextEncoder();
  let receipt = "\x1B\x40"; // Initialize printer
  
  receipt += "\x1B\x61\x01" + "SME-Sync POS\n\n" + "\x1B\x61\x00"; 
  receipt += "--------------------------------\n";
  
  cartItems.forEach(item => {
    receipt += `${item.name} x${item.quantity}   RM${item.price.toFixed(2)}\n`;
  });
  
  receipt += "--------------------------------\n";
  receipt += "\x1B\x61\x01" + `TOTAL: RM${total.toFixed(2)}\n\n\n\n`; 
  
  return encoder.encode(receipt);
}
