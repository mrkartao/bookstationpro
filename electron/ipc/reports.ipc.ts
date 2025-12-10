import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';
import { PrinterService } from '../services/printer.service';

export function registerReportsIPC(ipcMain: IpcMain): void {
    // Sales report
    ipcMain.handle('reports:salesReport', async (_event, params: {
        startDate: string;
        endDate: string;
        groupBy?: 'day' | 'week' | 'month';
        userId?: number;
    }) => {
        try {
            const db = getSqliteDb();

            // Summary
            const summary = db.prepare(`
        SELECT
          COUNT(*) as total_transactions,
          SUM(total) as total_revenue,
          SUM(vat_amount) as total_vat,
          SUM(discount_amount) as total_discounts,
          AVG(total) as average_sale
        FROM sales
        WHERE sale_date BETWEEN ? AND ? AND status = 'completed'
        ${params.userId ? 'AND user_id = ?' : ''}
      `).get(params.startDate, params.endDate, ...(params.userId ? [params.userId] : []));

            // Daily breakdown
            let groupQuery = '';
            switch (params.groupBy) {
                case 'week':
                    groupQuery = "strftime('%Y-W%W', sale_date)";
                    break;
                case 'month':
                    groupQuery = "strftime('%Y-%m', sale_date)";
                    break;
                default:
                    groupQuery = "DATE(sale_date)";
            }

            const breakdown = db.prepare(`
        SELECT
          ${groupQuery} as period,
          COUNT(*) as transactions,
          SUM(total) as revenue,
          SUM(vat_amount) as vat
        FROM sales
        WHERE sale_date BETWEEN ? AND ? AND status = 'completed'
        ${params.userId ? 'AND user_id = ?' : ''}
        GROUP BY ${groupQuery}
        ORDER BY period ASC
      `).all(params.startDate, params.endDate, ...(params.userId ? [params.userId] : []));

            // Top products
            const topProducts = db.prepare(`
        SELECT si.product_name, SUM(si.quantity) as quantity, SUM(si.total) as revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
        GROUP BY si.product_id
        ORDER BY revenue DESC
        LIMIT 20
      `).all(params.startDate, params.endDate);

            // By payment method
            const byPaymentMethod = db.prepare(`
        SELECT p.method, SUM(p.amount) as total
        FROM payments p
        JOIN sales s ON p.sale_id = s.id
        WHERE s.sale_date BETWEEN ? AND ? AND s.status = 'completed'
        GROUP BY p.method
      `).all(params.startDate, params.endDate);

            return {
                success: true,
                report: {
                    period: { startDate: params.startDate, endDate: params.endDate },
                    summary,
                    breakdown,
                    topProducts,
                    byPaymentMethod,
                },
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Inventory report
    ipcMain.handle('reports:inventoryReport', async (_event, params: {
        categoryId?: number;
        lowStockOnly?: boolean;
        includeInactive?: boolean;
    }) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT p.*, c.name as category_name,
          (p.stock_quantity * p.purchase_price) as stock_value,
          (p.sale_price - p.purchase_price) as margin,
          CASE WHEN p.purchase_price > 0 THEN ((p.sale_price - p.purchase_price) / p.purchase_price * 100) ELSE 0 END as margin_percent
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE 1=1
      `;
            const queryParams: any[] = [];

            if (!params.includeInactive) {
                query += ' AND p.is_active = 1';
            }

            if (params.categoryId) {
                query += ' AND p.category_id = ?';
                queryParams.push(params.categoryId);
            }

            if (params.lowStockOnly) {
                query += ' AND p.stock_quantity <= p.min_stock_level';
            }

            query += ' ORDER BY p.name_fr ASC';

            const products = db.prepare(query).all(...queryParams) as any[];

            // Summary
            const totalProducts = products.length;
            const totalStockValue = products.reduce((sum, p) => sum + (p.stock_value || 0), 0);
            const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_level).length;
            const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

            return {
                success: true,
                report: {
                    products,
                    summary: {
                        totalProducts,
                        totalStockValue,
                        lowStockCount,
                        outOfStockCount,
                    },
                },
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Price list
    ipcMain.handle('reports:priceList', async (_event, params: {
        categoryId?: number;
        sortBy?: 'name' | 'price' | 'margin';
        sortOrder?: 'asc' | 'desc';
    }) => {
        try {
            const db = getSqliteDb();

            let orderBy = 'p.name_fr';
            switch (params.sortBy) {
                case 'price':
                    orderBy = 'p.sale_price';
                    break;
                case 'margin':
                    orderBy = '(p.sale_price - p.purchase_price)';
                    break;
            }

            const order = params.sortOrder === 'desc' ? 'DESC' : 'ASC';

            let query = `
        SELECT p.id, p.barcode, p.name_fr, p.name_ar, p.sale_price, p.purchase_price, p.vat_rate,
          c.name as category_name, c.name_ar as category_name_ar,
          (p.sale_price - p.purchase_price) as margin
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.is_active = 1
      `;
            const queryParams: any[] = [];

            if (params.categoryId) {
                query += ' AND p.category_id = ?';
                queryParams.push(params.categoryId);
            }

            query += ` ORDER BY ${orderBy} ${order}`;

            const products = db.prepare(query).all(...queryParams);

            return { success: true, products };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Profit & Loss (delegated to accounting)
    ipcMain.handle('reports:profitLoss', async (_event) => {
        // This is handled by accounting:getProfitLoss
        return { success: true };
    });

    // Client balances
    ipcMain.handle('reports:clientBalances', async () => {
        try {
            const db = getSqliteDb();

            const clients = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM sales WHERE client_id = c.id) as total_purchases,
          (SELECT SUM(total) FROM sales WHERE client_id = c.id AND status = 'completed') as total_spent
        FROM clients c
        WHERE c.is_active = 1 AND c.balance != 0
        ORDER BY c.balance DESC
      `).all();

            const totalBalance = (clients as any[]).reduce((sum, c) => sum + c.balance, 0);

            return { success: true, clients, totalBalance };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Supplier balances
    ipcMain.handle('reports:supplierBalances', async () => {
        try {
            const db = getSqliteDb();

            const suppliers = db.prepare(`
        SELECT s.*,
          (SELECT COUNT(*) FROM purchases WHERE supplier_id = s.id) as total_purchases,
          (SELECT SUM(total) FROM purchases WHERE supplier_id = s.id AND status = 'received') as total_purchased
        FROM suppliers s
        WHERE s.is_active = 1 AND s.balance != 0
        ORDER BY s.balance DESC
      `).all();

            const totalBalance = (suppliers as any[]).reduce((sum, s) => sum + s.balance, 0);

            return { success: true, suppliers, totalBalance };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Export report to PDF
    ipcMain.handle('reports:exportToPDF', async (_event, reportData: any, filePath: string) => {
        try {
            const result = await PrinterService.generatePDF({
                title: reportData.title,
                header: reportData.header,
                items: reportData.items,
                summary: reportData.summary,
                footer: reportData.footer,
            }, filePath, { format: 'a4', language: reportData.language || 'fr' });

            return result;
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Dashboard stats
    ipcMain.handle('dashboard:getStats', async () => {
        try {
            const db = getSqliteDb();

            const today = new Date().toISOString().split('T')[0];
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

            // Today's sales
            const todaySales = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE DATE(sale_date) = DATE(?) AND status = 'completed'
      `).get(today) as { count: number; total: number };

            // This month's sales
            const monthSales = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE sale_date >= ? AND status = 'completed'
      `).get(startOfMonth) as { count: number; total: number };

            // Low stock count
            const lowStock = db.prepare(`
        SELECT COUNT(*) as count
        FROM products
        WHERE stock_quantity <= min_stock_level AND is_active = 1
      `).get() as { count: number };

            // Product count
            const productCount = db.prepare(`
        SELECT COUNT(*) as count FROM products WHERE is_active = 1
      `).get() as { count: number };

            // Recent sales trend (last 7 days)
            const salesTrend = db.prepare(`
        SELECT DATE(sale_date) as date, SUM(total) as total
        FROM sales
        WHERE sale_date >= date('now', '-7 days') AND status = 'completed'
        GROUP BY DATE(sale_date)
        ORDER BY date ASC
      `).all();

            return {
                success: true,
                stats: {
                    todaySales: todaySales.total,
                    todayTransactions: todaySales.count,
                    monthSales: monthSales.total,
                    monthTransactions: monthSales.count,
                    lowStockCount: lowStock.count,
                    productCount: productCount.count,
                    salesTrend,
                },
            };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Recent sales for dashboard
    ipcMain.handle('dashboard:getRecentSales', async (_event, limit: number) => {
        try {
            const db = getSqliteDb();

            const sales = db.prepare(`
        SELECT s.id, s.invoice_number, s.total, s.sale_date, u.full_name as cashier
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE s.status = 'completed'
        ORDER BY s.created_at DESC
        LIMIT ?
      `).all(limit);

            return { success: true, sales };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Low stock alerts
    ipcMain.handle('dashboard:getLowStockAlerts', async () => {
        try {
            const db = getSqliteDb();

            const products = db.prepare(`
        SELECT id, name_fr, name_ar, stock_quantity, min_stock_level
        FROM products
        WHERE stock_quantity <= min_stock_level AND is_active = 1
        ORDER BY stock_quantity ASC
        LIMIT 10
      `).all();

            return { success: true, products };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
