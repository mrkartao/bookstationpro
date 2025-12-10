import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function TrialBanner() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="trial-banner">
            <span>⚠️ {t('trial.banner')}</span>
            <button className="trial-banner__btn" onClick={() => navigate('/license')}>
                {t('trial.activateNow')}
            </button>
        </div>
    );
}
