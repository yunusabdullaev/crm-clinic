'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { Settings, Download, Calendar, Stethoscope, Users, History, Search, Phone, ClipboardList, ArrowLeft, Inbox, Activity, FileText, Wrench, Camera, CheckCircle, MessageSquare, Plus, UserX } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DoctorDashboard() {
    const router = useRouter();
    const { t } = useSettings();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('schedule');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [visitHistory, setVisitHistory] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [servicesExpanded, setServicesExpanded] = useState(false);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [selectedVisit, setSelectedVisit] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Patient list state
    const [patients, setPatients] = useState<any[]>([]);
    const [patientSearch, setPatientSearch] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [patientVisits, setPatientVisits] = useState<any[]>([]);
    const [selectedPatientVisit, setSelectedPatientVisit] = useState<any>(null);

    // Appointment booking state
    const [doctors, setDoctors] = useState<any[]>([]);
    const [appointmentPatientSearch, setAppointmentPatientSearch] = useState('');
    const [appointmentFilteredPatients, setAppointmentFilteredPatients] = useState<any[]>([]);
    const [appointmentSelectedPatient, setAppointmentSelectedPatient] = useState<any>(null);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [appointmentForm, setAppointmentForm] = useState({ patient_id: '', doctor_id: '', date: '', hour: '', minute: '' });
    const HOURS = [...Array.from({ length: 15 }, (_, i) => (9 + i).toString().padStart(2, '0')), '00'];
    const MINUTES = ['00', '15', '30', '45'];

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
        xray_images: [] as string[],
    });

    // X-ray upload state
    const [xrayUploading, setXrayUploading] = useState(false);
    const [xrayPreviewImage, setXrayPreviewImage] = useState<string | null>(null);

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
            const [scheduleData, visitsData, servicesData, doctorsData] = await Promise.all([
                api.getSchedule(dateFrom, dateTo), // Use from/to date range
                api.getVisits(today),
                api.getServices(),
                api.getDoctors(),
            ]);
            // Sort appointments by date/time
            const sortedAppointments = (scheduleData.appointments || []).sort((a: any, b: any) =>
                new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            );
            setAppointments(sortedAppointments);
            setVisits(visitsData.visits || []);
            setServices(servicesData.services || []);
            setDoctors(doctorsData.doctors || []);
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

    // Load patients for patient list
    const loadPatients = async (search?: string) => {
        try {
            const data = await api.getPatients(1, search || patientSearch);
            setPatients(data.patients || []);
        } catch (err: any) {
            console.error(err);
        }
    };

    // Load patient visit history
    const loadPatientVisits = async (patientId: string) => {
        try {
            const data = await api.getPatientVisits(patientId);
            // Sort by date descending
            const sorted = (data.visits || []).sort((a: any, b: any) =>
                new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
            );
            setPatientVisits(sorted);
        } catch (err: any) {
            console.error(err);
            setPatientVisits([]);
        }
    };

    // Export history to Excel
    const exportHistoryToExcel = () => {
        if (visitHistory.length === 0) {
            alert('Eksport qilish uchun tarix mavjud emas');
            return;
        }

        const exportData = visitHistory.map((v: any) => ({
            'Sana': new Date(v.completed_at || v.created_at).toLocaleDateString('uz-UZ'),
            'Bemor': v.patient_name || '-',
            'Tashxis': v.diagnosis || '-',
            'Xizmatlar': (v.services || []).map((s: any) => `${s.service_name} x${s.quantity}`).join(', '),
            'To\'lov turi': v.payment_type === 'cash' ? 'Naqd' : 'Karta',
            'Jami summa': v.total || v.total_amount || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Vizitlar tarixi');
        XLSX.writeFile(workbook, `vizitlar_tarixi_${historyDateFrom}_${historyDateTo}.xlsx`);
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

    // Mark appointment as no_show (kelmadi)
    const handleMarkNoShow = async (appointmentId: string) => {
        if (!confirm('Bemor kelmaganini tasdiqlaysizmi?')) return;
        try {
            await api.updateAppointmentStatus(appointmentId, 'no_show');
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Appointment booking functions
    const handleAppointmentPatientSearch = async (query: string) => {
        setAppointmentPatientSearch(query);
        setAppointmentSelectedPatient(null);
        setAppointmentForm({ ...appointmentForm, patient_id: '' });

        if (query.length >= 2) {
            try {
                const result = await api.getPatients(1, query);
                setAppointmentFilteredPatients(result.patients || []);
                setShowPatientDropdown(true);
            } catch (err) {
                console.error(err);
                setAppointmentFilteredPatients([]);
            }
        } else {
            setAppointmentFilteredPatients([]);
            setShowPatientDropdown(false);
        }
    };

    const selectAppointmentPatient = (patient: any) => {
        setAppointmentSelectedPatient(patient);
        setAppointmentPatientSearch(`${patient.first_name} ${patient.last_name}`);
        setAppointmentForm({ ...appointmentForm, patient_id: patient.id });
        setShowPatientDropdown(false);
    };

    const openAppointmentModal = () => {
        setAppointmentForm({ patient_id: '', doctor_id: user?.id || '', date: '', hour: '', minute: '' });
        setAppointmentPatientSearch('');
        setAppointmentSelectedPatient(null);
        setAppointmentFilteredPatients([]);
        setShowPatientDropdown(false);
        setShowModal('appointment');
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointmentForm.patient_id) {
            alert('Bemorni tanlang');
            return;
        }
        if (!appointmentForm.doctor_id) {
            alert('Shifokorni tanlang');
            return;
        }
        if (!appointmentForm.date || !appointmentForm.hour || !appointmentForm.minute) {
            alert('Sana va vaqtni tanlang');
            return;
        }

        const startTime = new Date(`${appointmentForm.date}T${appointmentForm.hour}:${appointmentForm.minute}:00`).toISOString();

        try {
            await api.createAppointment({
                patient_id: appointmentForm.patient_id,
                doctor_id: appointmentForm.doctor_id,
                start_time: startTime,
            });
            alert('Navbat muvaffaqiyatli qo\'shildi!');
            setShowModal(null);
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
            xray_images: visit.xray_images || [],
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
                    <button className={`tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}><Calendar size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('appointments.title')}</button>
                    <button className={`tab ${activeTab === 'visits' ? 'active' : ''}`} onClick={() => setActiveTab('visits')}><Stethoscope size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('visits.today')}</button>
                    <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => { setActiveTab('patients'); loadPatients(); }}><Users size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Bemorlar</button>
                    <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => { setActiveTab('history'); loadHistory(); }}><History size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Tarix</button>
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
                                <button className="btn btn-primary" onClick={openAppointmentModal}>
                                    <Plus size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Navbat qo'shish
                                </button>
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
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {(a.status === 'scheduled' || a.status === 'confirmed') && (
                                                    <>
                                                        <button className="btn btn-success" onClick={() => handleStartVisit(a)}>{t('visits.start')}</button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleMarkNoShow(a.id)}
                                                            style={{ backgroundColor: '#ef4444', color: 'white' }}
                                                            title="Kelmadi"
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                {a.status !== 'scheduled' && a.status !== 'confirmed' && (
                                                    <span>-</span>
                                                )}
                                            </div>
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
                            <h3><ClipboardList size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Bajarilgan ishlar tarixi</h3>
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
                                <button className="btn btn-primary" onClick={loadHistory}><Search size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Qidirish</button>
                                <button className="btn btn-success" onClick={exportHistoryToExcel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Download size={16} /> Excel
                                </button>
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

                {activeTab === 'patients' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <h3><Users size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Bemorlar ro'yxati</h3>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    className="input"
                                    placeholder="Bemor qidirish..."
                                    value={patientSearch}
                                    onChange={(e) => setPatientSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && loadPatients()}
                                    style={{ maxWidth: 250 }}
                                />
                                <button className="btn btn-primary" onClick={() => loadPatients()}><Search size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Qidirish</button>
                            </div>
                        </div>

                        {!selectedPatient ? (
                            // Patient list view
                            <div>
                                {patients.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                        {patients.map((p) => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedPatient(p);
                                                    loadPatientVisits(p.id);
                                                }}
                                                style={{
                                                    padding: 16,
                                                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                                    borderRadius: 12,
                                                    cursor: 'pointer',
                                                    border: '1px solid #e2e8f0',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: '#3b82f6',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold',
                                                        fontSize: 18
                                                    }}>
                                                        {p.first_name?.[0]}{p.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                                                        <div style={{ color: '#64748b', fontSize: 13 }}>{p.phone}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: 40 }}>
                                        <p><Search size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Bemor qidirish uchun ismni kiriting</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Patient details with visit history
                            <div>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { setSelectedPatient(null); setPatientVisits([]); setSelectedPatientVisit(null); }}
                                    style={{ marginBottom: 16 }}
                                >
                                    <ArrowLeft size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Orqaga
                                </button>

                                <div style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                    color: 'white',
                                    padding: 20,
                                    borderRadius: 12,
                                    marginBottom: 16
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{
                                            width: 64,
                                            height: 64,
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: 24
                                        }}>
                                            {selectedPatient.first_name?.[0]}{selectedPatient.last_name?.[0]}
                                        </div>
                                        <div>
                                            <h2 style={{ margin: 0 }}>{selectedPatient.first_name} {selectedPatient.last_name}</h2>
                                            <p style={{ margin: '4px 0 0', opacity: 0.9 }}><Phone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />{selectedPatient.phone}</p>
                                        </div>
                                    </div>
                                </div>

                                <h4 style={{ marginBottom: 12 }}><ClipboardList size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Tashriflar tarixi</h4>
                                {patientVisits.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {patientVisits.map((v) => (
                                            <div
                                                key={v.id}
                                                onClick={() => setSelectedPatientVisit(v)}
                                                style={{
                                                    padding: 16,
                                                    background: v.status === 'completed' ? '#f0fdf4' : '#fef3c7',
                                                    borderRadius: 8,
                                                    cursor: 'pointer',
                                                    border: '1px solid ' + (v.status === 'completed' ? '#86efac' : '#fcd34d'),
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>
                                                            <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />{new Date(v.completed_at || v.created_at).toLocaleDateString('uz-UZ')}
                                                        </div>
                                                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                                            {v.diagnosis || 'Tashxis yo\'q'}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span className={`badge badge-${v.status}`}>
                                                            {v.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}
                                                        </span>
                                                        <div style={{ fontWeight: 600, color: '#059669', marginTop: 4 }}>
                                                            {(v.total || 0).toLocaleString()} UZS
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ textAlign: 'center', padding: 20 }}>
                                        <p><Inbox size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Bu bemorning tashriflari yo'q</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Patient Visit Details Modal */}
                {selectedPatientVisit && (
                    <div className="modal-overlay" onClick={() => setSelectedPatientVisit(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <h2><ClipboardList size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Tashrif tafsilotlari</h2>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>Sana</div>
                                        <div style={{ fontWeight: 600 }}>
                                            {new Date(selectedPatientVisit.completed_at || selectedPatientVisit.created_at).toLocaleDateString('uz-UZ')}
                                        </div>
                                    </div>
                                    <div style={{ background: '#f1f5f9', padding: 12, borderRadius: 8 }}>
                                        <div style={{ fontSize: 12, color: '#64748b' }}>Holat</div>
                                        <span className={`badge badge-${selectedPatientVisit.status}`}>
                                            {selectedPatientVisit.status === 'completed' ? 'Yakunlangan' : 'Jarayonda'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}><Activity size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Tashxis</label>
                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    {selectedPatientVisit.diagnosis || 'Tashxis kiritilmagan'}
                                </div>
                            </div>

                            {selectedPatientVisit.affected_teeth?.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}><FileText size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Ta'sirlangan tishlar</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {selectedPatientVisit.affected_teeth.map((t: string) => (
                                            <span key={t} style={{
                                                padding: '4px 10px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                borderRadius: 12,
                                                fontSize: 13
                                            }}>{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPatientVisit.services?.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}><Wrench size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Bajarilgan xizmatlar</label>
                                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                        {selectedPatientVisit.services.map((s: any, i: number) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '8px 0',
                                                borderBottom: i < selectedPatientVisit.services.length - 1 ? '1px solid #e2e8f0' : 'none'
                                            }}>
                                                <span>{s.name || s.service_name} x{s.quantity}</span>
                                                <span style={{ fontWeight: 600 }}>{((s.price || 0) * (s.quantity || 1)).toLocaleString()} UZS</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPatientVisit.xray_images?.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}><Camera size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Rentgen rasmlar</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                                        {selectedPatientVisit.xray_images.map((url: string, i: number) => (
                                            <img
                                                key={i}
                                                src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${url}`}
                                                alt={`Rentgen ${i + 1}`}
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '1',
                                                    objectFit: 'cover',
                                                    borderRadius: 8,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => setXrayPreviewImage(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${url}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div style={{
                                background: '#f0fdf4',
                                padding: 16,
                                borderRadius: 8,
                                textAlign: 'right',
                                marginBottom: 16
                            }}>
                                <strong style={{ fontSize: 18, color: '#059669' }}>
                                    Jami: {(selectedPatientVisit.total || 0).toLocaleString()} UZS
                                </strong>
                            </div>

                            <button className="btn btn-secondary" onClick={() => setSelectedPatientVisit(null)}>Yopish</button>
                        </div>
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
                                    {/* Collapsible services dropdown header */}
                                    <div
                                        onClick={() => setServicesExpanded(!servicesExpanded)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: '#f8fafc',
                                            borderRadius: 12,
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            marginBottom: servicesExpanded ? 8 : 0
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontWeight: 600 }}>{t('nav.services')}</span>
                                            {visitForm.services.length > 0 && (
                                                <span style={{
                                                    background: '#22c55e',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    fontSize: 12,
                                                    fontWeight: 600
                                                }}>
                                                    {visitForm.services.length} ta
                                                </span>
                                            )}
                                        </div>
                                        <span style={{
                                            fontSize: 18,
                                            transition: 'transform 0.2s',
                                            transform: servicesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                                        }}>▼</span>
                                    </div>

                                    {/* Collapsible services list */}
                                    {servicesExpanded && (
                                        <>
                                            {/* Search input for services */}
                                            <div style={{ marginBottom: 8 }}>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    placeholder="🔍 Xizmat qidirish..."
                                                    value={serviceSearch}
                                                    onChange={(e) => setServiceSearch(e.target.value)}
                                                    style={{ width: '100%' }}
                                                />
                                            </div>
                                            <div style={{
                                                background: '#fff',
                                                borderRadius: 12,
                                                border: '1px solid #e2e8f0',
                                                maxHeight: 300,
                                                overflowY: 'auto'
                                            }}>
                                                {services
                                                    .filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                                    .map((s) => {
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
                                        </>
                                    )}
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
                                    <label><MessageSquare size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Izoh / Komentariy</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        value={visitForm.comment}
                                        onChange={(e) => setVisitForm({ ...visitForm, comment: e.target.value })}
                                        placeholder="Qo'shimcha izohlar..."
                                    />
                                </div>
                                {/* X-ray Image Upload Section */}
                                <div className="form-group">
                                    <label style={{ marginBottom: 8, display: 'block', fontWeight: 600 }}><Camera size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Rentgen fotolari</label>
                                    <div style={{
                                        background: '#f8fafc',
                                        borderRadius: 12,
                                        padding: 16,
                                        border: '2px dashed #cbd5e1'
                                    }}>
                                        {/* Upload button */}
                                        <div style={{ marginBottom: 12 }}>
                                            <input
                                                type="file"
                                                id="xray-upload"
                                                accept="image/*"
                                                multiple
                                                style={{ display: 'none' }}
                                                onChange={async (e) => {
                                                    const files = e.target.files;
                                                    if (!files || files.length === 0) return;

                                                    setXrayUploading(true);
                                                    try {
                                                        const uploadedUrls: string[] = [];
                                                        for (let i = 0; i < files.length; i++) {
                                                            const result = await api.uploadXrayImage(files[i]);
                                                            uploadedUrls.push(result.url);
                                                        }
                                                        setVisitForm(prev => ({
                                                            ...prev,
                                                            xray_images: [...prev.xray_images, ...uploadedUrls]
                                                        }));
                                                    } catch (err: any) {
                                                        alert('Rasm yuklashda xatolik: ' + (err.message || 'Xatolik'));
                                                    } finally {
                                                        setXrayUploading(false);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById('xray-upload')?.click()}
                                                disabled={xrayUploading}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '10px 16px',
                                                    background: xrayUploading ? '#94a3b8' : '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    cursor: xrayUploading ? 'wait' : 'pointer',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {xrayUploading ? '⏳ Yuklanmoqda...' : '+ Rasm yuklash'}
                                            </button>
                                        </div>

                                        {/* Thumbnails grid */}
                                        {visitForm.xray_images.length > 0 && (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                                                gap: 8,
                                                marginTop: 8
                                            }}>
                                                {visitForm.xray_images.map((url, index) => (
                                                    <div key={index} style={{
                                                        position: 'relative',
                                                        paddingTop: '100%',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        border: '1px solid #e2e8f0',
                                                        background: '#fff'
                                                    }}>
                                                        <img
                                                            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${url}`}
                                                            alt={`Rentgen ${index + 1}`}
                                                            onClick={() => setXrayPreviewImage(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${url}`)}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await api.deleteXrayImage(url);
                                                                    setVisitForm(prev => ({
                                                                        ...prev,
                                                                        xray_images: prev.xray_images.filter((_, i) => i !== index)
                                                                    }));
                                                                } catch (err: any) {
                                                                    alert('O\'chirishda xatolik: ' + (err.message || 'Xatolik'));
                                                                }
                                                            }}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 4,
                                                                right: 4,
                                                                width: 22,
                                                                height: 22,
                                                                borderRadius: '50%',
                                                                background: '#ef4444',
                                                                color: 'white',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: 12,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {visitForm.xray_images.length === 0 && (
                                            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0, textAlign: 'center' }}>
                                                Rentgen rasmlarini yuklash uchun tugmani bosing
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                    <strong>{t('visits.total')}: {calculateTotal().toLocaleString()} UZS</strong>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={async () => {
                                            if (!selectedVisit) return;
                                            try {
                                                await api.saveVisitDraft(selectedVisit.id, {
                                                    diagnosis: visitForm.diagnosis,
                                                    services: visitForm.services,
                                                    discount_type: visitForm.discount_type,
                                                    discount_value: visitForm.discount_value,
                                                    payment_type: visitForm.payment_type,
                                                    affected_teeth: visitForm.affected_teeth,
                                                    plan_steps: visitForm.planSteps.map((ps: any) => ({
                                                        description: ps.description || ps,
                                                        completed: ps.completed || false
                                                    })),
                                                    comment: visitForm.comment,
                                                    xray_images: visitForm.xray_images
                                                });
                                                alert(t('treatmentPlan.saved'));
                                                // Reload visits to get updated data
                                                const today = new Date().toISOString().split('T')[0];
                                                const visitsData = await api.getVisits(today);
                                                setVisits(visitsData.visits || []);
                                                setShowModal(null);
                                            } catch (err: any) {
                                                alert('Xatolik: ' + (err.message || 'Saqlashda xato'));
                                            }
                                        }}
                                    >{t('treatmentPlan.save')}</button>
                                    <button type="submit" className="btn btn-success" style={{ flex: 1 }}>{t('treatmentPlan.finish')}</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>{t('common.cancel')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* X-ray Preview Modal */}
                {xrayPreviewImage && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1100,
                            cursor: 'pointer'
                        }}
                        onClick={() => setXrayPreviewImage(null)}
                    >
                        <img
                            src={xrayPreviewImage}
                            alt="Rentgen kattalashtirish"
                            style={{
                                maxWidth: '90vw',
                                maxHeight: '90vh',
                                objectFit: 'contain',
                                borderRadius: 8
                            }}
                        />
                        <button
                            onClick={() => setXrayPreviewImage(null)}
                            style={{
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 20
                            }}
                        >×</button>
                    </div>
                )}

                {/* Appointment Booking Modal */}
                {showModal === 'appointment' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                            <h2><Plus size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />Navbat qo'shish</h2>
                            <form onSubmit={handleCreateAppointment}>
                                {/* Patient Search */}
                                <div className="form-group">
                                    <label>Bemor</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                            <input
                                                className="input"
                                                style={{ paddingLeft: 36 }}
                                                placeholder="Bemor qidirish..."
                                                value={appointmentPatientSearch}
                                                onChange={(e) => handleAppointmentPatientSearch(e.target.value)}
                                                onFocus={() => appointmentPatientSearch.length >= 2 && setShowPatientDropdown(true)}
                                            />
                                        </div>
                                        {showPatientDropdown && appointmentFilteredPatients.length > 0 && (
                                            <div className="patient-search-dropdown">
                                                {appointmentFilteredPatients.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="patient-search-item"
                                                        onClick={() => selectAppointmentPatient(p)}
                                                    >
                                                        <div className="patient-search-item-name">{p.first_name} {p.last_name}</div>
                                                        <div className="patient-search-item-phone">{p.phone}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {showPatientDropdown && appointmentFilteredPatients.length === 0 && appointmentPatientSearch.length >= 2 && (
                                            <div className="patient-search-empty">Bemor topilmadi</div>
                                        )}
                                    </div>
                                    {appointmentSelectedPatient && (
                                        <div className="patient-selected">
                                            ✓ {appointmentSelectedPatient.first_name} {appointmentSelectedPatient.last_name} ({appointmentSelectedPatient.phone})
                                        </div>
                                    )}
                                </div>

                                {/* Doctor Selection */}
                                <div className="form-group">
                                    <label>Shifokor</label>
                                    <select
                                        className="input"
                                        value={appointmentForm.doctor_id}
                                        onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: e.target.value })}
                                        required
                                    >
                                        <option value="">Shifokorni tanlang</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date and Time */}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Sana</label>
                                        <input
                                            className="input"
                                            type="date"
                                            value={appointmentForm.date}
                                            onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Vaqt</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select
                                                className="input"
                                                style={{ flex: 1 }}
                                                value={appointmentForm.hour}
                                                onChange={(e) => setAppointmentForm({ ...appointmentForm, hour: e.target.value })}
                                                required
                                            >
                                                <option value="">Soat</option>
                                                {HOURS.map((h) => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                                            <select
                                                className="input"
                                                style={{ flex: 1 }}
                                                value={appointmentForm.minute}
                                                onChange={(e) => setAppointmentForm({ ...appointmentForm, minute: e.target.value })}
                                                required
                                            >
                                                <option value="">Minut</option>
                                                {MINUTES.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">Navbat qo'shish</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Bekor qilish</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
