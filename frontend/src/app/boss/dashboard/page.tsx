'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
    BarChart3, Users, Briefcase, FileText, Receipt, Wallet,
    Activity, Settings, LogOut, Plus, Trash2, UserPlus, Building2,
    DollarSign, CalendarDays, TrendingUp, Stethoscope, ClipboardList
} from 'lucide-react';

const INITIAL_USER_FORM = { email: '', first_name: '', last_name: '', role: 'doctor', password: '' };
const INITIAL_SERVICE_FORM = { name: '', description: '', price: '', duration: '30' };
const INITIAL_CONTRACT_FORM = { doctor_id: '', share_percentage: '50', start_date: '', end_date: '', notes: '' };
const INITIAL_EXPENSE_FORM = { category: 'other', amount: '', date: '', note: '' };
const INITIAL_SALARY_FORM = { user_id: '', monthly_amount: '', effective_from: '' };

export default function BossDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('reports');
    const [report, setReport] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [salaries, setSalaries] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditDoctorFilter, setAuditDoctorFilter] = useState('');
    const [showModal, setShowModal] = useState<string | null>(null);
    const [modalKey, setModalKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form states
    const [userForm, setUserForm] = useState(INITIAL_USER_FORM);
    const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE_FORM);
    const [contractForm, setContractForm] = useState(INITIAL_CONTRACT_FORM);
    const [expenseForm, setExpenseForm] = useState(INITIAL_EXPENSE_FORM);
    const [salaryForm, setSalaryForm] = useState(INITIAL_SALARY_FORM);

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'boss') {
            router.push('/login');
            return;
        }
        setUser(u);
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const [reportData, usersData, servicesData, contractsData, expensesData, salariesData, auditData] = await Promise.all([
                api.getDailyReport(today),
                api.getUsers(),
                api.getBossServices(),
                api.getContracts(),
                api.getExpenses(),
                api.getSalaries(),
                api.getAuditLogs({ limit: 50 }),
            ]);
            setReport(reportData);
            setUsers(usersData.users || []);
            setServices(servicesData.services || []);
            setContracts(contractsData.contracts || []);
            setExpenses(expensesData.expenses || []);
            setSalaries(salariesData.salaries || []);
            setAuditLogs(auditData.audit_logs || []);
            const allUsers = usersData.users || [];
            setDoctors(allUsers.filter((u: any) => u.role === 'doctor'));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadAuditLogs = async (doctorId?: string) => {
        try {
            const data = await api.getAuditLogs({ doctor_id: doctorId || undefined, limit: 50 });
            setAuditLogs(data.audit_logs || []);
        } catch (err: any) {
            console.error('Failed to load audit logs:', err);
        }
    };

    const openModal = (modal: string) => {
        if (modal === 'user') setUserForm(INITIAL_USER_FORM);
        else if (modal === 'service') setServiceForm(INITIAL_SERVICE_FORM);
        else if (modal === 'contract') setContractForm({ ...INITIAL_CONTRACT_FORM, start_date: new Date().toISOString().split('T')[0] });
        else if (modal === 'expense') setExpenseForm({ ...INITIAL_EXPENSE_FORM, date: new Date().toISOString().split('T')[0] });
        else if (modal === 'salary') setSalaryForm({ ...INITIAL_SALARY_FORM, effective_from: new Date().toISOString().split('T')[0] });
        setModalKey(prev => prev + 1);
        setShowModal(modal);
    };

    const closeModal = () => setShowModal(null);
    const handleLogout = () => { api.logout(); router.push('/login'); };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createUser(userForm); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createService({ name: serviceForm.name, description: serviceForm.description, price: parseFloat(serviceForm.price), duration: parseInt(serviceForm.duration) }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createContract({ doctor_id: contractForm.doctor_id, share_percentage: parseFloat(contractForm.share_percentage), start_date: contractForm.start_date, end_date: contractForm.end_date || undefined, notes: contractForm.notes || undefined }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteContract = async (id: string) => { if (!confirm('Are you sure?')) return; try { await api.deleteContract(id); loadData(); } catch (err: any) { alert(err.message); } };
    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createExpense({ category: expenseForm.category, amount: parseFloat(expenseForm.amount), date: expenseForm.date, note: expenseForm.note || undefined }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteExpense = async (id: string) => { if (!confirm('Are you sure?')) return; try { await api.deleteExpense(id); loadData(); } catch (err: any) { alert(err.message); } };
    const handleCreateSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createSalary({ user_id: salaryForm.user_id, monthly_amount: parseFloat(salaryForm.monthly_amount), effective_from: salaryForm.effective_from }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteSalary = async (id: string) => { if (!confirm('Are you sure?')) return; try { await api.deleteSalary(id); loadData(); } catch (err: any) { alert(err.message); } };

    const getDoctorName = (doctorId: string) => { const doctor = doctors.find(d => d.id === doctorId); return doctor ? `${doctor.first_name} ${doctor.last_name}` : 'Unknown'; };
    const getStaffName = (userId: string) => { const staff = users.find(u => u.id === userId); return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'; };
    const staffUsers = users.filter(u => u.role !== 'doctor' && u.role !== 'boss');

    const formatActionLabel = (action: string) => {
        switch (action) {
            case 'VISIT_STARTED': return '🏥 Visit Started';
            case 'VISIT_FINISHED': return '✅ Visit Completed';
            case 'APPOINTMENT_STATUS_CHANGED': return '📅 Status Changed';
            default: return action;
        }
    };

    if (loading) return <div className="container"><p>Loading...</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand"><Building2 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Medical CRM</span>
                    <div className="nav-user">
                        <a href="/boss/reports" className="nav-link"><BarChart3 size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Reports</a>
                        <a href="/settings" className="nav-link"><Settings size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Settings</a>
                        <span>{user?.first_name} {user?.last_name} (Boss)</span>
                        <button className="btn btn-secondary" onClick={handleLogout}><LogOut size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Logout</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header"><h1>Boss Dashboard</h1></div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><TrendingUp size={16} /> Reports</button>
                    <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><Users size={16} /> Staff</button>
                    <button className={`tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}><Briefcase size={16} /> Services</button>
                    <button className={`tab ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}><FileText size={16} /> Contracts</button>
                    <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}><Receipt size={16} /> Expenses</button>
                    <button className={`tab ${activeTab === 'salaries' ? 'active' : ''}`} onClick={() => setActiveTab('salaries')}><Wallet size={16} /> Salaries</button>
                    <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}><Activity size={16} /> Activity</button>
                </div>

                {error && <div className="error-msg">{error}</div>}

                {activeTab === 'reports' && report && (
                    <div className="dashboard">
                        <div className="stats-grid">
                            <div className="stat-card"><h3><UserPlus size={18} style={{ marginRight: '6px', color: '#4f46e5' }} />New Patients Today</h3><div className="value">{report.patients_count || 0}</div></div>
                            <div className="stat-card"><h3><CalendarDays size={18} style={{ marginRight: '6px', color: '#0891b2' }} />Visits Today</h3><div className="value">{report.visits_count || 0}</div></div>
                            <div className="stat-card"><h3><DollarSign size={18} style={{ marginRight: '6px', color: '#16a34a' }} />Revenue Today</h3><div className="value">${(report.total_revenue || 0).toFixed(2)}</div></div>
                        </div>
                        {report.doctor_earnings?.length > 0 && (
                            <div className="card">
                                <h3>Doctor Earnings</h3>
                                <table className="table">
                                    <thead><tr><th>Doctor</th><th>Visits</th><th>Revenue</th><th>Earning</th></tr></thead>
                                    <tbody>
                                        {report.doctor_earnings.map((de: any, i: number) => (
                                            <tr key={i}><td>{de.doctor_name || 'Unknown'}</td><td>{de.visit_count}</td><td>${de.revenue.toFixed(2)}</td><td>${de.earning.toFixed(2)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Users size={18} style={{ marginRight: '6px' }} />Staff Members</h3><button className="btn btn-primary" onClick={() => openModal('user')}><Plus size={16} style={{ marginRight: '4px' }} />Add Staff</button></div>
                        <table className="table">
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                            <tbody>{users.map((u) => (<tr key={u.id}><td>{u.first_name} {u.last_name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.is_active ? '✅ Active' : '❌ Inactive'}</td></tr>))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Briefcase size={18} style={{ marginRight: '6px' }} />Medical Services</h3><button className="btn btn-primary" onClick={() => openModal('service')}><Plus size={16} style={{ marginRight: '4px' }} />Add Service</button></div>
                        <table className="table">
                            <thead><tr><th>Name</th><th>Price</th><th>Duration</th><th>Status</th></tr></thead>
                            <tbody>{services.map((s) => (<tr key={s.id}><td>{s.name}</td><td>${s.price.toFixed(2)}</td><td>{s.duration} min</td><td>{s.is_active ? '✅ Active' : '❌ Inactive'}</td></tr>))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'contracts' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><FileText size={18} style={{ marginRight: '6px' }} />Doctor Contracts</h3><button className="btn btn-primary" onClick={() => openModal('contract')}><Plus size={16} style={{ marginRight: '4px' }} />Add Contract</button></div>
                        {contracts.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No contracts yet.</p> : (
                            <table className="table">
                                <thead><tr><th>Doctor</th><th>Share %</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>{contracts.map((c) => (<tr key={c.id}><td>{getDoctorName(c.doctor_id)}</td><td>{c.share_percentage}%</td><td>{c.start_date}</td><td>{c.end_date || 'Ongoing'}</td><td>{c.is_active ? '✅ Active' : '❌ Inactive'}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteContract(c.id)}><Trash2 size={14} style={{ marginRight: '2px' }} />Delete</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Receipt size={18} style={{ marginRight: '6px' }} />Expenses</h3><button className="btn btn-primary" onClick={() => openModal('expense')}><Plus size={16} style={{ marginRight: '4px' }} />Add Expense</button></div>
                        {expenses.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No expenses recorded yet.</p> : (
                            <table className="table">
                                <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th><th>Actions</th></tr></thead>
                                <tbody>{expenses.map((e) => (<tr key={e.id}><td>{e.date}</td><td style={{ textTransform: 'capitalize' }}>{e.category}</td><td>${e.amount.toFixed(2)}</td><td>{e.note || '-'}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteExpense(e.id)}>Delete</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'salaries' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Wallet size={18} style={{ marginRight: '6px' }} />Staff Salaries</h3><button className="btn btn-primary" onClick={() => openModal('salary')}><Plus size={16} style={{ marginRight: '4px' }} />Add Salary</button></div>
                        {salaries.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No salaries configured yet.</p> : (
                            <table className="table">
                                <thead><tr><th>Staff Member</th><th>Monthly Amount</th><th>Effective From</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>{salaries.map((s) => (<tr key={s.id}><td>{getStaffName(s.user_id)}</td><td>${s.monthly_amount.toFixed(2)}</td><td>{s.effective_from}</td><td>{s.is_active ? '✅ Active' : '❌ Inactive'}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteSalary(s.id)}><Trash2 size={14} style={{ marginRight: '2px' }} />Delete</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3><Activity size={18} style={{ marginRight: '6px' }} />Doctor Activity Log</h3>
                            <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={auditDoctorFilter} onChange={(e) => { setAuditDoctorFilter(e.target.value); loadAuditLogs(e.target.value); }}>
                                <option value="">All Doctors</option>
                                {doctors.map((d) => (<option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>))}
                            </select>
                        </div>
                        {auditLogs.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No activity logs yet.</p> : (
                            <table className="table">
                                <thead><tr><th>Time</th><th>Doctor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                                            <td>{log.actor_name || 'Unknown'}</td>
                                            <td>{formatActionLabel(log.action)}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{log.entity_type}</td>
                                            <td style={{ fontSize: '12px', color: '#666' }}>
                                                {log.meta && Object.entries(log.meta).map(([k, v]) => (
                                                    <span key={k} style={{ marginRight: '8px' }}><strong>{k}:</strong> {String(v)}</span>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* User Modal */}
                {showModal === 'user' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Staff Member</h2>
                            <form onSubmit={handleCreateUser}>
                                <div className="form-group"><label>Email</label><input className="input" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required /></div>
                                <div className="form-group"><label>First Name</label><input className="input" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} required /></div>
                                <div className="form-group"><label>Last Name</label><input className="input" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} required /></div>
                                <div className="form-group"><label>Role</label><select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="doctor">Doctor</option><option value="receptionist">Receptionist</option></select></div>
                                <div className="form-group"><label>Password</label><input className="input" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={8} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Service Modal */}
                {showModal === 'service' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Service</h2>
                            <form onSubmit={handleCreateService}>
                                <div className="form-group"><label>Name</label><input className="input" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /></div>
                                <div className="form-group"><label>Description</label><input className="input" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
                                <div className="form-group"><label>Price ($)</label><input className="input" type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} required /></div>
                                <div className="form-group"><label>Duration (minutes)</label><input className="input" type="number" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} required /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Contract Modal */}
                {showModal === 'contract' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Doctor Contract</h2>
                            <form onSubmit={handleCreateContract}>
                                <div className="form-group"><label>Doctor</label><select className="input" value={contractForm.doctor_id} onChange={(e) => setContractForm({ ...contractForm, doctor_id: e.target.value })} required><option value="">Select a doctor</option>{doctors.map((d) => (<option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>))}</select></div>
                                <div className="form-group"><label>Share Percentage (%)</label><input className="input" type="number" min="0" max="100" value={contractForm.share_percentage} onChange={(e) => setContractForm({ ...contractForm, share_percentage: e.target.value })} required /></div>
                                <div className="form-group"><label>Start Date</label><input className="input" type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} required /></div>
                                <div className="form-group"><label>End Date (optional)</label><input className="input" type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} /></div>
                                <div className="form-group"><label>Notes (optional)</label><input className="input" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Expense Modal */}
                {showModal === 'expense' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Expense</h2>
                            <form onSubmit={handleCreateExpense}>
                                <div className="form-group"><label>Category</label><select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required><option value="rent">Rent</option><option value="utilities">Utilities</option><option value="supplies">Supplies</option><option value="marketing">Marketing</option><option value="salary">Salary</option><option value="other">Other</option></select></div>
                                <div className="form-group"><label>Amount ($)</label><input className="input" type="number" step="0.01" min="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></div>
                                <div className="form-group"><label>Date</label><input className="input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required /></div>
                                <div className="form-group"><label>Note (optional)</label><input className="input" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Salary Modal */}
                {showModal === 'salary' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>Add Staff Salary</h2>
                            <form onSubmit={handleCreateSalary}>
                                <div className="form-group"><label>Staff Member</label><select className="input" value={salaryForm.user_id} onChange={(e) => setSalaryForm({ ...salaryForm, user_id: e.target.value })} required><option value="">Select staff member</option>{staffUsers.map((u) => (<option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>))}</select></div>
                                <div className="form-group"><label>Monthly Amount ($)</label><input className="input" type="number" step="0.01" min="0.01" value={salaryForm.monthly_amount} onChange={(e) => setSalaryForm({ ...salaryForm, monthly_amount: e.target.value })} required /></div>
                                <div className="form-group"><label>Effective From</label><input className="input" type="date" value={salaryForm.effective_from} onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })} required /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">Create</button><button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button></div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
