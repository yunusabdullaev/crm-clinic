'use client';

import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
    const router = useRouter();
    const { theme, setTheme, language, setLanguage, t } = useSettings();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const u = api.getUser();
        if (!u) {
            router.push('/login');
            return;
        }
        setUser(u);
    }, [router]);

    const handleLogout = () => {
        api.logout();
        router.push('/login');
    };

    const goBack = () => {
        if (user?.role === 'boss') router.push('/boss/dashboard');
        else if (user?.role === 'doctor') router.push('/doctor/dashboard');
        else if (user?.role === 'receptionist') router.push('/receptionist/dashboard');
        else router.push('/login');
    };

    if (!user) return <div className="container"><p>{t('common.loading')}</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">Medical CRM</span>
                    <div className="nav-user">
                        <span>{user?.first_name} {user?.last_name}</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div style={{ marginBottom: '20px' }}>
                    <button className="btn btn-secondary" onClick={goBack}>← {t('nav.dashboard')}</button>
                </div>

                <div className="card">
                    <h1 style={{ marginBottom: '24px' }}>{t('settings.title')}</h1>

                    <section style={{ marginBottom: '32px' }}>
                        <h2 style={{ marginBottom: '16px', fontSize: '18px' }}>{t('settings.appearance')}</h2>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                                {t('settings.theme')}
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme('light')}
                                    style={{ minWidth: '100px' }}
                                >
                                    ☀️ {t('settings.themeLight')}
                                </button>
                                <button
                                    className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme('dark')}
                                    style={{ minWidth: '100px' }}
                                >
                                    🌙 {t('settings.themeDark')}
                                </button>
                                <button
                                    className={`btn ${theme === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setTheme('system')}
                                    style={{ minWidth: '100px' }}
                                >
                                    💻 {t('settings.themeSystem')}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                                {t('settings.language')}
                            </label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className={`btn ${language === 'en' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage('en')}
                                    style={{ minWidth: '100px' }}
                                >
                                    🇬🇧 English
                                </button>
                                <button
                                    className={`btn ${language === 'uz' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage('uz')}
                                    style={{ minWidth: '100px' }}
                                >
                                    🇺🇿 O'zbek
                                </button>
                                <button
                                    className={`btn ${language === 'ru' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setLanguage('ru')}
                                    style={{ minWidth: '100px' }}
                                >
                                    🇷🇺 Русский
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
