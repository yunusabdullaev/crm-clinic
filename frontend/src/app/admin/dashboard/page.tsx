'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function AdminDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [clinics, setClinics] = useState<any[]>([]);
    const [showModal, setShowModal] = useState<string | null>(null);
    const [selectedClinic, setSelectedClinic] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [clinicForm, setClinicForm] = useState({ name: '', timezone: 'UTC', address: '', phone: '' });
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteResult, setInviteResult] = useState<any>(null);

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'superadmin') {
            router.push('/login');
            return;
        }
        setUser(u);
        loadClinics();
    }, [router]);

    const loadClinics = async () => {
        try {
            const data = await api.getClinics();
            setClinics(data.clinics || []);
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

    const handleCreateClinic = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createClinic(clinicForm);
            setShowModal(null);
            setClinicForm({ name: '', timezone: 'UTC', address: '', phone: '' });
            loadClinics();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleInviteBoss = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await api.inviteBoss(selectedClinic.id, inviteEmail);
            setInviteResult(result);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openInviteModal = (clinic: any) => {
        setSelectedClinic(clinic);
        setInviteEmail('');
        setInviteResult(null);
        setShowModal('invite');
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">Medical CRM - Admin</span>
                    <div className="nav-user">
                        <span>{user?.first_name} {user?.last_name} (Superadmin)</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header">
                    <h1>Admin Dashboard</h1>
                    <button className="btn btn-primary" onClick={() => setShowModal('clinic')}>Create Clinic</button>
                </div>

                <div className="card">
                    <h3>Clinics</h3>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Timezone</th>
                                <th>Address</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clinics.map((c) => (
                                <tr key={c.id}>
                                    <td>{c.name}</td>
                                    <td>{c.timezone}</td>
                                    <td>{c.address || '-'}</td>
                                    <td>{c.is_active ? '✅ Active' : '❌ Inactive'}</td>
                                    <td>
                                        <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => openInviteModal(c)}>
                                            Invite Boss
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {clinics.length === 0 && (
                                <tr><td colSpan={5} className="empty-state">No clinics yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal === 'clinic' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Create Clinic</h2>
                            <form onSubmit={handleCreateClinic}>
                                <div className="form-group">
                                    <label>Clinic Name *</label>
                                    <input className="input" value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select className="input" value={clinicForm.timezone} onChange={(e) => setClinicForm({ ...clinicForm, timezone: e.target.value })}>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                                        <option value="Europe/London">Europe/London</option>
                                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input className="input" value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input className="input" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value })} />
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">Create</button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showModal === 'invite' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Invite Boss to {selectedClinic?.name}</h2>
                            {inviteResult ? (
                                <div>
                                    <p style={{ marginBottom: 16 }}>✅ Invitation created successfully!</p>
                                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                        <p><strong>Email:</strong> {inviteResult.email}</p>
                                        <p><strong>Token:</strong> {inviteResult.token}</p>
                                        <p><strong>Link:</strong></p>
                                        <input
                                            className="input"
                                            readOnly
                                            value={inviteResult.invite_url}
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                        />
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: 14 }}>Copy this link and send it to the boss.</p>
                                    <button className="btn btn-primary" onClick={() => setShowModal(null)}>Done</button>
                                </div>
                            ) : (
                                <form onSubmit={handleInviteBoss}>
                                    <div className="form-group">
                                        <label>Boss Email *</label>
                                        <input
                                            className="input"
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                            placeholder="boss@clinic.com"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="submit" className="btn btn-primary">Send Invite</button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
