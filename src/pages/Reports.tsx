import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Reports.css';

export default function Reports() {
    const { t } = useTranslation();
    const { storeConfig } = useSettingsStore();
    const [activeReport, setActiveReport] = useState<string | null>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const reports = [
        { id: 'sales', icon: '📊', label: t('reports.salesReport') },
        { id: 'inventory', icon: '📦', label: t('reports.inventoryReport') },
        { id: 'profitLoss', icon: '💰', label: t('reports.profitLoss') },
        { id: 'priceList', icon: '💲', label: t('reports.priceList') },
        { id: 'vatSummary', icon: '🧾', label: t('reports.vatSummary') },
    ];

    const generateReport = async (reportId: string) => {
        setActiveReport(reportId);
        setIsLoading(true);
        setReportData(null);

        try {
            let result;
            switch (reportId) {
                case 'sales':
                    result = await window.electronAPI.reports.salesReport({ startDate, endDate });
                    break;
                case 'inventory':
                    result = await window.electronAPI.reports.inventoryReport({});
                    break;
                case 'profitLoss':
                    result = await window.electronAPI.accounting.getProfitLoss(startDate, endDate);
                    break;
                case 'priceList':
                    result = await window.electronAPI.reports.priceList({});
                    break;
                case 'vatSummary':
                    result = await window.electronAPI.accounting.getVATSummary(startDate, endDate);
                    break;
            }

            if (result?.success) {
                setReportData(result);
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `${(amount || 0).toFixed(2)} ${storeConfig?.currencySymbol || 'DZD'}`;
    };

    const handleExportPDF = async () => {
        try {
            const result = await window.electronAPI.dialog.saveFile({
                title: t('reports.exportPDF'),
                defaultPath: `report-${activeReport}-${new Date().toISOString().split('T')[0]}.pdf`,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });

            if (result.filePath) {
                await window.electronAPI.reports.exportToPDF(reportData, result.filePath);
            }
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    return (
        <div className="reports-page">
            <h1>{t('reports.title')}</h1>

            {/* Report Selection */}
            <div className="report-cards">
                {reports.map(report => (
                    <button
                        key={report.id}
                        className={`report-card ${activeReport === report.id ? 'active' : ''}`}
                        onClick={() => generateReport(report.id)}
                    >
                        <span className="report-icon">{report.icon}</span>
                        <span className="report-label">{report.label}</span>
                    </button>
                ))}
            </div>

            {/* Date Filters */}
            {activeReport && ['sales', 'profitLoss', 'vatSummary'].includes(activeReport) && (
                <div className="report-filters">
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
                    <button className="btn btn--primary" onClick={() => generateReport(activeReport)}>
                        {t('reports.generate')}
                    </button>
                </div>
            )}

            {/* Report Content */}
            {isLoading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : reportData && (
                <div className="report-content">
                    <div className="report-header">
                        <h2>{reports.find(r => r.id === activeReport)?.label}</h2>
                        <button className="btn btn--secondary" onClick={handleExportPDF}>
                            📄 {t('reports.exportPDF')}
                        </button>
                    </div>

                    {/* Sales Report */}
                    {activeReport === 'sales' && reportData.data && (
                        <div className="report-summary">
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.totalSales')}</span>
                                <span className="stat-value">{formatCurrency(reportData.data.totalSales)}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.totalTransactions')}</span>
                                <span className="stat-value">{reportData.data.totalTransactions}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.averageTransaction')}</span>
                                <span className="stat-value">{formatCurrency(reportData.data.averageTransaction)}</span>
                            </div>
                        </div>
                    )}

                    {/* Inventory Report */}
                    {activeReport === 'inventory' && reportData.data && (
                        <div className="report-summary">
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.totalProducts')}</span>
                                <span className="stat-value">{reportData.data.totalProducts}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.totalStockValue')}</span>
                                <span className="stat-value">{formatCurrency(reportData.data.totalStockValue)}</span>
                            </div>
                            <div className="stat-card warning">
                                <span className="stat-label">{t('reports.lowStockItems')}</span>
                                <span className="stat-value">{reportData.data.lowStockCount}</span>
                            </div>
                        </div>
                    )}

                    {/* Profit & Loss */}
                    {activeReport === 'profitLoss' && reportData.data && (
                        <div className="pl-report">
                            <div className="pl-section">
                                <h3>{t('accounting.revenue')}</h3>
                                <div className="pl-row total">
                                    <span>{t('reports.totalRevenue')}</span>
                                    <span className="text-success">{formatCurrency(reportData.data.totalRevenue)}</span>
                                </div>
                            </div>
                            <div className="pl-section">
                                <h3>{t('accounting.expense')}</h3>
                                <div className="pl-row total">
                                    <span>{t('reports.totalExpenses')}</span>
                                    <span className="text-danger">{formatCurrency(reportData.data.totalExpenses)}</span>
                                </div>
                            </div>
                            <div className="pl-section final">
                                <div className="pl-row total">
                                    <span>{t('reports.netProfit')}</span>
                                    <span className={reportData.data.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                                        {formatCurrency(reportData.data.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VAT Summary */}
                    {activeReport === 'vatSummary' && reportData.data && (
                        <div className="vat-report">
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.vatCollected')}</span>
                                <span className="stat-value text-success">{formatCurrency(reportData.data.vatCollected)}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.vatPaid')}</span>
                                <span className="stat-value text-danger">{formatCurrency(reportData.data.vatPaid)}</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">{t('reports.vatBalance')}</span>
                                <span className="stat-value">{formatCurrency(reportData.data.vatBalance)}</span>
                            </div>
                        </div>
                    )}

                    {/* Price List */}
                    {activeReport === 'priceList' && reportData.products && (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('products.barcode')}</th>
                                        <th>{t('products.name')}</th>
                                        <th>{t('products.category')}</th>
                                        <th>{t('products.sellPrice')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.products.map((product: any) => (
                                        <tr key={product.id}>
                                            <td><code>{product.barcode || '-'}</code></td>
                                            <td>{product.name_fr}</td>
                                            <td>{product.category_name || '-'}</td>
                                            <td>{formatCurrency(product.sale_price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
