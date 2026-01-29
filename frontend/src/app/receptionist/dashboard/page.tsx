'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { Plus, Search, Settings } from 'lucide-react';

const INITIAL_PATIENT_FORM = { first_name: '', last_name: '', phone: '', gender: '' };
const INITIAL_APPOINTMENT_FORM = { patient_id: '', doctor_id: '', date: '', hour: '', minute: '' };

// Working hours (08:00 - 20:00)
const HOURS = Array.from({ length: 13 }, (_, i) => (8 + i).toString().padStart(2, '0'));
const MINUTES = ['00', '30'];

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
                    <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>{t('appointments.today')}</button>
                    <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>{t('patients.title')}</button>
                    <button className={`tab ${activeTab === 'jadval' ? 'active' : ''}`} onClick={() => setActiveTab('jadval')}>📅 Jadval</button>
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
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="17" y1="8" x2="23" y2="14" />
                                <line x1="23" y1="8" x2="17" y2="14" />
                            </svg>
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
                            <button className="btn btn-primary" onClick={() => openModal('patient')}>{t('patients.add')}</button>
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
                            <h3>📅 Bugungi navbatlar ({today})</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-primary" onClick={() => openModal('appointment')}>{t('appointments.book')}</button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => window.open('/display', 'navbatlar_display', 'width=1200,height=800')}
                                    style={{ backgroundColor: '#8b5cf6' }}
                                >
                                    📺 Ekranga chiqarish
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
                            <h3>📋 Barcha navbatlar</h3>
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
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{t('common.time')}</th>
                                    <th>{t('common.date')}</th>
                                    <th>{t('appointments.patient')}</th>
                                    <th>{t('appointments.doctor')}</th>
                                    <th>{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allAppointments.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{new Date(a.start_time).toLocaleDateString()}</td>
                                        <td>{a.patient_name || 'Unknown'}</td>
                                        <td>{a.doctor_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${a.status}`}>{t(`status.${a.status}`)}</span></td>
                                    </tr>
                                ))}
                                {allAppointments.length === 0 && (
                                    <tr><td colSpan={5} className="empty-state">{t('appointments.noAppointments')}</td></tr>
                                )}
                            </tbody>
                        </table>
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
                                    <input className="input" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} required />
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
                                                <input
                                                    className="input"
                                                    value={inlinePatientForm.phone}
                                                    onChange={(e) => setInlinePatientForm({ ...inlinePatientForm, phone: e.target.value })}
                                                    required
                                                />
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
            </div>
        </>
    );
}
