'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { Settings } from 'lucide-react';

export default function DoctorDashboard() {
    const router = useRouter();
    const { t } = useSettings();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('schedule');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [selectedVisit, setSelectedVisit] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // History date filters
    const [historyDateFrom, setHistoryDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30); // Last 30 days
        return d.toISOString().split('T')[0];
    });
    const [historyDateTo, setHistoryDateTo] = useState(new Date().toISOString().split('T')[0]);

    // Date filters
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30); // Default 30 days ahead
        return d.toISOString().split('T')[0];
    });

    // Complete visit form
    const [visitForm, setVisitForm] = useState({
        diagnosis: '',
        services: [] as { service_id: string; quantity: number }[],
        discount_type: '',
        discount_value: 0,
        payment_type: 'cash' as 'cash' | 'card',
        affected_teeth: [] as string[],
        planSteps: [] as { description: string; completed: boolean }[],
        comment: '',
    });

    // Tooth numbers for the dental formula
    const upperTeeth = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
    const lowerTeeth = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

    // Check discount permission
    const [canDiscount, setCanDiscount] = useState(false);

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'doctor') {
            router.push('/login');
            return;
        }
        setUser(u);
        // Check discount permission from localStorage
        const savedPermissions = localStorage.getItem('doctor_discount_permissions');
        if (savedPermissions) {
            const permissions = JSON.parse(savedPermissions);
            setCanDiscount(permissions[u.id] === true);
        }
        loadData();
    }, [router]);

    // Auto-reload when filters change
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [dateFrom, dateTo]);

    const loadData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [scheduleData, visitsData, servicesData] = await Promise.all([
                api.getSchedule(dateFrom, dateTo), // Use from/to date range
                api.getVisits(today),
                api.getServices(),
            ]);
            // Sort appointments by date/time
            const sortedAppointments = (scheduleData.appointments || []).sort((a: any, b: any) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
            setAppointments(sortedAppointments);
            setVisits(visitsData.visits || []);
            setServices(servicesData.services || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        try {
            const historyData = await api.getVisitHistory(historyDateFrom, historyDateTo);
            // Filter only completed visits
            const completedVisits = (historyData.visits || []).filter((v: any) => v.status === 'completed');
            // Sort by date descending
            completedVisits.sort((a: any, b: any) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
            setVisitHistory(completedVisits);
        } catch (err: any) {
            console.error(err);
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
        // Load existing draft data if available
        setVisitForm({
            diagnosis: visit.diagnosis || '',
            services: (visit.services || []).map((s: any) => ({
                service_id: s.service_id || s.id,
                quantity: s.quantity || 1
            })),
            discount_type: visit.discount_type || '',
            discount_value: visit.discount_value || 0,
            payment_type: visit.payment_type || 'cash',
            affected_teeth: visit.affected_teeth || [],
            planSteps: (visit.plan_steps || []).map((step: any) => ({
                description: step.description || step,
                completed: step.completed || false
            })),
            comment: visit.comment || '',
        });
        setShowModal('complete');
    };

    const handleToothToggle = (toothNumber: string) => {
        setVisitForm(prev => ({
            ...prev,
            affected_teeth: prev.affected_teeth.includes(toothNumber)
                ? prev.affected_teeth.filter(t => t !== toothNumber)
                : [...prev.affected_teeth, toothNumber]
        }));
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
        if (visitForm.services.length === 0) {
            alert(t('visits.serviceRequired'));
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

    if (loading) return <div className="container"><p>{t('common.loading')}</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">{t('nav.brand')}</span>
                    <div className="nav-user">
                        <a href="/settings" className="nav-link"><Settings size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('nav.settings')}</a>
                        <span>Dr. {user?.first_name} {user?.last_name}</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header">
                    <h1>{t('dashboard.doctor')}</h1>
                </div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>{t('appointments.title')}</button>
                    <button className={`tab ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}>{t('visits.today')}</button>
                    <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); loadHistory(); }}>📋 Tarix</button>
                </div>

                {activeTab === 'schedule' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <h3>{t('appointments.title')}</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    className="input"
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    style={{ maxWidth: 150 }}
                                />
                                <span>{t('common.to')}</span>
                                <input
                                    className="input"
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    style={{ maxWidth: 150 }}
                                />
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('common.date')}</th>
                                    <th>{t('common.time')}</th>
                                    <th>{t('appointments.patient')}</th>
                                    <th>{t('common.status')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.start_time).toLocaleDateString()}</td>
                                        <td>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{a.patient_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${a.status}`}>{t(`status.${a.status}`)}</span></td>
                                        <td>
                                            {a.status === 'scheduled' || a.status === 'confirmed' ? (
                                                <button className="btn btn-success" onClick={() => handleStartVisit(a)}>{t('visits.start')}</button>
                                            ) : (
                                                <span>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {appointments.length === 0 && (
                                    <tr><td colSpan={5} className="empty-state">{t('visits.noAppointments')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'visits' && (
                    <div className="card">
                        <h3>{t('visits.today')}</h3>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('appointments.patient')}</th>
                                    <th>{t('common.status')}</th>
                                    <th>{t('visits.diagnosis')}</th>
                                    <th>{t('visits.total')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visits.map((v) => (
                                    <tr key={v.id}>
                                        <td>{v.patient_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${v.status}`}>{t(`status.${v.status}`)}</span></td>
                                        <td>{v.diagnosis || '-'}</td>
                                        <td>{(v.total || 0).toLocaleString()} UZS</td>
                                        <td>
                                            {v.status === 'started' ? (
                                                <button className="btn btn-primary" onClick={() => openCompleteVisit(v)}>{t('visits.complete')}</button>
                                            ) : (
                                                <span>✓ {t('common.done')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {visits.length === 0 && (
                                    <tr><td colSpan={5} className="empty-state">{t('visits.noVisits')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <h3>📋 Bajarilgan ishlar tarixi</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    className="input"
                                    type="date"
                                    value={historyDateFrom}
                                    onChange={(e) => setHistoryDateFrom(e.target.value)}
                                    style={{ maxWidth: 150 }}
                                />
                                <span>{t('common.to')}</span>
                                <input
                                    className="input"
                                    type="date"
                                    value={historyDateTo}
                                    onChange={(e) => setHistoryDateTo(e.target.value)}
                                    style={{ maxWidth: 150 }}
                                />
                                <button className="btn btn-primary" onClick={loadHistory}>🔍 Qidirish</button>
                            </div>
                        </div>

                        {visitHistory.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Sana</th>
                                            <th>Bemor</th>
                                            <th>Tashxis</th>
                                            <th>Xizmatlar</th>
                                            <th>Jami</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visitHistory.map((v) => (
                                            <tr key={v.id}>
                                                <td>{new Date(v.completed_at || v.created_at).toLocaleString()}</td>
                                                <td>{v.patient_name || 'Noma\'lum'}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {v.diagnosis || '-'}
                                                </td>
                                                <td>
                                                    {(v.services || []).map((s: any, i: number) => (
                                                        <span key={i} style={{
                                                            display: 'inline-block',
                                                            background: '#e0f2fe',
                                                            padding: '2px 8px',
                                                            borderRadius: 4,
                                                            fontSize: 12,
                                                            marginRight: 4,
                                                            marginBottom: 2
                                                        }}>
                                                            {s.name || s.service_name} x{s.quantity}
                                                        </span>
                                                    ))}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#059669' }}>
                                                    {(v.total_amount || 0).toLocaleString()} UZS
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>📭 Bu davrda yakunlangan vizitlar topilmadi</p>
                                <p style={{ fontSize: 14, color: '#64748b' }}>Sanalarni o'zgartiring va "Qidirish" tugmasini bosing</p>
                            </div>
                        )}

                        {visitHistory.length > 0 && (
                            <div style={{ marginTop: 16, padding: 16, background: '#f0fdf4', borderRadius: 8, textAlign: 'right' }}>
                                <strong style={{ color: '#15803d' }}>
                                    Jami: {visitHistory.length} ta vizit |
                                    {' '}{visitHistory.reduce((sum, v) => sum + (v.total_amount || 0), 0).toLocaleString()} UZS
                                </strong>
                            </div>
                        )}
                    </div>
                )}
                {showModal === 'complete' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <h2>{t('visits.completeTitle')}</h2>
                            <form onSubmit={handleCompleteVisit}>
                                <div className="form-group">
                                    <label>{t('visits.diagnosis')} *</label>
                                    <textarea
                                        className="input"
                                        rows={3}
                                        value={visitForm.diagnosis}
                                        onChange={(e) => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
                                        required
                                        placeholder={t('visits.diagnosisPlaceholder')}
                                    />
                                </div>
                                {/* Tooth Formula Section */}
                                <div className="form-group">
                                    <label style={{ marginBottom: 8, display: 'block', fontWeight: 600 }}>{t('visits.toothFormula')}</label>
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: 12,
                                        padding: 16,
                                        border: '1px solid #e2e8f0',
                                        marginBottom: 8
                                    }}>
                                        <img
                                            src="/tooth_formula.png"
                                            alt="Tooth Formula"
                                            style={{ width: '100%', maxWidth: 500, display: 'block', margin: '0 auto 16px' }}
                                        />
                                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, textAlign: 'center' }}>
                                            {t('visits.selectAffectedTeeth')}
                                        </p>
                                        {/* Upper teeth row */}
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
                                            {upperTeeth.map((tooth) => (
                                                <label key={tooth} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    padding: '4px 2px',
                                                    borderRadius: 4,
                                                    background: visitForm.affected_teeth.includes(tooth) ? '#fee2e2' : 'transparent',
                                                    border: visitForm.affected_teeth.includes(tooth) ? '2px solid #ef4444' : '2px solid transparent',
                                                    transition: 'all 0.2s',
                                                    minWidth: 28
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={visitForm.affected_teeth.includes(tooth)}
                                                        onChange={() => handleToothToggle(tooth)}
                                                        style={{ marginBottom: 2, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 10, fontWeight: 500 }}>{tooth}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {/* Lower teeth row */}
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                            {lowerTeeth.map((tooth) => (
                                                <label key={tooth} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    padding: '4px 2px',
                                                    borderRadius: 4,
                                                    background: visitForm.affected_teeth.includes(tooth) ? '#fee2e2' : 'transparent',
                                                    border: visitForm.affected_teeth.includes(tooth) ? '2px solid #ef4444' : '2px solid transparent',
                                                    transition: 'all 0.2s',
                                                    minWidth: 28
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={visitForm.affected_teeth.includes(tooth)}
                                                        onChange={() => handleToothToggle(tooth)}
                                                        style={{ marginBottom: 2, cursor: 'pointer' }}
                                                    />
                                                    <span style={{ fontSize: 10, fontWeight: 500 }}>{tooth}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {visitForm.affected_teeth.length > 0 && (
                                            <div style={{ marginTop: 12, padding: 8, background: '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                                                <span style={{ fontSize: 12, color: '#dc2626' }}>
                                                    {t('visits.affectedTeeth')}: <strong>{visitForm.affected_teeth.sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}</strong>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {/* Treatment Plan Section */}
                                <div className="form-group">
                                    <label style={{ marginBottom: 8, display: 'block', fontWeight: 600 }}>{t('treatmentPlan.title')}</label>
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: 12,
                                        padding: 16,
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        {visitForm.planSteps.map((step, index) => (
                                            <div key={index} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '8px 0',
                                                borderBottom: index < visitForm.planSteps.length - 1 ? '1px solid #e2e8f0' : 'none'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={step.completed}
                                                    onChange={() => {
                                                        const newSteps = [...visitForm.planSteps];
                                                        newSteps[index].completed = !newSteps[index].completed;
                                                        setVisitForm({ ...visitForm, planSteps: newSteps });
                                                    }}
                                                    style={{ width: 20, height: 20, cursor: 'pointer' }}
                                                />
                                                <span style={{
                                                    flex: 1,
                                                    textDecoration: step.completed ? 'line-through' : 'none',
                                                    color: step.completed ? '#9ca3af' : '#1f2937'
                                                }}>{step.description}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSteps = visitForm.planSteps.filter((_, i) => i !== index);
                                                        setVisitForm({ ...visitForm, planSteps: newSteps });
                                                    }}
                                                    style={{
                                                        background: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: 'none',
                                                        borderRadius: 6,
                                                        padding: '4px 8px',
                                                        cursor: 'pointer',
                                                        fontSize: 14
                                                    }}
                                                >×</button>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: 8, marginTop: visitForm.planSteps.length > 0 ? 12 : 0 }}>
                                            <input
                                                type="text"
                                                id="newPlanStep"
                                                className="input"
                                                placeholder={t('treatmentPlan.stepPlaceholder')}
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const input = e.target as HTMLInputElement;
                                                        if (input.value.trim()) {
                                                            setVisitForm({
                                                                ...visitForm,
                                                                planSteps: [...visitForm.planSteps, { description: input.value.trim(), completed: false }]
                                                            });
                                                            input.value = '';
                                                        }
                                                    }
                                                }}
                                                style={{ flex: 1 }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const input = document.getElementById('newPlanStep') as HTMLInputElement;
                                                    if (input && input.value.trim()) {
                                                        setVisitForm({
                                                            ...visitForm,
                                                            planSteps: [...visitForm.planSteps, { description: input.value.trim(), completed: false }]
                                                        });
                                                        input.value = '';
                                                    }
                                                }}
                                                className="btn btn-secondary"
                                                style={{ whiteSpace: 'nowrap' }}
                                            >+ {t('treatmentPlan.addStep')}</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ marginBottom: 8, display: 'block', fontWeight: 600 }}>{t('nav.services')}</label>
                                    <div style={{
                                        background: '#fff',
                                        borderRadius: 12,
                                        border: '1px solid #e2e8f0',
                                        maxHeight: 300,
                                        overflowY: 'auto'
                                    }}>
                                        {services.map((s) => {
                                            const selectedService = visitForm.services.find((vs) => vs.service_id === s.id);
                                            const isSelected = !!selectedService;
                                            return (
                                                <div key={s.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 16px',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    background: isSelected ? '#f0fdf4' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            handleRemoveService(s.id);
                                                        } else {
                                                            handleAddService(s.id);
                                                        }
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            readOnly
                                                            style={{ width: 18, height: 18, accentColor: '#22c55e', cursor: 'pointer' }}
                                                        />
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: '#1f2937', fontSize: 14 }}>{s.name}</div>
                                                            <div style={{ fontSize: 12, color: '#64748b' }}>{s.price.toLocaleString()} UZS</div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (selectedService!.quantity > 1) {
                                                                        setVisitForm({
                                                                            ...visitForm,
                                                                            services: visitForm.services.map((vs) =>
                                                                                vs.service_id === s.id ? { ...vs, quantity: vs.quantity - 1 } : vs
                                                                            ),
                                                                        });
                                                                    } else {
                                                                        handleRemoveService(s.id);
                                                                    }
                                                                }}
                                                                style={{
                                                                    width: 28, height: 28, borderRadius: 6,
                                                                    background: '#fee2e2', color: '#dc2626',
                                                                    border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 'bold'
                                                                }}
                                                            >−</button>
                                                            <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{selectedService!.quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddService(s.id)}
                                                                style={{
                                                                    width: 28, height: 28, borderRadius: 6,
                                                                    background: '#dcfce7', color: '#16a34a',
                                                                    border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 'bold'
                                                                }}
                                                            >+</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {visitForm.services.length > 0 && (
                                        <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', borderRadius: 8 }}>
                                            <div style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>
                                                ✓ Tanlangan: {visitForm.services.length} ta xizmat
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {canDiscount && (
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>{t('payment.discountType')}</label>
                                            <select className="input" value={visitForm.discount_type} onChange={(e) => setVisitForm({ ...visitForm, discount_type: e.target.value })}>
                                                <option value="">{t('payment.noDiscount')}</option>
                                                <option value="percentage">{t('payment.percentage')}</option>
                                                <option value="fixed">{t('payment.fixed')}</option>
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>{t('payment.discountValue')}</label>
                                            <input
                                                className="input"
                                                type="number"
                                                step="0.01"
                                                value={visitForm.discount_value}
                                                onChange={(e) => setVisitForm({ ...visitForm, discount_value: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>{t('payment.type')} *</label>
                                    <select
                                        className="input"
                                        value={visitForm.payment_type}
                                        onChange={(e) => setVisitForm({ ...visitForm, payment_type: e.target.value as 'cash' | 'card' })}
                                        required
                                    >
                                        <option value="cash">{t('payment.cash')}</option>
                                        <option value="card">{t('payment.card')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>📝 Izoh / Komentariy</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={visitForm.comment}
                                        onChange={(e) => setVisitForm({ ...visitForm, comment: e.target.value })}
                                        placeholder="Qo'shimcha izohlar..."
                                    />
                                </div>
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                    <strong>{t('visits.total')}: {calculateTotal().toLocaleString()} UZS</strong>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            // Save for later - just close modal, treatment plan is tracked separately
                                            alert(t('treatmentPlan.saved'));
                                            setShowModal(null);
                                        }}
                                    >{t('treatmentPlan.save')}</button>
                                    <button type="submit" className="btn btn-success" style={{ flex: 1 }}>{t('treatmentPlan.finish')}</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>{t('common.cancel')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
