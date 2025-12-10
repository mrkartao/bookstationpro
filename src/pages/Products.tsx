import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Products.css';

interface Product {
    id: number;
    barcode: string;
    name_fr: string;
    name_ar: string;
    category_name: string;
    purchase_price: number;
    sale_price: number;
    stock_quantity: number;
    min_stock_level: number;
    is_active: number;
}

interface Category {
    id: number;
    name: string;
    name_ar: string;
}

export default function Products() {
    const { t } = useTranslation();
    const { storeConfig } = useSettingsStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Form state
    const [form, setForm] = useState({
        barcode: '',
        nameFr: '',
        nameAr: '',
        categoryId: '',
        purchasePrice: '',
        salePrice: '',
        vatRate: '19',
        stockQuantity: '0',
        minStockLevel: '5',
        unit: 'pcs',
    });

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.products.getAll({
                search: searchTerm || undefined,
                categoryId: selectedCategory || undefined,
            });
            if (result.success) {
                setProducts(result.products);
            }
        } catch (error) {
            console.error('Failed to load products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const result = await window.electronAPI.categories.getAll();
            if (result.success) {
                setCategories(result.categories);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProducts();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const productData = {
            barcode: form.barcode || undefined,
            nameFr: form.nameFr,
            nameAr: form.nameAr || undefined,
            categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
            purchasePrice: parseFloat(form.purchasePrice) || 0,
            salePrice: parseFloat(form.salePrice) || 0,
            vatRate: parseFloat(form.vatRate) || 19,
            stockQuantity: parseInt(form.stockQuantity) || 0,
            minStockLevel: parseInt(form.minStockLevel) || 5,
            unit: form.unit,
        };

        try {
            let result;
            if (editingProduct) {
                result = await window.electronAPI.products.update(editingProduct.id, productData);
            } else {
                result = await window.electronAPI.products.create(productData);
            }

            if (result.success) {
                setShowModal(false);
                resetForm();
                loadProducts();
            } else {
                alert(result.error);
            }
        } catch (error) {
            console.error('Failed to save product:', error);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setForm({
            barcode: product.barcode || '',
            nameFr: product.name_fr,
            nameAr: product.name_ar || '',
            categoryId: '', // Would need to map category
            purchasePrice: product.purchase_price.toString(),
            salePrice: product.sale_price.toString(),
            vatRate: '19',
            stockQuantity: product.stock_quantity.toString(),
            minStockLevel: product.min_stock_level.toString(),
            unit: 'pcs',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('common.confirmDelete'))) return;

        try {
            const result = await window.electronAPI.products.delete(id);
            if (result.success) {
                loadProducts();
            }
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    const resetForm = () => {
        setEditingProduct(null);
        setForm({
            barcode: '',
            nameFr: '',
            nameAr: '',
            categoryId: '',
            purchasePrice: '',
            salePrice: '',
            vatRate: '19',
            stockQuantity: '0',
            minStockLevel: '5',
            unit: 'pcs',
        });
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} ${storeConfig?.currencySymbol || 'DZD'}`;
    };

    return (
        <div className="products-page">
            <div className="page-header">
                <h1>{t('products.title')}</h1>
                <button className="btn btn--primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + {t('products.addProduct')}
                </button>
            </div>

            {/* Filters */}
            <div className="products-filters">
                <div className="search-box">
                    <input
                        type="text"
                        className="input"
                        placeholder={t('products.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="input"
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                >
                    <option value="">{t('products.allCategories')}</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Products Table */}
            {isLoading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>{t('products.barcode')}</th>
                                <th>{t('products.name')}</th>
                                <th>{t('products.category')}</th>
                                <th>{t('products.buyPrice')}</th>
                                <th>{t('products.sellPrice')}</th>
                                <th>{t('products.stock')}</th>
                                <th>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product.id} className={product.stock_quantity <= product.min_stock_level ? 'low-stock' : ''}>
                                    <td><code>{product.barcode || '-'}</code></td>
                                    <td>
                                        <div>{product.name_fr}</div>
                                        {product.name_ar && <div className="text-muted">{product.name_ar}</div>}
                                    </td>
                                    <td>{product.category_name || '-'}</td>
                                    <td>{formatCurrency(product.purchase_price)}</td>
                                    <td>{formatCurrency(product.sale_price)}</td>
                                    <td>
                                        <span className={`badge ${product.stock_quantity <= product.min_stock_level ? 'badge--danger' : 'badge--success'}`}>
                                            {product.stock_quantity}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn--ghost btn--sm" onClick={() => handleEdit(product)}>✏️</button>
                                        <button className="btn btn--ghost btn--sm" onClick={() => handleDelete(product.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {products.length === 0 && (
                        <div className="empty-state">
                            <p>{t('products.noProducts')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{editingProduct ? t('products.editProduct') : t('products.addProduct')}</h2>
                            <button className="btn btn--ghost" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal__content">
                                <div className="form-grid">
                                    <div className="input-group">
                                        <label>{t('products.barcode')}</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={form.barcode}
                                            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.category')}</label>
                                        <select
                                            className="input"
                                            value={form.categoryId}
                                            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                                        >
                                            <option value="">{t('products.selectCategory')}</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.nameFr')} *</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={form.nameFr}
                                            onChange={(e) => setForm({ ...form, nameFr: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.nameAr')}</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={form.nameAr}
                                            onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                                            dir="rtl"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.buyPrice')} *</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.purchasePrice}
                                            onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.sellPrice')} *</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.salePrice}
                                            onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.stock')}</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.stockQuantity}
                                            onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>{t('products.minStock')}</label>
                                        <input
                                            type="number"
                                            className="input"
                                            value={form.minStockLevel}
                                            onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal__footer">
                                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    {editingProduct ? t('common.save') : t('common.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
