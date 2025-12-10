import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Users.css';

interface User {
    id: number;
    username: string;
    full_name: string;
    full_name_ar: string;
    role: 'admin' | 'user';
    is_active: number;
    last_login: string;
    created_at: string;
}

export default function Users() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        username: '',
        password: '',
        fullName: '',
        fullNameAr: '',
        role: 'user' as 'admin' | 'user',
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.auth.getUsers();
            if (result.success) {
                setUsers(result.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            let result;
            if (editingUser) {
                const updateData: any = {
                    fullName: form.fullName,
                    fullNameAr: form.fullNameAr,
                    role: form.role,
                };
                if (form.password) {
                    updateData.password = form.password;
                }
                result = await window.electronAPI.auth.updateUser(editingUser.id, updateData);
            } else {
                if (!form.password) {
                    setError(t('validation.required'));
                    return;
                }
                result = await window.electronAPI.auth.createUser({
                    username: form.username,
                    password: form.password,
                    fullName: form.fullName,
                    fullNameAr: form.fullNameAr,
                    role: form.role,
                });
            }

            if (result.success) {
                setShowModal(false);
                resetForm();
                loadUsers();
            } else {
                setError(result.error);
            }
        } catch (error) {
            setError('Failed to save user');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setForm({
            username: user.username,
            password: '',
            fullName: user.full_name,
            fullNameAr: user.full_name_ar || '',
            role: user.role,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('common.confirmDelete'))) return;

        try {
            const result = await window.electronAPI.auth.deleteUser(id);
            if (result.success) {
                loadUsers();
            }
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    const resetForm = () => {
        setEditingUser(null);
        setForm({
            username: '',
            password: '',
            fullName: '',
            fullNameAr: '',
            role: 'user',
        });
        setError('');
    };

    return (
        <div className="users-page">
            <div className="page-header">
                <h1>{t('users.title')}</h1>
                <button className="btn btn--primary" onClick={() => { resetForm(); setShowModal(true); }}>
                    + {t('users.addUser')}
                </button>
            </div>

            {isLoading ? (
                <div className="loading">{t('common.loading')}</div>
            ) : (
                <div className="users-grid">
                    {users.map(user => (
                        <div key={user.id} className={`user-card ${!user.is_active ? 'inactive' : ''}`}>
                            <div className="user-avatar">
                                {user.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="user-info">
                                <h3>{user.full_name}</h3>
                                {user.full_name_ar && <p className="user-name-ar">{user.full_name_ar}</p>}
                                <p className="user-username">@{user.username}</p>
                                <span className={`badge ${user.role === 'admin' ? 'badge--primary' : 'badge--secondary'}`}>
                                    {user.role === 'admin' ? t('users.admin') : t('users.user')}
                                </span>
                            </div>
                            <div className="user-meta">
                                <p>{t('users.lastLogin')}: {user.last_login ? new Date(user.last_login).toLocaleDateString() : '-'}</p>
                            </div>
                            <div className="user-actions">
                                <button className="btn btn--ghost btn--sm" onClick={() => handleEdit(user)}>✏️</button>
                                {user.username !== 'admin' && (
                                    <button className="btn btn--ghost btn--sm" onClick={() => handleDelete(user.id)}>🗑️</button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{editingUser ? t('users.editUser') : t('users.addUser')}</h2>
                            <button className="btn btn--ghost" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal__content">
                                {error && <div className="error-message">{error}</div>}

                                <div className="input-group">
                                    <label>{t('auth.username')} *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        disabled={!!editingUser}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>{t('auth.password')} {editingUser ? '' : '*'}</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        required={!editingUser}
                                        placeholder={editingUser ? t('users.leaveBlank') : ''}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>{t('users.fullName')} (FR) *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.fullName}
                                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label>{t('users.fullName')} (AR)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={form.fullNameAr}
                                        onChange={(e) => setForm({ ...form, fullNameAr: e.target.value })}
                                        dir="rtl"
                                    />
                                </div>

                                <div className="input-group">
                                    <label>{t('users.role')}</label>
                                    <select
                                        className="input"
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'user' })}
                                    >
                                        <option value="user">{t('users.user')}</option>
                                        <option value="admin">{t('users.admin')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal__footer">
                                <button type="button" className="btn btn--ghost" onClick={() => setShowModal(false)}>
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="btn btn--primary">
                                    {editingUser ? t('common.save') : t('common.add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
