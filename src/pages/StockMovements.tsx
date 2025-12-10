import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './StockMovements.css';

interface StockMovement {
    id: number;
    product_name: string;
    barcode: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    previous_stock: number;
    new_stock: number;
    reason: string;
    user_name: string;
    created_at: string;
}

export default function StockMovements() {
    const { t } = useTranslation();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState<string>('');

    useEffect(() => {
        loadMovements();
    }, [typeFilter]);

    const loadMovements = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.stock.getMovements({});
            if (result.success) {
                let filtered = result.movements;
                if (typeFilter) {
                    filtered = filtered.filter((m: StockMovement) => m.type === typeFilter);
                }
                setMovements(filtered);
            }
        } catch (error) {
            console.error('Failed to load movements:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'in':
                return <span className="badge badge--success">↑ {t('stock.in')}</span>;
            case 'out':
                return <span className="badge badge--danger">↓ {t('stock.out')}</span>;
            case 'adjustment':
                return <span className="badge badge--warning">⟳ {t('stock.adjustment')}</span>;
            default:
                return null;
        }
    };

    return (
        <div className="stock-movements-page">
            <div className="page-header">
                <h1>{t('stock.title')}</h1>
            </div>

            {/* Filters */}
            <div className="movements-filters">
                <select
                    className="input"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">{t('stock.allTypes')}</option>
                    <option value="in">{t('stock.in')}</option>
                    <option value="out">{t('stock.out')}</option>
                    <option value="adjustment">{t('stock.adjustment')}</option>
                </select>
            </div>

            {/* Movements Table */}
            {isLoading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('stock.date')}</th>
                                <th>{t('products.name')}</th>
                                <th>{t('stock.type')}</th>
                                <th>{t('stock.quantity')}</th>
                                <th>{t('stock.previousStock')}</th>
                                <th>{t('stock.newStock')}</th>
                                <th>{t('stock.reason')}</th>
                                <th>{t('stock.user')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map(movement => (
                                <tr key={movement.id}>
                                    <td>{new Date(movement.created_at).toLocaleString()}</td>
                                    <td>
                                        <div>{movement.product_name}</div>
                                        {movement.barcode && <code className="text-muted">{movement.barcode}</code>}
                                    </td>
                                    <td>{getTypeBadge(movement.type)}</td>
                                    <td className={movement.type === 'in' ? 'text-success' : movement.type === 'out' ? 'text-danger' : ''}>
                                        {movement.type === 'in' ? '+' : movement.type === 'out' ? '-' : ''}{movement.quantity}
                                    </td>
                                    <td>{movement.previous_stock}</td>
                                    <td><strong>{movement.new_stock}</strong></td>
                                    <td>{movement.reason || '-'}</td>
                                    <td>{movement.user_name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {movements.length === 0 && (
                        <div className="empty-state">{t('stock.noMovements')}</div>
                    )}
                </div>
            )}
        </div>
    );
}
