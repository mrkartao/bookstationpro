// Type definitions for Electron API exposed via preload
export { };

declare global {
    interface Window {
        electronAPI: {
            auth: {
                login: (username: string, password: string) => Promise<any>;
                logout: () => Promise<any>;
                getCurrentUser: () => Promise<any>;
                createUser: (userData: any) => Promise<any>;
                updateUser: (id: number, userData: any) => Promise<any>;
                deleteUser: (id: number) => Promise<any>;
                getUsers: () => Promise<any>;
                changePassword: (userId: number, oldPass: string, newPass: string) => Promise<any>;
            };
            products: {
                getAll: (filters?: any) => Promise<any>;
                getById: (id: number) => Promise<any>;
                getByBarcode: (barcode: string) => Promise<any>;
                create: (data: any) => Promise<any>;
                update: (id: number, data: any) => Promise<any>;
                delete: (id: number) => Promise<any>;
                import: (filePath: string) => Promise<any>;
                export: (filePath: string, format: string) => Promise<any>;
                getLowStock: () => Promise<any>;
            };
            categories: {
                getAll: () => Promise<any>;
                create: (data: any) => Promise<any>;
                update: (id: number, data: any) => Promise<any>;
                delete: (id: number) => Promise<any>;
            };
            stock: {
                addMovement: (data: any) => Promise<any>;
                getMovements: (filters?: any) => Promise<any>;
                adjustStock: (productId: number, quantity: number, reason: string) => Promise<any>;
            };
            sales: {
                create: (saleData: any) => Promise<any>;
                getAll: (filters?: any) => Promise<any>;
                getById: (id: number) => Promise<any>;
                void: (id: number, reason: string) => Promise<any>;
                getByDateRange: (startDate: string, endDate: string) => Promise<any>;
                getDailySummary: (date: string) => Promise<any>;
            };
            purchases: {
                create: (purchaseData: any) => Promise<any>;
                getAll: (filters?: any) => Promise<any>;
                getById: (id: number) => Promise<any>;
            };
            suppliers: {
                getAll: () => Promise<any>;
                create: (data: any) => Promise<any>;
                update: (id: number, data: any) => Promise<any>;
                delete: (id: number) => Promise<any>;
                getBalance: (id: number) => Promise<any>;
            };
            clients: {
                getAll: () => Promise<any>;
                create: (data: any) => Promise<any>;
                update: (id: number, data: any) => Promise<any>;
                delete: (id: number) => Promise<any>;
                getBalance: (id: number) => Promise<any>;
            };
            accounting: {
                getAccounts: () => Promise<any>;
                getJournalEntries: (filters?: any) => Promise<any>;
                createManualEntry: (data: any) => Promise<any>;
                getProfitLoss: (startDate: string, endDate: string) => Promise<any>;
                getVATSummary: (startDate: string, endDate: string) => Promise<any>;
                getCashierSummary: (userId: number, date: string) => Promise<any>;
            };
            reports: {
                salesReport: (params: any) => Promise<any>;
                inventoryReport: (params: any) => Promise<any>;
                priceList: (params: any) => Promise<any>;
                profitLoss: (params: any) => Promise<any>;
                clientBalances: () => Promise<any>;
                supplierBalances: () => Promise<any>;
                exportToPDF: (reportData: any, filePath: string) => Promise<any>;
            };
            settings: {
                get: () => Promise<any>;
                update: (settings: any) => Promise<any>;
                getStoreConfig: () => Promise<any>;
                updateStoreConfig: (config: any) => Promise<any>;
                setStoreType: (storeType: string) => Promise<any>;
                backup: (filePath: string) => Promise<any>;
                restore: (filePath: string) => Promise<any>;
            };
            license: {
                getStatus: () => Promise<any>;
                getMachineInfo: () => Promise<any>;
                generateRequest: (customerName: string) => Promise<any>;
                activate: (licenseData: string) => Promise<any>;
            };
            printer: {
                getList: () => Promise<any>;
                print: (options: any) => Promise<any>;
            };
            dialog: {
                openFile: (options: any) => Promise<any>;
                saveFile: (options: any) => Promise<any>;
            };
            dashboard: {
                getStats: () => Promise<any>;
                getRecentSales: (limit: number) => Promise<any>;
                getLowStockAlerts: () => Promise<any>;
            };
        };
    }
}
