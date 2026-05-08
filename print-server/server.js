// Simple Print Server for Silent Printing
// Run this on your local computer to enable direct printing

const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');

const app = express();
const PORT = 3001;

// Enable CORS for your web app
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Print server is running' });
});

// Print to COM7 (Serial Port)
app.post('/print/serial', async (req, res) => {
  try {
    const { content, port = 'COM7', baudRate = 9600 } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    // Open serial port
    const serialPort = new SerialPort({
      path: port,
      baudRate: baudRate,
    });

    // Wait for port to open
    serialPort.on('open', () => {
      // Send content to printer
      serialPort.write(content, (err) => {
        if (err) {
          console.error('Write error:', err);
          return res.status(500).json({ 
            error: 'Print failed', 
            message: err.message 
          });
        }

        // Add paper feed (6 lines for easy tearing)
        serialPort.write('\n\n\n\n\n\n', (err) => {
          if (err) {
            console.error('Feed error:', err);
          }

          // Close port
          serialPort.close();
          
          res.json({ 
            success: true, 
            message: 'Printed successfully to ' + port 
          });
        });
      });
    });

    // Handle errors
    serialPort.on('error', (err) => {
      console.error('Serial port error:', err);
      res.status(500).json({ 
        error: 'Print failed', 
        message: err.message 
      });
    });

  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ 
      error: 'Print failed', 
      message: error.message 
    });
  }
});

// Print HTML content (converts to text)
app.post('/print/html', async (req, res) => {
  try {
    const { html, port = 'COM7' } = req.body;
    
    if (!html) {
      return res.status(400).json({ error: 'No HTML provided' });
    }

    // Strip HTML tags and print as text
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    
    // Open serial port
    const serialPort = new SerialPort({
      path: port,
      baudRate: 9600,
    });

    serialPort.on('open', () => {
      serialPort.write(text, (err) => {
        if (err) {
          return res.status(500).json({ 
            error: 'Print failed', 
            message: err.message 
          });
        }

        // Add paper feed
        serialPort.write('\n\n\n\n\n\n', () => {
          serialPort.close();
          res.json({ 
            success: true, 
            message: 'Printed successfully' 
          });
        });
      });
    });

    serialPort.on('error', (err) => {
      res.status(500).json({ 
        error: 'Print failed', 
        message: err.message 
      });
    });

  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({ 
      error: 'Print failed', 
      message: error.message 
    });
  }
});

// List available serial ports
app.get('/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json({ 
      ports: ports.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer,
        serialNumber: p.serialNumber,
        pnpId: p.pnpId,
        locationId: p.locationId,
        productId: p.productId,
        vendorId: p.vendorId,
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to list ports', 
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🖨️  Print Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready to receive print jobs`);
  console.log(`🔌 Default port: COM7`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health          - Check server status`);
  console.log(`  GET  /ports           - List available serial ports`);
  console.log(`  POST /print/serial    - Print to serial port (COM7)`);
  console.log(`  POST /print/html      - Print HTML content`);
});
