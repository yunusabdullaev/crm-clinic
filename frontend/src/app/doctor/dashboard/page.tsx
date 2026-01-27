'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function DoctorDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('schedule');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [selectedVisit, setSelectedVisit] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Complete visit form
    const [visitForm, setVisitForm] = useState({
        diagnosis: '',
        notes: '',
        services: [] as { service_id: string; quantity: number }[],
        discount_type: '',
        discount_value: 0,
        doctor_share: 50,
    });

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'doctor') {
            router.push('/login');
            return;
        }
        setUser(u);
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [scheduleData, visitsData, servicesData] = await Promise.all([
                api.getSchedule(today),
                api.getVisits(today),
                api.getServices(),
            ]);
            setAppointments(scheduleData.appointments || []);
            setVisits(visitsData.visits || []);
            setServices(servicesData.services || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        api.logout();
        router.push('/login');
    };

    const handleStartVisit = async (appointment: any) => {
        try {
            await api.startVisit(appointment.patient_id, appointment.id);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openCompleteVisit = (visit: any) => {
        setSelectedVisit(visit);
        setVisitForm({
            diagnosis: '',
            notes: '',
            services: [],
            discount_type: '',
            discount_value: 0,
            doctor_share: 50,
        });
        setShowModal('complete');
    };

    const handleAddService = (serviceId: string) => {
        const existing = visitForm.services.find((s) => s.service_id === serviceId);
        if (existing) {
            setVisitForm({
                ...visitForm,
                services: visitForm.services.map((s) =>
                    s.service_id === serviceId ? { ...s, quantity: s.quantity + 1 } : s
                ),
            });
        } else {
            setVisitForm({
                ...visitForm,
                services: [...visitForm.services, { service_id: serviceId, quantity: 1 }],
            });
        }
    };

    const handleRemoveService = (serviceId: string) => {
        setVisitForm({
            ...visitForm,
            services: visitForm.services.filter((s) => s.service_id !== serviceId),
        });
    };

    const handleCompleteVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!visitForm.diagnosis) {
            alert('Diagnosis is required');
            return;
        }
        if (visitForm.services.length === 0) {
            alert('At least one service is required');
            return;
        }
        try {
            await api.completeVisit(selectedVisit.id, visitForm);
            setShowModal(null);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const calculateTotal = () => {
        let subtotal = 0;
        visitForm.services.forEach((vs) => {
            const service = services.find((s) => s.id === vs.service_id);
            if (service) {
                subtotal += service.price * vs.quantity;
            }
        });
        let discount = 0;
        if (visitForm.discount_type === 'percentage') {
            discount = subtotal * (visitForm.discount_value / 100);
        } else if (visitForm.discount_type === 'fixed') {
            discount = visitForm.discount_value;
        }
        return Math.max(0, subtotal - discount);
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">Medical CRM</span>
                    <div className="nav-user">
                        <span>Dr. {user?.first_name} {user?.last_name}</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header">
                    <h1>Doctor Dashboard</h1>
                </div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Today's Schedule</button>
                    <button className={`tab ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>Today's Visits</button>
                </div>

                {activeTab === 'schedule' && (
                    <div className="card">
                        <h3>Today's Appointments</h3>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Patient</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{a.patient_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                                        <td>
                                            {a.status === 'scheduled' || a.status === 'confirmed' ? (
                                                <button className="btn btn-success" onClick={() => handleStartVisit(a)}>Start Visit</button>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {appointments.length === 0 && (
                                    <tr><td colSpan={4} className="empty-state">No appointments today</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'visits' && (
                    <div className="card">
                        <h3>Today's Visits</h3>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Status</th>
                                    <th>Diagnosis</th>
                                    <th>Total</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((v) => (
                                    <tr key={v.id}>
                                        <td>{v.patient_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                                        <td>{v.diagnosis || '-'}</td>
                                        <td>${(v.total || 0).toFixed(2)}</td>
                                        <td>
                                            {v.status === 'started' ? (
                                                <button className="btn btn-primary" onClick={() => openCompleteVisit(v)}>Complete</button>
                                            ) : (
                                                <span>✓ Done</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {visits.length === 0 && (
                                    <tr><td colSpan={5} className="empty-state">No visits today</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal === 'complete' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <h2>Complete Visit</h2>
                            <form onSubmit={handleCompleteVisit}>
                                <div className="form-group">
                                    <label>Diagnosis *</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={visitForm.diagnosis}
                                        onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
                                        required
                                        placeholder="Enter diagnosis..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Notes</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={visitForm.notes}
                                        onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })}
                                        placeholder="Additional notes..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Services</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                                        {services.map((s) => (
                                            <button
                                                key={s.id}
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ fontSize: 12 }}
                                                onClick={() => handleAddService(s.id)}
                                            >
                                                + {s.name} (${s.price})
                                            </button>
                                        ))}
                                    </div>
                                    {visitForm.services.length > 0 && (
                                        <table className="table">
                                            <thead>
                                                <tr><th>Service</th><th>Price</th><th>Qty</th><th></th></tr>
                                            </thead>
                                            <tbody>
                                                {visitForm.services.map((vs) => {
                                                    const service = services.find((s) => s.id === vs.service_id);
                                                    return (
                                                        <tr key={vs.service_id}>
                                                            <td>{service?.name}</td>
                                                            <td>${service?.price}</td>
                                                            <td>{vs.quantity}</td>
                                                            <td><button type="button" className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleRemoveService(vs.service_id)}>×</button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 16 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Discount Type</label>
                                        <select className="input" value={visitForm.discount_type} onChange={(e) => setVisitForm({ ...visitForm, discount_type: e.target.value })}>
                                            <option value="">No Discount</option>
                                            <option value="percentage">Percentage</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Discount Value</label>
                                        <input
                                            className="input"
                                            type="number"
                                            step="0.01"
                                            value={visitForm.discount_value}
                                            onChange={(e) => setVisitForm({ ...visitForm, discount_value: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Doctor Share (%)</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={visitForm.doctor_share}
                                        onChange={(e) => setVisitForm({ ...visitForm, doctor_share: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                    <strong>Total: ${calculateTotal().toFixed(2)}</strong>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-success">Complete Visit</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
