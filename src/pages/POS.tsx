import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../stores/cartStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import './POS.css';

interface Product {
    id: number;
    barcode: string;
    name_fr: string;
    name_ar?: string;
    sale_price: number;
    vat_rate: number;
    stock_quantity: number;
    category_name?: string;
}

export default function POS() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { storeConfig, language } = useSettingsStore();
    const {
        items,
        addItem,
        removeItem,
        updateItemQuantity,
        clearCart,
        getSubtotal,
        getVatAmount,
        getTotal,
        getItemCount,
        discountAmount,
    } = useCartStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [amountReceived, setAmountReceived] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSale, setLastSale] = useState<{ invoiceNumber: string; total: number; change: number } | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const barcodeBuffer = useRef('');
    const barcodeTimeout = useRef<number | null>(null);

    useEffect(() => {
        // Focus search input on mount
        searchInputRef.current?.focus();

        // Listen for barcode scanner (keyboard input)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (showPaymentModal) return;

            // Barcode scanners typically send Enter at the end
            if (e.key === 'Enter' && barcodeBuffer.current.length > 0) {
                handleBarcodeScanned(barcodeBuffer.current);
                barcodeBuffer.current = '';
                return;
            }

            // Accumulate characters for barcode
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                barcodeBuffer.current += e.key;

                // Clear buffer after 100ms of no input (distinguish from typing)
                if (barcodeTimeout.current) {
                    clearTimeout(barcodeTimeout.current);
                }
                barcodeTimeout.current = window.setTimeout(() => {
                    barcodeBuffer.current = '';
                }, 100);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPaymentModal]);

    const handleBarcodeScanned = async (barcode: string) => {
        try {
            const result = await window.electronAPI.products.getByBarcode(barcode);
            if (result.success && result.product) {
                const added = addItem(result.product);
                if (!added) {
                    // Show insufficient stock error
                    alert(t('pos.insufficientStock'));
                }
            } else {
                // Show product not found error
                alert(t('pos.productNotFound'));
            }
        } catch (error) {
            console.error('Barcode scan error:', error);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const result = await window.electronAPI.products.getAll({ search: query, isActive: true });
            if (result.success) {
                setSearchResults(result.products.slice(0, 10));
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    const handleAddProduct = (product: Product) => {
        const added = addItem(product);
        if (!added) {
            alert(t('pos.insufficientStock'));
        }
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const handleCompleteSale = async () => {
        if (items.length === 0) return;

        setIsProcessing(true);
        try {
            const saleData = {
                userId: user!.id,
                items: items.map(item => ({
                    productId: item.productId,
                    productName: item.name,
                    barcode: item.barcode,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discount: item.discount,
                    vatRate: item.vatRate,
                })),
                discountAmount: discountAmount,
                amountPaid: parseFloat(amountReceived) || getTotal(),
                paymentMethod,
            };

            const result = await window.electronAPI.sales.create(saleData);

            if (result.success) {
                setLastSale({
                    invoiceNumber: result.invoiceNumber,
                    total: result.total,
                    change: result.change,
                });
                clearCart();
                setShowPaymentModal(false);
                setAmountReceived('');
            } else {
                alert(result.error || 'Erreur lors de la vente');
            }
        } catch (error) {
            console.error('Sale error:', error);
            alert('Erreur lors de la vente');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-DZ', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount) + ' ' + storeConfig.currencySymbol;
    };

    const getProductName = (item: any) => {
        return language === 'ar' && item.nameAr ? item.nameAr : item.name;
    };

    const change = parseFloat(amountReceived) - getTotal();

    return (
        <div className="pos">
            {/* Search & Products Panel */}
            <div className="pos__products">
                <div className="pos__search">
                    <div className="input-icon">
                        <span className="input-icon__icon">🔍</span>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="input input--lg"
                            placeholder={t('pos.scanOrSearch')}
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {searchResults.length > 0 && (
                        <div className="pos__search-results">
                            {searchResults.map((product) => (
                                <div
                                    key={product.id}
                                    className="pos__search-item"
                                    onClick={() => handleAddProduct(product)}
                                >
                                    <div className="pos__search-item-info">
                                        <span className="pos__search-item-name">{product.name_fr}</span>
                                        {product.name_ar && (
                                            <span className="pos__search-item-name-ar">{product.name_ar}</span>
                                        )}
                                        <span className="pos__search-item-barcode">{product.barcode}</span>
                                    </div>
                                    <div className="pos__search-item-price">
                                        {formatCurrency(product.sale_price)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Last Sale Info */}
                {lastSale && (
                    <div className="pos__last-sale">
                        <div className="last-sale__info">
                            <span>✅ {lastSale.invoiceNumber}</span>
                            <span className="last-sale__total">{formatCurrency(lastSale.total)}</span>
                        </div>
                        {lastSale.change > 0 && (
                            <div className="last-sale__change">
                                {t('pos.change')}: <strong>{formatCurrency(lastSale.change)}</strong>
                            </div>
                        )}
                        <button className="btn btn--sm btn--secondary" onClick={() => setLastSale(null)}>
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Cart Panel */}
            <div className="pos__cart">
                <div className="pos__cart-header">
                    <h2>{t('pos.cart')} ({getItemCount()})</h2>
                    {items.length > 0 && (
                        <button className="btn btn--ghost btn--sm" onClick={clearCart}>
                            {t('pos.clearCart')}
                        </button>
                    )}
                </div>

                <div className="pos__cart-items">
                    {items.length === 0 ? (
                        <div className="pos__cart-empty">
                            <span>🛒</span>
                            <p>{t('pos.emptyCart')}</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.productId} className="pos__cart-item">
                                <div className="pos__cart-item-info">
                                    <span className="pos__cart-item-name">{getProductName(item)}</span>
                                    <span className="pos__cart-item-price">
                                        {formatCurrency(item.unitPrice)}
                                    </span>
                                </div>
                                <div className="pos__cart-item-actions">
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                                    >
                                        -
                                    </button>
                                    <span className="pos__cart-item-qty">{item.quantity}</span>
                                    <button
                                        className="btn btn--ghost btn--sm"
                                        onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                        disabled={item.quantity >= item.stockQuantity}
                                    >
                                        +
                                    </button>
                                    <span className="pos__cart-item-total">
                                        {formatCurrency(item.unitPrice * item.quantity)}
                                    </span>
                                    <button
                                        className="btn btn--ghost btn--sm text-danger"
                                        onClick={() => removeItem(item.productId)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Cart Summary */}
                <div className="pos__cart-summary">
                    <div className="pos__cart-summary-row">
                        <span>{t('common.subtotal')}</span>
                        <span>{formatCurrency(getSubtotal())}</span>
                    </div>
                    <div className="pos__cart-summary-row">
                        <span>{t('common.tax')} (TVA)</span>
                        <span>{formatCurrency(getVatAmount())}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="pos__cart-summary-row text-success">
                            <span>{t('common.discount')}</span>
                            <span>-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    <div className="pos__cart-summary-row pos__cart-summary-total">
                        <span>{t('common.total')}</span>
                        <span>{formatCurrency(getTotal())}</span>
                    </div>
                </div>

                {/* Payment Button */}
                <button
                    className="btn btn--primary btn--lg pos__pay-btn"
                    disabled={items.length === 0}
                    onClick={() => setShowPaymentModal(true)}
                >
                    💳 {t('pos.payment')} - {formatCurrency(getTotal())}
                </button>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal pos__payment-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{t('pos.payment')}</h2>
                            <button className="btn btn--ghost" onClick={() => setShowPaymentModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="modal__content">
                            <div className="pos__payment-total">
                                <span>{t('common.total')}</span>
                                <span className="pos__payment-amount">{formatCurrency(getTotal())}</span>
                            </div>

                            <div className="pos__payment-methods">
                                <button
                                    className={`pos__payment-method ${paymentMethod === 'cash' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('cash')}
                                >
                                    💵 {t('pos.cash')}
                                </button>
                                <button
                                    className={`pos__payment-method ${paymentMethod === 'card' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('card')}
                                >
                                    💳 {t('pos.card')}
                                </button>
                                <button
                                    className={`pos__payment-method ${paymentMethod === 'credit' ? 'active' : ''}`}
                                    onClick={() => setPaymentMethod('credit')}
                                >
                                    📝 {t('pos.credit')}
                                </button>
                            </div>

                            {paymentMethod === 'cash' && (
                                <div className="input-group">
                                    <label>{t('pos.amountReceived')}</label>
                                    <input
                                        type="number"
                                        className="input input--lg"
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    {change > 0 && (
                                        <div className="pos__change">
                                            {t('pos.change')}: <strong>{formatCurrency(change)}</strong>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal__footer">
                            <button className="btn btn--secondary" onClick={() => setShowPaymentModal(false)}>
                                {t('common.cancel')}
                            </button>
                            <button
                                className="btn btn--success btn--lg"
                                onClick={handleCompleteSale}
                                disabled={isProcessing || (paymentMethod === 'cash' && parseFloat(amountReceived) < getTotal())}
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="loading-spinner-sm"></span>
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>✓ {t('pos.completeSale')}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
