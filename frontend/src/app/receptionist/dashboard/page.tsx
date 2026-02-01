'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { Plus, Search, Settings, Upload, Download, Calendar, Users, ClipboardList, Monitor, UserX } from 'lucide-react';
import * as XLSX from 'xlsx';

const INITIAL_PATIENT_FORM = { first_name: '', last_name: '', phone: '', gender: '' };
const INITIAL_APPOINTMENT_FORM = { patient_id: '', doctor_id: '', date: '', hour: '', minute: '' };

// Working hours (09:00 - 00:00)
const HOURS = [...Array.from({ length: 15 }, (_, i) => (9 + i).toString().padStart(2, '0')), '00'];
const MINUTES = ['00', '15', '30', '45'];

export default function ReceptionistDashboard() {
    const router = useRouter();
    const { t } = useSettings();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('appointments');
    const [patients, setPatients] = useState<any[]>([]);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]); // For today tab
    const [allAppointments, setAllAppointments] = useState<any[]>([]);     // For jadval tab
    const [doctors, setDoctors] = useState<any[]>([]);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [modalKey, setModalKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

    const showToast = (message: string, type: 'error' | 'success' = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Form states
    const [patientForm, setPatientForm] = useState(INITIAL_PATIENT_FORM);
    const [appointmentForm, setAppointmentForm] = useState(INITIAL_APPOINTMENT_FORM);
    // Appointment filters for Jadval tab
    const today = new Date().toISOString().split('T')[0];
    const [dateFrom, setDateFrom] = useState(today);
    const [dateTo, setDateTo] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });

    // Patient search in appointment modal
    const [patientSearch, setPatientSearch] = useState('');
    const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [showInlinePatientForm, setShowInlinePatientForm] = useState(false);
    const [inlinePatientForm, setInlinePatientForm] = useState(INITIAL_PATIENT_FORM);

    // Excel import state
    const [importPreview, setImportPreview] = useState<any[]>([]);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const u = api.getUser();
        if (!u || (u.role !== 'receptionist' && u.role !== 'boss')) {
            router.push('/login');
            return;
        }
        setUser(u);
        loadData();
    }, [router]);

    // Auto-reload when date filters change
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [dateFrom, dateTo]);

    const loadData = async () => {
        try {
            const [patientsData, todayData, allData, doctorsData] = await Promise.all([
                api.getPatients(1, search),
                api.getAppointments({ from: today, to: today }), // Today only
                api.getAppointments({ from: dateFrom, to: dateTo }), // Filtered range
                api.getDoctors(),
            ]);
            setPatients(patientsData.patients || []);
            setTodayAppointments(todayData.appointments || []);
            setAllAppointments(allData.appointments || []);
            setDoctors(doctorsData.doctors || []);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (modal: string) => {
        // Reset form states when opening modal
        if (modal === 'patient') {
            setPatientForm(INITIAL_PATIENT_FORM);
        } else if (modal === 'appointment') {
            setAppointmentForm(INITIAL_APPOINTMENT_FORM);
            setPatientSearch('');
            setSelectedPatient(null);
            setFilteredPatients([]);
            setShowPatientDropdown(false);
            setShowInlinePatientForm(false);
            setInlinePatientForm(INITIAL_PATIENT_FORM);
        }
        setModalKey(prev => prev + 1);
        setShowModal(modal);
    };

    const closeModal = () => {
        setShowModal(null);
        setShowInlinePatientForm(false);
    };

    const handleLogout = () => {
        api.logout();
        router.push('/login');
    };

    // Excel import handler
    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Skip header row, map columns: Ism, Familiya, Telefon, Jins
            const patients = jsonData.slice(1).filter(row => row[0] && row[1] && row[2]).map(row => ({
                first_name: String(row[0] || '').trim(),
                last_name: String(row[1] || '').trim(),
                phone: '+998' + String(row[2] || '').replace(/[^0-9]/g, '').slice(-9),
                gender: String(row[3] || '').toLowerCase() === 'erkak' ? 'male' :
                    String(row[3] || '').toLowerCase() === 'ayol' ? 'female' :
                        String(row[3] || '').toLowerCase() || undefined
            }));

            setImportPreview(patients);
            setImportResult(null);
            setShowModal('importPatients');
        };
        reader.readAsArrayBuffer(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmImport = async () => {
        if (importPreview.length === 0) return;
        setImporting(true);
        try {
            const result = await api.importPatients(importPreview);
            setImportResult(result);
            if (result.imported > 0) loadData();
        } catch (err: any) {
            setImportResult({ imported: 0, errors: [err.message] });
        } finally {
            setImporting(false);
        }
    };

    // Export patients to Excel
    const exportPatientsToExcel = () => {
        if (patients.length === 0) {
            alert('Eksport qilish uchun bemorlar mavjud emas');
            return;
        }

        const exportData = patients.map((p: any) => ({
            'Ism': p.first_name || '-',
            'Familiya': p.last_name || '-',
            'Telefon': p.phone || '-',
            'Jinsi': p.gender === 'male' ? 'Erkak' : p.gender === 'female' ? 'Ayol' : '-',
            'Ro\'yxatga olingan': new Date(p.created_at).toLocaleDateString('uz-UZ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Bemorlar');
        XLSX.writeFile(workbook, `bemorlar_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleCreatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createPatient(patientForm);
            closeModal();
            setPatientForm(INITIAL_PATIENT_FORM);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Search patients as user types
    const handlePatientSearch = async (query: string) => {
        setPatientSearch(query);
        setSelectedPatient(null);
        setAppointmentForm({ ...appointmentForm, patient_id: '' });

        if (query.length >= 2) {
            try {
                const result = await api.getPatients(1, query);
                setFilteredPatients(result.patients || []);
                setShowPatientDropdown(true);
            } catch (err) {
                console.error(err);
                setFilteredPatients([]);
            }
        } else {
            setFilteredPatients([]);
            setShowPatientDropdown(false);
        }
    };

    const selectPatient = (patient: any) => {
        setSelectedPatient(patient);
        setPatientSearch(`${patient.first_name} ${patient.last_name}`);
        setAppointmentForm({ ...appointmentForm, patient_id: patient.id });
        setShowPatientDropdown(false);
    };

    // Create patient inline and select it
    const handleCreateInlinePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newPatient: any = await api.createPatient(inlinePatientForm);
            // Select the newly created patient
            setSelectedPatient(newPatient);
            setPatientSearch(`${newPatient.first_name} ${newPatient.last_name}`);
            setAppointmentForm({ ...appointmentForm, patient_id: newPatient.id });
            setShowInlinePatientForm(false);
            setInlinePatientForm(INITIAL_PATIENT_FORM);
            // Refresh patients list
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Creating appointment with form:', appointmentForm);

        if (!appointmentForm.patient_id) {
            alert(t('appointments.selectPatient'));
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

        // Combine date, hour and minute into ISO string
        const startTime = new Date(`${appointmentForm.date}T${appointmentForm.hour}:${appointmentForm.minute}:00`).toISOString();

        try {
            console.log('Sending request to create appointment...');
            await api.createAppointment({
                patient_id: appointmentForm.patient_id,
                doctor_id: appointmentForm.doctor_id,
                start_time: startTime,
            });
            showToast('Navbat muvaffaqiyatli qo\'shildi!', 'success');
            closeModal();
            setAppointmentForm(INITIAL_APPOINTMENT_FORM);
            setSelectedPatient(null);
            setPatientSearch('');
            loadData();
        } catch (err: any) {
            console.error('Appointment creation error:', err);
            if (err.message.includes('vaqtda')) {
                showToast('Doktor vaqti bosh emas!', 'error');
            } else {
                showToast(err.message, 'error');
            }
        }
    };

    if (loading) return <div className="container"><p>{t('common.loading')}</p></div>;

    // Toast component
    const ToastNotification = () => toast && (
        <div style={{
            position: 'fixed',
            top: 20,
            right: 20,
            padding: '16px 24px',
            borderRadius: 8,
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#22c55e',
            color: 'white',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease-out'
        }}>
            {toast.message}
        </div>
    );

    return (
        <>
            <ToastNotification />
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">{t('nav.brand')}</span>
                    <div className="nav-user">
                        <a href="/settings" className="nav-link"><Settings size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('nav.settings')}</a>
                        <span>{user?.first_name} {user?.last_name} ({t('staff.receptionist')})</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header">
                    <h1>{t('dashboard.reception')}</h1>
                </div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}><Calendar size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('appointments.today')}</button>
                    <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}><Users size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />{t('patients.title')}</button>
                    <button className={`tab ${activeTab === 'jadval' ? 'active' : ''}`} onClick={() => setActiveTab('jadval')}><ClipboardList size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Jadval</button>
                </div>

                {/* Stats Panel */}
                <div className="stats-panel">
                    <div className="stats-panel-item">
                        <div className="stats-panel-icon blue">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div>
                            <div className="stats-panel-value">{todayAppointments.length}</div>
                            <div className="stats-panel-label">Bugungi qabullar</div>
                        </div>
                    </div>

                    <div className="stats-panel-item">
                        <div className="stats-panel-icon green">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="#22c55e" />
                                <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div>
                            <div className="stats-panel-value">{todayAppointments.filter(a => a.status === 'completed' || a.status === 'in_progress').length}</div>
                            <div className="stats-panel-label">Kelganlar</div>
                        </div>
                    </div>

                    <div className="stats-panel-item">
                        <div className="stats-panel-icon red">
                            <UserX size={24} stroke="#ef4444" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="stats-panel-value">{todayAppointments.filter(a => a.status === 'cancelled' || a.status === 'no_show').length}</div>
                            <div className="stats-panel-label">Kelmaganlar</div>
                        </div>
                    </div>
                </div>

                {activeTab === 'patients' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <input
                                className="input"
                                style={{ maxWidth: 300 }}
                                placeholder={t('patients.search')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleExcelImport}
                                    style={{ display: 'none' }}
                                />
                                <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={16} style={{ marginRight: 4 }} /> Excel import
                                </button>
                                <button className="btn btn-success" onClick={exportPatientsToExcel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Download size={16} /> Excel export
                                </button>
                                <button className="btn btn-primary" onClick={() => openModal('patient')}>{t('patients.add')}</button>
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('common.name')}</th>
                                    <th>{t('common.phone')}</th>
                                    <th>{t('patients.gender')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.first_name} {p.last_name}</td>
                                        <td>{p.phone}</td>
                                        <td>{p.gender ? t(`patients.${p.gender}`) : '-'}</td>
                                    </tr>
                                ))}
                                {patients.length === 0 && (
                                    <tr><td colSpan={3} className="empty-state">{t('patients.noPatients')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3><Calendar size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Bugungi navbatlar ({today})</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" onClick={() => openModal('appointment')}>{t('appointments.book')}</button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => window.open('/display', 'navbatlar_display', 'width=1200,height=800')}
                                    style={{ backgroundColor: '#8b5cf6' }}
                                >
                                    <Monitor size={16} style={{ marginRight: 4, verticalAlign: 'middle' }} />Ekranga chiqarish
                                </button>
                            </div>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('common.time')}</th>
                                    <th>{t('appointments.patient')}</th>
                                    <th>{t('appointments.doctor')}</th>
                                    <th>{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayAppointments.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{a.patient_name || 'Unknown'}</td>
                                        <td>{a.doctor_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${a.status}`}>{t(`status.${a.status}`)}</span></td>
                                    </tr>
                                ))}
                                {todayAppointments.length === 0 && (
                                    <tr><td colSpan={4} className="empty-state">Bugungi navbatlar yo'q</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'jadval' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                            <h3><ClipboardList size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Shifokorlar jadvali</h3>
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
                                <button className="btn btn-secondary" onClick={loadData}>{t('common.filter')}</button>
                                <button className="btn btn-primary" onClick={() => openModal('appointment')}>{t('appointments.book')}</button>
                            </div>
                        </div>

                        {/* Doctor Schedule Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {doctors.map((doctor) => {
                                const doctorAppointments = allAppointments
                                    .filter(a => a.doctor_id === doctor.id)
                                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                if (doctorAppointments.length === 0) return null;

                                // Group by date
                                const groupedByDate: { [date: string]: any[] } = {};
                                doctorAppointments.forEach(a => {
                                    const date = new Date(a.start_time).toLocaleDateString('uz-UZ');
                                    if (!groupedByDate[date]) groupedByDate[date] = [];
                                    groupedByDate[date].push(a);
                                });

                                return (
                                    <div key={doctor.id} style={{
                                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                                        borderRadius: 12,
                                        padding: 16,
                                        border: '1px solid #e2e8f0'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            marginBottom: 12,
                                            paddingBottom: 12,
                                            borderBottom: '2px solid #3b82f6'
                                        }}>
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
                                                {doctor.first_name?.[0]}{doctor.last_name?.[0]}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 16 }}>
                                                    Dr. {doctor.first_name} {doctor.last_name}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: 13 }}>
                                                    {doctorAppointments.length} ta navbat
                                                </div>
                                            </div>
                                        </div>

                                        {Object.entries(groupedByDate).map(([date, appointments]) => (
                                            <div key={date} style={{ marginBottom: 12 }}>
                                                <div style={{
                                                    fontWeight: 600,
                                                    fontSize: 13,
                                                    color: '#475569',
                                                    marginBottom: 8,
                                                    padding: '4px 8px',
                                                    background: '#e2e8f0',
                                                    borderRadius: 4,
                                                    display: 'inline-block'
                                                }}>
                                                    <Calendar size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />{date}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {appointments.map((a: any) => {
                                                        const startTime = new Date(a.start_time);
                                                        const endTime = new Date(startTime.getTime() + 15 * 60000); // 15 min slots
                                                        return (
                                                            <div key={a.id} style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 12,
                                                                padding: '10px 14px',
                                                                background: 'white',
                                                                borderRadius: 8,
                                                                border: '1px solid #e2e8f0',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <div style={{
                                                                    fontWeight: 600,
                                                                    color: '#3b82f6',
                                                                    fontSize: 14,
                                                                    minWidth: 100
                                                                }}>
                                                                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    {' - '}
                                                                    {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                                <div style={{ flex: 1 }}>
                                                                    <span style={{ fontWeight: 500 }}>
                                                                        {a.patient_name || 'Noma\'lum bemor'}
                                                                    </span>
                                                                </div>
                                                                <span className={`badge badge-${a.status}`} style={{ fontSize: 11 }}>
                                                                    {t(`status.${a.status}`)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}

                            {allAppointments.length === 0 && (
                                <div className="empty-state" style={{ textAlign: 'center', padding: 40 }}>
                                    {t('appointments.noAppointments')}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {showModal === 'patient' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>{t('patients.add')}</h2>
                            <form onSubmit={handleCreatePatient}>
                                <div className="form-group">
                                    <label>{t('patients.firstName')} *</label>
                                    <input className="input" value={patientForm.first_name} onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('patients.lastName')} *</label>
                                    <input className="input" value={patientForm.last_name} onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>{t('common.phone')} *</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontWeight: 500, color: '#475569' }}>+998</span>
                                        <input className="input" style={{ flex: 1 }} placeholder="90 123 45 67" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })} required maxLength={9} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{t('patients.gender')}</label>
                                    <select className="input" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                                        <option value="">{t('common.select')}</option>
                                        <option value="male">{t('patients.male')}</option>
                                        <option value="female">{t('patients.female')}</option>
                                        <option value="other">{t('patients.other')}</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">{t('common.create')}</button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showModal === 'appointment' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey} style={{ maxWidth: 500 }}>
                            <h2>{t('appointments.book')}</h2>
                            <form onSubmit={handleCreateAppointment}>
                                {/* Patient Search with Add Button */}
                                <div className="form-group">
                                    <label>{t('appointments.patient')}</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <div style={{ position: 'relative' }}>
                                                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                                                <input
                                                    className="input"
                                                    style={{ paddingLeft: 36 }}
                                                    placeholder={t('patients.search')}
                                                    value={patientSearch}
                                                    onChange={(e) => handlePatientSearch(e.target.value)}
                                                    onFocus={() => patientSearch.length >= 2 && setShowPatientDropdown(true)}
                                                />
                                            </div>
                                            {/* Dropdown with search results */}
                                            {showPatientDropdown && filteredPatients.length > 0 && (
                                                <div className="patient-search-dropdown">
                                                    {filteredPatients.map((p) => (
                                                        <div
                                                            key={p.id}
                                                            className="patient-search-item"
                                                            onClick={() => selectPatient(p)}
                                                        >
                                                            <div className="patient-search-item-name">{p.first_name} {p.last_name}</div>
                                                            <div className="patient-search-item-phone">{p.phone}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {/* No results message */}
                                            {showPatientDropdown && filteredPatients.length === 0 && patientSearch.length >= 2 && (
                                                <div className="patient-search-empty">
                                                    {t('patients.noPatients')}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                                            onClick={() => setShowInlinePatientForm(!showInlinePatientForm)}
                                            title={t('patients.add')}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                    {/* Selected patient display */}
                                    {selectedPatient && (
                                        <div className="patient-selected">
                                            ✓ {selectedPatient.first_name} {selectedPatient.last_name} ({selectedPatient.phone})
                                        </div>
                                    )}
                                </div>

                                {/* Inline Patient Form */}
                                {showInlinePatientForm && (
                                    <div className="inline-patient-form">
                                        <h4>{t('patients.add')}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: 12 }}>{t('patients.firstName')} *</label>
                                                <input
                                                    className="input"
                                                    value={inlinePatientForm.first_name}
                                                    onChange={(e) => setInlinePatientForm({ ...inlinePatientForm, first_name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: 12 }}>{t('patients.lastName')} *</label>
                                                <input
                                                    className="input"
                                                    value={inlinePatientForm.last_name}
                                                    onChange={(e) => setInlinePatientForm({ ...inlinePatientForm, last_name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: 12 }}>{t('common.phone')} *</label>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ padding: '6px 8px', background: '#f1f5f9', borderRadius: 4, fontWeight: 500, fontSize: 12, color: '#475569' }}>+998</span>
                                                    <input
                                                        className="input"
                                                        style={{ flex: 1 }}
                                                        placeholder="90 123 45 67"
                                                        value={inlinePatientForm.phone}
                                                        onChange={(e) => setInlinePatientForm({ ...inlinePatientForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })}
                                                        required
                                                        maxLength={9}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: 12 }}>{t('patients.gender')}</label>
                                                <select
                                                    className="input"
                                                    value={inlinePatientForm.gender}
                                                    onChange={(e) => setInlinePatientForm({ ...inlinePatientForm, gender: e.target.value })}
                                                >
                                                    <option value="">{t('common.select')}</option>
                                                    <option value="male">{t('patients.male')}</option>
                                                    <option value="female">{t('patients.female')}</option>
                                                    <option value="other">{t('patients.other')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ fontSize: 13, padding: '6px 12px' }}
                                                onClick={handleCreateInlinePatient}
                                            >
                                                {t('common.create')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ fontSize: 13, padding: '6px 12px' }}
                                                onClick={() => {
                                                    setShowInlinePatientForm(false);
                                                    setInlinePatientForm(INITIAL_PATIENT_FORM);
                                                }}
                                            >
                                                {t('common.cancel')}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label>{t('appointments.doctor')}</label>
                                    <select className="input" value={appointmentForm.doctor_id} onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: e.target.value })} required>
                                        <option value="">{t('appointments.selectDoctor')}</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>{t('common.date')}</label>
                                        <input className="input" type="date" value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} required />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>{t('common.time')}</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select className="input" style={{ flex: 1 }} value={appointmentForm.hour} onChange={(e) => setAppointmentForm({ ...appointmentForm, hour: e.target.value })} required>
                                                <option value="">Soat</option>
                                                {HOURS.map((h) => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                            <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>:</span>
                                            <select className="input" style={{ flex: 1 }} value={appointmentForm.minute} onChange={(e) => setAppointmentForm({ ...appointmentForm, minute: e.target.value })} required>
                                                <option value="">Minut</option>
                                                {MINUTES.map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">{t('appointments.book')}</button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Import Patients Modal */}
                {showModal === 'importPatients' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <h2>📥 Bemorlarni import qilish</h2>

                            {importResult ? (
                                <div>
                                    <div style={{ padding: 16, background: importResult.imported > 0 ? '#dcfce7' : '#fef2f2', borderRadius: 8, marginBottom: 16 }}>
                                        <p style={{ fontWeight: 600, marginBottom: 8 }}>
                                            ✅ {importResult.imported} ta bemor muvaffaqiyatli import qilindi
                                        </p>
                                        {importResult.errors.length > 0 && (
                                            <div style={{ color: '#dc2626' }}>
                                                <p style={{ fontWeight: 500 }}>Xatolar:</p>
                                                <ul style={{ marginLeft: 16, fontSize: 14 }}>
                                                    {importResult.errors.slice(0, 5).map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                    {importResult.errors.length > 5 && <li>... va yana {importResult.errors.length - 5} ta</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={closeModal}>Yopish</button>
                                </div>
                            ) : (
                                <>
                                    <p style={{ marginBottom: 12, color: '#64748b' }}>Excel format: <b>Ism, Familiya, Telefon, Jins</b></p>

                                    <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                                        <table className="table" style={{ fontSize: 14 }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Ism</th>
                                                    <th>Familiya</th>
                                                    <th>Telefon</th>
                                                    <th>Jins</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importPreview.map((p, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td>{p.first_name}</td>
                                                        <td>{p.last_name}</td>
                                                        <td>{p.phone}</td>
                                                        <td>{p.gender || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary" onClick={closeModal}>Bekor qilish</button>
                                        <button className="btn btn-primary" onClick={handleConfirmImport} disabled={importing || importPreview.length === 0}>
                                            {importing ? 'Import qilinmoqda...' : `${importPreview.length} ta bemorni import qilish`}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
