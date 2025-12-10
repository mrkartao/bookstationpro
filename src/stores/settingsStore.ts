import { create } from 'zustand';

interface SettingsState {
    language: 'fr' | 'ar';
    isTrialMode: boolean;
    licenseStatus: {
        isValid: boolean;
        customerName?: string;
        expiresAt?: string;
        daysRemaining?: number;
    };
    storeConfig: {
        storeType: string | null;
        storeName: string;
        storeNameAr?: string;
        address?: string;
        phone?: string;
        email?: string;
        taxId?: string;
        currency: string;
        currencySymbol: string;
        vatRate: number;
        invoicePrefix: string;
        thermalPrinter?: string;
        a4Printer?: string;
    };
    isLoading: boolean;

    // Actions
    loadSettings: () => Promise<void>;
    setLanguage: (language: 'fr' | 'ar') => void;
    updateSettings: (settings: Partial<SettingsState['storeConfig']>) => Promise<boolean>;
    setStoreType: (storeType: string) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    language: 'fr',
    isTrialMode: true,
    licenseStatus: {
        isValid: false,
    },
    storeConfig: {
        storeType: null,
        storeName: '',
        currency: 'DZD',
        currencySymbol: 'د.ج',
        vatRate: 19,
        invoicePrefix: 'INV',
    },
    isLoading: false,

    loadSettings: async () => {
        set({ isLoading: true });

        try {
            // Load license status
            const licenseStatus = await window.electronAPI.license.getStatus();

            // Load store config
            const configResult = await window.electronAPI.settings.getStoreConfig();

            let language: 'fr' | 'ar' = 'fr';
            let storeConfig = get().storeConfig;

            if (configResult.success && configResult.config) {
                const config = configResult.config;
                language = config.language === 'ar' ? 'ar' : 'fr';
                storeConfig = {
                    storeType: config.store_type || null,
                    storeName: config.store_name || '',
                    storeNameAr: config.store_name_ar,
                    address: config.address,
                    phone: config.phone,
                    email: config.email,
                    taxId: config.tax_id,
                    currency: config.currency || 'DZD',
                    currencySymbol: config.currency_symbol || 'د.ج',
                    vatRate: config.vat_rate || 19,
                    invoicePrefix: config.invoice_prefix || 'INV',
                    thermalPrinter: config.thermal_printer,
                    a4Printer: config.a4_printer,
                };
            }

            set({
                language,
                isTrialMode: licenseStatus.isTrial,
                licenseStatus: {
                    isValid: licenseStatus.isValid,
                    customerName: licenseStatus.customerName,
                    expiresAt: licenseStatus.expiresAt,
                    daysRemaining: licenseStatus.daysRemaining,
                },
                storeConfig,
                isLoading: false,
            });
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoading: false });
        }
    },

    setLanguage: (language: 'fr' | 'ar') => {
        set({ language });

        // Persist language setting
        window.electronAPI.settings.update({ language }).catch(console.error);

        // Update document direction
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    },

    updateSettings: async (settings) => {
        try {
            const result = await window.electronAPI.settings.updateStoreConfig({
                ...get().storeConfig,
                ...settings,
            });

            if (result.success) {
                set((state) => ({
                    storeConfig: { ...state.storeConfig, ...settings },
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to update settings:', error);
            return false;
        }
    },

    setStoreType: async (storeType: string) => {
        try {
            const result = await window.electronAPI.settings.setStoreType(storeType);

            if (result.success) {
                set((state) => ({
                    storeConfig: { ...state.storeConfig, storeType },
                }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to set store type:', error);
            return false;
        }
    },
}));
