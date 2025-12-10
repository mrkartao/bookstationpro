import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Settings.css';

export default function Settings() {
    const { t } = useTranslation();
    const { language, setLanguage, storeConfig, loadSettings } = useSettingsStore();
    const [printers, setPrinters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [form, setForm] = useState({
        storeName: '',
        storeNameAr: '',
        address: '',
        phone: '',
        email: '',
        taxId: '',
        currency: 'DZD',
        currencySymbol: 'د.ج',
        vatRate: '19',
        invoicePrefix: 'INV',
        thermalPrinter: '',
        a4Printer: '',
    });

    useEffect(() => {
        loadPrinters();
        if (storeConfig) {
            setForm({
                storeName: storeConfig.storeName || '',
                storeNameAr: storeConfig.storeNameAr || '',
                address: storeConfig.address || '',
                phone: storeConfig.phone || '',
                email: storeConfig.email || '',
                taxId: storeConfig.taxId || '',
                currency: storeConfig.currency || 'DZD',
                currencySymbol: storeConfig.currencySymbol || 'د.ج',
                vatRate: storeConfig.vatRate?.toString() || '19',
                invoicePrefix: storeConfig.invoicePrefix || 'INV',
                thermalPrinter: storeConfig.thermalPrinter || '',
                a4Printer: storeConfig.a4Printer || '',
            });
        }
    }, [storeConfig]);

    const loadPrinters = async () => {
        try {
            const result = await window.electronAPI.printer.getList();
            setPrinters(result || []);
        } catch (error) {
            console.error('Failed to load printers:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const result = await window.electronAPI.settings.updateStoreConfig({
                storeName: form.storeName,
                storeNameAr: form.storeNameAr,
                address: form.address,
                phone: form.phone,
                email: form.email,
                taxId: form.taxId,
                currency: form.currency,
                currencySymbol: form.currencySymbol,
                vatRate: parseFloat(form.vatRate),
                invoicePrefix: form.invoicePrefix,
                thermalPrinter: form.thermalPrinter,
                a4Printer: form.a4Printer,
            });

            if (result.success) {
                setMessage({ type: 'success', text: t('settings.saved') });
                await loadSettings();
            } else {
                setMessage({ type: 'error', text: result.error || 'Error' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setIsLoading(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleBackup = async () => {
        try {
            const result = await window.electronAPI.dialog.saveFile({
                title: t('settings.backup'),
                defaultPath: `bookstation-backup-${new Date().toISOString().split('T')[0]}.db`,
                filters: [{ name: 'Database', extensions: ['db'] }],
            });

            if (result.filePath) {
                const backupResult = await window.electronAPI.settings.backup(result.filePath);
                if (backupResult.success) {
                    setMessage({ type: 'success', text: t('settings.backupSuccess') });
                } else {
                    setMessage({ type: 'error', text: backupResult.error });
                }
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Backup failed' });
        }
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="settings-page">
            <h1>{t('settings.title')}</h1>

            {message && (
                <div className={`message message--${message.type}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Store Information */}
                <div className="settings-section">
                    <h2>{t('settings.storeInfo')}</h2>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>{t('settings.storeName')} (FR)</label>
                            <input
                                type="text"
                                className="input"
                                value={form.storeName}
                                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('settings.storeName')} (AR)</label>
                            <input
                                type="text"
                                className="input"
                                value={form.storeNameAr}
                                onChange={(e) => setForm({ ...form, storeNameAr: e.target.value })}
                                dir="rtl"
                            />
                        </div>
                        <div className="input-group full-width">
                            <label>{t('settings.address')}</label>
                            <input
                                type="text"
                                className="input"
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('settings.phone')}</label>
                            <input
                                type="tel"
                                className="input"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('settings.email')}</label>
                            <input
                                type="email"
                                className="input"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('settings.taxId')}</label>
                            <input
                                type="text"
                                className="input"
                                value={form.taxId}
                                onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Financial Settings */}
                <div className="settings-section">
                    <h2>{t('settings.financial')}</h2>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>{t('settings.currency')}</label>
                            <select
                                className="input"
                                value={form.currency}
                                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                            >
                                <option value="DZD">DZD - Dinar Algérien</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="USD">USD - Dollar</option>
                                <option value="MAD">MAD - Dirham Marocain</option>
                                <option value="TND">TND - Dinar Tunisien</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>{t('settings.vatRate')} (%)</label>
                            <input
                                type="number"
                                className="input"
                                value={form.vatRate}
                                onChange={(e) => setForm({ ...form, vatRate: e.target.value })}
                                step="0.1"
                            />
                        </div>
                        <div className="input-group">
                            <label>{t('settings.invoicePrefix')}</label>
                            <input
                                type="text"
                                className="input"
                                value={form.invoicePrefix}
                                onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Printing Settings */}
                <div className="settings-section">
                    <h2>{t('settings.printing')}</h2>
                    <div className="form-grid">
                        <div className="input-group">
                            <label>{t('settings.thermalPrinter')}</label>
                            <select
                                className="input"
                                value={form.thermalPrinter}
                                onChange={(e) => setForm({ ...form, thermalPrinter: e.target.value })}
                            >
                                <option value="">{t('settings.selectPrinter')}</option>
                                {printers.map(p => (
                                    <option key={p.name} value={p.name}>{p.displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group">
                            <label>{t('settings.a4Printer')}</label>
                            <select
                                className="input"
                                value={form.a4Printer}
                                onChange={(e) => setForm({ ...form, a4Printer: e.target.value })}
                            >
                                <option value="">{t('settings.selectPrinter')}</option>
                                {printers.map(p => (
                                    <option key={p.name} value={p.name}>{p.displayName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Language Settings */}
                <div className="settings-section">
                    <h2>{t('settings.language')}</h2>
                    <div className="language-selector">
                        <button
                            type="button"
                            className={`lang-btn ${language === 'fr' ? 'active' : ''}`}
                            onClick={() => setLanguage('fr')}
                        >
                            🇫🇷 Français
                        </button>
                        <button
                            type="button"
                            className={`lang-btn ${language === 'ar' ? 'active' : ''}`}
                            onClick={() => setLanguage('ar')}
                        >
                            🇩🇿 العربية
                        </button>
                    </div>
                </div>

                <div className="settings-actions">
                    <button type="submit" className="btn btn--primary" disabled={isLoading}>
                        {isLoading ? t('common.loading') : t('common.save')}
                    </button>
                </div>
            </form>

            {/* Backup Section */}
            <div className="settings-section">
                <h2>{t('settings.backupRestore')}</h2>
                <div className="backup-actions">
                    <button type="button" className="btn btn--secondary" onClick={handleBackup}>
                        💾 {t('settings.backup')}
                    </button>
                </div>
            </div>
        </div>
    );
}
