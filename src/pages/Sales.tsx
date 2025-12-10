import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Sales.css';

interface Sale {
    id: number;
    invoice_number: string;
    user_name: string;
    client_name?: string;
    sale_date: string;
    subtotal: number;
    discount_amount: number;
    vat_amount: number;
    total: number;
    status: 'completed' | 'pending' | 'voided';
}

export default function Sales() {
    const { t } = useTranslation();
    const { storeConfig } = useSettingsStore();
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [saleItems, setSaleItems] = useState<any[]>([]);

    useEffect(() => {
        loadSales();
    }, [startDate, endDate]);

    const loadSales = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.sales.getAll({
                startDate,
                endDate,
            });
            if (result.success) {
                setSales(result.sales);
            }
        } catch (error) {
            console.error('Failed to load sales:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const viewSaleDetails = async (sale: Sale) => {
        try {
            const result = await window.electronAPI.sales.getById(sale.id);
            if (result.success) {
                setSelectedSale(sale);
                setSaleItems(result.items || []);
            }
        } catch (error) {
            console.error('Failed to load sale details:', error);
        }
    };

    const handleVoidSale = async (id: number) => {
        const reason = prompt(t('sales.voidReason'));
        if (!reason) return;

        try {
            const result = await window.electronAPI.sales.void(id, reason);
            if (result.success) {
                loadSales();
                setSelectedSale(null);
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to void sale:', error);
        }
    };

    const handlePrint = async (sale: Sale) => {
        try {
            const result = await window.electronAPI.sales.getById(sale.id);
            if (result.success) {
                await window.electronAPI.printer.print({
                    type: 'thermal',
                    content: {
                        header: {
                            storeName: storeConfig?.storeName || 'Store',
                            address: storeConfig?.address,
                            phone: storeConfig?.phone,
                            taxId: storeConfig?.taxId,
                        },
                        items: result.items.map((item: any) => ({
                            name: item.product_name,
                            quantity: item.quantity,
                            price: item.unit_price,
                            total: item.total,
                        })),
                        summary: {
                            subtotal: sale.subtotal,
                            discount: sale.discount_amount,
                            vat: sale.vat_amount,
                            total: sale.total,
                        },
                        footer: {
                            invoiceNumber: sale.invoice_number,
                            date: new Date(sale.sale_date).toLocaleString(),
                            cashier: sale.user_name,
                        },
                    },
                });
            }
        } catch (error) {
            console.error('Failed to print:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} ${storeConfig?.currencySymbol || 'DZD'}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="badge badge--success">{t('sales.completed')}</span>;
            case 'pending':
                return <span className="badge badge--warning">{t('sales.pending')}</span>;
            case 'voided':
                return <span className="badge badge--danger">{t('sales.voided')}</span>;
            default:
                return null;
        }
    };

    const totalSales = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + s.total, 0);

    return (
        <div className="sales-page">
            <div className="page-header">
                <h1>{t('sales.title')}</h1>
                <div className="sales-summary">
                    <span>{t('sales.totalSales')}: </span>
                    <strong>{formatCurrency(totalSales)}</strong>
                </div>
            </div>

            {/* Date Filters */}
            <div className="sales-filters">
                <div className="input-group">
                    <label>{t('reports.startDate')}</label>
                    <input
                        type="date"
                        className="input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="input-group">
                    <label>{t('reports.endDate')}</label>
                    <input
                        type="date"
                        className="input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            {/* Sales Table */}
            {isLoading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('sales.invoiceNumber')}</th>
                                <th>{t('sales.date')}</th>
                                <th>{t('sales.cashier')}</th>
                                <th>{t('sales.client')}</th>
                                <th>{t('sales.total')}</th>
                                <th>{t('sales.status')}</th>
                                <th>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map(sale => (
                                <tr key={sale.id} className={sale.status === 'voided' ? 'voided' : ''}>
                                    <td><code>{sale.invoice_number}</code></td>
                                    <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                                    <td>{sale.user_name || '-'}</td>
                                    <td>{sale.client_name || t('pos.walkInCustomer')}</td>
                                    <td><strong>{formatCurrency(sale.total)}</strong></td>
                                    <td>{getStatusBadge(sale.status)}</td>
                                    <td>
                                        <button className="btn btn--ghost btn--sm" onClick={() => viewSaleDetails(sale)} title={t('common.view')}>👁️</button>
                                        <button className="btn btn--ghost btn--sm" onClick={() => handlePrint(sale)} title={t('common.print')}>🖨️</button>
                                        {sale.status === 'completed' && (
                                            <button className="btn btn--ghost btn--sm" onClick={() => handleVoidSale(sale.id)} title={t('sales.void')}>❌</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {sales.length === 0 && (
                        <div className="empty-state">
                            <p>{t('sales.noSales')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{t('sales.invoiceDetails')} - {selectedSale.invoice_number}</h2>
                            <button className="btn btn--ghost" onClick={() => setSelectedSale(null)}>×</button>
                        </div>
                        <div className="modal__content">
                            <div className="sale-info">
                                <div><strong>{t('sales.date')}:</strong> {new Date(selectedSale.sale_date).toLocaleString()}</div>
                                <div><strong>{t('sales.cashier')}:</strong> {selectedSale.user_name}</div>
                                <div><strong>{t('sales.status')}:</strong> {getStatusBadge(selectedSale.status)}</div>
                            </div>

                            <table className="table mt-lg">
                                <thead>
                                    <tr>
                                        <th>{t('products.name')}</th>
                                        <th>{t('pos.quantity')}</th>
                                        <th>{t('pos.price')}</th>
                                        <th>{t('pos.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saleItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.product_name}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency(item.unit_price)}</td>
                                            <td>{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="sale-summary">
                                <div className="summary-row">
                                    <span>{t('pos.subtotal')}:</span>
                                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                                </div>
                                {selectedSale.discount_amount > 0 && (
                                    <div className="summary-row">
                                        <span>{t('pos.discount')}:</span>
                                        <span>-{formatCurrency(selectedSale.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="summary-row">
                                    <span>{t('pos.vat')}:</span>
                                    <span>{formatCurrency(selectedSale.vat_amount)}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>{t('pos.total')}:</span>
                                    <span>{formatCurrency(selectedSale.total)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="modal__footer">
                            <button className="btn btn--primary" onClick={() => handlePrint(selectedSale)}>
                                🖨️ {t('common.print')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
