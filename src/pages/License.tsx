import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './License.css';

interface MachineInfo {
    macAddress: string;
    macHash: string;
    deviceId: string;
}

interface LicenseStatus {
    isValid: boolean;
    isTrial: boolean;
    customerName?: string;
    features: string[];
    expiresAt?: string;
    daysRemaining?: number;
    error?: string;
}

export default function License() {
    const { t } = useTranslation();
    const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
    const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [licenseRequest, setLicenseRequest] = useState('');
    const [licenseInput, setLicenseInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        loadLicenseInfo();
    }, []);

    const loadLicenseInfo = async () => {
        try {
            const [machineResult, statusResult] = await Promise.all([
                window.electronAPI.license.getMachineInfo(),
                window.electronAPI.license.getStatus(),
            ]);

            if (machineResult.success) {
                setMachineInfo(machineResult);
            }

            setLicenseStatus(statusResult);
        } catch (error) {
            console.error('Failed to load license info:', error);
        }
    };

    const handleGenerateRequest = async () => {
        if (!customerName.trim()) {
            setMessage({ type: 'error', text: t('validation.required') });
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.electronAPI.license.generateRequest(customerName);
            if (result.success) {
                setLicenseRequest(JSON.stringify(result.request, null, 2));
                setMessage({ type: 'success', text: t('license.requestGenerated') });
            } else {
                setMessage({ type: 'error', text: result.error || 'Error' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to generate request' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivateLicense = async () => {
        if (!licenseInput.trim()) {
            setMessage({ type: 'error', text: t('validation.required') });
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.electronAPI.license.activate(licenseInput);
            if (result.success) {
                setMessage({ type: 'success', text: 'License activated successfully!' });
                setLicenseStatus(result.status);
                setLicenseInput('');
            } else {
                setMessage({ type: 'error', text: result.status?.error || 'Activation failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Activation failed' });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessage({ type: 'success', text: t('license.copyToClipboard') + ' ✓' });
        setTimeout(() => setMessage(null), 2000);
    };

    return (
        <div className="license-page">
            <h1>{t('license.title')}</h1>

            {/* License Status */}
            <div className="card mb-lg">
                <div className="card__header">
                    <h3 className="card__title">{t('license.status')}</h3>
                    <span className={`badge ${licenseStatus?.isValid ? 'badge--success' : 'badge--warning'}`}>
                        {licenseStatus?.isValid ? t('license.licensed') : t('license.trialMode')}
                    </span>
                </div>

                {licenseStatus?.isValid ? (
                    <div className="license-info">
                        <div className="license-info__row">
                            <span>{t('license.customerName')}:</span>
                            <strong>{licenseStatus.customerName}</strong>
                        </div>
                        {licenseStatus.expiresAt && (
                            <>
                                <div className="license-info__row">
                                    <span>{t('license.expiresAt')}:</span>
                                    <strong>{new Date(licenseStatus.expiresAt).toLocaleDateString()}</strong>
                                </div>
                                <div className="license-info__row">
                                    <span>{t('license.daysRemaining')}:</span>
                                    <strong className={licenseStatus.daysRemaining! < 30 ? 'text-warning' : ''}>
                                        {licenseStatus.daysRemaining}
                                    </strong>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="license-trial">
                        <p>⚠️ {t('trial.banner')}</p>
                    </div>
                )}
            </div>

            {/* Machine Info */}
            <div className="card mb-lg">
                <h3 className="card__title mb-md">{t('license.machineId')}</h3>
                {machineInfo && (
                    <div className="machine-info">
                        <div className="machine-info__item">
                            <span>{t('license.macAddress')}:</span>
                            <code>{machineInfo.macAddress}</code>
                            <button className="btn btn--ghost btn--sm" onClick={() => copyToClipboard(machineInfo.macHash)}>
                                📋
                            </button>
                        </div>
                        <div className="machine-info__item">
                            <span>{t('license.machineId')}:</span>
                            <code>{machineInfo.deviceId.substring(0, 16)}...</code>
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Request */}
            {!licenseStatus?.isValid && (
                <div className="card mb-lg">
                    <h3 className="card__title mb-md">{t('license.generateRequest')}</h3>

                    <div className="input-group mb-md">
                        <label>{t('license.customerName')}</label>
                        <input
                            type="text"
                            className="input"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder={t('license.customerName')}
                        />
                    </div>

                    <button
                        className="btn btn--primary mb-md"
                        onClick={handleGenerateRequest}
                        disabled={isLoading}
                    >
                        {isLoading ? t('common.loading') : t('license.generateRequest')}
                    </button>

                    {licenseRequest && (
                        <div className="license-request">
                            <div className="license-request__header">
                                <span>📄 {t('license.requestGenerated')}</span>
                                <button className="btn btn--ghost btn--sm" onClick={() => copyToClipboard(licenseRequest)}>
                                    📋 {t('license.copyToClipboard')}
                                </button>
                            </div>
                            <pre>{licenseRequest}</pre>
                            <p className="text-muted text-sm mt-md">
                                ℹ️ {t('license.sendToVendor')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Activate License */}
            {!licenseStatus?.isValid && (
                <div className="card">
                    <h3 className="card__title mb-md">{t('license.activateLicense')}</h3>

                    <div className="input-group mb-md">
                        <label>{t('license.pasteLicense')}</label>
                        <textarea
                            className="input"
                            rows={6}
                            value={licenseInput}
                            onChange={(e) => setLicenseInput(e.target.value)}
                            placeholder='{"customerId": "...", "signature": "..."}'
                        />
                    </div>

                    <button
                        className="btn btn--success"
                        onClick={handleActivateLicense}
                        disabled={isLoading}
                    >
                        {isLoading ? t('common.loading') : t('license.activateLicense')}
                    </button>
                </div>
            )}

            {/* Message */}
            {message && (
                <div className={`license-message license-message--${message.type}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
