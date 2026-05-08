/**
 * Simplified Bluetooth Printing for Thermal Receipt Printers
 * Works on Android Chrome without needing print server
 */

// ESC/POS Commands for thermal printers
const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  INIT: [ESC, 0x40], // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  FEED_LINES: (n: number) => [ESC, 0x64, n], // Feed n lines
  FEED_AND_CUT: [ESC, 0x69], // Feed and cut (if supported)
  CUT_PAPER: [GS, 0x56, 0x00], // Full cut (if supported)
  PARTIAL_CUT: [GS, 0x56, 0x01], // Partial cut
};

/**
 * Convert text to bytes for thermal printer
 */
function textToBytes(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

/**
 * Print to Bluetooth thermal printer
 * This function handles the low-level Bluetooth communication
 */
export async function printToBluetoothPrinter(
  content: string,
  deviceId?: string
): Promise<void> {
  try {
    let device: BluetoothDevice | undefined;

    // Try to reconnect to saved device first (no dialog!)
    if (deviceId) {
      try {
        // Get previously authorized devices
        const devices = await navigator.bluetooth.getDevices();
        device = devices.find(d => d.id === deviceId);
        
        if (!device) {
          console.log('Saved device not found in authorized devices');
          // Device not found, will need to pair again
          throw new Error("Device not found");
        }
        
        console.log(`Found saved device: ${device.name || device.id}`);
      } catch (error) {
        console.error('Error getting saved device:', error);
        // Fall through to request new device
      }
    }

    // If no saved device or couldn't reconnect, request new one
    if (!device) {
      console.log('Requesting new Bluetooth device...');
      device = await requestBluetoothDevice();
      
      // Save the new device ID
      try {
        const config = localStorage.getItem("printerConfig");
        if (config) {
          const parsed = JSON.parse(config);
          parsed.deviceId = device.id;
          parsed.deviceName = device.name || "Bluetooth Printer";
          localStorage.setItem("printerConfig", JSON.stringify(parsed));
        }
      } catch {
        // Ignore save errors
      }
    }

    // Connect to device
    console.log('Connecting to GATT server...');
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Failed to connect to printer");
    }

    console.log('Connected! Finding printer characteristic...');
    
    // Try to find the correct service and characteristic
    const { service, characteristic } = await findPrinterCharacteristic(server);

    console.log('Found characteristic, initializing printer...');

    // Initialize printer
    await characteristic.writeValue(new Uint8Array(COMMANDS.INIT));
    await sleep(100);

    // Add space at top (5 blank lines to separate from previous receipt)
    await characteristic.writeValue(new Uint8Array(COMMANDS.FEED_LINES(5)));
    await sleep(100);

    console.log('Printing content...');

    // Print content line by line
    const lines = content.split('\n');
    for (const line of lines) {
      const data = textToBytes(line + '\n');
      await characteristic.writeValue(data);
      await sleep(50); // Small delay between lines
    }

    console.log('Adding paper feed...');

    // Add space at bottom (10 lines for easy tearing and to see full receipt)
    await characteristic.writeValue(new Uint8Array(COMMANDS.FEED_LINES(10)));
    await sleep(300);

    // Try to cut paper (some printers don't support this)
    try {
      await characteristic.writeValue(new Uint8Array(COMMANDS.PARTIAL_CUT));
      await sleep(200);
    } catch {
      // Ignore if cut not supported
    }

    // Disconnect
    server.disconnect();

    console.log('✅ Printed successfully via Bluetooth');
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw error;
  }
}

/**
 * Request Bluetooth device from user
 */
async function requestBluetoothDevice(): Promise<BluetoothDevice> {
  return await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb", // Common thermal printer
      "49535343-fe7d-4ae5-8fa9-9fafd205e455", // HM-10 / CC41-A
      "0000ff00-0000-1000-8000-00805f9b34fb", // Generic serial
    ],
  });
}

/**
 * Find the correct service and characteristic for printing
 * Different printers use different UUIDs, so we try multiple options
 */
async function findPrinterCharacteristic(
  server: BluetoothRemoteGATTServer
): Promise<{ service: BluetoothRemoteGATTService; characteristic: BluetoothRemoteGATTCharacteristic }> {
  // Common printer service/characteristic UUIDs
  const serviceUUIDs = [
    "000018f0-0000-1000-8000-00805f9b34fb",
    "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    "0000ff00-0000-1000-8000-00805f9b34fb",
  ];

  const characteristicUUIDs = [
    "00002af1-0000-1000-8000-00805f9b34fb",
    "49535343-8841-43f4-a8d4-ecbe34729bb3",
    "0000ff01-0000-1000-8000-00805f9b34fb",
  ];

  // Try each service
  for (const serviceUUID of serviceUUIDs) {
    try {
      const service = await server.getPrimaryService(serviceUUID);
      
      // Try each characteristic
      for (const charUUID of characteristicUUIDs) {
        try {
          const characteristic = await service.getCharacteristic(charUUID);
          
          // Check if characteristic supports write
          if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) {
            return { service, characteristic };
          }
        } catch {
          // Try next characteristic
          continue;
        }
      }
    } catch {
      // Try next service
      continue;
    }
  }

  throw new Error(
    "Could not find printer service. Make sure your printer is a thermal receipt printer with Bluetooth support."
  );
}

/**
 * Helper function to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if Bluetooth is available
 */
export function isBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Get saved Bluetooth device ID from localStorage
 */
export function getSavedBluetoothDevice(): string | null {
  try {
    const config = localStorage.getItem("printerConfig");
    if (config) {
      const parsed = JSON.parse(config);
      if (parsed.printerType === "bluetooth" && parsed.deviceId) {
        return parsed.deviceId;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}
