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
 * Extract text content from HTML element
 */
function extractTextFromElement(element: HTMLElement): {
  businessName: string;
  username: string;
  phone: string;
  email: string;
  receiptNo: string;
  date: string;
  time: string;
  items: Array<{ name: string; quantity: string; unit: string; price: string; total: string }>;
  subtotal: string;
  discount?: string;
  total: string;
  payment: string;
  cashReceived?: string;
  change?: string;
} {
  // This is a simplified extraction - you may need to adjust based on your HTML structure
  const text = element.innerText || element.textContent || '';
  
  // Parse the text content (this is a basic implementation)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  return {
    businessName: lines[0] || 'Admin',
    username: lines.find(l => l.includes('Username:'))?.split(':')[1]?.trim() || '',
    phone: lines.find(l => l.includes('Phone Number:'))?.split(':')[1]?.trim() || '',
    email: lines.find(l => l.includes('Email:'))?.split(':')[1]?.trim() || '',
    receiptNo: lines.find(l => l.includes('Receipt No'))?.split(':')[1]?.trim() || '',
    date: lines.find(l => l.includes('Date:'))?.split(':')[1]?.trim() || '',
    time: lines.find(l => l.includes('Time'))?.split(':')[1]?.trim() || '',
    items: [],
    subtotal: lines.find(l => l.includes('Subtotal:'))?.split(':')[1]?.trim() || '',
    total: lines.find(l => l.includes('TOTAL:'))?.split(':')[1]?.trim() || '',
    payment: lines.find(l => l.includes('Payment'))?.split(':')[1]?.trim() || '',
  };
}

/**
 * Format receipt for thermal printer
 * Takes HTML element and returns formatted plain text
 */
export function formatReceiptForThermal(element: HTMLElement): string {
  const content = element.innerText || element.textContent || '';
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  let output: string[] = [];
  
  // Parse content
  let businessName = '';
  let username = '';
  let phone = '';
  let email = '';
  let receiptNo = '';
  let date = '';
  let time = '';
  let items: Array<{ name: string; qty: string; price: string; total: string }> = [];
  let subtotal = '';
  let total = '';
  let payment = '';
  let discount = '';
  
  // Extract data from lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i === 0 && !line.includes(':')) {
      businessName = line;
    } else if (line.includes('Username:')) {
      username = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Phone Number:')) {
      phone = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Email:')) {
      email = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Receipt No')) {
      receiptNo = line.split(':')[1]?.trim() || line.split('#')[1]?.trim() || '';
    } else if (line.includes('Date:')) {
      date = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Time')) {
      time = line.split(':').slice(1).join(':').trim() || '';
    } else if (line.includes('Subtotal:')) {
      subtotal = line.split(':')[1]?.trim() || '';
    } else if (line.includes('TOTAL:')) {
      total = line.split(':')[1]?.trim() || '';
    } else if (line.includes('Payment')) {
      payment = line.split(':')[1]?.trim() || line.replace('Payment', '').trim();
    } else if (line.includes('Discount')) {
      discount = line;
    } else if (line.includes(' x RM ') || line.includes(' x rm ')) {
      // Item line: "1 unit x RM 25.00 RM 25.00"
      const parts = line.split(' x ');
      if (parts.length >= 2) {
        const qtyUnit = parts[0].trim();
        const priceTotal = parts[1].replace(/RM|rm/gi, '').trim().split(/\s+/);
        items.push({
          name: lines[i - 1] || '', // Previous line is item name
          qty: qtyUnit,
          price: priceTotal[0] || '',
          total: priceTotal[priceTotal.length - 1] || '',
        });
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
      output.push(twoColumns(
        `  ${item.qty}`,
        `RM ${item.total}`
      ));
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
  
  output.push('');
  output.push(dashedLine());
  output.push('');
  output.push(centerText('Thank you for your business!'));
  output.push(centerText('Please come again'));
  output.push('');
  output.push(dashedLine());
  
  return output.join('\n');
}
