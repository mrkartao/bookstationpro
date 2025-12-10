import { create } from 'zustand';

interface CartItem {
    productId: number;
    barcode: string;
    name: string;
    nameAr?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    vatRate: number;
    stockQuantity: number;
}

interface CartState {
    items: CartItem[];
    clientId: number | null;
    clientName: string | null;
    discountAmount: number;
    discountPercent: number;
    notes: string;

    // Computed (use getters via selectors)

    // Actions
    addItem: (product: any) => boolean;
    updateItemQuantity: (productId: number, quantity: number) => void;
    updateItemDiscount: (productId: number, discount: number) => void;
    removeItem: (productId: number) => void;
    clearCart: () => void;
    setClient: (clientId: number | null, clientName: string | null) => void;
    setDiscount: (amount: number, percent?: number) => void;
    setNotes: (notes: string) => void;

    // Getters
    getSubtotal: () => number;
    getVatAmount: () => number;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    clientId: null,
    clientName: null,
    discountAmount: 0,
    discountPercent: 0,
    notes: '',

    addItem: (product) => {
        const state = get();
        const existingItem = state.items.find(item => item.productId === product.id);

        if (existingItem) {
            // Check stock
            if (existingItem.quantity >= product.stock_quantity) {
                return false; // Insufficient stock
            }

            set({
                items: state.items.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                ),
            });
        } else {
            // Check stock
            if (product.stock_quantity < 1) {
                return false; // Out of stock
            }

            set({
                items: [
                    ...state.items,
                    {
                        productId: product.id,
                        barcode: product.barcode || '',
                        name: product.name_fr,
                        nameAr: product.name_ar,
                        quantity: 1,
                        unitPrice: product.sale_price,
                        discount: 0,
                        vatRate: product.vat_rate,
                        stockQuantity: product.stock_quantity,
                    },
                ],
            });
        }

        return true;
    },

    updateItemQuantity: (productId, quantity) => {
        if (quantity < 1) {
            get().removeItem(productId);
            return;
        }

        set((state) => ({
            items: state.items.map(item =>
                item.productId === productId
                    ? { ...item, quantity: Math.min(quantity, item.stockQuantity) }
                    : item
            ),
        }));
    },

    updateItemDiscount: (productId, discount) => {
        set((state) => ({
            items: state.items.map(item =>
                item.productId === productId
                    ? { ...item, discount: Math.max(0, discount) }
                    : item
            ),
        }));
    },

    removeItem: (productId) => {
        set((state) => ({
            items: state.items.filter(item => item.productId !== productId),
        }));
    },

    clearCart: () => {
        set({
            items: [],
            clientId: null,
            clientName: null,
            discountAmount: 0,
            discountPercent: 0,
            notes: '',
        });
    },

    setClient: (clientId, clientName) => {
        set({ clientId, clientName });
    },

    setDiscount: (amount, percent = 0) => {
        set({ discountAmount: amount, discountPercent: percent });
    },

    setNotes: (notes) => {
        set({ notes });
    },

    getSubtotal: () => {
        return get().items.reduce((sum, item) => {
            const lineTotal = (item.unitPrice * item.quantity) - item.discount;
            return sum + lineTotal;
        }, 0);
    },

    getVatAmount: () => {
        return get().items.reduce((sum, item) => {
            const lineTotal = (item.unitPrice * item.quantity) - item.discount;
            const vat = lineTotal * (item.vatRate / 100);
            return sum + vat;
        }, 0);
    },

    getTotal: () => {
        const state = get();
        const subtotal = state.getSubtotal();
        const vat = state.getVatAmount();
        const discount = state.discountAmount || (subtotal * state.discountPercent / 100);
        return subtotal - discount + vat;
    },

    getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
    },
}));
