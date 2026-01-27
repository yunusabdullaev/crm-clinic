'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useSettings } from '@/lib/settings';

interface MonthlyReport {
    year: number;
    month: number;
    patients_count: number;
    visits_count: number;
    total_revenue: number;
    total_discount: number;
    doctor_earnings: DoctorEarning[];
    total_expenses: number;
    expenses_by_category: Record<string, number>;
    total_salaries: number;
    total_doctor_earnings: number;
    gross_profit: number;
    net_profit: number;
}

interface DoctorEarning {
    doctor_id: string;
    doctor_name: string;
    revenue: number;
    earning: number;
    visit_count: number;
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FinancialReportsPage() {
    const router = useRouter();
    const { t } = useSettings();
    const [user, setUser] = useState<any>(null);
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    useEffect(() => {
        const u = api.getUser();
        if (!u || u.role !== 'boss') {
            router.push('/login');
            return;
        }
        setUser(u);
    }, [router]);

    useEffect(() => {
        if (user) {
            fetchReport();
        }
    }, [user, selectedYear, selectedMonth]);

    const fetchReport = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getMonthlyReport(selectedYear, selectedMonth);
            setReport(data as MonthlyReport);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch report');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        api.logout();
        router.push('/login');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount) + ' UZS';
    };

    // CSS-based bar chart component
    const BarChart = ({ data, maxValue, label }: { data: { name: string; value: number; color: string }[]; maxValue: number; label: string }) => (
        <div className="chart-container">
            <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{label}</h4>
            <div className="bar-chart">
                {data.map((item, index) => (
                    <div key={index} className="bar-item">
                        <div className="bar-label" title={item.name}>
                            {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
                        </div>
                        <div className="bar-wrapper">
                            <div
                                className="bar-fill"
                                style={{
                                    width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%',
                                    backgroundColor: item.color,
                                }}
                            />
                        </div>
                        <div className="bar-value">{formatCurrency(item.value)}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    // CSS-based pie chart component
    const PieChart = ({ data, label }: { data: { name: string; value: number; color: string }[]; label: string }) => {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let cumulativePercent = 0;

        // Generate conic-gradient
        const gradientParts = data.map(item => {
            const startPercent = cumulativePercent;
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            cumulativePercent += percent;
            return `${item.color} ${startPercent}% ${cumulativePercent}%`;
        });

        const gradient = `conic-gradient(${gradientParts.join(', ')})`;

        return (
            <div className="chart-container">
                <h4 style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{label}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                    <div
                        className="pie-chart"
                        style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            background: total > 0 ? gradient : 'var(--border-color)',
                        }}
                    />
                    <div className="pie-legend">
                        {data.map((item, index) => (
                            <div key={index} className="legend-item">
                                <span
                                    className="legend-color"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="legend-label">{item.name}</span>
                                <span className="legend-value">
                                    {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : '0%'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    if (!user) return <div className="container"><p>{t('common.loading')}</p></div>;

    // Prepare chart data
    const expenseCategories = report?.expenses_by_category ? Object.entries(report.expenses_by_category).map(([name, value], i) => ({
        name,
        value,
        color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'][i % 6]
    })) : [];

    const doctorData = report?.doctor_earnings?.map((d, i) => ({
        name: d.doctor_name || 'Unknown',
        value: d.revenue,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316'][i % 5]
    })) || [];

    const profitBreakdown = report ? [
        { name: t('reports.revenue') || 'Revenue', value: report.total_revenue, color: '#22c55e' },
        { name: t('reports.doctorEarnings') || 'Doctor Earnings', value: report.total_doctor_earnings, color: '#3b82f6' },
        { name: t('reports.expenses') || 'Expenses', value: report.total_expenses, color: '#ef4444' },
        { name: t('reports.salaries') || 'Salaries', value: report.total_salaries, color: '#f97316' },
    ].filter(item => item.value > 0) : [];

    const maxDoctorRevenue = Math.max(...(doctorData.map(d => d.value) || [0]), 1);
    const maxExpenseValue = Math.max(...(expenseCategories.map(e => e.value) || [0]), 1);

    return (
        <>
            <style jsx>{`
        .chart-container {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bar-item {
          display: grid;
          grid-template-columns: 100px 1fr 120px;
          align-items: center;
          gap: 12px;
        }
        .bar-label {
          font-size: 14px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .bar-wrapper {
          height: 24px;
          background: var(--bg-secondary);
          border-radius: 6px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.5s ease;
        }
        .bar-value {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: right;
        }
        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .legend-label {
          font-size: 14px;
          color: var(--text-primary);
          flex: 1;
        }
        .legend-value {
          font-size: 14px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .summary-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .summary-card.positive {
          border-color: #22c55e;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, var(--card-bg) 100%);
        }
        .summary-card.negative {
          border-color: #ef4444;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, var(--card-bg) 100%);
        }
        .summary-label {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .summary-value.positive {
          color: #22c55e;
        }
        .summary-value.negative {
          color: #ef4444;
        }
        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 24px;
        }
        .date-selector {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .date-selector select {
          padding: 10px 16px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--card-bg);
          color: var(--text-primary);
          font-size: 14px;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
          .bar-item {
            grid-template-columns: 80px 1fr 80px;
          }
        }
      `}</style>

            <nav className="nav">
                <div className="nav-content">
                    <span className="nav-brand">Medical CRM</span>
                    <div className="nav-user">
                        <span>{user?.first_name} {user?.last_name}</span>
                        <button className="btn btn-secondary" onClick={handleLogout}>{t('nav.logout')}</button>
                    </div>
                </div>
            </nav>

            <div className="container">
                <div style={{ marginBottom: '20px' }}>
                    <button className="btn btn-secondary" onClick={() => router.push('/boss/dashboard')}>
                        ← {t('nav.dashboard')}
                    </button>
                </div>

                <h1 style={{ marginBottom: '8px' }}>{t('reports.financialReports') || 'Financial Reports'}</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    {t('reports.subtitle') || 'Monthly financial overview and profit analysis'}
                </p>

                <div className="date-selector">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {MONTHS.map((month, index) => (
                            <option key={index} value={index + 1}>{month}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={fetchReport}>
                        {t('common.refresh') || 'Refresh'}
                    </button>
                </div>

                {loading && <div className="card"><p>{t('common.loading')}</p></div>}

                {error && <div className="card" style={{ borderColor: '#ef4444' }}><p style={{ color: '#ef4444' }}>{error}</p></div>}

                {!loading && !error && report && (
                    <>
                        {/* Summary Cards */}
                        <div className="summary-grid">
                            <div className="summary-card">
                                <div className="summary-label">{t('reports.totalRevenue') || 'Total Revenue'}</div>
                                <div className="summary-value">{formatCurrency(report.total_revenue)}</div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-label">{t('reports.doctorEarnings') || 'Doctor Earnings'}</div>
                                <div className="summary-value">{formatCurrency(report.total_doctor_earnings)}</div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-label">{t('reports.expenses') || 'Total Expenses'}</div>
                                <div className="summary-value">{formatCurrency(report.total_expenses)}</div>
                            </div>
                            <div className="summary-card">
                                <div className="summary-label">{t('reports.salaries') || 'Staff Salaries'}</div>
                                <div className="summary-value">{formatCurrency(report.total_salaries)}</div>
                            </div>
                            <div className={`summary-card ${report.gross_profit >= 0 ? 'positive' : 'negative'}`}>
                                <div className="summary-label">{t('reports.grossProfit') || 'Gross Profit'}</div>
                                <div className={`summary-value ${report.gross_profit >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(report.gross_profit)}
                                </div>
                            </div>
                            <div className={`summary-card ${report.net_profit >= 0 ? 'positive' : 'negative'}`}>
                                <div className="summary-label">{t('reports.netProfit') || 'Net Profit'}</div>
                                <div className={`summary-value ${report.net_profit >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(report.net_profit)}
                                </div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="charts-grid">
                            {doctorData.length > 0 && (
                                <BarChart
                                    data={doctorData}
                                    maxValue={maxDoctorRevenue}
                                    label={t('reports.revenueByDoctor') || 'Revenue by Doctor'}
                                />
                            )}

                            {expenseCategories.length > 0 && (
                                <BarChart
                                    data={expenseCategories}
                                    maxValue={maxExpenseValue}
                                    label={t('reports.expensesByCategory') || 'Expenses by Category'}
                                />
                            )}

                            {profitBreakdown.length > 0 && (
                                <PieChart
                                    data={profitBreakdown}
                                    label={t('reports.profitBreakdown') || 'Financial Breakdown'}
                                />
                            )}
                        </div>

                        {/* Additional Stats */}
                        <div className="card" style={{ marginTop: '24px' }}>
                            <h3 style={{ marginBottom: '16px' }}>{t('reports.additionalStats') || 'Additional Statistics'}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {t('reports.visitsCount') || 'Total Visits'}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '600' }}>{report.visits_count}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {t('reports.patientsCount') || 'Patients'}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '600' }}>{report.patients_count}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {t('reports.totalDiscount') || 'Total Discounts'}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '600' }}>{formatCurrency(report.total_discount)}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        {t('reports.avgPerVisit') || 'Avg. per Visit'}
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: '600' }}>
                                        {report.visits_count > 0 ? formatCurrency(report.total_revenue / report.visits_count) : '0 UZS'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!loading && !error && !report && (
                    <div className="card">
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                            {t('reports.noData') || 'No data available for the selected period'}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}
