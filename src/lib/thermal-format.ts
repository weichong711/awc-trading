/**
 * Format receipt content for thermal printers
 * Converts HTML-style receipt to plain text with proper formatting
 */

const PAPER_WIDTH = 32; // Characters per line for 58mm paper

/**
 * Center text within paper width
 */
function centerText(text: string): string {
  const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Create a line of dashes
 */
function dashedLine(): string {
  return '-'.repeat(PAPER_WIDTH);
}

/**
 * Format text to fit within two columns
 */
function twoColumns(left: string, right: string): string {
  const maxLeft = PAPER_WIDTH - right.length - 1;
  const leftTrimmed = left.length > maxLeft ? left.substring(0, maxLeft) : left;
  const spaces = PAPER_WIDTH - leftTrimmed.length - right.length;
  return leftTrimmed + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * Format receipt for thermal printer
 * Takes HTML element and returns formatted plain text
 */
export function formatReceiptForThermal(element: HTMLElement): string {
  // Get all text content
  const text = element.innerText || element.textContent || '';
  
  console.log('=== THERMAL FORMATTER DEBUG ===');
  console.log('Raw text:', text);
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  console.log('Parsed lines:', lines);
  
  let output: string[] = [];
  
  // Parse the receipt data
  let businessName = '';
  let username = '';
  let phone = '';
  let email = '';
  let receiptNo = '';
  let date = '';
  let time = '';
  let items: Array<{ name: string; details: string; total: string }> = [];
  let subtotal = '';
  let discount = '';
  let total = '';
  let payment = '';
  let cashReceived = '';
  let change = '';
  
  let inItems = false;
  let currentItemName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    console.log(`Line ${i}: "${line}"`);
    
    // Skip headers
    if (line === 'OFFICIAL RECEIPT' || line === 'RECEIPT') {
      continue;
    }
    
    // Business name (usually first non-header line)
    if (!businessName && !line.includes(':') && !line.includes('RECEIPT') && i < 5) {
      businessName = line;
      console.log('Found business name:', businessName);
      continue;
    }
    
    // Extract fields with colons
    if (line.includes(':')) {
      const parts = line.split(':');
      const key = parts[0].trim().toLowerCase();
      const value = parts.slice(1).join(':').trim();
      
      if (key.includes('username')) {
        username = value;
        console.log('Found username:', username);
      } else if (key.includes('phone')) {
        phone = value;
        console.log('Found phone:', phone);
      } else if (key.includes('email')) {
        email = value;
        console.log('Found email:', email);
      } else if (key.includes('receipt')) {
        receiptNo = value.replace('#', '');
        console.log('Found receipt no:', receiptNo);
      } else if (key.includes('date')) {
        date = value;
        console.log('Found date:', date);
      } else if (key.includes('time')) {
        time = value;
        console.log('Found time:', time);
      } else if (key.includes('subtotal')) {
        subtotal = value;
        inItems = false;
        console.log('Found subtotal:', subtotal);
      } else if (key.includes('total') && !key.includes('subtotal')) {
        total = value;
        console.log('Found total:', total);
      } else if (key.includes('payment')) {
        payment = value;
        console.log('Found payment:', payment);
      } else if (key.includes('cash') && key.includes('received')) {
        cashReceived = value;
        console.log('Found cash received:', cashReceived);
      } else if (key.includes('change')) {
        change = value;
        console.log('Found change:', change);
      }
    }
    
    // Items section
    if (line === 'ITEMS' || line.toLowerCase().includes('items')) {
      inItems = true;
      console.log('Entering ITEMS section');
      continue;
    }
    
    // Parse items
    if (inItems) {
      // Check if this is a quantity/price line (contains "x RM" or "x rm")
      if (line.match(/\d+\s+\w+\s+x\s+RM\s+[\d.]+/i)) {
        // This is the details line: "1 unit x RM 25.00 RM 25.00"
        const match = line.match(/(.*?)\s+(RM\s+[\d.]+)$/i);
        if (match && currentItemName) {
          const details = match[1].trim();
          const itemTotal = match[2].trim();
          items.push({
            name: currentItemName,
            details: details,
            total: itemTotal
          });
          console.log('Added item:', { name: currentItemName, details, total: itemTotal });
          currentItemName = '';
        }
      } else if (!line.includes(':') && !line.includes('Thank you') && !line.includes('Please come')) {
        // This is likely an item name
        currentItemName = line;
        console.log('Current item name:', currentItemName);
      }
    }
    
    // Discount
    if (line.toLowerCase().includes('discount')) {
      discount = line;
      console.log('Found discount:', discount);
    }
  }
  
  console.log('=== PARSED DATA ===');
  console.log('Business:', businessName);
  console.log('Username:', username);
  console.log('Phone:', phone);
  console.log('Email:', email);
  console.log('Receipt No:', receiptNo);
  console.log('Date:', date);
  console.log('Time:', time);
  console.log('Items:', items);
  console.log('Subtotal:', subtotal);
  console.log('Total:', total);
  console.log('Payment:', payment);
  
  // Build formatted receipt - CLEAN FORMAT
  output.push(''); // Blank line at top
  output.push(centerText(businessName || 'RECEIPT'));
  output.push(centerText('OFFICIAL RECEIPT'));
  output.push('');
  
  // Business info
  if (username) output.push(twoColumns('Username:', username));
  if (phone) output.push(twoColumns('Phone Number:', phone));
  if (email) {
    // Split long email if needed
    if (email.length > 20) {
      output.push('Email:');
      output.push('  ' + email);
    } else {
      output.push(twoColumns('Email:', email));
    }
  }
  
  output.push(dashedLine());
  
  // Receipt details
  if (receiptNo) output.push(twoColumns('Receipt No:', '#' + receiptNo));
  if (date) output.push(twoColumns('Date:', date));
  if (time) output.push(twoColumns('Time:', time));
  
  output.push(dashedLine());
  output.push('ITEMS');
  output.push('');
  
  // Items
  if (items.length > 0) {
    for (const item of items) {
      output.push(item.name);
      output.push(twoColumns('  ' + item.details, item.total));
    }
  } else {
    output.push('(No items found)');
    console.warn('WARNING: No items were parsed!');
  }
  
  output.push('');
  output.push(dashedLine());
  
  // Totals
  if (subtotal) output.push(twoColumns('Subtotal:', subtotal));
  if (discount) output.push(discount);
  if (total) {
    output.push(dashedLine());
    output.push(twoColumns('TOTAL:', total));
    output.push(dashedLine());
  }
  if (payment) output.push(twoColumns('Payment:', payment));
  if (cashReceived) output.push(twoColumns('Cash Received:', cashReceived));
  if (change) output.push(twoColumns('Change:', change));
  
  output.push('');
  output.push(centerText('Thank you for your business!'));
  output.push(centerText('Please come again'));
  output.push('');
  
  const result = output.join('\n');
  console.log('=== FORMATTED OUTPUT ===');
  console.log(result);
  console.log('=== END ===');
  
  return result;
}
