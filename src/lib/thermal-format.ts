/**
 * Format receipt content for thermal printers
 * Converts HTML receipt element to clean plain text with proper formatting
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
 * Extract text content safely
 */
function getTextContent(selector: string, parent: HTMLElement): string {
  const el = parent.querySelector(selector);
  return el?.textContent?.trim() || '';
}

/**
 * Format receipt for thermal printer
 * Takes HTML element and returns formatted plain text
 */
export function formatReceiptForThermal(element: HTMLElement): string {
  const output: string[] = [];
  
  try {
    // Get the receipt element - it should have id="print-receipt-orders"
    const receiptEl = element.querySelector('#print-receipt-orders') || element;
    
    // Extract business info from the first section
    const businessName = getTextContent('h2, .text-xl', receiptEl) || 'RECEIPT';
    const username = extractLabelValue(receiptEl, 'Username');
    const phone = extractLabelValue(receiptEl, 'Phone');
    const email = extractLabelValue(receiptEl, 'Email');
    
    // Extract receipt info
    const receiptNo = extractLabelValue(receiptEl, 'Receipt No');
    const date = extractLabelValue(receiptEl, 'Date');
    const time = extractLabelValue(receiptEl, 'Time');
    
    // Extract items
    const items = extractItems(receiptEl);
    
    // Extract totals
    const subtotal = extractLabelValue(receiptEl, 'Subtotal');
    const discount = extractLabelValue(receiptEl, 'Discount');
    const total = extractLabelValue(receiptEl, 'TOTAL');
    const payment = extractLabelValue(receiptEl, 'Payment');
    const cashReceived = extractLabelValue(receiptEl, 'Cash Received');
    const change = extractLabelValue(receiptEl, 'Change');
    
    // Build the receipt
    output.push('');
    output.push(centerText(businessName));
    output.push(centerText('OFFICIAL RECEIPT'));
    output.push('');
    
    if (username) output.push(twoColumns('Username:', username));
    if (phone) output.push(twoColumns('Phone Number:', phone));
    if (email) {
      if (email.length > 20) {
        output.push('Email:');
        output.push('  ' + email);
      } else {
        output.push(twoColumns('Email:', email));
      }
    }
    
    output.push(dashedLine());
    
    if (receiptNo) output.push(twoColumns('Receipt No:', receiptNo));
    if (date) output.push(twoColumns('Date:', date));
    if (time) output.push(twoColumns('Time:', time));
    
    output.push(dashedLine());
    output.push('ITEMS');
    output.push('');
    
    if (items.length > 0) {
      for (const item of items) {
        output.push(item.name);
        output.push(twoColumns('  ' + item.details, item.total));
      }
    } else {
      output.push('(No items)');
    }
    
    output.push('');
    output.push(dashedLine());
    
    if (subtotal) output.push(twoColumns('Subtotal:', subtotal));
    if (discount) output.push(twoColumns('Discount:', discount));
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
    
  } catch (error) {
    console.error('Error formatting receipt:', error);
    output.push('Error formatting receipt');
  }
  
  return output.join('\n');
}

/**
 * Extract value for a label from the receipt
 */
function extractLabelValue(element: HTMLElement, label: string): string {
  // Find all divs with flex justify-between (our label-value pairs)
  const pairs = element.querySelectorAll('div.flex.justify-between');
  
  for (const pair of pairs) {
    const text = pair.textContent || '';
    if (text.includes(label + ':')) {
      // Extract the value after the colon
      const parts = text.split(':');
      if (parts.length >= 2) {
        return parts.slice(1).join(':').trim();
      }
    }
  }
  
  return '';
}

/**
 * Extract items from the receipt
 */
function extractItems(element: HTMLElement): Array<{ name: string; details: string; total: string }> {
  const items: Array<{ name: string; details: string; total: string }> = [];
  
  // Find the items section
  const allDivs = Array.from(element.querySelectorAll('div'));
  
  let inItemsSection = false;
  let currentItemName = '';
  
  for (const div of allDivs) {
    const text = (div.textContent || '').trim();
    
    // Check if we're entering the items section
    if (text === 'ITEMS' || text.startsWith('ITEMS')) {
      inItemsSection = true;
      continue;
    }
    
    // Check if we're leaving the items section
    if (inItemsSection && (text.includes('Subtotal') || text.includes('TOTAL'))) {
      break;
    }
    
    if (inItemsSection) {
      // Check if this div has the item structure
      const hasQuantity = text.match(/(\d+(?:\.\d+)?)\s+(\w+)\s+x\s+RM\s+([\d.]+)/);
      
      if (hasQuantity && currentItemName) {
        // This is the details line
        const match = text.match(/(\d+(?:\.\d+)?)\s+(\w+)\s+x\s+RM\s+([\d.]+)\s+RM\s+([\d.]+)/);
        if (match) {
          items.push({
            name: currentItemName,
            details: `${match[1]} ${match[2]} x RM ${match[3]}`,
            total: `RM ${match[4]}`
          });
          currentItemName = '';
        }
      } else if (!text.includes(':') && !text.includes('RM') && text.length > 0 && text.length < 50) {
        // This might be an item name
        currentItemName = text;
      }
    }
  }
  
  return items;
}
