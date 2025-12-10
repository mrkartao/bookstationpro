import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';

interface ProductFilters {
    categoryId?: number;
    search?: string;
    isActive?: boolean;
    lowStock?: boolean;
}

interface ProductData {
    barcode?: string;
    sku?: string;
    nameFr: string;
    nameAr?: string;
    description?: string;
    categoryId?: number;
    purchasePrice: number;
    salePrice: number;
    wholesalePrice?: number;
    vatRate: number;
    stockQuantity?: number;
    minStockLevel?: number;
    unit?: string;
    expiryDate?: string;
    batchNumber?: string;
    serialNumber?: string;
    size?: string;
    color?: string;
    weight?: number;
}

export function registerProductsIPC(ipcMain: IpcMain): void {
    // Get all products
    ipcMain.handle('products:getAll', async (_event, filters?: ProductFilters) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.categoryId) {
                query += ' AND p.category_id = ?';
                params.push(filters.categoryId);
            }

            if (filters?.search) {
                query += ' AND (p.name_fr LIKE ? OR p.name_ar LIKE ? OR p.barcode LIKE ?)';
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm);
            }

            if (filters?.isActive !== undefined) {
                query += ' AND p.is_active = ?';
                params.push(filters.isActive ? 1 : 0);
            }

            if (filters?.lowStock) {
                query += ' AND p.stock_quantity <= p.min_stock_level';
            }

            query += ' ORDER BY p.name_fr ASC';

            const products = db.prepare(query).all(...params);

            return { success: true, products };
        } catch (error) {
            console.error('Get products error:', error);
            return { success: false, error: (error as Error).message, products: [] };
        }
    });

    // Get product by ID
    ipcMain.handle('products:getById', async (_event, id: number) => {
        try {
            const db = getSqliteDb();

            const product = db.prepare(`
        SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.id = ?
      `).get(id);

            return { success: true, product };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get product by barcode
    ipcMain.handle('products:getByBarcode', async (_event, barcode: string) => {
        try {
            const db = getSqliteDb();

            const product = db.prepare(`
        SELECT p.*, c.name as category_name, c.name_ar as category_name_ar
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.barcode = ? AND p.is_active = 1
      `).get(barcode);

            if (!product) {
                return { success: false, error: 'Produit non trouvé' };
            }

            return { success: true, product };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Create product
    ipcMain.handle('products:create', async (_event, data: ProductData) => {
        try {
            const db = getSqliteDb();

            // Check if barcode already exists
            if (data.barcode) {
                const existing = db.prepare('SELECT id FROM products WHERE barcode = ?').get(data.barcode);
                if (existing) {
                    return { success: false, error: 'Ce code-barres existe déjà' };
                }
            }

            const result = db.prepare(`
        INSERT INTO products (
          barcode, sku, name_fr, name_ar, description, category_id,
          purchase_price, sale_price, wholesale_price, vat_rate,
          stock_quantity, min_stock_level, unit, expiry_date,
          batch_number, serial_number, size, color, weight
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                data.barcode || null,
                data.sku || null,
                data.nameFr,
                data.nameAr || null,
                data.description || null,
                data.categoryId || null,
                data.purchasePrice,
                data.salePrice,
                data.wholesalePrice || null,
                data.vatRate,
                data.stockQuantity || 0,
                data.minStockLevel || 5,
                data.unit || 'pcs',
                data.expiryDate || null,
                data.batchNumber || null,
                data.serialNumber || null,
                data.size || null,
                data.color || null,
                data.weight || null
            );

            return { success: true, productId: result.lastInsertRowid };
        } catch (error) {
            console.error('Create product error:', error);
            return { success: false, error: 'Erreur lors de la création du produit' };
        }
    });

    // Update product
    ipcMain.handle('products:update', async (_event, id: number, data: Partial<ProductData>) => {
        try {
            const db = getSqliteDb();

            const updates: string[] = [];
            const values: any[] = [];

            const fields: { [key: string]: string } = {
                barcode: 'barcode',
                sku: 'sku',
                nameFr: 'name_fr',
                nameAr: 'name_ar',
                description: 'description',
                categoryId: 'category_id',
                purchasePrice: 'purchase_price',
                salePrice: 'sale_price',
                wholesalePrice: 'wholesale_price',
                vatRate: 'vat_rate',
                stockQuantity: 'stock_quantity',
                minStockLevel: 'min_stock_level',
                unit: 'unit',
                expiryDate: 'expiry_date',
                batchNumber: 'batch_number',
                serialNumber: 'serial_number',
                size: 'size',
                color: 'color',
                weight: 'weight',
            };

            for (const [key, column] of Object.entries(fields)) {
                if (data[key as keyof ProductData] !== undefined) {
                    updates.push(`${column} = ?`);
                    values.push(data[key as keyof ProductData]);
                }
            }

            if (updates.length === 0) {
                return { success: false, error: 'Aucune donnée à mettre à jour' };
            }

            updates.push('updated_at = datetime("now")');
            values.push(id);

            db.prepare(`
        UPDATE products
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);

            return { success: true };
        } catch (error) {
            console.error('Update product error:', error);
            return { success: false, error: 'Erreur lors de la mise à jour' };
        }
    });

    // Delete product (soft delete)
    ipcMain.handle('products:delete', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get low stock products
    ipcMain.handle('products:getLowStock', async () => {
        try {
            const db = getSqliteDb();

            const products = db.prepare(`
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE p.stock_quantity <= p.min_stock_level AND p.is_active = 1
        ORDER BY p.stock_quantity ASC
      `).all();

            return { success: true, products };
        } catch (error) {
            return { success: false, error: (error as Error).message, products: [] };
        }
    });

    // Import products from file
    ipcMain.handle('products:import', async (_event, filePath: string) => {
        try {
            // Import logic would use xlsx library to parse Excel/CSV
            // This is a placeholder for the full implementation
            return { success: true, imported: 0, errors: [] };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Export products to file
    ipcMain.handle('products:export', async (_event, filePath: string, format: string) => {
        try {
            // Export logic would generate Excel/CSV file
            return { success: true, path: filePath };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // CATEGORIES
    // =====================

    ipcMain.handle('categories:getAll', async () => {
        try {
            const db = getSqliteDb();
            const categories = db.prepare(`
        SELECT * FROM product_categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, name ASC
      `).all();
            return { success: true, categories };
        } catch (error) {
            return { success: false, error: (error as Error).message, categories: [] };
        }
    });

    ipcMain.handle('categories:create', async (_event, data: { name: string; nameAr?: string; parentId?: number }) => {
        try {
            const db = getSqliteDb();
            const result = db.prepare(`
        INSERT INTO product_categories (name, name_ar, parent_id)
        VALUES (?, ?, ?)
      `).run(data.name, data.nameAr || null, data.parentId || null);
            return { success: true, categoryId: result.lastInsertRowid };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('categories:update', async (_event, id: number, data: { name?: string; nameAr?: string; sortOrder?: number }) => {
        try {
            const db = getSqliteDb();
            const updates: string[] = [];
            const values: any[] = [];

            if (data.name) {
                updates.push('name = ?');
                values.push(data.name);
            }
            if (data.nameAr !== undefined) {
                updates.push('name_ar = ?');
                values.push(data.nameAr);
            }
            if (data.sortOrder !== undefined) {
                updates.push('sort_order = ?');
                values.push(data.sortOrder);
            }

            values.push(id);
            db.prepare(`UPDATE product_categories SET ${updates.join(', ')} WHERE id = ?`).run(...values);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('categories:delete', async (_event, id: number) => {
        try {
            const db = getSqliteDb();
            db.prepare('UPDATE product_categories SET is_active = 0 WHERE id = ?').run(id);
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // =====================
    // STOCK MOVEMENTS
    // =====================

    ipcMain.handle('stock:addMovement', async (_event, data: {
        productId: number;
        type: 'in' | 'out' | 'adjustment';
        quantity: number;
        reason?: string;
        userId: number;
    }) => {
        try {
            const db = getSqliteDb();

            // Get current stock
            const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(data.productId) as { stock_quantity: number } | undefined;
            if (!product) {
                return { success: false, error: 'Produit non trouvé' };
            }

            const previousStock = product.stock_quantity;
            let newStock = previousStock;

            if (data.type === 'in') {
                newStock = previousStock + data.quantity;
            } else if (data.type === 'out') {
                newStock = previousStock - data.quantity;
                if (newStock < 0) {
                    return { success: false, error: 'Stock insuffisant' };
                }
            } else {
                newStock = data.quantity; // Direct adjustment
            }

            // Update product stock
            db.prepare('UPDATE products SET stock_quantity = ?, updated_at = datetime("now") WHERE id = ?').run(newStock, data.productId);

            // Record movement
            db.prepare(`
        INSERT INTO stock_movements (product_id, type, quantity, previous_stock, new_stock, reason, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(data.productId, data.type, data.quantity, previousStock, newStock, data.reason || null, data.userId);

            return { success: true, newStock };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    ipcMain.handle('stock:getMovements', async (_event, filters?: { productId?: number; startDate?: string; endDate?: string }) => {
        try {
            const db = getSqliteDb();

            let query = `
        SELECT sm.*, p.name_fr as product_name, p.barcode, u.full_name as user_name
        FROM stock_movements sm
        JOIN products p ON sm.product_id = p.id
        JOIN users u ON sm.user_id = u.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (filters?.productId) {
                query += ' AND sm.product_id = ?';
                params.push(filters.productId);
            }

            if (filters?.startDate) {
                query += ' AND sm.created_at >= ?';
                params.push(filters.startDate);
            }

            if (filters?.endDate) {
                query += ' AND sm.created_at <= ?';
                params.push(filters.endDate);
            }

            query += ' ORDER BY sm.created_at DESC LIMIT 500';

            const movements = db.prepare(query).all(...params);
            return { success: true, movements };
        } catch (error) {
            return { success: false, error: (error as Error).message, movements: [] };
        }
    });

    ipcMain.handle('stock:adjust', async (_event, productId: number, quantity: number, reason: string) => {
        // This is handled by stock:addMovement with type 'adjustment'
        return { success: true };
    });
}
