import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import './Layout.css';

export default function Layout() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { language, setLanguage, storeConfig } = useSettingsStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleLanguage = () => {
        setLanguage(language === 'fr' ? 'ar' : 'fr');
    };

    const navItems = [
        { path: '/dashboard', icon: '📊', label: t('nav.dashboard') },
        { path: '/pos', icon: '🛒', label: t('nav.pos') },
        { path: '/products', icon: '📦', label: t('nav.products') },
        { path: '/stock', icon: '📋', label: t('nav.stock') },
        { path: '/sales', icon: '💰', label: t('nav.sales') },
        { path: '/purchases', icon: '🚚', label: t('nav.purchases'), adminOnly: true },
        { path: '/accounting', icon: '📒', label: t('nav.accounting'), adminOnly: true },
        { path: '/reports', icon: '📈', label: t('nav.reports') },
    ];

    const settingsItems = [
        { path: '/settings', icon: '⚙️', label: t('nav.settings'), adminOnly: true },
        { path: '/users', icon: '👥', label: t('nav.users'), adminOnly: true },
        { path: '/license', icon: '🔑', label: t('nav.license'), adminOnly: true },
    ];

    const isAdmin = user?.role === 'admin';

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className="layout__sidebar">
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <span className="sidebar__logo-icon">📚</span>
                        <span className="sidebar__logo-text">Book Station</span>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    <div className="sidebar__nav-section">
                        {navItems
                            .filter(item => !item.adminOnly || isAdmin)
                            .map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `sidebar__nav-item ${isActive ? 'active' : ''}`
                                    }
                                >
                                    <span className="sidebar__nav-icon">{item.icon}</span>
                                    <span className="sidebar__nav-label">{item.label}</span>
                                </NavLink>
                            ))}
                    </div>

                    {isAdmin && (
                        <div className="sidebar__nav-section">
                            <div className="sidebar__nav-divider">
                                <span>{t('settings.title')}</span>
                            </div>
                            {settingsItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `sidebar__nav-item ${isActive ? 'active' : ''}`
                                    }
                                >
                                    <span className="sidebar__nav-icon">{item.icon}</span>
                                    <span className="sidebar__nav-label">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__user-avatar">
                            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="sidebar__user-info">
                            <span className="sidebar__user-name">{user?.fullName}</span>
                            <span className="sidebar__user-role">
                                {user?.role === 'admin' ? t('users.admin') : t('users.user')}
                            </span>
                        </div>
                    </div>

                    <div className="sidebar__actions">
                        <button
                            className="sidebar__action-btn"
                            onClick={toggleLanguage}
                            title={language === 'fr' ? 'العربية' : 'Français'}
                        >
                            {language === 'fr' ? 'ع' : 'Fr'}
                        </button>
                        <button
                            className="sidebar__action-btn sidebar__action-btn--danger"
                            onClick={handleLogout}
                            title={t('auth.logout')}
                        >
                            🚪
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="layout__main">
                <div className="layout__content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
