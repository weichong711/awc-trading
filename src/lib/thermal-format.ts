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
 * Create a line of equals
 */
function doubleLine(): string {
  return '='.repeat(PAPER_WIDTH);
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
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
  let currentItem: { name: string; details: string; total: string } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Business name (first line, usually)
    if (i === 0 && !line.includes(':') && !line.includes('RECEIPT')) {
      businessName = line;
      continue;
    }
    
    // Skip "OFFICIAL RECEIPT" header
    if (line.includes('OFFICIAL RECEIPT')) continue;
    
    // Extract fields
    if (line.startsWith('Username:')) {
      username = line.replace('Username:', '').trim();
    } else if (line.startsWith('Phone Number:')) {
      phone = line.replace('Phone Number:', '').trim();
    } else if (line.startsWith('Email:')) {
      email = line.replace('Email:', '').trim();
    } else if (line.includes('Receipt No')) {
      receiptNo = line.split(/[:#]/).pop()?.trim() || '';
    } else if (line.startsWith('Date:')) {
      date = line.replace('Date:', '').trim();
    } else if (line.startsWith('Time')) {
      time = line.replace(/^Time[:\s]*/, '').trim();
    } else if (line === 'ITEMS' || line.includes('ITEMS')) {
      inItems = true;
    } else if (line.startsWith('Subtotal:')) {
      inItems = false;
      subtotal = line.replace('Subtotal:', '').trim();
    } else if (line.includes('Discount')) {
      discount = line;
    } else if (line.startsWith('TOTAL:')) {
      total = line.replace('TOTAL:', '').trim();
    } else if (line.startsWith('Payment')) {
      payment = line.replace(/^Payment[:\s]*/, '').trim();
    } else if (line.includes('Cash Received') || line.includes('Tendered')) {
      cashReceived = line.split(':').pop()?.trim() || '';
    } else if (line.includes('Change:')) {
      change = line.split(':').pop()?.trim() || '';
    } else if (inItems && line.length > 0) {
      // Check if this is an item detail line (contains "x RM" or "x rm")
      if (line.includes(' x RM ') || line.includes(' x rm ')) {
        // This is the quantity/price line
        // Format: "1 unit x RM 25.00 RM 25.00"
        const parts = line.split(/RM\s+/i);
        const qtyPart = parts[0]?.trim() || '';
        const totalPart = parts[parts.length - 1]?.trim() || '';
        
        if (currentItem) {
          currentItem.details = qtyPart;
          currentItem.total = 'RM ' + totalPart;
          items.push(currentItem);
          currentItem = null;
        }
      } else if (!line.includes('Thank you') && !line.includes('Please come')) {
        // This is likely an item name
        currentItem = { name: line, details: '', total: '' };
      }
    }
  }
  
  // Build formatted receipt
  output.push(''); // Blank line at top
  output.push(centerText(businessName || 'RECEIPT'));
  output.push('');
  output.push(centerText('OFFICIAL RECEIPT'));
  output.push(doubleLine());
  
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
  
  output.push(doubleLine());
  
  // Receipt details
  if (receiptNo) output.push(twoColumns('Receipt No:', '#' + receiptNo));
  if (date) output.push(twoColumns('Date:', date));
  if (time) output.push(twoColumns('Time:', time));
  
  output.push(doubleLine());
  output.push('ITEMS');
  output.push(dashedLine());
  
  // Items
  for (const item of items) {
    if (item.name) {
      output.push(item.name);
      if (item.details && item.total) {
        output.push(twoColumns('  ' + item.details, item.total));
      }
    }
  }
  
  output.push(dashedLine());
  
  // Totals
  if (subtotal) output.push(twoColumns('Subtotal:', subtotal));
  if (discount) output.push(discount);
  if (total) {
    output.push(doubleLine());
    output.push(twoColumns('TOTAL:', total));
    output.push(doubleLine());
  }
  if (payment) output.push(twoColumns('Payment:', payment));
  if (cashReceived) output.push(twoColumns('Cash Received:', cashReceived));
  if (change) output.push(twoColumns('Change:', change));
  
  output.push('');
  output.push(dashedLine());
  output.push('');
  output.push(centerText('Thank you for your business!'));
  output.push(centerText('Please come again'));
  output.push('');
  output.push(dashedLine());
  
  return output.join('\n');
}
