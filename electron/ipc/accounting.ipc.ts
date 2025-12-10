import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';

export function registerAccountingIPC(ipcMain: IpcMain): void {
    // Get all accounts
    ipcMain.handle('accounting:getAccounts', async () => {
        try {
            const db = getSqliteDb();
            const accounts = db.prepare(`
        SELECT * FROM accounts
        WHERE is_active = 1
        ORDER BY code ASC
      `).all();
            return { success: true, accounts };
        } catch (error) {
            return { success: false, error: (error as Error).message, accounts: [] };
        }
    });

    // Get journal entries
    ipcMain.handle('accounting:getJournalEntries', async (_event, filters?: {
        startDate?: string;
        endDate?: string;
        accountId?: number;
        referenceType?: string;
    }) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT j.*, a.code as account_code, a.name_fr as account_name, u.full_name as user_name
        FROM journal_entries j
        JOIN accounts a ON j.account_id = a.id
        JOIN users u ON j.user_id = u.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.startDate) {
                query += ' AND j.entry_date >= ?';
                params.push(filters.startDate);
            }

            if (filters?.endDate) {
                query += ' AND j.entry_date <= ?';
                params.push(filters.endDate);
            }

            if (filters?.accountId) {
                query += ' AND j.account_id = ?';
                params.push(filters.accountId);
            }

            if (filters?.referenceType) {
                query += ' AND j.reference_type = ?';
                params.push(filters.referenceType);
            }

            query += ' ORDER BY j.entry_date DESC, j.id DESC LIMIT 1000';

            const entries = db.prepare(query).all(...params);
            return { success: true, entries };
        } catch (error) {
            return { success: false, error: (error as Error).message, entries: [] };
        }
    });

    // Create manual journal entry
    ipcMain.handle('accounting:createManualEntry', async (_event, data: {
        entries: Array<{ accountId: number; debit: number; credit: number }>;
        description: string;
        userId: number;
        entryDate?: string;
    }) => {
        const db = getSqliteDb();

        try {
            // Validate that debits equal credits
            let totalDebit = 0;
            let totalCredit = 0;

            for (const entry of data.entries) {
                totalDebit += entry.debit || 0;
                totalCredit += entry.credit || 0;
            }

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                return { success: false, error: 'Les débits et crédits doivent être égaux' };
            }

            db.exec('BEGIN TRANSACTION');

            const entryDate = data.entryDate || new Date().toISOString();

            for (const entry of data.entries) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, user_id)
          VALUES (?, ?, ?, ?, ?, 'manual', ?)
        `).run(entryDate, entry.accountId, entry.debit || 0, entry.credit || 0, data.description, data.userId);

                // Update account balance
                const balanceChange = (entry.debit || 0) - (entry.credit || 0);
                db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(balanceChange, entry.accountId);
            }

            db.exec('COMMIT');

            return { success: true };
        } catch (error) {
            db.exec('ROLLBACK');
            console.error('Create journal entry error:', error);
            return { success: false, error: 'Erreur lors de la création de l\'écriture' };
        }
    });

    // Get Profit & Loss statement
    ipcMain.handle('accounting:getProfitLoss', async (_event, startDate: string, endDate: string) => {
        try {
            const db = getSqliteDb();

            // Revenue accounts (type = 'revenue')
            const revenue = db.prepare(`
        SELECT a.code, a.name_fr, a.name_ar,
          SUM(j.credit) - SUM(j.debit) as total
        FROM accounts a
        LEFT JOIN journal_entries j ON a.id = j.account_id
          AND j.entry_date BETWEEN ? AND ?
        WHERE a.type = 'revenue' AND a.is_active = 1
        GROUP BY a.id
        ORDER BY a.code
      `).all(startDate, endDate) as any[];

            // Expense accounts (type = 'expense')
            const expenses = db.prepare(`
        SELECT a.code, a.name_fr, a.name_ar,
          SUM(j.debit) - SUM(j.credit) as total
        FROM accounts a
        LEFT JOIN journal_entries j ON a.id = j.account_id
          AND j.entry_date BETWEEN ? AND ?
        WHERE a.type = 'expense' AND a.is_active = 1
        GROUP BY a.id
        ORDER BY a.code
      `).all(startDate, endDate) as any[];

            // Cost of goods sold
            const cogs = db.prepare(`
        SELECT SUM(j.debit) - SUM(j.credit) as total
        FROM journal_entries j
        JOIN accounts a ON j.account_id = a.id
        WHERE a.code LIKE '5%' AND j.entry_date BETWEEN ? AND ?
      `).get(startDate, endDate) as { total: number };

            const totalRevenue = revenue.reduce((sum, r) => sum + (r.total || 0), 0);
            const totalExpenses = expenses.reduce((sum, e) => sum + (e.total || 0), 0);
            const grossProfit = totalRevenue - (cogs?.total || 0);
            const netProfit = grossProfit - totalExpenses;

            return {
                success: true,
                report: {
                    period: { startDate, endDate },
                    revenue,
                    totalRevenue,
                    costOfGoodsSold: cogs?.total || 0,
                    grossProfit,
                    expenses,
                    totalExpenses,
                    netProfit,
                },
            };
        } catch (error) {
            console.error('Profit/Loss error:', error);
            return { success: false, error: (error as Error).message };
        }
    });

    // Get VAT summary
    ipcMain.handle('accounting:getVATSummary', async (_event, startDate: string, endDate: string) => {
        try {
            const db = getSqliteDb();

            // VAT collected from sales
            const vatCollected = db.prepare(`
        SELECT SUM(vat_amount) as total
        FROM sales
        WHERE sale_date BETWEEN ? AND ? AND status = 'completed'
      `).get(startDate, endDate) as { total: number };

            // VAT paid on purchases
            const vatPaid = db.prepare(`
        SELECT SUM(vat_amount) as total
        FROM purchases
        WHERE purchase_date BETWEEN ? AND ? AND status = 'received'
      `).get(startDate, endDate) as { total: number };

            // Breakdown by VAT rate
            const byRate = db.prepare(`
        SELECT si.vat_rate, SUM(si.vat_amount) as total
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
        GROUP BY si.vat_rate
        ORDER BY si.vat_rate
      `).all(startDate, endDate);

            const collected = vatCollected?.total || 0;
            const paid = vatPaid?.total || 0;
            const netVat = collected - paid;

            return {
                success: true,
                summary: {
                    period: { startDate, endDate },
                    vatCollected: collected,
                    vatPaid: paid,
                    netVatPayable: netVat,
                    byRate,
                },
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get cashier shift summary
    ipcMain.handle('accounting:getCashierSummary', async (_event, userId: number, date: string) => {
        try {
            const db = getSqliteDb();

            // Sales summary
            const salesSummary = db.prepare(`
        SELECT
          COUNT(*) as total_transactions,
          SUM(total) as total_sales,
          SUM(vat_amount) as total_vat,
          SUM(discount_amount) as total_discounts
        FROM sales
        WHERE user_id = ? AND DATE(sale_date) = DATE(?) AND status = 'completed'
      `).get(userId, date);

            // Payment breakdown
            const paymentBreakdown = db.prepare(`
        SELECT p.method, SUM(p.amount) as total
        FROM payments p
        JOIN sales s ON p.sale_id = s.id
        WHERE s.user_id = ? AND DATE(s.sale_date) = DATE(?) AND s.status = 'completed'
        GROUP BY p.method
      `).all(userId, date);

            // Voided sales
            const voidedSales = db.prepare(`
        SELECT COUNT(*) as count, SUM(total) as total
        FROM sales
        WHERE user_id = ? AND DATE(sale_date) = DATE(?) AND status = 'voided'
      `).get(userId, date);

            // Top products sold
            const topProducts = db.prepare(`
        SELECT si.product_name, SUM(si.quantity) as quantity_sold, SUM(si.total) as total_sales
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.user_id = ? AND DATE(s.sale_date) = DATE(?) AND s.status = 'completed'
        GROUP BY si.product_id
        ORDER BY quantity_sold DESC
        LIMIT 10
      `).all(userId, date);

            return {
                success: true,
                summary: {
                    userId,
                    date,
                    sales: salesSummary,
                    payments: paymentBreakdown,
                    voided: voidedSales,
                    topProducts,
                },
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // EXPENSES
    // =====================

    ipcMain.handle('expenses:getAll', async (_event, filters?: { startDate?: string; endDate?: string; categoryId?: number }) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT e.*, ec.name as category_name, u.full_name as user_name
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        JOIN users u ON e.user_id = u.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.startDate) {
                query += ' AND e.expense_date >= ?';
                params.push(filters.startDate);
            }

            if (filters?.endDate) {
                query += ' AND e.expense_date <= ?';
                params.push(filters.endDate);
            }

            if (filters?.categoryId) {
                query += ' AND e.category_id = ?';
                params.push(filters.categoryId);
            }

            query += ' ORDER BY e.expense_date DESC';

            const expenses = db.prepare(query).all(...params);
            return { success: true, expenses };
        } catch (error) {
            return { success: false, error: (error as Error).message, expenses: [] };
        }
    });

    ipcMain.handle('expenses:create', async (_event, data: {
        categoryId?: number;
        amount: number;
        description: string;
        expenseDate: string;
        paymentMethod: string;
        reference?: string;
        userId: number;
    }) => {
        const db = getSqliteDb();

        try {
            db.exec('BEGIN TRANSACTION');

            const result = db.prepare(`
        INSERT INTO expenses (category_id, amount, description, expense_date, payment_method, reference, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.categoryId, data.amount, data.description, data.expenseDate, data.paymentMethod, data.reference, data.userId);

            const expenseId = result.lastInsertRowid;

            // Create journal entry
            // Debit: Expense account, Credit: Cash/Bank
            let accountCode = '6000'; // Default expense
            if (data.categoryId) {
                const category = db.prepare('SELECT account_code FROM expense_categories WHERE id = ?').get(data.categoryId) as { account_code: string } | undefined;
                if (category?.account_code) {
                    accountCode = category.account_code;
                }
            }

            const expenseAccount = db.prepare('SELECT id FROM accounts WHERE code = ?').get(accountCode) as { id: number } | undefined;
            const cashAccount = db.prepare("SELECT id FROM accounts WHERE code = '1000'").get() as { id: number } | undefined;

            if (expenseAccount) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (?, ?, ?, 0, ?, 'expense', ?, ?)
        `).run(data.expenseDate, expenseAccount.id, data.amount, data.description, expenseId, data.userId);
            }

            if (cashAccount) {
                db.prepare(`
          INSERT INTO journal_entries (entry_date, account_id, debit, credit, description, reference_type, reference_id, user_id)
          VALUES (?, ?, 0, ?, ?, 'expense', ?, ?)
        `).run(data.expenseDate, cashAccount.id, data.amount, data.description, expenseId, data.userId);
            }

            db.exec('COMMIT');

            return { success: true, expenseId };
        } catch (error) {
            db.exec('ROLLBACK');
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('expenses:getCategories', async () => {
        try {
            const db = getSqliteDb();
            const categories = db.prepare('SELECT * FROM expense_categories WHERE is_active = 1 ORDER BY name').all();
            return { success: true, categories };
        } catch (error) {
            return { success: false, error: (error as Error).message, categories: [] };
        }
    });
}
