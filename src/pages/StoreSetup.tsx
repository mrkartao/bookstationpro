import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settingsStore';
import './StoreSetup.css';

const storeTypes = [
    { id: 'general', icon: '🏪', labelKey: 'storeTypes.general' },
    { id: 'grocery', icon: '🛒', labelKey: 'storeTypes.grocery' },
    { id: 'electronics', icon: '📱', labelKey: 'storeTypes.electronics' },
    { id: 'clothing', icon: '👔', labelKey: 'storeTypes.clothing' },
    { id: 'pharmacy', icon: '💊', labelKey: 'storeTypes.pharmacy' },
    { id: 'restaurant', icon: '🍽️', labelKey: 'storeTypes.restaurant' },
    { id: 'hardware', icon: '🔧', labelKey: 'storeTypes.hardware' },
    { id: 'books', icon: '📚', labelKey: 'storeTypes.books' },
];

export default function StoreSetup() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { loadSettings } = useSettingsStore();
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({
        storeName: '',
        storeNameAr: '',
        address: '',
        phone: '',
        email: '',
        taxId: '',
        currency: 'DZD',
        vatRate: '19',
    });

    const handleTypeSelect = (typeId: string) => {
        setSelectedType(typeId);
    };

    const handleSubmit = async () => {
        if (!selectedType || !form.storeName) return;

        setIsLoading(true);
        try {
            // Set store type
            await window.electronAPI.settings.setStoreType(selectedType);

            // Update store config
            await window.electronAPI.settings.updateStoreConfig({
                storeType: selectedType,
                storeName: form.storeName,
                storeNameAr: form.storeNameAr,
                address: form.address,
                phone: form.phone,
                email: form.email,
                taxId: form.taxId,
                currency: form.currency,
                vatRate: parseFloat(form.vatRate),
            });

            await loadSettings();
            navigate('/dashboard');
        } catch (error) {
            console.error('Failed to save store config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="store-setup-page">
            <div className="setup-container">
                <div className="setup-header">
                    <h1>🏪 {t('storeSetup.title')}</h1>
                    <p>{t('storeSetup.subtitle')}</p>
                </div>

                {/* Progress */}
                <div className="setup-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>1</div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>2</div>
                </div>

                {/* Step 1: Store Type */}
                {step === 1 && (
                    <div className="setup-step">
                        <h2>{t('storeSetup.selectType')}</h2>
                        <div className="store-types-grid">
                            {storeTypes.map(type => (
                                <button
                                    key={type.id}
                                    className={`store-type-card ${selectedType === type.id ? 'selected' : ''}`}
                                    onClick={() => handleTypeSelect(type.id)}
                                >
                                    <span className="type-icon">{type.icon}</span>
                                    <span className="type-label">{t(type.labelKey)}</span>
                                </button>
                            ))}
                        </div>
                        <div className="setup-actions">
                            <button
                                className="btn btn--primary"
                                disabled={!selectedType}
                                onClick={() => setStep(2)}
                            >
                                {t('common.next')} →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Store Info */}
                {step === 2 && (
                    <div className="setup-step">
                        <h2>{t('storeSetup.storeInfo')}</h2>
                        <div className="setup-form">
                            <div className="form-grid">
                                <div className="input-group">
                                    <label>{t('settings.storeName')} (FR) *</label>
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
                            </div>
                        </div>
                        <div className="setup-actions">
                            <button className="btn btn--ghost" onClick={() => setStep(1)}>
                                ← {t('common.back')}
                            </button>
                            <button
                                className="btn btn--primary"
                                disabled={!form.storeName || isLoading}
                                onClick={handleSubmit}
                            >
                                {isLoading ? t('common.loading') : t('storeSetup.complete')} ✓
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
