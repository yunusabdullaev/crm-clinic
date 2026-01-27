'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const INITIAL_PATIENT_FORM = { first_name: '', last_name: '', phone: '', gender: '' };
const INITIAL_APPOINTMENT_FORM = { patient_id: '', doctor_id: '', start_time: '' };

export default function ReceptionistDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('patients');
    const [patients, setPatients] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [modalKey, setModalKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Form states
    const [patientForm, setPatientForm] = useState(INITIAL_PATIENT_FORM);
    const [appointmentForm, setAppointmentForm] = useState(INITIAL_APPOINTMENT_FORM);

    useEffect(() => {
        const u = api.getUser();
        if (!u || (u.role !== 'receptionist' && u.role !== 'boss')) {
            router.push('/login');
            return;
        }
        setUser(u);
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [patientsData, appointmentsData, doctorsData] = await Promise.all([
                api.getPatients(1, search),
                api.getAppointments(today),
                api.getDoctors(),
            ]);
            setPatients(patientsData.patients || []);
            setAppointments(appointmentsData.appointments || []);
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
        }
        setModalKey(prev => prev + 1);
        setShowModal(modal);
    };

    const closeModal = () => {
        setShowModal(null);
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

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createAppointment({
                patient_id: appointmentForm.patient_id,
                doctor_id: appointmentForm.doctor_id,
                start_time: new Date(appointmentForm.start_time).toISOString(),
            });
            closeModal();
            setAppointmentForm(INITIAL_APPOINTMENT_FORM);
            loadData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">Medical CRM</span>
                    <div className="nav-user">
                        <span>{user?.first_name} {user?.last_name} (Receptionist)</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header">
                    <h1>Reception Dashboard</h1>
                </div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'patients' ? 'active' : ''}`} onClick={() => setActiveTab('patients')}>Patients</button>
                    <button className={`tab ${activeTab === 'appointments' ? 'active' : ''}`} onClick={() => setActiveTab('appointments')}>Today's Appointments</button>
                </div>

                {activeTab === 'patients' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <input
                                className="input"
                                style={{ maxWidth: 300 }}
                                placeholder="Search patients..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            />
                            <button className="btn btn-primary" onClick={() => openModal('patient')}>Add Patient</button>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Gender</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.first_name} {p.last_name}</td>
                                        <td>{p.phone}</td>
                                        <td>{p.gender || '-'}</td>
                                    </tr>
                                ))}
                                {patients.length === 0 && (
                                    <tr><td colSpan={3} className="empty-state">No patients found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3>Today's Appointments</h3>
                            <button className="btn btn-primary" onClick={() => openModal('appointment')}>Book Appointment</button>
                        </div>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {appointments.map((a) => (
                                    <tr key={a.id}>
                                        <td>{new Date(a.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{a.patient_name || 'Unknown'}</td>
                                        <td>{a.doctor_name || 'Unknown'}</td>
                                        <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                                    </tr>
                                ))}
                                {appointments.length === 0 && (
                                    <tr><td colSpan={4} className="empty-state">No appointments today</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal === 'patient' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Patient</h2>
                            <form onSubmit={handleCreatePatient}>
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input className="input" value={patientForm.first_name} onChange={(e) => setPatientForm({ ...patientForm, first_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Last Name *</label>
                                    <input className="input" value={patientForm.last_name} onChange={(e) => setPatientForm({ ...patientForm, last_name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input className="input" value={patientForm.phone} onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select className="input" value={patientForm.gender} onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                                        <option value="">Select...</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">Create</button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showModal === 'appointment' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Book Appointment</h2>
                            <form onSubmit={handleCreateAppointment}>
                                <div className="form-group">
                                    <label>Patient</label>
                                    <select className="input" value={appointmentForm.patient_id} onChange={(e) => setAppointmentForm({ ...appointmentForm, patient_id: e.target.value })} required>
                                        <option value="">Select Patient...</option>
                                        {patients.map((p) => (
                                            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Doctor</label>
                                    <select className="input" value={appointmentForm.doctor_id} onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor_id: e.target.value })} required>
                                        <option value="">Select Doctor...</option>
                                        {doctors.map((d) => (
                                            <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date & Time</label>
                                    <input className="input" type="datetime-local" value={appointmentForm.start_time} onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })} required />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">Book</button>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

