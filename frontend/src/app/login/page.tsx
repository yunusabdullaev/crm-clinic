'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';

export default function LoginPage() {
    const router = useRouter();
    const { t } = useSettings();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.login(email, password);

            // Redirect based on role
            switch (response.user.role) {
                case 'superadmin':
                    router.push('/admin/dashboard');
                    break;
                case 'boss':
                    router.push('/boss/dashboard');
                    break;
                case 'doctor':
                    router.push('/doctor/dashboard');
                    break;
                case 'receptionist':
                    router.push('/receptionist/dashboard');
                    break;
                default:
                    router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>{t('login.title')}</h1>
                <p>{t('login.subtitle')}</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('login.email')}</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('login.password')}</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('login.passwordPlaceholder')}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? t('login.submitting') : t('login.submit')}
                    </button>
                </form>
            </div>
        </div>
    );
}
