import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Purchases.css';

interface Purchase {
    id: number;
    reference_number: string;
    supplier_name: string;
    user_name: string;
    purchase_date: string;
    subtotal: number;
    vat_amount: number;
    total: number;
    amount_paid: number;
    status: string;
}

interface Supplier {
    id: number;
    name: string;
    name_ar?: string;
    phone?: string;
    balance: number;
}

export default function Purchases() {
    const { t } = useTranslation();
    const { storeConfig } = useSettingsStore();
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    const [supplierForm, setSupplierForm] = useState({
        name: '',
        nameAr: '',
        phone: '',
        email: '',
        address: '',
    });

    useEffect(() => {
        loadPurchases();
        loadSuppliers();
    }, []);

    const loadPurchases = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.purchases.getAll({});
            if (result.success) {
                setPurchases(result.purchases);
            }
        } catch (error) {
            console.error('Failed to load purchases:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuppliers = async () => {
        try {
            const result = await window.electronAPI.suppliers.getAll();
            if (result.success) {
                setSuppliers(result.suppliers);
            }
        } catch (error) {
            console.error('Failed to load suppliers:', error);
        }
    };

    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await window.electronAPI.suppliers.create(supplierForm);
            if (result.success) {
                setShowSupplierModal(false);
                setSupplierForm({ name: '', nameAr: '', phone: '', email: '', address: '' });
                loadSuppliers();
            }
        } catch (error) {
            console.error('Failed to create supplier:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} ${storeConfig?.currencySymbol || 'DZD'}`;
    };

    const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);

    return (
        <div className="purchases-page">
            <div className="page-header">
                <h1>{t('purchases.title')}</h1>
                <div className="header-actions">
                    <button className="btn btn--secondary" onClick={() => setShowSupplierModal(true)}>
                        + {t('purchases.addSupplier')}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="purchases-summary">
                <div className="summary-card">
                    <span className="summary-label">{t('purchases.totalPurchases')}</span>
                    <span className="summary-value">{formatCurrency(totalPurchases)}</span>
                </div>
                <div className="summary-card">
                    <span className="summary-label">{t('purchases.supplierCount')}</span>
                    <span className="summary-value">{suppliers.length}</span>
                </div>
            </div>

            {/* Suppliers List */}
            <div className="section">
                <h2>{t('purchases.suppliers')}</h2>
                <div className="suppliers-grid">
                    {suppliers.map(supplier => (
                        <div key={supplier.id} className="supplier-card">
                            <h3>{supplier.name}</h3>
                            {supplier.name_ar && <p className="name-ar">{supplier.name_ar}</p>}
                            {supplier.phone && <p>📞 {supplier.phone}</p>}
                            <div className="supplier-balance">
                                <span>{t('purchases.balance')}:</span>
                                <span className={supplier.balance > 0 ? 'text-danger' : ''}>
                                    {formatCurrency(supplier.balance)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Purchases Table */}
            <div className="section">
                <h2>{t('purchases.history')}</h2>
                {isLoading ? (
                    <div className="loading">{t('common.loading')}</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('purchases.reference')}</th>
                                    <th>{t('purchases.date')}</th>
                                    <th>{t('purchases.supplier')}</th>
                                    <th>{t('purchases.total')}</th>
                                    <th>{t('purchases.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(purchase => (
                                    <tr key={purchase.id}>
                                        <td><code>{purchase.reference_number}</code></td>
                                        <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                                        <td>{purchase.supplier_name}</td>
                                        <td><strong>{formatCurrency(purchase.total)}</strong></td>
                                        <td>
                                            <span className={`badge badge--${purchase.status === 'received' ? 'success' : 'warning'}`}>
                                                {purchase.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {purchases.length === 0 && (
                            <div className="empty-state">{t('purchases.noPurchases')}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Supplier Modal */}
            {showSupplierModal && (
                <div className="modal-overlay" onClick={() => setShowSupplierModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{t('purchases.addSupplier')}</h2>
                            <button className="btn btn--ghost" onClick={() => setShowSupplierModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleAddSupplier}>
                            <div className="modal__content">
                                <div className="input-group">
                                    <label>{t('purchases.supplierName')} (FR) *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={supplierForm.name}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{t('purchases.supplierName')} (AR)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={supplierForm.nameAr}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, nameAr: e.target.value })}
                                        dir="rtl"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{t('settings.phone')}</label>
                                    <input
                                        type="tel"
                                        className="input"
                                        value={supplierForm.phone}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{t('settings.email')}</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={supplierForm.email}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{t('settings.address')}</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={supplierForm.address}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal__footer">
                                <button type="button" className="btn btn--ghost" onClick={() => setShowSupplierModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    {t('common.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
