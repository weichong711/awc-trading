/**
 * Format receipt data directly to thermal printer text
 * This bypasses HTML parsing and creates clean output
 */

import type { Order } from "../app/types/business";
import type { ReceiptBusinessProfile } from "../app/types/business";

const PAPER_WIDTH = 32; // Characters per line for 58mm paper

function centerText(text: string): string {
  const padding = Math.max(0, Math.floor((PAPER_WIDTH - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function dashedLine(): string {
  return '-'.repeat(PAPER_WIDTH);
}

function twoColumns(left: string, right: string): string {
  const maxLeft = PAPER_WIDTH - right.length - 1;
  const leftTrimmed = left.length > maxLeft ? left.substring(0, maxLeft) : left;
  const spaces = PAPER_WIDTH - leftTrimmed.length - right.length;
  return leftTrimmed + ' '.repeat(Math.max(1, spaces)) + right;
}

/**
 * Format order data directly to thermal receipt text
 */
export function formatOrderReceipt(
  order: Order,
  businessProfile: ReceiptBusinessProfile
): string {
  const output: string[] = [];
  
  // Header
  output.push('');
  output.push(centerText(businessProfile.businessName || 'RECEIPT'));
  output.push(centerText('OFFICIAL RECEIPT'));
  output.push('');
  
  // Business info
  if (businessProfile.username) {
    output.push(twoColumns('Username:', businessProfile.username));
  }
  if (businessProfile.phoneNumber) {
    output.push(twoColumns('Phone Number:', businessProfile.phoneNumber));
  }
  if (businessProfile.email) {
    if (businessProfile.email.length > 20) {
      output.push('Email:');
      output.push('  ' + businessProfile.email);
    } else {
      output.push(twoColumns('Email:', businessProfile.email));
    }
  }
  
  output.push(dashedLine());
  
  // Receipt info
  if (order.id) {
    output.push(twoColumns('Receipt No:', '#' + order.id));
  }
  output.push(twoColumns('Date:', new Date(order.date).toLocaleDateString()));
  output.push(twoColumns('Time:', new Date(order.date).toLocaleTimeString()));
  
  output.push(dashedLine());
  output.push('ITEMS');
  output.push('');
  
  // Items
  for (const item of order.items) {
    output.push(item.productName);
    const details = `${item.quantity} ${item.unit} x RM ${item.price.toFixed(2)}`;
    output.push(twoColumns('  ' + details, `RM ${item.total.toFixed(2)}`));
  }
  
  output.push('');
  output.push(dashedLine());
  
  // Totals
  output.push(twoColumns('Subtotal:', `RM ${order.subtotal.toFixed(2)}`));
  
  if (order.discount > 0) {
    const discountText = order.discountType === 'percentage' 
      ? `Discount (${order.discount}%):`
      : 'Discount:';
    output.push(twoColumns(discountText, `- RM ${order.discountAmount.toFixed(2)}`));
  }
  
  output.push(dashedLine());
  output.push(twoColumns('TOTAL:', `RM ${order.total.toFixed(2)}`));
  output.push(dashedLine());
  
  // Payment info
  if (order.paymentMethod) {
    const paymentText = order.paymentMethod === 'qr' ? 'QR' : 
                       order.paymentMethod === 'card' ? 'Card' : 'Cash';
    output.push(twoColumns('Payment:', paymentText));
  }
  
  if (order.cashTendered != null && order.cashTendered > 0) {
    output.push(twoColumns('Cash Received:', `RM ${order.cashTendered.toFixed(2)}`));
    output.push(twoColumns('Change:', `RM ${(order.cashTendered - order.total).toFixed(2)}`));
  }
  
  // Footer
  output.push('');
  output.push(centerText('Thank you for your business!'));
  output.push(centerText('Please come again'));
  output.push('');
  
  return output.join('\n');
}
