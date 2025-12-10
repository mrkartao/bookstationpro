import { BrowserWindow } from 'electron';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

export interface PrintOptions {
    printerName?: string;
    type: 'thermal' | 'a4';
    content: string | PrintContent;
    copies?: number;
    silent?: boolean;
}

export interface PrintContent {
    title?: string;
    header?: {
        storeName: string;
        address?: string;
        phone?: string;
        taxId?: string;
    };
    items?: Array<{
        name: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    summary?: {
        subtotal: number;
        discount?: number;
        vat?: number;
        total: number;
    };
    footer?: {
        invoiceNumber: string;
        date: string;
        cashier?: string;
        message?: string;
    };
    barcode?: string;
}

export interface PrinterInfo {
    name: string;
    displayName: string;
    isDefault: boolean;
    status?: number;
}

export class PrinterService {
    /**
     * Get list of available printers
     */
    public static async getPrinters(): Promise<PrinterInfo[]> {
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (!window) return [];

        const printers = await window.webContents.getPrintersAsync();

        return printers.map(printer => ({
            name: printer.name,
            displayName: printer.displayName || printer.name,
            isDefault: printer.isDefault,
            status: printer.status,
        }));
    }

    /**
     * Print content to specified printer
     */
    public static async print(options: PrintOptions): Promise<{ success: boolean; error?: string }> {
        try {
            const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (!window) {
                return { success: false, error: 'No window available for printing' };
            }

            if (options.type === 'thermal') {
                return await this.printThermal(window, options);
            } else {
                return await this.printA4(window, options);
            }
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Print to thermal receipt printer
     */
    private static async printThermal(
        window: BrowserWindow,
        options: PrintOptions
    ): Promise<{ success: boolean; error?: string }> {
        // Generate thermal receipt HTML
        const html = this.generateThermalHTML(options.content as PrintContent);

        // Create a hidden window for printing
        const printWindow = new BrowserWindow({
            show: false,
            width: 300,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            },
        });

        try {
            await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

            const printOptions: Electron.WebContentsPrintOptions = {
                silent: options.silent ?? true,
                printBackground: true,
                deviceName: options.printerName,
                copies: options.copies || 1,
                margins: {
                    marginType: 'none',
                },
                pageSize: {
                    width: 80000, // 80mm in microns
                    height: 297000, // Variable height
                },
            };

            return new Promise((resolve) => {
                printWindow.webContents.print(printOptions, (success, failureReason) => {
                    printWindow.close();
                    if (success) {
                        resolve({ success: true });
                    } else {
                        resolve({ success: false, error: failureReason });
                    }
                });
            });
        } catch (error) {
            printWindow.close();
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Print to A4 printer or generate PDF
     */
    private static async printA4(
        window: BrowserWindow,
        options: PrintOptions
    ): Promise<{ success: boolean; error?: string }> {
        const printOptions: Electron.WebContentsPrintOptions = {
            silent: options.silent ?? false,
            printBackground: true,
            deviceName: options.printerName,
            copies: options.copies || 1,
            margins: {
                marginType: 'default',
            },
            pageSize: 'A4',
        };

        return new Promise((resolve) => {
            window.webContents.print(printOptions, (success, failureReason) => {
                if (success) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: failureReason });
                }
            });
        });
    }

