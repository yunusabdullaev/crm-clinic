'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import {
    BarChart3, Users, Briefcase, FileText, Receipt, Wallet,
    Activity, Settings, LogOut, Plus, Trash2, UserPlus, Building2,
    DollarSign, CalendarDays, TrendingUp, Stethoscope, ClipboardList, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRef } from 'react';

const INITIAL_USER_FORM = { phone: '', first_name: '', last_name: '', role: 'doctor', password: '' };
const INITIAL_SERVICE_FORM = { name: '', description: '', price: '', duration: '30' };
const INITIAL_CONTRACT_FORM = { doctor_id: '', share_percentage: '50', start_date: '', end_date: '', notes: '' };
const INITIAL_EXPENSE_FORM = { category: 'other', amount: '', date: '', note: '' };
const INITIAL_SALARY_FORM = { user_id: '', monthly_amount: '', effective_from: '' };
const INITIAL_EDIT_SERVICE_FORM = { name: '', description: '', price: '', duration: '', is_active: true };

export default function BossDashboard() {
    const router = useRouter();
    const { t } = useSettings();
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

    // Discount permissions for doctors
    const [discountPermissions, setDiscountPermissions] = useState<Record<string, boolean>>({});

    // Form states
    const [userForm, setUserForm] = useState(INITIAL_USER_FORM);
    const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE_FORM);
    const [editServiceForm, setEditServiceForm] = useState(INITIAL_EDIT_SERVICE_FORM);
    const [editingService, setEditingService] = useState<any>(null);
    const [contractForm, setContractForm] = useState(INITIAL_CONTRACT_FORM);
    const [expenseForm, setExpenseForm] = useState(INITIAL_EXPENSE_FORM);
    const [salaryForm, setSalaryForm] = useState(INITIAL_SALARY_FORM);

    // Service import state
    const [serviceImportPreview, setServiceImportPreview] = useState<any[]>([]);
    const [serviceImporting, setServiceImporting] = useState(false);
    const [serviceImportResult, setServiceImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
    const serviceFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'boss') {
            router.push('/login');
            return;
        }
        setUser(u);
        // Load discount permissions from localStorage
        const savedPermissions = localStorage.getItem('doctor_discount_permissions');
        if (savedPermissions) {
            setDiscountPermissions(JSON.parse(savedPermissions));
        }
        loadData();
    }, [router]);

    const toggleDiscountPermission = (doctorId: string) => {
        const newPermissions = {
            ...discountPermissions,
            [doctorId]: !discountPermissions[doctorId]
        };
        setDiscountPermissions(newPermissions);
        localStorage.setItem('doctor_discount_permissions', JSON.stringify(newPermissions));
    };

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
    const handleEditService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingService) return;
        try {
            await api.updateService(editingService.id, {
                name: editServiceForm.name,
                description: editServiceForm.description,
                price: parseFloat(editServiceForm.price),
                duration: parseInt(editServiceForm.duration),
                is_active: editServiceForm.is_active
            });
            closeModal();
            loadData();
        } catch (err: any) { alert(err.message); }
    };
    const handleDeleteService = async (id: string) => {
        if (!confirm(t('common.confirm'))) return;
        try { await api.deleteService(id); loadData(); } catch (err: any) { alert(err.message); }
    };
    const openEditServiceModal = (service: any) => {
        setEditingService(service);
        setEditServiceForm({
            name: service.name,
            description: service.description || '',
            price: service.price.toString(),
            duration: service.duration.toString(),
            is_active: service.is_active
        });
        setModalKey(prev => prev + 1);
        setShowModal('editService');
    };
    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createContract({ doctor_id: contractForm.doctor_id, share_percentage: parseFloat(contractForm.share_percentage), start_date: contractForm.start_date, end_date: contractForm.end_date || undefined, notes: contractForm.notes || undefined }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteContract = async (id: string) => { if (!confirm(t('common.confirm'))) return; try { await api.deleteContract(id); loadData(); } catch (err: any) { alert(err.message); } };
    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createExpense({ category: expenseForm.category, amount: parseFloat(expenseForm.amount), date: expenseForm.date, note: expenseForm.note || undefined }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteExpense = async (id: string) => { if (!confirm(t('common.confirm'))) return; try { await api.deleteExpense(id); loadData(); } catch (err: any) { alert(err.message); } };
    const handleCreateSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createSalary({ user_id: salaryForm.user_id, monthly_amount: parseFloat(salaryForm.monthly_amount), effective_from: salaryForm.effective_from }); closeModal(); loadData(); } catch (err: any) { alert(err.message); }
    };
    const handleDeleteSalary = async (id: string) => { if (!confirm(t('common.confirm'))) return; try { await api.deleteSalary(id); loadData(); } catch (err: any) { alert(err.message); } };

    // Service Excel import handler
    const handleServiceExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            // Skip header row, map columns: Nom, Tavsif, Narx, Davomiylik
            const services = jsonData.slice(1).filter(row => row[0] && row[2]).map(row => ({
                name: String(row[0] || '').trim(),
                description: String(row[1] || '').trim(),
                price: parseFloat(String(row[2] || '0').replace(/[^0-9.]/g, '')) || 0,
                duration: parseInt(String(row[3] || '30').replace(/[^0-9]/g, '')) || 30
            }));

            setServiceImportPreview(services);
            setServiceImportResult(null);
            setShowModal('importServices');
        };
        reader.readAsArrayBuffer(file);
        if (serviceFileRef.current) serviceFileRef.current.value = '';
    };

    const handleConfirmServiceImport = async () => {
        if (serviceImportPreview.length === 0) return;
        setServiceImporting(true);
        try {
            const result = await api.importServices(serviceImportPreview);
            setServiceImportResult(result);
            if (result.imported > 0) loadData();
        } catch (err: any) {
            setServiceImportResult({ imported: 0, errors: [err.message] });
        } finally {
            setServiceImporting(false);
        }
    };

    const getDoctorName = (doctorId: string) => { const doctor = doctors.find(d => d.id === doctorId); return doctor ? `${doctor.first_name} ${doctor.last_name}` : 'Unknown'; };
    const getStaffName = (userId: string) => { const staff = users.find(u => u.id === userId); return staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'; };
    const staffUsers = users.filter(u => u.role !== 'doctor' && u.role !== 'boss');

    const formatActionLabel = (action: string) => {
        switch (action) {
            case 'VISIT_STARTED': return t('activity.visitStarted');
            case 'VISIT_FINISHED': return t('activity.visitFinished');
            case 'APPOINTMENT_STATUS_CHANGED': return t('activity.statusChanged');
            default: return action;
        }
    };

    if (loading) return <div className="container"><p>{t('common.loading')}</p></div>;

    return (
        <>
            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand"><Building2 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />{t('nav.brand')}</span>
                    <div className="nav-user">
                        <a href="/boss/reports" className="nav-link"><BarChart3 size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('nav.reports')}</a>
                        <a href="/settings" className="nav-link"><Settings size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {t('nav.settings')}</a>
                        <span>{user?.first_name} {user?.last_name} (Boss)</span>
                        <button className="btn btn-secondary" onClick={handleLogout}><LogOut size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('nav.logout')}</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div className="dashboard-header"><h1>{t('dashboard.boss')}</h1></div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><TrendingUp size={16} /> {t('nav.reports')}</button>
                    <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><Users size={16} /> {t('nav.staff')}</button>
                    <button className={`tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}><Briefcase size={16} /> {t('nav.services')}</button>
                    <button className={`tab ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}><FileText size={16} /> {t('nav.contracts')}</button>
                    <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}><Receipt size={16} /> {t('nav.expenses')}</button>
                    <button className={`tab ${activeTab === 'salaries' ? 'active' : ''}`} onClick={() => setActiveTab('salaries')}><Wallet size={16} /> {t('nav.salaries')}</button>
                    <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}><Activity size={16} /> {t('nav.activity')}</button>
                </div>

                {error && <div className="error-msg">{error}</div>}

                {activeTab === 'reports' && report && (
                    <div className="dashboard">
                        <div className="stats-grid">
                            <div className="stat-card"><h3><UserPlus size={18} style={{ marginRight: '6px', color: '#4f46e5' }} />{t('dashboard.patientsToday')}</h3><div className="value">{report.patients_count || 0}</div></div>
                            <div className="stat-card"><h3><CalendarDays size={18} style={{ marginRight: '6px', color: '#0891b2' }} />{t('dashboard.visitsToday')}</h3><div className="value">{report.visits_count || 0}</div></div>
                            <div className="stat-card"><h3><DollarSign size={18} style={{ marginRight: '6px', color: '#16a34a' }} />{t('dashboard.revenueToday')}</h3><div className="value">{(report.total_revenue || 0).toLocaleString()} UZS</div></div>
                        </div>
                        {report.doctor_earnings?.length > 0 && (
                            <div className="card">
                                <h3>{t('reports.doctorEarnings')}</h3>
                                <table className="table">
                                    <thead><tr><th>{t('appointments.doctor')}</th><th>{t('nav.visits')}</th><th>{t('table.revenue')}</th><th>{t('table.earning')}</th></tr></thead>
                                    <tbody>
                                        {report.doctor_earnings.map((de: any, i: number) => (
                                            <tr key={i}><td>{de.doctor_name || 'Unknown'}</td><td>{de.visit_count}</td><td>{de.revenue.toLocaleString()} UZS</td><td>{de.earning.toLocaleString()} UZS</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Users size={18} style={{ marginRight: '6px' }} />{t('staff.title')}</h3><button className="btn btn-primary" onClick={() => openModal('user')}><Plus size={16} style={{ marginRight: '4px' }} />{t('staff.add')}</button></div>
                        <table className="table">
                            <thead><tr><th>{t('common.name')}</th><th>{t('common.email')}</th><th>{t('staff.role')}</th><th>{t('common.status')}</th><th>Chegirma</th></tr></thead>
                            <tbody>{users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.first_name} {u.last_name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{u.is_active ? `✅ ${t('common.active')}` : `❌ ${t('common.inactive')}`}</td>
                                    <td>
                                        {u.role === 'doctor' ? (
                                            <button
                                                className={`btn ${discountPermissions[u.id] ? 'btn-success' : 'btn-secondary'}`}
                                                style={{ fontSize: '12px', padding: '4px 10px' }}
                                                onClick={() => toggleDiscountPermission(u.id)}
                                            >
                                                {discountPermissions[u.id] ? '✅ Ruxsat' : '❌ Ruxsat yo\'q'}
                                            </button>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3><Briefcase size={18} style={{ marginRight: '6px' }} />{t('services.title')}</h3>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    ref={serviceFileRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleServiceExcelImport}
                                    style={{ display: 'none' }}
                                />
                                <button className="btn btn-secondary" onClick={() => serviceFileRef.current?.click()}>
                                    <Upload size={16} style={{ marginRight: 4 }} /> Excel import
                                </button>
                                <button className="btn btn-primary" onClick={() => openModal('service')}><Plus size={16} style={{ marginRight: '4px' }} />{t('services.add')}</button>
                            </div>
                        </div>
                        <table className="table">
                            <thead><tr><th>{t('services.name')}</th><th>{t('common.price')}</th><th>{t('common.duration')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
                            <tbody>{services.map((s) => (<tr key={s.id}>
                                <td>{s.name}</td>
                                <td>{s.price.toLocaleString()} UZS</td>
                                <td>{s.duration} min</td>
                                <td>{s.is_active ? `✅ ${t('common.active')}` : `❌ ${t('common.inactive')}`}</td>
                                <td>
                                    <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px', marginRight: 4 }} onClick={() => openEditServiceModal(s)}>✏️ {t('common.edit')}</button>
                                    <button className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteService(s.id)}>🗑️</button>
                                </td>
                            </tr>))}</tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'contracts' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><FileText size={18} style={{ marginRight: '6px' }} />{t('contracts.title')}</h3><button className="btn btn-primary" onClick={() => openModal('contract')}><Plus size={16} style={{ marginRight: '4px' }} />{t('contracts.add')}</button></div>
                        {contracts.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>{t('contracts.noContracts')}</p> : (
                            <table className="table">
                                <thead><tr><th>{t('appointments.doctor')}</th><th>{t('contracts.sharePercent')}</th><th>{t('contracts.startDate')}</th><th>{t('contracts.endDate')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
                                <tbody>{contracts.map((c) => (<tr key={c.id}><td>{getDoctorName(c.doctor_id)}</td><td>{c.share_percentage}%</td><td>{c.start_date}</td><td>{c.end_date || t('contracts.ongoing')}</td><td>{c.is_active ? `✅ ${t('common.active')}` : `❌ ${t('common.inactive')}`}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteContract(c.id)}><Trash2 size={14} style={{ marginRight: '2px' }} />{t('common.delete')}</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Receipt size={18} style={{ marginRight: '6px' }} />{t('expenses.title')}</h3><button className="btn btn-primary" onClick={() => openModal('expense')}><Plus size={16} style={{ marginRight: '4px' }} />{t('expenses.add')}</button></div>
                        {expenses.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>{t('expenses.noExpenses')}</p> : (
                            <table className="table">
                                <thead><tr><th>{t('common.date')}</th><th>{t('expenses.category')}</th><th>{t('common.amount')}</th><th>{t('common.notes')}</th><th>{t('common.actions')}</th></tr></thead>
                                <tbody>{expenses.map((e) => (<tr key={e.id}><td>{e.date}</td><td style={{ textTransform: 'capitalize' }}>{e.category}</td><td>{e.amount.toLocaleString()} UZS</td><td>{e.note || '-'}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteExpense(e.id)}>{t('common.delete')}</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'salaries' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><h3><Wallet size={18} style={{ marginRight: '6px' }} />{t('salaries.title')}</h3><button className="btn btn-primary" onClick={() => openModal('salary')}><Plus size={16} style={{ marginRight: '4px' }} />{t('salaries.add')}</button></div>
                        {salaries.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>{t('salaries.noSalaries')}</p> : (
                            <table className="table">
                                <thead><tr><th>{t('nav.staff')}</th><th>{t('salaries.monthlyAmount')}</th><th>{t('salaries.effectiveFrom')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
                                <tbody>{salaries.map((s) => (<tr key={s.id}><td>{getStaffName(s.user_id)}</td><td>{s.monthly_amount.toLocaleString()} UZS</td><td>{s.effective_from}</td><td>{s.is_active ? `✅ ${t('common.active')}` : `❌ ${t('common.inactive')}`}</td><td><button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => handleDeleteSalary(s.id)}><Trash2 size={14} style={{ marginRight: '2px' }} />{t('common.delete')}</button></td></tr>))}</tbody>
                            </table>
                        )}
                    </div>
                )}

                {activeTab === 'activity' && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3><Activity size={18} style={{ marginRight: '6px' }} />{t('activity.title')}</h3>
                            <select className="input" style={{ width: 'auto', minWidth: '200px' }} value={auditDoctorFilter} onChange={(e) => { setAuditDoctorFilter(e.target.value); loadAuditLogs(e.target.value); }}>
                                <option value="">{t('activity.allDoctors')}</option>
                                {doctors.map((d) => (<option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>))}
                            </select>
                        </div>
                        {auditLogs.length === 0 ? <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>{t('activity.noLogs')}</p> : (
                            <table className="table">
                                <thead><tr><th>{t('common.time')}</th><th>{t('appointments.doctor')}</th><th>{t('activity.action')}</th><th>{t('activity.entity')}</th><th>{t('activity.details')}</th></tr></thead>
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
                            <h2>{t('staff.add')}</h2>
                            <form onSubmit={handleCreateUser}>
                                <div className="form-group"><label>Telefon raqami</label><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, fontWeight: 500, color: '#475569' }}>+998</span><input className="input" type="tel" style={{ flex: 1 }} value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })} maxLength={9} required /></div></div>
                                <div className="form-group"><label>{t('patients.firstName')}</label><input className="input" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('patients.lastName')}</label><input className="input" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('staff.role')}</label><select className="input" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="doctor">{t('staff.doctor')}</option><option value="receptionist">{t('staff.receptionist')}</option></select></div>
                                <div className="form-group"><label>{t('login.password')}</label><input className="input" type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required minLength={8} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.create')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Service Modal */}
                {showModal === 'service' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>{t('services.add')}</h2>
                            <form onSubmit={handleCreateService}>
                                <div className="form-group"><label>{t('services.name')}</label><input className="input" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('services.description')}</label><input className="input" value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} /></div>
                                <div className="form-group"><label>{t('common.price')}</label><input className="input" type="number" step="0.01" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('common.duration')} (min)</label><input className="input" type="number" value={serviceForm.duration} onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })} required /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.create')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Service Modal */}
                {showModal === 'editService' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>✏️ Xizmatni tahrirlash</h2>
                            <form onSubmit={handleEditService}>
                                <div className="form-group"><label>{t('services.name')}</label><input className="input" value={editServiceForm.name} onChange={(e) => setEditServiceForm({ ...editServiceForm, name: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('services.description')}</label><input className="input" value={editServiceForm.description} onChange={(e) => setEditServiceForm({ ...editServiceForm, description: e.target.value })} /></div>
                                <div className="form-group"><label>{t('common.price')}</label><input className="input" type="number" step="0.01" value={editServiceForm.price} onChange={(e) => setEditServiceForm({ ...editServiceForm, price: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('common.duration')} (min)</label><input className="input" type="number" value={editServiceForm.duration} onChange={(e) => setEditServiceForm({ ...editServiceForm, duration: e.target.value })} required /></div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" checked={editServiceForm.is_active} onChange={(e) => setEditServiceForm({ ...editServiceForm, is_active: e.target.checked })} />
                                        {t('common.active')}
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.save')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Contract Modal */}
                {showModal === 'contract' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>{t('contracts.add')}</h2>
                            <form onSubmit={handleCreateContract}>
                                <div className="form-group"><label>{t('appointments.doctor')}</label><select className="input" value={contractForm.doctor_id} onChange={(e) => setContractForm({ ...contractForm, doctor_id: e.target.value })} required><option value="">{t('contracts.selectDoctor')}</option>{doctors.map((d) => (<option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>))}</select></div>
                                <div className="form-group"><label>{t('contracts.sharePercent')}</label><input className="input" type="number" min="0" max="100" value={contractForm.share_percentage} onChange={(e) => setContractForm({ ...contractForm, share_percentage: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('contracts.startDate')}</label><input className="input" type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('contracts.endDate')}</label><input className="input" type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} /></div>
                                <div className="form-group"><label>{t('common.notes')}</label><input className="input" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.create')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Expense Modal */}
                {showModal === 'expense' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>{t('expenses.add')}</h2>
                            <form onSubmit={handleCreateExpense}>
                                <div className="form-group"><label>{t('expenses.category')}</label><select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} required><option value="rent">{t('expenses.rent')}</option><option value="utilities">{t('expenses.utilities')}</option><option value="supplies">{t('expenses.supplies')}</option><option value="marketing">{t('expenses.marketing')}</option><option value="salary">{t('expenses.salary')}</option><option value="other">{t('expenses.other')}</option></select></div>
                                <div className="form-group"><label>{t('common.amount')}</label><input className="input" type="number" step="0.01" min="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('common.date')}</label><input className="input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('expenses.note')}</label><input className="input" value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.create')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Salary Modal */}
                {showModal === 'salary' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} key={modalKey}>
                            <h2>{t('salaries.add')}</h2>
                            <form onSubmit={handleCreateSalary}>
                                <div className="form-group"><label>{t('nav.staff')}</label><select className="input" value={salaryForm.user_id} onChange={(e) => setSalaryForm({ ...salaryForm, user_id: e.target.value })} required><option value="">{t('salaries.selectStaff')}</option>{staffUsers.map((u) => (<option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>))}</select></div>
                                <div className="form-group"><label>{t('salaries.monthlyAmount')}</label><input className="input" type="number" step="0.01" min="0.01" value={salaryForm.monthly_amount} onChange={(e) => setSalaryForm({ ...salaryForm, monthly_amount: e.target.value })} required /></div>
                                <div className="form-group"><label>{t('salaries.effectiveFrom')}</label><input className="input" type="date" value={salaryForm.effective_from} onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })} required /></div>
                                <div style={{ display: 'flex', gap: 8 }}><button type="submit" className="btn btn-primary">{t('common.create')}</button><button type="button" className="btn btn-secondary" onClick={closeModal}>{t('common.cancel')}</button></div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Import Services Modal */}
                {showModal === 'importServices' && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                            <h2>📥 Xizmatlarni import qilish</h2>

                            {serviceImportResult ? (
                                <div>
                                    <div style={{ padding: 16, background: serviceImportResult.imported > 0 ? '#dcfce7' : '#fef2f2', borderRadius: 8, marginBottom: 16 }}>
                                        <p style={{ fontWeight: 600, marginBottom: 8 }}>
                                            ✅ {serviceImportResult.imported} ta xizmat muvaffaqiyatli import qilindi
                                        </p>
                                        {serviceImportResult.errors.length > 0 && (
                                            <div style={{ color: '#dc2626' }}>
                                                <p style={{ fontWeight: 500 }}>Xatolar:</p>
                                                <ul style={{ marginLeft: 16, fontSize: 14 }}>
                                                    {serviceImportResult.errors.slice(0, 5).map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                    {serviceImportResult.errors.length > 5 && <li>... va yana {serviceImportResult.errors.length - 5} ta</li>}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={closeModal}>Yopish</button>
                                </div>
                            ) : (
                                <>
                                    <p style={{ marginBottom: 12, color: '#64748b' }}>Excel format: <b>Nom, Tavsif, Narx, Davomiylik (min)</b></p>

                                    <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                                        <table className="table" style={{ fontSize: 14 }}>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Nom</th>
                                                    <th>Tavsif</th>
                                                    <th>Narx</th>
                                                    <th>Min</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {serviceImportPreview.map((s, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td>{s.name}</td>
                                                        <td>{s.description || '-'}</td>
                                                        <td>{s.price.toLocaleString()} UZS</td>
                                                        <td>{s.duration}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-secondary" onClick={closeModal}>Bekor qilish</button>
                                        <button className="btn btn-primary" onClick={handleConfirmServiceImport} disabled={serviceImporting || serviceImportPreview.length === 0}>
                                            {serviceImporting ? 'Import qilinmoqda...' : `${serviceImportPreview.length} ta xizmatni import qilish`}
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
