export function escapeReceiptText(value: unknown): string {
  return String(value).replace(/[&<>"']/g, character => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

export function formatReceiptCurrency(value: string | number): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toFixed(2)}`
    : `₹${escapeReceiptText(value)}`;
}

export function formatReceiptDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? escapeReceiptText(value)
    : escapeReceiptText(date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }));
}

export async function printThermalReceipt(
  title: string,
  receiptContent: string | (() => Promise<string>),
): Promise<void> {
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (!printWindow) {
    window.alert('Allow pop-ups for this site to print the receipt.');
    return;
  }

  let content: string;
  try {
    content = typeof receiptContent === 'string' ? receiptContent : await receiptContent();
  } catch {
    printWindow.close();
    window.alert('Could not load the restaurant address. Please try printing again.');
    return;
  }
  if (printWindow.closed) return;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeReceiptText(title)}</title>
        <style>
          @page { size: 58mm auto; margin: 2mm; }
          * { box-sizing: border-box; }
          body {
            width: 54mm;
            margin: 0 auto;
            color: #000;
            font: 12px/1.4 Arial, sans-serif;
            overflow-wrap: anywhere;
          }
          h1 { margin: 0 0 4px; font-size: 16px; text-align: center; }
          h2 { margin: 0 0 3px; font-size: 13px; }
          p { margin: 2px 0; }
          .center { text-align: center; }
          .muted { font-size: 10px; }
          .divider { border-top: 1px dashed #000; margin: 7px 0; }
          .row { display: flex; justify-content: space-between; gap: 6px; }
          .item { margin: 5px 0; }
          .total { font-size: 14px; font-weight: 700; }
          @media print {
            html, body { width: 54mm; }
          }
        </style>
      </head>
      <body>${content}</body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.requestAnimationFrame(() => {
    printWindow.requestAnimationFrame(() => printWindow.print());
  });
}
