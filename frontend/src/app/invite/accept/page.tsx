'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [phone, setPhone] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Clear any existing session when accepting a new invitation
        api.logout();

        if (!token) {
            setError('Taklif havolasi yaroqsiz');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (phone.length !== 9) {
            setError('Telefon raqami 9 ta raqamdan iborat bo\'lishi kerak');
            return;
        }

        if (password !== confirmPassword) {
            setError('Parollar mos kelmaydi');
            return;
        }

        if (password.length < 8) {
            setError('Parol kamida 8 ta belgidan iborat bo\'lishi kerak');
            return;
        }

        setLoading(true);

        try {
            await api.acceptInvite(token!, password, firstName, lastName, '+998' + phone);
            router.push('/login?success=Akkaunt muvaffaqiyatli yaratildi. Iltimos, kiring.');
        } catch (err: any) {
            setError(err.message || 'Taklifni qabul qilishda xatolik');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <h1>❌ Noto'g'ri havola</h1>
                    <p>Bu taklif havolasi yaroqsiz yoki muddati tugagan.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>📋 Taklifni qabul qilish</h1>
                <p>Boshlash uchun akkauntingizni sozlang</p>

                {error && <div className="error-msg">{error}</div>}

                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="form-group">
                        <label>Telefon raqami *</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontWeight: 500, color: '#475569' }}>+998</span>
                            <input
                                type="text"
                                className="input"
                                style={{ flex: 1 }}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                                placeholder="90 123 45 67"
                                required
                                maxLength={9}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Ism *</label>
                        <input
                            type="text"
                            className="input"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ismingizni kiriting"
                            autoComplete="given-name"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Familiya *</label>
                        <input
                            type="text"
                            className="input"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Familiyangizni kiriting"
                            autoComplete="family-name"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Parol *</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Parol yarating (kamida 8 ta belgi)"
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="form-group">
                        <label>Parolni tasdiqlang *</label>
                        <input
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Parolni qayta kiriting"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading}
                    >
                        {loading ? 'Akkaunt yaratilmoqda...' : 'Akkaunt yaratish'}
                    </button>
                </form>
            </div>
        </div>
    );
}