    /**
     * Generate HTML for thermal receipt
     */
    private static generateThermalHTML(content: PrintContent): string {
        const items = content.items || [];
        const summary = content.summary || { subtotal: 0, total: 0 };
        const header = content.header || { storeName: 'Store' };
        const footer = content.footer || { invoiceNumber: '', date: '' };

        return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 5mm;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .store-name {
      font-size: 16px;
      font-weight: bold;
    }
    .items {
      width: 100%;
      margin: 10px 0;
    }
    .item {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .divider {
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    .summary {
      margin: 10px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }
    .total {
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      border-top: 1px dashed #000;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${header.storeName}</div>
    ${header.address ? `<div>${header.address}</div>` : ''}
    ${header.phone ? `<div>Tel: ${header.phone}</div>` : ''}
    ${header.taxId ? `<div>RC: ${header.taxId}</div>` : ''}
  </div>

  <div class="items">
    ${items.map(item => `
      <div class="item">
        <span>${item.name}</span>
        <span>${item.quantity} x ${item.price.toFixed(2)}</span>
      </div>
      <div class="item">
        <span></span>
        <span>${item.total.toFixed(2)}</span>
      </div>
    `).join('')}
  </div>

  <div class="divider"></div>

  <div class="summary">
    <div class="summary-row">
      <span>Sous-total:</span>
      <span>${summary.subtotal.toFixed(2)}</span>
    </div>
    ${summary.discount ? `
      <div class="summary-row">
        <span>Remise:</span>
        <span>-${summary.discount.toFixed(2)}</span>
      </div>
    ` : ''}
    ${summary.vat ? `
      <div class="summary-row">
        <span>TVA:</span>
        <span>${summary.vat.toFixed(2)}</span>
      </div>
    ` : ''}
    <div class="summary-row total">
      <span>TOTAL:</span>
      <span>${summary.total.toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <div>Facture N°: ${footer.invoiceNumber}</div>
    <div>Date: ${footer.date}</div>
    ${footer.cashier ? `<div>Caissier: ${footer.cashier}</div>` : ''}
    ${footer.message ? `<div>${footer.message}</div>` : '<div>Merci de votre visite!</div>'}
  </div>
</body>
</html>
    `;
    }

    /**
     * Generate PDF from content
     */
    public static async generatePDF(
        content: PrintContent,
        outputPath: string,
        options: { format: 'a4' | 'thermal'; language: 'ar' | 'fr' } = { format: 'a4', language: 'fr' }
    ): Promise<{ success: boolean; path?: string; error?: string }> {
        try {
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: options.format === 'thermal' ? [80, 200] : 'a4',
            });

            // Add Arabic font support if needed
            if (options.language === 'ar') {
                // Note: You would need to add an Arabic font here
                // doc.addFont('path/to/arabic-font.ttf', 'Arabic', 'normal');
                // doc.setFont('Arabic');
            }

            const header = content.header || { storeName: 'Store' };
            const items = content.items || [];
            const summary = content.summary || { subtotal: 0, total: 0 };
            const footer = content.footer || { invoiceNumber: '', date: '' };

            let y = 20;

            // Header
            doc.setFontSize(16);
            doc.text(header.storeName, 105, y, { align: 'center' });
            y += 10;

            if (header.address) {
                doc.setFontSize(10);
                doc.text(header.address, 105, y, { align: 'center' });
                y += 6;
            }

            y += 10;

            // Invoice info
            doc.setFontSize(12);
            doc.text(`Facture N°: ${footer.invoiceNumber}`, 20, y);
            doc.text(`Date: ${footer.date}`, 150, y);
            y += 15;

            // Items table
            if (items.length > 0) {
                (doc as any).autoTable({
                    startY: y,
                    head: [['Produit', 'Qté', 'Prix', 'Total']],
                    body: items.map(item => [
                        item.name,
                        item.quantity.toString(),
                        item.price.toFixed(2),
                        item.total.toFixed(2),
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [66, 66, 66] },
                    margin: { left: 20, right: 20 },
                });

                y = (doc as any).lastAutoTable.finalY + 10;
            }

            // Summary
            doc.setFontSize(10);
            doc.text(`Sous-total: ${summary.subtotal.toFixed(2)}`, 150, y, { align: 'right' });
            y += 6;

            if (summary.discount) {
                doc.text(`Remise: -${summary.discount.toFixed(2)}`, 150, y, { align: 'right' });
                y += 6;
            }

            if (summary.vat) {
                doc.text(`TVA: ${summary.vat.toFixed(2)}`, 150, y, { align: 'right' });
                y += 6;
            }

            doc.setFontSize(14);
            doc.text(`TOTAL: ${summary.total.toFixed(2)}`, 150, y + 4, { align: 'right' });

            // Save PDF
            const pdfBuffer = doc.output('arraybuffer');
            fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));

            return { success: true, path: outputPath };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}
