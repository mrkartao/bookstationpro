import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import './Login.css';

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login(username, password);
        if (success) {
            navigate('/dashboard');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Left Side - Branding */}
                <div className="login-branding">
                    <div className="login-branding__content">
                        <div className="login-branding__logo">
                            <span className="logo-icon">📚</span>
                            <h1>Book Station Pro</h1>
                        </div>
                        <p className="login-branding__tagline">
                            Système de gestion de magasin complet et performant
                        </p>
                        <div className="login-branding__features">
                            <div className="feature">
                                <span className="feature-icon">🛒</span>
                                <span>Point de Vente</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">📦</span>
                                <span>Gestion de Stock</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">📊</span>
                                <span>Comptabilité</span>
                            </div>
                            <div className="feature">
                                <span className="feature-icon">📈</span>
                                <span>Rapports</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="login-form-container">
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="login-form__header">
                            <h2>{t('auth.welcomeBack')}</h2>
                            <p>{t('auth.loginTitle')}</p>
                        </div>

                        {error && (
                            <div className="login-error">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="input-group">
                            <label htmlFor="username">{t('auth.username')}</label>
                            <div className="input-icon">
                                <span className="input-icon__icon">👤</span>
                                <input
                                    id="username"
                                    type="text"
                                    className="input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder={t('auth.username')}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">{t('auth.password')}</label>
                            <div className="input-icon">
                                <span className="input-icon__icon">🔒</span>
                                <input
                                    id="password"
                                    type="password"
                                    className="input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('auth.password')}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn--primary btn--lg login-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="loading-spinner-sm"></span>
                                    <span>{t('common.loading')}</span>
                                </>
                            ) : (
                                t('auth.loginButton')
                            )}
                        </button>

                        <div className="login-hint">
                            <p>
                                <strong>Compte par défaut:</strong><br />
                                Utilisateur: <code>admin</code><br />
                                Mot de passe: <code>admin123</code>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
