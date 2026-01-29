'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AppointmentsDisplayPage() {
    const [appointments, setAppointments] = useState<any[]>([]);

    const loadAppointments = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const data = await api.getAppointments({ from: today, to: today }); // Today only
            setAppointments(data.appointments || []);
        } catch (err) {
            console.error('Failed to load appointments:', err);
        }
    };

    useEffect(() => {
        loadAppointments();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadAppointments, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1b2a 100%)',
            padding: 40,
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <h1 style={{
                color: 'white',
                textAlign: 'center',
                fontSize: 48,
                marginBottom: 40,
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
                📋 Bugungi Navbatlar
            </h1>

            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
                <thead>
                    <tr style={{ backgroundColor: '#2563eb' }}>
                        <th style={{ padding: 20, color: 'white', fontSize: 24, textAlign: 'left' }}>Vaqt</th>
                        <th style={{ padding: 20, color: 'white', fontSize: 24, textAlign: 'left' }}>Bemor</th>
                        <th style={{ padding: 20, color: 'white', fontSize: 24, textAlign: 'left' }}>Shifokor</th>
                        <th style={{ padding: 20, color: 'white', fontSize: 24, textAlign: 'left' }}>Holat</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map((a, index) => (
                        <tr key={a.id} style={{
                            backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                            borderBottom: '1px solid #e2e8f0'
                        }}>
                            <td style={{ padding: 16, fontSize: 22, fontWeight: 600 }}>
                                {new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: 16, fontSize: 22, fontWeight: 500 }}>
                                {a.patient_name || 'Noma\'lum'}
                            </td>
                            <td style={{ padding: 16, fontSize: 22 }}>
                                {a.doctor_name || 'Noma\'lum'}
                            </td>
                            <td style={{ padding: 16 }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    fontSize: 18,
                                    fontWeight: 600,
                                    backgroundColor: a.status === 'scheduled' ? '#dbeafe' :
                                        a.status === 'in_progress' ? '#fef3c7' :
                                            a.status === 'completed' ? '#d1fae5' : '#fee2e2',
                                    color: a.status === 'scheduled' ? '#1e40af' :
                                        a.status === 'in_progress' ? '#92400e' :
                                            a.status === 'completed' ? '#065f46' : '#991b1b'
                                }}>
                                    {a.status === 'scheduled' ? 'Rejalashtirilgan' :
                                        a.status === 'in_progress' ? 'Jarayonda' :
                                            a.status === 'completed' ? 'Yakunlangan' : 'Bekor qilingan'}
                                </span>
                            </td>
                        </tr>
                    ))}
                    {appointments.length === 0 && (
                        <tr>
                            <td colSpan={4} style={{
                                padding: 40,
                                textAlign: 'center',
                                fontSize: 24,
                                color: '#64748b'
                            }}>
                                Hozircha navbatlar yo'q
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <p style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)',
                marginTop: 30,
                fontSize: 18
            }}>
                Har 30 soniyada avtomatik yangilanadi
            </p>
        </div>
    );
}
