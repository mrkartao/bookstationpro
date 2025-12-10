import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoreSetup from './pages/StoreSetup';
import POS from './pages/POS';
import Products from './pages/Products';
import StockMovements from './pages/StockMovements';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import License from './pages/License';
import Users from './pages/Users';

// Components
import Layout from './components/common/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import TrialBanner from './components/common/TrialBanner';

function App() {
    const { i18n } = useTranslation();
    const { user, isAuthenticated, checkAuth } = useAuthStore();
    const { language, loadSettings, isTrialMode } = useSettingsStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await loadSettings();
            await checkAuth();
            setIsLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        // Update document direction and language
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
        i18n.changeLanguage(language);
    }, [language, i18n]);

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p>Chargement...</p>
            </div>
        );
    }

    return (
        <div className="app" data-theme="dark">
            {isTrialMode && <TrialBanner />}

            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
                />

                {/* Protected Routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="store-setup" element={<StoreSetup />} />
                    <Route path="pos" element={<POS />} />
                    <Route path="products" element={<Products />} />
                    <Route path="stock" element={<StockMovements />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="purchases" element={<Purchases />} />
                    <Route path="accounting" element={<Accounting />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="license" element={<License />} />
                    <Route path="users" element={<Users />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </div>
    );
}

export default App;
