import { IpcMain } from 'electron';
import { getSqliteDb } from '../services/database.service';

export function registerSettingsIPC(ipcMain: IpcMain): void {
    // Get settings
    ipcMain.handle('settings:get', async () => {
        try {
            const db = getSqliteDb();
            const config = db.prepare('SELECT * FROM store_config LIMIT 1').get();
            return { success: true, settings: config };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Update settings
    ipcMain.handle('settings:update', async (_event, settings: any) => {
        try {
            const db = getSqliteDb();

            const updates: string[] = [];
            const values: any[] = [];

            const fields: { [key: string]: string } = {
                storeName: 'store_name',
                storeNameAr: 'store_name_ar',
                address: 'address',
                phone: 'phone',
                email: 'email',
                taxId: 'tax_id',
                currency: 'currency',
                currencySymbol: 'currency_symbol',
                vatRate: 'vat_rate',
                invoicePrefix: 'invoice_prefix',
                thermalPrinter: 'thermal_printer',
                a4Printer: 'a4_printer',
                language: 'language',
            };

            for (const [key, column] of Object.entries(fields)) {
                if (settings[key] !== undefined) {
                    updates.push(`${column} = ?`);
                    values.push(settings[key]);
                }
            }

            if (updates.length > 0) {
                updates.push('updated_at = datetime("now")');

                // Check if config exists
                const existing = db.prepare('SELECT id FROM store_config LIMIT 1').get();

                if (existing) {
                    db.prepare(`UPDATE store_config SET ${updates.join(', ')}`).run(...values);
                } else {
                    // Create initial config
                    db.prepare(`
            INSERT INTO store_config (store_type, store_name, language)
            VALUES ('general', ?, ?)
          `).run(settings.storeName || 'My Store', settings.language || 'fr');
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Get store config
    ipcMain.handle('settings:getStoreConfig', async () => {
        try {
            const db = getSqliteDb();
            const config = db.prepare('SELECT * FROM store_config LIMIT 1').get();

            if (!config) {
                // Return default config
                return {
                    success: true,
                    config: {
                        storeType: null,
                        storeName: '',
                        language: 'fr',
                        currency: 'DZD',
                        vatRate: 19,
                    },
                };
            }

            return { success: true, config };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Update store config
    ipcMain.handle('settings:updateStoreConfig', async (_event, config: any) => {
        try {
            const db = getSqliteDb();

            const existing = db.prepare('SELECT id FROM store_config LIMIT 1').get();

            if (existing) {
                db.prepare(`
          UPDATE store_config SET
            store_type = ?,
            store_name = ?,
            store_name_ar = ?,
            address = ?,
            phone = ?,
            email = ?,
            tax_id = ?,
            currency = ?,
            currency_symbol = ?,
            vat_rate = ?,
            settings_json = ?,
            updated_at = datetime('now')
        `).run(
                    config.storeType,
                    config.storeName,
                    config.storeNameAr || null,
                    config.address || null,
                    config.phone || null,
                    config.email || null,
                    config.taxId || null,
                    config.currency || 'DZD',
                    config.currencySymbol || 'د.ج',
                    config.vatRate || 19,
                    config.settingsJson ? JSON.stringify(config.settingsJson) : null
                );
            } else {
                db.prepare(`
          INSERT INTO store_config (store_type, store_name, store_name_ar, address, phone, email, tax_id, currency, currency_symbol, vat_rate, settings_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
                    config.storeType,
                    config.storeName,
                    config.storeNameAr || null,
                    config.address || null,
                    config.phone || null,
                    config.email || null,
                    config.taxId || null,
                    config.currency || 'DZD',
                    config.currencySymbol || 'د.ج',
                    config.vatRate || 19,
                    config.settingsJson ? JSON.stringify(config.settingsJson) : null
                );
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Set store type
    ipcMain.handle('settings:setStoreType', async (_event, storeType: string) => {
        try {
            const db = getSqliteDb();

            // Store type configurations
            const storeConfigs: { [key: string]: { categories: string[]; categoriesAr: string[] } } = {
                grocery: {
                    categories: ['Fruits', 'Légumes', 'Boissons', 'Produits laitiers', 'Boulangerie', 'Épices', 'Conserves'],
                    categoriesAr: ['فواكه', 'خضروات', 'مشروبات', 'منتجات الألبان', 'مخبوزات', 'توابل', 'معلبات'],
                },
                clothing: {
                    categories: ['Hommes', 'Femmes', 'Enfants', 'Accessoires', 'Chaussures', 'Sport'],
                    categoriesAr: ['رجال', 'نساء', 'أطفال', 'إكسسوارات', 'أحذية', 'رياضة'],
                },
                electronics: {
                    categories: ['Téléphones', 'Ordinateurs', 'Tablettes', 'Accessoires', 'TV & Audio', 'Gaming'],
                    categoriesAr: ['هواتف', 'حواسيب', 'لوحات', 'إكسسوارات', 'تلفزيون وصوت', 'ألعاب'],
                },
                pharmacy: {
                    categories: ['Médicaments', 'Cosmétiques', 'Parapharmacie', 'Hygiène', 'Bébé', 'Vitamines'],
                    categoriesAr: ['أدوية', 'مستحضرات تجميل', 'شبه صيدلية', 'نظافة', 'أطفال', 'فيتامينات'],
                },
                general: {
                    categories: ['Catégorie 1', 'Catégorie 2', 'Catégorie 3'],
                    categoriesAr: ['فئة 1', 'فئة 2', 'فئة 3'],
                },
            };

            const config = storeConfigs[storeType] || storeConfigs.general;

            // Update store type
            const existing = db.prepare('SELECT id FROM store_config LIMIT 1').get();

            if (existing) {
                db.prepare('UPDATE store_config SET store_type = ?, updated_at = datetime("now")').run(storeType);
            } else {
                db.prepare(`
          INSERT INTO store_config (store_type, store_name, language)
          VALUES (?, 'My Store', 'fr')
        `).run(storeType);
            }

            // Add default categories for this store type
            const existingCategories = db.prepare('SELECT COUNT(*) as count FROM product_categories').get() as { count: number };

            if (existingCategories.count === 0) {
                const insertCategory = db.prepare(`
          INSERT INTO product_categories (name, name_ar, sort_order)
          VALUES (?, ?, ?)
        `);

                for (let i = 0; i < config.categories.length; i++) {
                    insertCategory.run(config.categories[i], config.categoriesAr[i], i);
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Backup database
    ipcMain.handle('settings:backup', async (_event, filePath: string) => {
        try {
            const db = getSqliteDb();
            db.backup(filePath);
            return { success: true, path: filePath };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Restore database
    ipcMain.handle('settings:restore', async (_event, filePath: string) => {
        try {
            // This would require closing the current connection and replacing the database file
            // Then reopening the connection
            return { success: false, error: 'La restauration nécessite un redémarrage de l\'application' };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });
}
