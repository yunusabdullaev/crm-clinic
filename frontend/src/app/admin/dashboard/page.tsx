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
    const [editClinicForm, setEditClinicForm] = useState({ name: '', timezone: '', address: '', phone: '', is_active: true });

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
            const fullPhone = '+998' + inviteEmail;
            const result = await api.inviteBoss(selectedClinic.id, fullPhone);
            setInviteResult(result);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openInviteModal = (clinic: any) => {
        setSelectedClinic(clinic);
        // Auto-fill with clinic phone (remove +998 prefix if present)
        const phone = clinic.phone || '';
        const cleanPhone = phone.replace(/^\+998/, '').replace(/[^0-9]/g, '');
        setInviteEmail(cleanPhone);
        setInviteResult(null);
        setShowModal('invite');
    };

    const openEditModal = (clinic: any) => {
        setSelectedClinic(clinic);
        setEditClinicForm({
            name: clinic.name,
            timezone: clinic.timezone,
            address: clinic.address || '',
            phone: clinic.phone || '',
            is_active: clinic.is_active,
        });
        setShowModal('edit');
    };

    const handleEditClinic = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.updateClinic(selectedClinic.id, editClinicForm);
            setShowModal(null);
            loadClinics();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteClinic = async (clinic: any) => {
        if (!confirm(`Klinikani o'chirmoqchimisiz: ${clinic.name}?`)) return;
        try {
            await api.deleteClinic(clinic.id);
            loadClinics();
        } catch (err: any) {
            alert(err.message);
        }
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
                                        <button className="btn btn-secondary" style={{ fontSize: 12, marginRight: 4 }} onClick={() => openEditModal(c)}>
                                            ✏️ Edit
                                        </button>
                                        <button className="btn btn-primary" style={{ fontSize: 12, marginRight: 4 }} onClick={() => openInviteModal(c)}>
                                            📧 Invite Boss
                                        </button>
                                        <button className="btn btn-danger" style={{ fontSize: 12, background: '#ef4444', border: 'none' }} onClick={() => handleDeleteClinic(c)}>
                                            🗑️ Delete
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontWeight: 500, color: 'var(--text-muted)' }}>+998</span>
                                        <input className="input" style={{ flex: 1 }} placeholder="90 123 45 67" value={clinicForm.phone} onChange={(e) => setClinicForm({ ...clinicForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })} maxLength={9} />
                                    </div>
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
                                    <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                                        <p><strong>Telefon:</strong> {inviteResult.email}</p>
                                        <p><strong>Token:</strong> {inviteResult.token}</p>
                                        <p><strong>Link:</strong></p>
                                        <input
                                            className="input"
                                            readOnly
                                            value={inviteResult.invite_url}
                                            onClick={(e) => (e.target as HTMLInputElement).select()}
                                        />
                                    </div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Copy this link and send it to the boss.</p>
                                    <button className="btn btn-primary" onClick={() => setShowModal(null)}>Done</button>
                                </div>
                            ) : (
                                <form onSubmit={handleInviteBoss}>
                                    <div className="form-group">
                                        <label>Boss Telefon Raqami *</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontWeight: 500, color: 'var(--text-muted)' }}>+998</span>
                                            <input
                                                className="input"
                                                type="tel"
                                                style={{ flex: 1 }}
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                                                required
                                                maxLength={9}
                                                placeholder="90 123 45 67"
                                            />
                                        </div>
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

                {showModal === 'edit' && (
                    <div className="modal-overlay" onClick={() => setShowModal(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Edit Clinic: {selectedClinic?.name}</h2>
                            <form onSubmit={handleEditClinic}>
                                <div className="form-group">
                                    <label>Clinic Name *</label>
                                    <input className="input" value={editClinicForm.name} onChange={(e) => setEditClinicForm({ ...editClinicForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select className="input" value={editClinicForm.timezone} onChange={(e) => setEditClinicForm({ ...editClinicForm, timezone: e.target.value })}>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">America/New_York</option>
                                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                                        <option value="Europe/London">Europe/London</option>
                                        <option value="Asia/Tokyo">Asia/Tokyo</option>
                                        <option value="Asia/Tashkent">Asia/Tashkent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input className="input" value={editClinicForm.address} onChange={(e) => setEditClinicForm({ ...editClinicForm, address: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontWeight: 500, color: 'var(--text-muted)' }}>+998</span>
                                        <input className="input" style={{ flex: 1 }} placeholder="90 123 45 67" value={editClinicForm.phone} onChange={(e) => setEditClinicForm({ ...editClinicForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })} maxLength={9} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" checked={editClinicForm.is_active} onChange={(e) => setEditClinicForm({ ...editClinicForm, is_active: e.target.checked })} />
                                        Active
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="submit" className="btn btn-primary">Save</button>
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
