import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// USERS & AUTHENTICATION
// ============================================

export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
    fullName: text('full_name').notNull(),
    fullNameAr: text('full_name_ar'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at'),
    lastLogin: text('last_login'),
});

export const sessions = sqliteTable('sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id),
    token: text('token').notNull().unique(),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    expiresAt: text('expires_at').notNull(),
});

// ============================================
// STORE CONFIGURATION
// ============================================

export const storeConfig = sqliteTable('store_config', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    storeType: text('store_type').notNull(),
    storeName: text('store_name').notNull(),
    storeNameAr: text('store_name_ar'),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    taxId: text('tax_id'),
    currency: text('currency').notNull().default('DZD'),
    currencySymbol: text('currency_symbol').notNull().default('د.ج'),
    vatRate: real('vat_rate').notNull().default(19),
    invoicePrefix: text('invoice_prefix').notNull().default('INV'),
    invoiceNextNumber: integer('invoice_next_number').notNull().default(1),
    thermalPrinter: text('thermal_printer'),
    a4Printer: text('a4_printer'),
    language: text('language').notNull().default('fr'),
    settingsJson: text('settings_json'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at'),
});

// ============================================
// PRODUCTS & CATEGORIES
// ============================================

export const productCategories = sqliteTable('product_categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nameAr: text('name_ar'),
    parentId: integer('parent_id'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const products = sqliteTable('products', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    barcode: text('barcode').unique(),
    sku: text('sku').unique(),
    nameFr: text('name_fr').notNull(),
    nameAr: text('name_ar'),
    description: text('description'),
    categoryId: integer('category_id').references(() => productCategories.id),
    purchasePrice: real('purchase_price').notNull().default(0),
    salePrice: real('sale_price').notNull().default(0),
    wholesalePrice: real('wholesale_price'),
    vatRate: real('vat_rate').notNull().default(19),
    stockQuantity: integer('stock_quantity').notNull().default(0),
    minStockLevel: integer('min_stock_level').notNull().default(5),
    unit: text('unit').notNull().default('pcs'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    imageUrl: text('image_url'),
    // Store-type specific fields
    expiryDate: text('expiry_date'),
    batchNumber: text('batch_number'),
    serialNumber: text('serial_number'),
    size: text('size'),
    color: text('color'),
    weight: real('weight'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
    updatedAt: text('updated_at'),
});

// ============================================
// STOCK MOVEMENTS
// ============================================

export const stockMovements = sqliteTable('stock_movements', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id').notNull().references(() => products.id),
    type: text('type', { enum: ['in', 'out', 'adjustment'] }).notNull(),
    quantity: integer('quantity').notNull(),
    previousStock: integer('previous_stock').notNull(),
    newStock: integer('new_stock').notNull(),
    reason: text('reason'),
    referenceType: text('reference_type'),
    referenceId: integer('reference_id'),
    userId: integer('user_id').notNull().references(() => users.id),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================
// SUPPLIERS & CLIENTS
// ============================================

export const suppliers = sqliteTable('suppliers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nameAr: text('name_ar'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    taxId: text('tax_id'),
    balance: real('balance').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const clients = sqliteTable('clients', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nameAr: text('name_ar'),
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    taxId: text('tax_id'),
    balance: real('balance').notNull().default(0),
    creditLimit: real('credit_limit').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================
// SALES
// ============================================

export const sales = sqliteTable('sales', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    invoiceNumber: text('invoice_number').notNull().unique(),
    userId: integer('user_id').notNull().references(() => users.id),
    clientId: integer('client_id').references(() => clients.id),
    saleDate: text('sale_date').notNull(),
    subtotal: real('subtotal').notNull(),
    discountAmount: real('discount_amount').notNull().default(0),
    discountPercent: real('discount_percent').notNull().default(0),
    vatAmount: real('vat_amount').notNull().default(0),
    total: real('total').notNull(),
    amountPaid: real('amount_paid').notNull().default(0),
    changeAmount: real('change_amount').notNull().default(0),
    status: text('status', { enum: ['completed', 'pending', 'voided'] }).notNull().default('completed'),
    notes: text('notes'),
    voidReason: text('void_reason'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const saleItems = sqliteTable('sale_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    saleId: integer('sale_id').notNull().references(() => sales.id),
    productId: integer('product_id').notNull().references(() => products.id),
    productName: text('product_name').notNull(),
    barcode: text('barcode'),
    quantity: integer('quantity').notNull(),
    unitPrice: real('unit_price').notNull(),
    discount: real('discount').notNull().default(0),
    vatRate: real('vat_rate').notNull(),
    vatAmount: real('vat_amount').notNull(),
    total: real('total').notNull(),
});

export const payments = sqliteTable('payments', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    saleId: integer('sale_id').references(() => sales.id),
    purchaseId: integer('purchase_id').references(() => purchases.id),
    amount: real('amount').notNull(),
    method: text('method', { enum: ['cash', 'card', 'check', 'credit', 'bank_transfer'] }).notNull(),
    reference: text('reference'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================
// PURCHASES
// ============================================

export const purchases = sqliteTable('purchases', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    referenceNumber: text('reference_number').notNull().unique(),
    supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
    userId: integer('user_id').notNull().references(() => users.id),
    purchaseDate: text('purchase_date').notNull(),
    subtotal: real('subtotal').notNull(),
    vatAmount: real('vat_amount').notNull().default(0),
    total: real('total').notNull(),
    amountPaid: real('amount_paid').notNull().default(0),
    status: text('status', { enum: ['received', 'pending', 'cancelled'] }).notNull().default('received'),
    notes: text('notes'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const purchaseItems = sqliteTable('purchase_items', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    purchaseId: integer('purchase_id').notNull().references(() => purchases.id),
    productId: integer('product_id').notNull().references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPrice: real('unit_price').notNull(),
    vatRate: real('vat_rate').notNull(),
    vatAmount: real('vat_amount').notNull(),
    total: real('total').notNull(),
});

// ============================================
// ACCOUNTING
// ============================================

export const accounts = sqliteTable('accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    nameFr: text('name_fr').notNull(),
    nameAr: text('name_ar'),
    type: text('type', { enum: ['asset', 'liability', 'equity', 'revenue', 'expense'] }).notNull(),
    parentCode: text('parent_code'),
    balance: real('balance').notNull().default(0),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const journalEntries = sqliteTable('journal_entries', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    entryDate: text('entry_date').notNull(),
    accountId: integer('account_id').notNull().references(() => accounts.id),
    debit: real('debit').notNull().default(0),
    credit: real('credit').notNull().default(0),
    description: text('description'),
    referenceType: text('reference_type'),
    referenceId: integer('reference_id'),
    userId: integer('user_id').notNull().references(() => users.id),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

export const expenseCategories = sqliteTable('expense_categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    nameAr: text('name_ar'),
    accountCode: text('account_code'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const expenses = sqliteTable('expenses', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoryId: integer('category_id').references(() => expenseCategories.id),
    amount: real('amount').notNull(),
    description: text('description').notNull(),
    expenseDate: text('expense_date').notNull(),
    paymentMethod: text('payment_method').notNull().default('cash'),
    reference: text('reference'),
    userId: integer('user_id').notNull().references(() => users.id),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================
// AUDIT LOG
// ============================================

export const auditLog = sqliteTable('audit_log', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id),
    action: text('action').notNull(),
    tableName: text('table_name'),
    recordId: integer('record_id'),
    oldValues: text('old_values'),
    newValues: text('new_values'),
    ipAddress: text('ip_address'),
    createdAt: text('created_at').notNull().default('CURRENT_TIMESTAMP'),
});

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
    sales: many(sales),
    sessions: many(sessions),
    stockMovements: many(stockMovements),
    auditLogs: many(auditLog),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
    category: one(productCategories, {
        fields: [products.categoryId],
        references: [productCategories.id],
    }),
    stockMovements: many(stockMovements),
    saleItems: many(saleItems),
    purchaseItems: many(purchaseItems),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
    user: one(users, {
        fields: [sales.userId],
        references: [users.id],
    }),
    client: one(clients, {
        fields: [sales.clientId],
        references: [clients.id],
    }),
    items: many(saleItems),
    payments: many(payments),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [purchases.supplierId],
        references: [suppliers.id],
    }),
    user: one(users, {
        fields: [purchases.userId],
        references: [users.id],
    }),
    items: many(purchaseItems),
    payments: many(payments),
}));
