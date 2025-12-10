import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../stores/settingsStore';
import './Accounting.css';

interface JournalEntry {
    id: number;
    entry_date: string;
    account_name: string;
    account_code: string;
    debit: number;
    credit: number;
    description: string;
    reference_type: string;
}

interface Account {
    id: number;
    code: string;
    name_fr: string;
    name_ar: string;
    type: string;
    balance: number;
}

export default function Accounting() {
    const { t } = useTranslation();
    const { storeConfig } = useSettingsStore();
    const [activeTab, setActiveTab] = useState<'journal' | 'accounts' | 'expenses'>('journal');
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 1);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (activeTab === 'journal') {
            loadJournalEntries();
        } else if (activeTab === 'accounts') {
            loadAccounts();
        }
    }, [activeTab, startDate, endDate]);

    const loadJournalEntries = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.accounting.getJournalEntries({
                startDate,
                endDate,
            });
            if (result.success) {
                setEntries(result.entries || []);
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAccounts = async () => {
        setIsLoading(true);
        try {
            const result = await window.electronAPI.accounting.getAccounts();
            if (result.success) {
                setAccounts(result.accounts || []);
            }
        } catch (error) {
            console.error('Failed to load accounts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `${amount.toFixed(2)} ${storeConfig?.currencySymbol || 'DZD'}`;
    };

    const getAccountTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            asset: 'badge--success',
            liability: 'badge--danger',
            equity: 'badge--primary',
            revenue: 'badge--info',
            expense: 'badge--warning',
        };
        return <span className={`badge ${colors[type] || ''}`}>{t(`accounting.${type}`)}</span>;
    };

    return (
        <div className="accounting-page">
            <h1>{t('accounting.title')}</h1>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'journal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('journal')}
                >
                    {t('accounting.journal')}
                </button>
                <button
                    className={`tab ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                >
                    {t('accounting.chartOfAccounts')}
                </button>
                <button
                    className={`tab ${activeTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => setActiveTab('expenses')}
                >
                    {t('accounting.expenses')}
                </button>
            </div>

            {/* Journal Entries Tab */}
            {activeTab === 'journal' && (
                <>
                    <div className="filters-row">
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
                    </div>

                    {isLoading ? (
                        <div className="loading">{t('common.loading')}</div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{t('accounting.date')}</th>
                                        <th>{t('accounting.account')}</th>
                                        <th>{t('accounting.description')}</th>
                                        <th>{t('accounting.debit')}</th>
                                        <th>{t('accounting.credit')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                                            <td>
                                                <code>{entry.account_code}</code> {entry.account_name}
                                            </td>
                                            <td>{entry.description || '-'}</td>
                                            <td className={entry.debit > 0 ? 'text-success' : ''}>
                                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                            </td>
                                            <td className={entry.credit > 0 ? 'text-danger' : ''}>
                                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {entries.length === 0 && (
                                <div className="empty-state">{t('accounting.noEntries')}</div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Chart of Accounts Tab */}
            {activeTab === 'accounts' && (
                <>
                    {isLoading ? (
                        <div className="loading">{t('common.loading')}</div>
                    ) : (
                        <div className="accounts-grid">
                            {accounts.map(account => (
                                <div key={account.id} className="account-card">
                                    <div className="account-header">
                                        <code>{account.code}</code>
                                        {getAccountTypeBadge(account.type)}
                                    </div>
                                    <h3>{account.name_fr}</h3>
                                    {account.name_ar && <p className="name-ar">{account.name_ar}</p>}
                                    <div className="account-balance">
                                        {formatCurrency(account.balance)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="expenses-section">
                    <p className="placeholder-text">{t('common.comingSoon')}</p>
                </div>
            )}
        </div>
    );
}
