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
 * Format receipt for thermal printer
 * Takes HTML element and returns formatted plain text
 */
export function formatReceiptForThermal(element: HTMLElement): string {
  const output: string[] = [];
  
  // Parse the receipt structure by looking at the actual DOM
  try {
    // Get business name (first h2 or text-xl element)
    const businessNameEl = element.querySelector('h2, .text-xl');
    const businessName = businessNameEl?.textContent?.trim() || 'RECEIPT';
    
    // Get all text content organized by sections
    const allDivs = element.querySelectorAll('div');
    
    let receiptNo = '';
    let date = '';
    let time = '';
    let username = '';
    let phone = '';
    let email = '';
    let items: Array<{ name: string; qty: string; price: string; total: string }> = [];
    let subtotal = '';
    let discount = '';
    let total = '';
    let payment = '';
    let cashReceived = '';
    let change = '';
    
    // Parse each div for data
    allDivs.forEach((div) => {
      const text = div.textContent?.trim() || '';
      
      // Receipt info
      if (text.includes('Receipt No:') || text.includes('receiptNo')) {
        const match = text.match(/#?(\d+)/);
        if (match) receiptNo = match[1];
      }
      if (text.includes('Date:') && !date) {
        const match = text.match(/Date:\s*(.+)/);
        if (match) date = match[1].trim();
      }
      if (text.includes('Time:') && !time) {
        const match = text.match(/Time:\s*(.+)/);
        if (match) time = match[1].trim();
      }
      
      // Business info
      if (text.includes('Username:') && !username) {
        const match = text.match(/Username:\s*(.+)/);
        if (match) username = match[1].trim();
      }
      if (text.includes('Phone') && !phone) {
        const match = text.match(/Phone[^:]*:\s*(.+)/);
        if (match) phone = match[1].trim();
      }
      if (text.includes('Email:') && !email) {
        const match = text.match(/Email:\s*(.+)/);
        if (match) email = match[1].trim();
      }
      
      // Totals
      if (text.includes('Subtotal:') && !subtotal) {
        const match = text.match(/RM\s*([\d.]+)/);
        if (match) subtotal = match[1];
      }
      if (text.includes('TOTAL:') && !total) {
        const match = text.match(/RM\s*([\d.]+)/);
        if (match) total = match[1];
      }
      if (text.includes('Payment:') && !payment) {
        const match = text.match(/Payment:\s*(.+)/);
        if (match) payment = match[1].trim();
      }
      if (text.includes('Cash Received:') && !cashReceived) {
        const match = text.match(/RM\s*([\d.]+)/);
        if (match) cashReceived = match[1];
      }
      if (text.includes('Change:') && !change) {
        const match = text.match(/RM\s*([\d.]+)/);
        if (match) change = match[1];
      }
      if (text.includes('Discount') && !discount) {
        const match = text.match(/RM\s*([\d.]+)/);
        if (match) discount = match[1];
      }
    });
    
    // Parse items - look for item structure
    const itemDivs = element.querySelectorAll('div[class*="mb-2"]');
    itemDivs.forEach((itemDiv) => {
      const itemText = itemDiv.textContent || '';
      
      // Check if this looks like an item (has "x RM" pattern)
      if (itemText.includes(' x RM ')) {
        const lines = itemText.split('\n').map(l => l.trim()).filter(l => l);
        
        if (lines.length >= 2) {
          const itemName = lines[0];
          const detailLine = lines[1];
          
          // Parse: "1 unit x RM 25.00 RM 25.00"
          const match = detailLine.match(/(\d+(?:\.\d+)?)\s+(\w+)\s+x\s+RM\s+([\d.]+)\s+RM\s+([\d.]+)/);
          if (match) {
            items.push({
              name: itemName,
              qty: match[1],
              price: match[3],
              total: match[4]
            });
          }
        }
      }
    });
    
    // Build the formatted receipt
    output.push(''); // Blank line at top
    output.push(centerText(businessName));
    output.push(centerText('OFFICIAL RECEIPT'));
    output.push('');
    
    // Business info
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
        const details = `${item.qty} unit x RM ${item.price}`;
        output.push(twoColumns('  ' + details, 'RM ' + item.total));
      }
    } else {
      output.push('(No items)');
    }
    
    output.push('');
    output.push(dashedLine());
    
    // Totals
    if (subtotal) output.push(twoColumns('Subtotal:', 'RM ' + subtotal));
    if (discount) output.push(twoColumns('Discount:', '- RM ' + discount));
    if (total) {
      output.push(dashedLine());
      output.push(twoColumns('TOTAL:', 'RM ' + total));
      output.push(dashedLine());
    }
    if (payment) output.push(twoColumns('Payment:', payment));
    if (cashReceived) output.push(twoColumns('Cash Received:', 'RM ' + cashReceived));
    if (change) output.push(twoColumns('Change:', 'RM ' + change));
    
    output.push('');
    output.push(centerText('Thank you for your business!'));
    output.push(centerText('Please come again'));
    output.push('');
    
  } catch (error) {
    console.error('Error formatting receipt:', error);
    // Fallback to simple text extraction
    output.push(element.innerText || element.textContent || 'Receipt');
  }
  
  const result = output.join('\n');
  console.log('=== FORMATTED RECEIPT ===');
  console.log(result);
  console.log('=== END ===');
  
  return result;
}
