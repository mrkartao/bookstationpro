import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Authentication
    auth: {
        login: (username: string, password: string) =>
            ipcRenderer.invoke('auth:login', username, password),
        logout: () => ipcRenderer.invoke('auth:logout'),
        getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
        createUser: (userData: any) => ipcRenderer.invoke('auth:createUser', userData),
        updateUser: (id: number, userData: any) =>
            ipcRenderer.invoke('auth:updateUser', id, userData),
        deleteUser: (id: number) => ipcRenderer.invoke('auth:deleteUser', id),
        getUsers: () => ipcRenderer.invoke('auth:getUsers'),
        changePassword: (userId: number, oldPass: string, newPass: string) =>
            ipcRenderer.invoke('auth:changePassword', userId, oldPass, newPass),
    },

    // Products
    products: {
        getAll: (filters?: any) => ipcRenderer.invoke('products:getAll', filters),
        getById: (id: number) => ipcRenderer.invoke('products:getById', id),
        getByBarcode: (barcode: string) =>
            ipcRenderer.invoke('products:getByBarcode', barcode),
        create: (data: any) => ipcRenderer.invoke('products:create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('products:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('products:delete', id),
        import: (filePath: string) => ipcRenderer.invoke('products:import', filePath),
        export: (filePath: string, format: string) =>
            ipcRenderer.invoke('products:export', filePath, format),
        getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    },

    // Categories
    categories: {
        getAll: () => ipcRenderer.invoke('categories:getAll'),
        create: (data: any) => ipcRenderer.invoke('categories:create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('categories:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('categories:delete', id),
    },

    // Stock
    stock: {
        addMovement: (data: any) => ipcRenderer.invoke('stock:addMovement', data),
        getMovements: (filters?: any) =>
            ipcRenderer.invoke('stock:getMovements', filters),
        adjustStock: (productId: number, quantity: number, reason: string) =>
            ipcRenderer.invoke('stock:adjust', productId, quantity, reason),
    },

    // Sales
    sales: {
        create: (saleData: any) => ipcRenderer.invoke('sales:create', saleData),
        getAll: (filters?: any) => ipcRenderer.invoke('sales:getAll', filters),
        getById: (id: number) => ipcRenderer.invoke('sales:getById', id),
        void: (id: number, reason: string) =>
            ipcRenderer.invoke('sales:void', id, reason),
        getByDateRange: (startDate: string, endDate: string) =>
            ipcRenderer.invoke('sales:getByDateRange', startDate, endDate),
        getDailySummary: (date: string) =>
            ipcRenderer.invoke('sales:getDailySummary', date),
    },

    // Purchases
    purchases: {
        create: (purchaseData: any) =>
            ipcRenderer.invoke('purchases:create', purchaseData),
        getAll: (filters?: any) => ipcRenderer.invoke('purchases:getAll', filters),
        getById: (id: number) => ipcRenderer.invoke('purchases:getById', id),
    },

    // Suppliers & Clients
    suppliers: {
        getAll: () => ipcRenderer.invoke('suppliers:getAll'),
        create: (data: any) => ipcRenderer.invoke('suppliers:create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('suppliers:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('suppliers:delete', id),
        getBalance: (id: number) => ipcRenderer.invoke('suppliers:getBalance', id),
    },

    clients: {
        getAll: () => ipcRenderer.invoke('clients:getAll'),
        create: (data: any) => ipcRenderer.invoke('clients:create', data),
        update: (id: number, data: any) =>
            ipcRenderer.invoke('clients:update', id, data),
        delete: (id: number) => ipcRenderer.invoke('clients:delete', id),
        getBalance: (id: number) => ipcRenderer.invoke('clients:getBalance', id),
    },

    // Accounting
    accounting: {
        getAccounts: () => ipcRenderer.invoke('accounting:getAccounts'),
        getJournalEntries: (filters?: any) =>
            ipcRenderer.invoke('accounting:getJournalEntries', filters),
        createManualEntry: (data: any) =>
            ipcRenderer.invoke('accounting:createManualEntry', data),
        getProfitLoss: (startDate: string, endDate: string) =>
            ipcRenderer.invoke('accounting:getProfitLoss', startDate, endDate),
        getVATSummary: (startDate: string, endDate: string) =>
            ipcRenderer.invoke('accounting:getVATSummary', startDate, endDate),
        getCashierSummary: (userId: number, date: string) =>
            ipcRenderer.invoke('accounting:getCashierSummary', userId, date),
    },

    // Reports
    reports: {
        salesReport: (params: any) =>
            ipcRenderer.invoke('reports:salesReport', params),
        inventoryReport: (params: any) =>
            ipcRenderer.invoke('reports:inventoryReport', params),
        priceList: (params: any) => ipcRenderer.invoke('reports:priceList', params),
        profitLoss: (params: any) =>
            ipcRenderer.invoke('reports:profitLoss', params),
        clientBalances: () => ipcRenderer.invoke('reports:clientBalances'),
        supplierBalances: () => ipcRenderer.invoke('reports:supplierBalances'),
        exportToPDF: (reportData: any, filePath: string) =>
            ipcRenderer.invoke('reports:exportToPDF', reportData, filePath),
    },

    // Settings
    settings: {
        get: () => ipcRenderer.invoke('settings:get'),
        update: (settings: any) => ipcRenderer.invoke('settings:update', settings),
        getStoreConfig: () => ipcRenderer.invoke('settings:getStoreConfig'),
        updateStoreConfig: (config: any) =>
            ipcRenderer.invoke('settings:updateStoreConfig', config),
        setStoreType: (storeType: string) =>
            ipcRenderer.invoke('settings:setStoreType', storeType),
        backup: (filePath: string) =>
            ipcRenderer.invoke('settings:backup', filePath),
        restore: (filePath: string) =>
            ipcRenderer.invoke('settings:restore', filePath),
    },

    // License
    license: {
        getStatus: () => ipcRenderer.invoke('license:getStatus'),
        getMachineInfo: () => ipcRenderer.invoke('license:getMachineInfo'),
        generateRequest: (customerName: string) =>
            ipcRenderer.invoke('license:generateRequest', customerName),
        activate: (licenseData: string) =>
            ipcRenderer.invoke('license:activate', licenseData),
    },

    // Printing
    printer: {
        getList: () => ipcRenderer.invoke('printer:getList'),
        print: (options: any) => ipcRenderer.invoke('printer:print', options),
    },

    // Dialog
    dialog: {
        openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
        saveFile: (options: any) => ipcRenderer.invoke('dialog:saveFile', options),
    },

    // Dashboard
    dashboard: {
        getStats: () => ipcRenderer.invoke('dashboard:getStats'),
        getRecentSales: (limit: number) =>
            ipcRenderer.invoke('dashboard:getRecentSales', limit),
        getLowStockAlerts: () => ipcRenderer.invoke('dashboard:getLowStockAlerts'),
    },
});

// Type definitions for the exposed API
export type ElectronAPI = typeof window.electronAPI;
