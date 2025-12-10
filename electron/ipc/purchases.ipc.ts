import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';

export function registerPurchasesIPC(ipcMain: IpcMain): void {
    // Create purchase
    ipcMain.handle('purchases:create', async (_event, purchaseData: {
        supplierId: number;
        userId: number;
        items: Array<{
            productId: number;
            quantity: number;
            unitPrice: number;
            vatRate: number;
        }>;
        notes?: string;
    }) => {
        const db = getSqliteDb();

        try {
            db.exec('BEGIN TRANSACTION');

            // Generate purchase reference number
            const config = db.prepare('SELECT invoice_next_number FROM store_config LIMIT 1').get() as { invoice_next_number: number } | undefined;
            const nextNumber = config?.invoice_next_number || 1;
            const referenceNumber = `PUR-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

            // Calculate totals
            let subtotal = 0;
            let vatAmount = 0;

            for (const item of purchaseData.items) {
                const lineTotal = item.unitPrice * item.quantity;
                const lineVat = lineTotal * (item.vatRate / 100);
                subtotal += lineTotal;
                vatAmount += lineVat;
            }

            const total = subtotal + vatAmount;
            const purchaseDate = new Date().toISOString();

            // Create purchase record
            const result = db.prepare(`
                INSERT INTO purchases (reference_number, supplier_id, user_id, purchase_date, subtotal, vat_amount, total, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received')
            `).run(referenceNumber, purchaseData.supplierId, purchaseData.userId, purchaseDate, subtotal, vatAmount, total, purchaseData.notes || null);

            const purchaseId = result.lastInsertRowid;

            // Create purchase items and update stock
            const insertItem = db.prepare(`
                INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, vat_rate, vat_amount, total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const updateStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, purchase_price = ? WHERE id = ?');

            const insertMovement = db.prepare(`
                INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, reference_type, reference_id, user_id)
                VALUES (?, 'in', ?, ?, ?, ?, 'purchase', ?, ?)
            `);

            for (const item of purchaseData.items) {
                const lineTotal = item.unitPrice * item.quantity;
                const lineVat = lineTotal * (item.vatRate / 100);

                insertItem.run(purchaseId, item.productId, item.quantity, item.unitPrice, item.vatRate, lineVat, lineTotal + lineVat);

                // Get current stock
                const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.productId) as { stock_quantity: number };
                const previousStock = product?.stock_quantity || 0;
                const newStock = previousStock + item.quantity;

                // Update product stock and purchase price
                updateStock.run(item.quantity, item.unitPrice, item.productId);

                // Record stock movement
                insertMovement.run(item.productId, item.quantity, previousStock, newStock, `Achat ${referenceNumber}`, purchaseId, purchaseData.userId);
            }

            // Update supplier balance (credit)
            db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?').run(total, purchaseData.supplierId);

            // Create journal entries
            // Debit: Stock (5000), Credit: Supplier (2000)
            const stockAccount = db.prepare("SELECT id FROM accounts WHERE code = '5000'").get() as { id: number } | undefined;
            const supplierAccount = db.prepare("SELECT id FROM accounts WHERE code = '2000'").get() as { id: number } | undefined;
            const vatAccount = db.prepare("SELECT id FROM accounts WHERE code = '5100'").get() as { id: number } | undefined;

            if (stockAccount) {
                db.prepare(`
                    INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
                    VALUES (?, ?, ?, 0, ?, 'purchase', ?, ?)
                `).run(purchaseDate, stockAccount.id, subtotal, `Achat ${referenceNumber}`, purchaseId, purchaseData.userId);
            }

            if (vatAccount && vatAmount > 0) {
                db.prepare(`
                    INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
                    VALUES (?, ?, ?, 0, ?, 'purchase', ?, ?)
                `).run(purchaseDate, vatAccount.id, vatAmount, `TVA Achat ${referenceNumber}`, purchaseId, purchaseData.userId);
            }

            if (supplierAccount) {
                db.prepare(`
                    INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
                    VALUES (?, ?, 0, ?, ?, 'purchase', ?, ?)
                `).run(purchaseDate, supplierAccount.id, total, `Achat ${referenceNumber}`, purchaseId, purchaseData.userId);
            }

            // Update config for next purchase number
            db.prepare('UPDATE store_config SET invoice_next_number = invoice_next_number + 1').run();

            db.exec('COMMIT');

            return {
                success: true,
                purchaseId,
                referenceNumber,
                total,
            };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Create purchase error:', error);
            return { success: false, error: 'Erreur lors de la création de l\'achat' };
        }
    });

    // Get all purchases
    ipcMain.handle('purchases:getAll', async (_event, filters?: { startDate?: string; endDate?: string; supplierId?: number }) => {
        try {
            const db = getSqliteDb();

            let query = `
                SELECT p.*, s.name as supplier_name, u.full_name as user_name
                FROM purchases p
                LEFT JOIN suppliers s ON p.supplier_id = s.id
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

            if (filters?.supplierId) {
                query += ' AND p.supplier_id = ?';
                params.push(filters.supplierId);
            }

            query += ' ORDER BY p.created_at DESC';

            const purchases = db.prepare(query).all(...params);
            return { success: true, purchases };
        } catch (error) {
            return { success: false, error: (error as Error).message, purchases: [] };
        }
    });

    // Get purchase by ID
    ipcMain.handle('purchases:getById', async (_event, id: number) => {
        try {
            const db = getSqliteDb();

            const purchase = db.prepare(`
                SELECT p.*, s.name as supplier_name, u.full_name as user_name
                FROM purchases p
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                JOIN users u ON p.user_id = u.id
                WHERE p.id = ?
            `).get(id);

            if (!purchase) {
                return { success: false, error: 'Achat non trouvé' };
            }

            const items = db.prepare(`
                SELECT pi.*, pr.name_fr as product_name, pr.barcode
                FROM purchase_items pi
                JOIN products pr ON pi.product_id = pr.id
                WHERE pi.purchase_id = ?
            `).all(id);

            return { success: true, purchase, items };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get suppliers
    ipcMain.handle('suppliers:getAll', async () => {
        try {
            const db = getSqliteDb();
            const suppliers = db.prepare(`
                SELECT * FROM suppliers
                WHERE is_active = 1
                ORDER BY name ASC
            `).all();
            return { success: true, suppliers };
        } catch (error) {
            return { success: false, error: (error as Error).message, suppliers: [] };
        }
    });

    // Create supplier
    ipcMain.handle('suppliers:create', async (_event, data: { name: string; nameAr?: string; phone?: string; email?: string; address?: string; taxId?: string }) => {
        try {
            const db = getSqliteDb();

            const result = db.prepare(`
                INSERT INTO suppliers (name, name_ar, phone, email, address, tax_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(data.name, data.nameAr || null, data.phone || null, data.email || null, data.address || null, data.taxId || null);

            return { success: true, supplierId: result.lastInsertRowid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Update supplier
    ipcMain.handle('suppliers:update', async (_event, id: number, data: Partial<{ name: string; nameAr?: string; phone?: string; email?: string; address?: string; taxId?: string }>) => {
        try {
            const db = getSqliteDb();

            const updates: string[] = [];
            const values: any[] = [];

            if (data.name) { updates.push('name = ?'); values.push(data.name); }
            if (data.nameAr !== undefined) { updates.push('name_ar = ?'); values.push(data.nameAr); }
            if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
            if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
            if (data.address !== undefined) { updates.push('address = ?'); values.push(data.address); }
            if (data.taxId !== undefined) { updates.push('tax_id = ?'); values.push(data.taxId); }

            if (updates.length > 0) {
                values.push(id);
                db.prepare(`UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Delete supplier (soft delete)
    ipcMain.handle('suppliers:delete', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE suppliers SET is_active = 0 WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get supplier balance
    ipcMain.handle('suppliers:getBalance', async (_event: any, id: number) => {
        try {
            const db = getSqliteDb();
            const supplier = db.prepare('SELECT balance FROM suppliers WHERE id = ?').get(id) as { balance: number } | undefined;
            return { success: true, balance: supplier?.balance || 0 };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // CLIENTS
    // =====================

    // Get all clients
    ipcMain.handle('clients:getAll', async () => {
        try {
            const db = getSqliteDb();
            const clients = db.prepare(`
                SELECT * FROM clients
                WHERE is_active = 1
                ORDER BY name ASC
            `).all();
            return { success: true, clients };
        } catch (error) {
            return { success: false, error: (error as Error).message, clients: [] };
        }
    });

    // Create client
    ipcMain.handle('clients:create', async (_event: any, data: { name: string; nameAr?: string; phone?: string; email?: string; address?: string; taxId?: string; creditLimit?: number }) => {
        try {
            const db = getSqliteDb();

            const result = db.prepare(`
                INSERT INTO clients (name, name_ar, phone, email, address, tax_id, credit_limit)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(data.name, data.nameAr || null, data.phone || null, data.email || null, data.address || null, data.taxId || null, data.creditLimit || 0);

            return { success: true, clientId: result.lastInsertRowid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Update client
    ipcMain.handle('clients:update', async (_event: any, id: number, data: Partial<{ name: string; nameAr?: string; phone?: string; email?: string; address?: string; taxId?: string; creditLimit?: number }>) => {
        try {
            const db = getSqliteDb();

            const updates: string[] = [];
            const values: any[] = [];

            if (data.name) { updates.push('name = ?'); values.push(data.name); }
            if (data.nameAr !== undefined) { updates.push('name_ar = ?'); values.push(data.nameAr); }
            if (data.phone !== undefined) { updates.push('phone = ?'); values.push(data.phone); }
            if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
            if (data.address !== undefined) { updates.push('address = ?'); values.push(data.address); }
            if (data.taxId !== undefined) { updates.push('tax_id = ?'); values.push(data.taxId); }
            if (data.creditLimit !== undefined) { updates.push('credit_limit = ?'); values.push(data.creditLimit); }

            if (updates.length > 0) {
                values.push(id);
                db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Delete client (soft delete)
    ipcMain.handle('clients:delete', async (_event: any, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE clients SET is_active = 0 WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get client balance
    ipcMain.handle('clients:getBalance', async (_event: any, id: number) => {
        try {
            const db = getSqliteDb();
            const client = db.prepare('SELECT balance, credit_limit FROM clients WHERE id = ?').get(id) as { balance: number; credit_limit: number } | undefined;
            return { success: true, balance: client?.balance || 0, creditLimit: client?.credit_limit || 0 };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
