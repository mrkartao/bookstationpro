import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';

interface SaleItem {
    productId: number;
    productName: string;
    barcode?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    vatRate: number;
}

interface SaleData {
    userId: number;
    clientId?: number;
    items: SaleItem[];
    discountAmount?: number;
    discountPercent?: number;
    amountPaid: number;
    paymentMethod: 'cash' | 'card' | 'check' | 'credit' | 'bank_transfer';
    notes?: string;
}

export function registerSalesIPC(ipcMain: IpcMain): void {
    // Create sale
    ipcMain.handle('sales:create', async (_event, saleData: SaleData) => {
        const db = getSqliteDb();

        try {
            // Start transaction
            db.exec('BEGIN TRANSACTION');

            // Generate invoice number
            const config = db.prepare('SELECT invoice_prefix, invoice_next_number FROM store_config LIMIT 1').get() as {
                invoice_prefix: string;
                invoice_next_number: number;
            } | undefined;

            const prefix = config?.invoice_prefix || 'INV';
            const nextNumber = config?.invoice_next_number || 1;
            const invoiceNumber = `${prefix}-${String(nextNumber).padStart(6, '0')}`;

            // Calculate totals
            let subtotal = 0;
            let totalVat = 0;

            for (const item of saleData.items) {
                const itemSubtotal = (item.unitPrice * item.quantity) - item.discount;
                const itemVat = itemSubtotal * (item.vatRate / 100);
                subtotal += itemSubtotal;
                totalVat += itemVat;
            }

            const discountAmount = saleData.discountAmount || (subtotal * (saleData.discountPercent || 0) / 100);
            const total = subtotal - discountAmount + totalVat;
            const changeAmount = saleData.amountPaid - total;

            // Insert sale
            const saleResult = db.prepare(`
        INSERT INTO sales (
          invoice_number, user_id, client_id, sale_date, subtotal,
          discount_amount, discount_percent, vat_amount, total,
          amount_paid, change_amount, status, notes
        ) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(
                invoiceNumber,
                saleData.userId,
                saleData.clientId || null,
                subtotal,
                discountAmount,
                saleData.discountPercent || 0,
                totalVat,
                total,
                saleData.amountPaid,
                changeAmount > 0 ? changeAmount : 0,
                saleData.notes || null
            );

            const saleId = saleResult.lastInsertRowid as number;

            // Insert sale items and update stock
            for (const item of saleData.items) {
                const itemSubtotal = (item.unitPrice * item.quantity) - item.discount;
                const itemVat = itemSubtotal * (item.vatRate / 100);
                const itemTotal = itemSubtotal + itemVat;

                db.prepare(`
          INSERT INTO sale_items (
            sale_id, product_id, product_name, barcode, quantity,
            unit_price, discount, vat_rate, vat_amount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
                    saleId,
                    item.productId,
                    item.productName,
                    item.barcode || null,
                    item.quantity,
                    item.unitPrice,
                    item.discount,
                    item.vatRate,
                    itemVat,
                    itemTotal
                );

                // Update product stock
                const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.productId) as { stock_quantity: number };
                const newStock = product.stock_quantity - item.quantity;

                db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime("now") WHERE id = ?').run(newStock, item.productId);

                // Record stock movement
                db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_type, reference_id, user_id)
          VALUES (?, 'out', ?, ?, ?, 'Vente', 'sale', ?, ?)
        `).run(item.productId, item.quantity, product.stock_quantity, newStock, saleId, saleData.userId);
            }

            // Insert payment
            db.prepare(`
        INSERT INTO payments (sale_id, amount, method)
        VALUES (?, ?, ?)
      `).run(saleId, saleData.amountPaid, saleData.paymentMethod);

            // Create journal entries for accounting
            // Debit: Cash/Bank, Credit: Sales Revenue
            const cashAccountId = db.prepare("SELECT id FROM accounts WHERE code = '1000'").get() as { id: number };
            const salesAccountId = db.prepare("SELECT id FROM accounts WHERE code = '4000'").get() as { id: number };
            const vatAccountId = db.prepare("SELECT id FROM accounts WHERE code = '2100'").get() as { id: number };

            if (cashAccountId) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (datetime('now'), ?, ?, 0, ?, 'sale', ?, ?)
        `).run(cashAccountId.id, total, `Vente ${invoiceNumber}`, saleId, saleData.userId);
            }

            if (salesAccountId) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (datetime('now'), ?, 0, ?, ?, 'sale', ?, ?)
        `).run(salesAccountId.id, subtotal - discountAmount, `Vente ${invoiceNumber}`, saleId, saleData.userId);
            }

            if (vatAccountId && totalVat > 0) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (datetime('now'), ?, 0, ?, ?, 'sale', ?, ?)
        `).run(vatAccountId.id, totalVat, `TVA Vente ${invoiceNumber}`, saleId, saleData.userId);
            }

            // Update invoice number counter
            db.prepare('UPDATE store_config SET invoice_next_number = invoice_next_number + 1').run();

            // Update client balance if credit sale
            if (saleData.clientId && saleData.paymentMethod === 'credit') {
                db.prepare('UPDATE clients SET balance = balance + ? WHERE id = ?').run(total, saleData.clientId);
            }

            db.exec('COMMIT');

            return {
                success: true,
                saleId,
                invoiceNumber,
                total,
                change: changeAmount > 0 ? changeAmount : 0,
            };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Create sale error:', error);
            return { success: false, error: 'Erreur lors de la création de la vente' };
        }
    });

    // Get all sales
    ipcMain.handle('sales:getAll', async (_event, filters?: { startDate?: string; endDate?: string; userId?: number; status?: string }) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT s.*, u.full_name as cashier_name, c.name as client_name
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.startDate) {
                query += ' AND s.sale_date >= ?';
                params.push(filters.startDate);
            }

            if (filters?.endDate) {
                query += ' AND s.sale_date <= ?';
                params.push(filters.endDate);
            }

            if (filters?.userId) {
                query += ' AND s.user_id = ?';
                params.push(filters.userId);
            }

            if (filters?.status) {
                query += ' AND s.status = ?';
                params.push(filters.status);
            }

            query += ' ORDER BY s.created_at DESC LIMIT 500';

            const sales = db.prepare(query).all(...params);
            return { success: true, sales };
        } catch (error) {
            return { success: false, error: (error as Error).message, sales: [] };
        }
    });

    // Get sale by ID with items
    ipcMain.handle('sales:getById', async (_event, id: number) => {
        try {
            const db = getSqliteDb();

            const sale = db.prepare(`
        SELECT s.*, u.full_name as cashier_name, c.name as client_name
        FROM sales s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN clients c ON s.client_id = c.id
        WHERE s.id = ?
      `).get(id);

            if (!sale) {
                return { success: false, error: 'Vente non trouvée' };
            }

            const items = db.prepare(`
        SELECT si.*, p.name_fr as product_name_current
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(id);

            const payments = db.prepare('SELECT * FROM payments WHERE sale_id = ?').all(id);

            return { success: true, sale: { ...sale, items, payments } };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Void sale
    ipcMain.handle('sales:void', async (_event, id: number, reason: string) => {
        const db = getSqliteDb();

        try {
            db.exec('BEGIN TRANSACTION');

            // Get sale and items
            const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any;
            if (!sale) {
                return { success: false, error: 'Vente non trouvée' };
            }

            if (sale.status === 'voided') {
                return { success: false, error: 'Cette vente est déjà annulée' };
            }

            const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id) as any[];

            // Restore stock
            for (const item of items) {
                const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id) as { stock_quantity: number };
                const newStock = product.stock_quantity + item.quantity;

                db.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?').run(newStock, item.product_id);

                // Record stock movement
                db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_type, reference_id, user_id)
          VALUES (?, 'in', ?, ?, ?, 'Annulation vente', 'sale_void', ?, ?)
        `).run(item.product_id, item.quantity, product.stock_quantity, newStock, id, sale.user_id);
            }

            // Update sale status
            db.prepare(`
        UPDATE sales SET status = 'voided', void_reason = ?
        WHERE id = ?
      `).run(reason, id);

            // Reverse client balance if credit sale
            if (sale.client_id) {
                db.prepare('UPDATE clients SET balance = balance - ? WHERE id = ?').run(sale.total, sale.client_id);
            }

            // Create reverse journal entries
            const cashAccountId = db.prepare("SELECT id FROM accounts WHERE code = '1000'").get() as { id: number };
            const salesAccountId = db.prepare("SELECT id FROM accounts WHERE code = '4000'").get() as { id: number };

            if (cashAccountId) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (datetime('now'), ?, 0, ?, ?, 'sale_void', ?, ?)
        `).run(cashAccountId.id, sale.total, `Annulation ${sale.invoice_number}`, id, sale.user_id);
            }

            if (salesAccountId) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (datetime('now'), ?, ?, 0, ?, 'sale_void', ?, ?)
        `).run(salesAccountId.id, sale.subtotal - sale.discount_amount, `Annulation ${sale.invoice_number}`, id, sale.user_id);
            }

            db.exec('COMMIT');

            return { success: true };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Void sale error:', error);
            return { success: false, error: 'Erreur lors de l\'annulation' };
        }
    });

    // Get sales by date range
    ipcMain.handle('sales:getByDateRange', async (_event, startDate: string, endDate: string) => {
        try {
            const db = getSqliteDb();

            const sales = db.prepare(`
        SELECT s.*, u.full_name as cashier_name
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
        ORDER BY s.sale_date ASC
      `).all(startDate, endDate);

            return { success: true, sales };
        } catch (error) {
            return { success: false, error: (error as Error).message, sales: [] };
        }
    });

    // Get daily summary
    ipcMain.handle('sales:getDailySummary', async (_event, date: string) => {
        try {
            const db = getSqliteDb();

            const summary = db.prepare(`
        SELECT
          COUNT(*) as total_transactions,
          SUM(total) as total_revenue,
          SUM(vat_amount) as total_vat,
          SUM(discount_amount) as total_discounts,
          AVG(total) as average_sale
        FROM sales
        WHERE DATE(sale_date) = DATE(?) AND status = 'completed'
      `).get(date);

            const byPaymentMethod = db.prepare(`
        SELECT p.method, SUM(p.amount) as total
        FROM payments p
        JOIN sales s ON p.sale_id = s.id
        WHERE DATE(s.sale_date) = DATE(?) AND s.status = 'completed'
        GROUP BY p.method
      `).all(date);

            const byCashier = db.prepare(`
        SELECT u.full_name as cashier, COUNT(*) as transactions, SUM(s.total) as total
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE DATE(s.sale_date) = DATE(?) AND s.status = 'completed'
        GROUP BY s.user_id
      `).all(date);

            return { success: true, summary, byPaymentMethod, byCashier };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // SUPPLIERS & CLIENTS
    // =====================

    ipcMain.handle('suppliers:getAll', async () => {
        try {
            const db = getSqliteDb();
            const suppliers = db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all();
            return { success: true, suppliers };
        } catch (error) {
            return { success: false, error: (error as Error).message, suppliers: [] };
        }
    });

    ipcMain.handle('suppliers:create', async (_event, data: any) => {
        try {
            const db = getSqliteDb();
            const result = db.prepare(`
        INSERT INTO suppliers (name, name_ar, phone, email, address, tax_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.name, data.nameAr, data.phone, data.email, data.address, data.taxId);
            return { success: true, supplierId: result.lastInsertRowid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('suppliers:update', async (_event, id: number, data: any) => {
        try {
            const db = getSqliteDb();
            db.prepare(`
        UPDATE suppliers SET name = ?, name_ar = ?, phone = ?, email = ?, address = ?, tax_id = ?
        WHERE id = ?
      `).run(data.name, data.nameAr, data.phone, data.email, data.address, data.taxId, id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('suppliers:delete', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('suppliers:getBalance', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            const supplier = db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(id) as { balance: number };
            return { success: true, balance: supplier?.balance || 0 };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('clients:getAll', async () => {
        try {
            const db = getSqliteDb();
            const clients = db.prepare('SELECT * FROM clients WHERE is_active = 1 ORDER BY name ASC').all();
            return { success: true, clients };
        } catch (error) {
            return { success: false, error: (error as Error).message, clients: [] };
        }
    });

    ipcMain.handle('clients:create', async (_event, data: any) => {
        try {
            const db = getSqliteDb();
            const result = db.prepare(`
        INSERT INTO clients (name, name_ar, phone, email, address, tax_id, credit_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.name, data.nameAr, data.phone, data.email, data.address, data.taxId, data.creditLimit || 0);
            return { success: true, clientId: result.lastInsertRowid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('clients:update', async (_event, id: number, data: any) => {
        try {
            const db = getSqliteDb();
            db.prepare(`
        UPDATE clients SET name = ?, name_ar = ?, phone = ?, email = ?, address = ?, tax_id = ?, credit_limit = ?
        WHERE id = ?
      `).run(data.name, data.nameAr, data.phone, data.email, data.address, data.taxId, data.creditLimit, id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('clients:delete', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE clients SET is_active = 0 WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('clients:getBalance', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            const client = db.prepare('SELECT balance FROM clients WHERE id = ?').get(id) as { balance: number };
            return { success: true, balance: client?.balance || 0 };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // PURCHASES
    // =====================

    ipcMain.handle('purchases:create', async (_event, purchaseData: any) => {
        const db = getSqliteDb();

        try {
            db.exec('BEGIN TRANSACTION');

            // Generate reference number
            const count = db.prepare('SELECT COUNT(*) as count FROM purchases').get() as { count: number };
            const referenceNumber = `PUR-${String(count.count + 1).padStart(6, '0')}`;

            // Calculate totals
            let subtotal = 0;
            let totalVat = 0;

            for (const item of purchaseData.items) {
                const itemSubtotal = item.unitPrice * item.quantity;
                const itemVat = itemSubtotal * (item.vatRate / 100);
                subtotal += itemSubtotal;
                totalVat += itemVat;
            }

            const total = subtotal + totalVat;

            // Insert purchase
            const purchaseResult = db.prepare(`
        INSERT INTO purchases (reference_number, supplier_id, user_id, purchase_date, subtotal, vat_amount, total, amount_paid, status, notes)
        VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, 'received', ?)
      `).run(
                referenceNumber,
                purchaseData.supplierId,
                purchaseData.userId,
                subtotal,
                totalVat,
                total,
                purchaseData.amountPaid || 0,
                purchaseData.notes || null
            );

            const purchaseId = purchaseResult.lastInsertRowid as number;

            // Insert purchase items and update stock
            for (const item of purchaseData.items) {
                const itemVat = (item.unitPrice * item.quantity) * (item.vatRate / 100);
                const itemTotal = (item.unitPrice * item.quantity) + itemVat;

                db.prepare(`
          INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, vat_rate, vat_amount, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(purchaseId, item.productId, item.quantity, item.unitPrice, item.vatRate, itemVat, itemTotal);

                // Update product stock
                const product = db.prepare('SELECT stock_quantity, purchase_price FROM products WHERE id = ?').get(item.productId) as any;
                const newStock = product.stock_quantity + item.quantity;

                db.prepare('UPDATE products SET stock_quantity = ?, purchase_price = ?, updated_at = datetime("now") WHERE id = ?')
                    .run(newStock, item.unitPrice, item.productId);

                // Record stock movement
                db.prepare(`
          INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_type, reference_id, user_id)
          VALUES (?, 'in', ?, ?, ?, 'Achat', 'purchase', ?, ?)
        `).run(item.productId, item.quantity, product.stock_quantity, newStock, purchaseId, purchaseData.userId);
            }

            // Update supplier balance
            const amountDue = total - (purchaseData.amountPaid || 0);
            if (amountDue > 0) {
                db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(amountDue, purchaseData.supplierId);
            }

            db.exec('COMMIT');

            return { success: true, purchaseId, referenceNumber };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Create purchase error:', error);
            return { success: false, error: 'Erreur lors de la création de l\'achat' };
        }
    });

    ipcMain.handle('purchases:getAll', async (_event, filters?: any) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT p.*, s.name as supplier_name, u.full_name as user_name
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        JOIN users u ON p.user_id = u.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.startDate) {
                query += ' AND p.purchase_date >= ?';
                params.push(filters.startDate);
            }

            if (filters?.endDate) {
                query += ' AND p.purchase_date <= ?';
                params.push(filters.endDate);
            }

            query += ' ORDER BY p.created_at DESC LIMIT 500';

            const purchases = db.prepare(query).all(...params);
            return { success: true, purchases };
        } catch (error) {
            return { success: false, error: (error as Error).message, purchases: [] };
        }
    });

    ipcMain.handle('purchases:getById', async (_event, id: number) => {
        try {
            const db = getSqliteDb();

            const purchase = db.prepare(`
        SELECT p.*, s.name as supplier_name
        FROM purchases p
        JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.id = ?
      `).get(id);

            const items = db.prepare(`
        SELECT pi.*, pr.name_fr as product_name
        FROM purchase_items pi
        JOIN products pr ON pi.product_id = pr.id
        WHERE pi.purchase_id = ?
      `).all(id);

            return { success: true, purchase: purchase || {}, items };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
