import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/settingsStore';
import './Dashboard.css';

interface DashboardStats {
    todaySales: number;
    todayTransactions: number;
    monthSales: number;
    monthTransactions: number;
    lowStockCount: number;
    productCount: number;
    salesTrend: Array<{ date: string; total: number }>;
}

interface RecentSale {
    id: number;
    invoice_number: string;
    total: number;
    sale_date: string;
    cashier: string;
}

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { storeConfig } = useSettingsStore();

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const [statsResult, salesResult, alertsResult] = await Promise.all([
                window.electronAPI.dashboard.getStats(),
                window.electronAPI.dashboard.getRecentSales(10),
                window.electronAPI.dashboard.getLowStockAlerts(),
            ]);

            if (statsResult.success) {
                setStats(statsResult.stats);
            }
            if (salesResult.success) {
                setRecentSales(salesResult.sales);
            }
            if (alertsResult.success) {
                setLowStockAlerts(alertsResult.products);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-DZ', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount) + ' ' + storeConfig.currencySymbol;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="dashboard">
                <div className="loading-screen">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <div>
                    <h1>{t('dashboard.title')}</h1>
                    <p className="text-muted">
                        {storeConfig.storeName || 'Book Station Pro'}
                    </p>
                </div>
                <div className="dashboard__actions">
                    <button className="btn btn--primary" onClick={() => navigate('/pos')}>
                        <span>🛒</span>
                        {t('dashboard.newSale')}
                    </button>
                    <button className="btn btn--secondary" onClick={() => navigate('/products')}>
                        <span>📦</span>
                        {t('dashboard.addProduct')}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid--4 mb-lg">
                <div className="stat-card animate-slide-up">
                    <div className="stat-card__icon stat-card__icon--success">
                        💰
                    </div>
                    <div className="stat-card__value">
                        {formatCurrency(stats?.todaySales || 0)}
                    </div>
                    <div className="stat-card__label">{t('dashboard.todaySales')}</div>
                    <div className="stat-card__sub">
                        {stats?.todayTransactions || 0} {t('dashboard.transactions')}
                    </div>
                </div>

                <div className="stat-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    <div className="stat-card__icon stat-card__icon--primary">
                        📊
                    </div>
                    <div className="stat-card__value">
                        {formatCurrency(stats?.monthSales || 0)}
                    </div>
                    <div className="stat-card__label">{t('dashboard.monthSales')}</div>
                    <div className="stat-card__sub">
                        {stats?.monthTransactions || 0} {t('dashboard.transactions')}
                    </div>
                </div>

                <div className="stat-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="stat-card__icon stat-card__icon--warning">
                        ⚠️
                    </div>
                    <div className="stat-card__value">
                        {stats?.lowStockCount || 0}
                    </div>
                    <div className="stat-card__label">{t('dashboard.lowStock')}</div>
                </div>

                <div className="stat-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
                    <div className="stat-card__icon" style={{ background: 'var(--color-info-light)', color: 'var(--color-info)' }}>
                        📦
                    </div>
                    <div className="stat-card__value">
                        {stats?.productCount || 0}
                    </div>
                    <div className="stat-card__label">{t('dashboard.totalProducts')}</div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="dashboard__content">
                {/* Recent Sales */}
                <div className="card animate-fade-in">
                    <div className="card__header">
                        <h3 className="card__title">{t('dashboard.recentSales')}</h3>
                        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/sales')}>
                            {t('common.details')} →
                        </button>
                    </div>

                    {recentSales.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('sales.invoiceNumber')}</th>
                                        <th>{t('common.date')}</th>
                                        <th>{t('sales.cashier')}</th>
                                        <th>{t('common.total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td>
                                                <span className="badge badge--info">{sale.invoice_number}</span>
                                            </td>
                                            <td>{formatDate(sale.sale_date)}</td>
                                            <td>{sale.cashier}</td>
                                            <td className="font-bold">{formatCurrency(sale.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <span>🛒</span>
                            <p>{t('sales.noSales')}</p>
                        </div>
                    )}
                </div>

                {/* Low Stock Alerts */}
                <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="card__header">
                        <h3 className="card__title">{t('products.lowStockAlert')}</h3>
                        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/products')}>
                            {t('common.details')} →
                        </button>
                    </div>

                    {lowStockAlerts.length > 0 ? (
                        <div className="low-stock-list">
                            {lowStockAlerts.map((product) => (
                                <div key={product.id} className="low-stock-item">
                                    <div className="low-stock-item__info">
                                        <span className="low-stock-item__name">{product.name_fr}</span>
                                        {product.name_ar && (
                                            <span className="low-stock-item__name-ar">{product.name_ar}</span>
                                        )}
                                    </div>
                                    <div className="low-stock-item__stock">
                                        <span className={`badge ${product.stock_quantity === 0 ? 'badge--danger' : 'badge--warning'}`}>
                                            {product.stock_quantity} / {product.min_stock_level}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state empty-state--success">
                            <span>✅</span>
                            <p>Tous les stocks sont à jour</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card mt-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="card__title mb-md">{t('dashboard.quickActions')}</h3>
                <div className="quick-actions">
                    <button className="quick-action" onClick={() => navigate('/pos')}>
                        <span className="quick-action__icon">🛒</span>
                        <span>{t('dashboard.newSale')}</span>
                    </button>
                    <button className="quick-action" onClick={() => navigate('/products')}>
                        <span className="quick-action__icon">📦</span>
                        <span>{t('dashboard.addProduct')}</span>
                    </button>
                    <button className="quick-action" onClick={() => navigate('/purchases')}>
                        <span className="quick-action__icon">🚚</span>
                        <span>{t('purchases.addPurchase')}</span>
                    </button>
                    <button className="quick-action" onClick={() => navigate('/reports')}>
                        <span className="quick-action__icon">📊</span>
                        <span>{t('dashboard.viewReports')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
