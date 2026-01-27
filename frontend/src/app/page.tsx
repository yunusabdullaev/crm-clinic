'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const user = api.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        // Redirect based on role
        switch (user.role) {
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
                router.push('/login');
        }
    }, [router]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <p>Redirecting...</p>
        </div>
    );
}
