import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import * as schema from '../../database/schema';
import bcrypt from 'bcryptjs';

let db: ReturnType<typeof drizzle> | null = null;
let sqliteDb: Database.Database | null = null;

const DB_NAME = 'bookstation.db';

export function getDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, DB_NAME);
}

export async function initDatabase(): Promise<void> {
    const dbPath = getDatabasePath();
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create SQLite connection
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.pragma('foreign_keys = ON');

    // Initialize Drizzle ORM
    db = drizzle(sqliteDb, { schema });

    // Run migrations
    await runMigrations();

    // Seed default data
    await seedDefaultData();
}

async function runMigrations(): Promise<void> {
    if (!sqliteDb) return;

    // Create tables if they don't exist
    sqliteDb.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
      full_name TEXT NOT NULL,
      full_name_ar TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      last_login TEXT
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL
    );

    -- Store config table
    CREATE TABLE IF NOT EXISTS store_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_type TEXT NOT NULL,
      store_name TEXT NOT NULL,
      store_name_ar TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      tax_id TEXT,
      currency TEXT NOT NULL DEFAULT 'DZD',
      currency_symbol TEXT NOT NULL DEFAULT 'د.ج',
      vat_rate REAL NOT NULL DEFAULT 19,
      invoice_prefix TEXT NOT NULL DEFAULT 'INV',
      invoice_next_number INTEGER NOT NULL DEFAULT 1,
      thermal_printer TEXT,
      a4_printer TEXT,
      language TEXT NOT NULL DEFAULT 'fr',
      settings_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );

    -- Product categories table
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      parent_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT UNIQUE,
      sku TEXT UNIQUE,
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      description TEXT,
      category_id INTEGER REFERENCES product_categories(id),
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL,
      vat_rate REAL NOT NULL DEFAULT 19,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'pcs',
      is_active INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      expiry_date TEXT,
      batch_number TEXT,
      serial_number TEXT,
      size TEXT,
      color TEXT,
      weight REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    );

    -- Stock movements table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment')),
      quantity INTEGER NOT NULL,
      previous_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reason TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Suppliers table
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      balance REAL NOT NULL DEFAULT 0,
      credit_limit REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      client_id INTEGER REFERENCES clients(id),
      sale_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      discount_percent REAL NOT NULL DEFAULT 0,
      vat_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      change_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'voided')),
      notes TEXT,
      void_reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Sale items table
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      barcode TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL NOT NULL DEFAULT 0,
      vat_rate REAL NOT NULL,
      vat_amount REAL NOT NULL,
      total REAL NOT NULL
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id),
      purchase_id INTEGER REFERENCES purchases(id),
      amount REAL NOT NULL,
      method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'check', 'credit', 'bank_transfer')),
      reference TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Purchases table
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      purchase_date TEXT NOT NULL,
      subtotal REAL NOT NULL,
      vat_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received', 'pending', 'cancelled')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Purchase items table
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      vat_rate REAL NOT NULL,
      vat_amount REAL NOT NULL,
      total REAL NOT NULL
    );

    -- Accounts table (Chart of Accounts)
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name_fr TEXT NOT NULL,
      name_ar TEXT,
      type TEXT NOT NULL CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
      parent_code TEXT,
      balance REAL NOT NULL DEFAULT 0,
      is_system INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Journal entries table
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      debit REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      description TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Expense categories table
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_ar TEXT,
      account_code TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    -- Expenses table
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES expense_categories(id),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'cash',
      reference TEXT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      table_name TEXT,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
  `);
}

async function seedDefaultData(): Promise<void> {
    if (!sqliteDb) return;

    // Check if admin user exists
    const adminExists = sqliteDb.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    if (!adminExists) {
        // Create default admin user
        const passwordHash = await bcrypt.hash('admin123', 12);
        sqliteDb.prepare(`
      INSERT INTO users (username, password_hash, role, full_name, full_name_ar)
      VALUES (?, ?, 'admin', 'Administrator', 'المشرف')
    `).run('admin', passwordHash);
    }

    // Check if default accounts exist
    const accountsExist = sqliteDb.prepare('SELECT id FROM accounts LIMIT 1').get();

    if (!accountsExist) {
        // Insert default chart of accounts
        const defaultAccounts = [
            { code: '1000', nameFr: 'Caisse', nameAr: 'الصندوق', type: 'asset' },
            { code: '1100', nameFr: 'Banque', nameAr: 'البنك', type: 'asset' },
            { code: '1200', nameFr: 'Clients', nameAr: 'الزبائن', type: 'asset' },
            { code: '1300', nameFr: 'Stock', nameAr: 'المخزون', type: 'asset' },
            { code: '2000', nameFr: 'Fournisseurs', nameAr: 'الموردون', type: 'liability' },
            { code: '2100', nameFr: 'TVA à payer', nameAr: 'ضريبة القيمة المضافة', type: 'liability' },
            { code: '3000', nameFr: 'Capital', nameAr: 'رأس المال', type: 'equity' },
            { code: '4000', nameFr: 'Ventes', nameAr: 'المبيعات', type: 'revenue' },
            { code: '5000', nameFr: 'Coût des marchandises', nameAr: 'تكلفة البضائع', type: 'expense' },
            { code: '6000', nameFr: 'Charges générales', nameAr: 'المصاريف العامة', type: 'expense' },
            { code: '6100', nameFr: 'Loyer', nameAr: 'الإيجار', type: 'expense' },
            { code: '6200', nameFr: 'Salaires', nameAr: 'الرواتب', type: 'expense' },
            { code: '6300', nameFr: 'Électricité', nameAr: 'الكهرباء', type: 'expense' },
        ];

        const insertAccount = sqliteDb.prepare(`
      INSERT INTO accounts (code, name_fr, name_ar, type, is_system)
      VALUES (?, ?, ?, ?, 1)
    `);

        for (const account of defaultAccounts) {
            insertAccount.run(account.code, account.nameFr, account.nameAr, account.type);
        }
    }

    // Check if expense categories exist
    const categoriesExist = sqliteDb.prepare('SELECT id FROM expense_categories LIMIT 1').get();

    if (!categoriesExist) {
        const defaultCategories = [
            { name: 'Loyer', nameAr: 'الإيجار', accountCode: '6100' },
            { name: 'Salaires', nameAr: 'الرواتب', accountCode: '6200' },
            { name: 'Électricité', nameAr: 'الكهرباء', accountCode: '6300' },
            { name: 'Eau', nameAr: 'الماء', accountCode: '6000' },
            { name: 'Transport', nameAr: 'النقل', accountCode: '6000' },
            { name: 'Fournitures', nameAr: 'اللوازم', accountCode: '6000' },
        ];

        const insertCategory = sqliteDb.prepare(`
      INSERT INTO expense_categories (name, name_ar, account_code)
      VALUES (?, ?, ?)
    `);

        for (const cat of defaultCategories) {
            insertCategory.run(cat.name, cat.nameAr, cat.accountCode);
        }
    }
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized');
    }
    return db;
}

export function getSqliteDb() {
    if (!sqliteDb) {
        throw new Error('SQLite database not initialized');
    }
    return sqliteDb;
}

export function closeDatabase(): void {
    if (sqliteDb) {
        sqliteDb.close();
        sqliteDb = null;
        db = null;
    }
}
