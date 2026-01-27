const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiError {
    error: {
        code: string;
        message: string;
        request_id: string;
    };
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('access_token');
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        requireAuth: boolean = true
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (requireAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const text = await response.text();
        let data: any;

        try {
            data = text ? JSON.parse(text) : {};
        } catch (parseError) {
            console.error(`JSON parse error for ${path}:`, text.substring(0, 100));
            throw new Error(`Invalid JSON response from ${path}: ${text.substring(0, 50)}`);
        }

        if (!response.ok) {
            const error = data as ApiError;
            throw new Error(error.error?.message || 'An error occurred');
        }

        return data as T;
    }

    // Auth
    async login(email: string, password: string) {
        const response = await this.request<{
            access_token: string;
            refresh_token: string;
            expires_in: number;
            user: {
                id: string;
                email: string;
                first_name: string;
                last_name: string;
                role: string;
                clinic_id?: string;
            };
        }>('POST', '/api/v1/auth/login', { email, password }, false);

        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        localStorage.setItem('user', JSON.stringify(response.user));

        return response;
    }

    async acceptInvite(token: string, password: string, firstName: string, lastName: string) {
        return this.request(
            'POST',
            '/api/v1/auth/accept-invite',
            { token, password, first_name: firstName, last_name: lastName },
            false
        );
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    }

    getUser() {
        if (typeof window === 'undefined') return null;
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Patients
    async getPatients(page = 1, search = '') {
        return this.request<{
            patients: any[];
            total: number;
            page: number;
            page_size: number;
        }>('GET', `/api/v1/patients?page=${page}&search=${search}`);
    }

    async createPatient(data: any) {
        return this.request('POST', '/api/v1/patients', data);
    }

    // Appointments
    async getAppointments(date: string) {
        return this.request<{ appointments: any[]; total: number }>(
            'GET',
            `/api/v1/appointments?date=${date}`
        );
    }

    async createAppointment(data: any) {
        return this.request('POST', '/api/v1/appointments', data);
    }

    // Doctors
    async getDoctors() {
        return this.request<{ doctors: any[] }>('GET', '/api/v1/doctors');
    }

    // Doctor schedule
    async getSchedule(date: string) {
        return this.request<{ date: string; appointments: any[] }>(
            'GET',
            `/api/v1/doctor/schedule?date=${date}`
        );
    }

    // Visits
    async startVisit(patientId: string, appointmentId?: string) {
        return this.request('POST', '/api/v1/doctor/visits', {
            patient_id: patientId,
            appointment_id: appointmentId,
        });
    }

    async completeVisit(visitId: string, data: any) {
        return this.request('PUT', `/api/v1/doctor/visits/${visitId}/complete`, data);
    }

    async getVisits(date: string) {
        return this.request<{ visits: any[] }>('GET', `/api/v1/doctor/visits?date=${date}`);
    }

    // Services
    async getServices() {
        return this.request<{ services: any[] }>('GET', '/api/v1/doctor/services');
    }

    // Boss endpoints
    async getUsers() {
        return this.request<{ users: any[] }>('GET', '/api/v1/boss/users');
    }

    async createUser(data: any) {
        return this.request('POST', '/api/v1/boss/users', data);
    }

    async getBossServices() {
        return this.request<{ services: any[] }>('GET', '/api/v1/boss/services');
    }

    async createService(data: any) {
        return this.request('POST', '/api/v1/boss/services', data);
    }

    async getDailyReport(date: string) {
        return this.request('GET', `/api/v1/boss/reports/daily?date=${date}`);
    }

    async getMonthlyReport(year: number, month: number) {
        return this.request('GET', `/api/v1/boss/reports/monthly?year=${year}&month=${month}`);
    }

    // Doctor Contracts
    async getContracts() {
        return this.request<{ contracts: any[] }>('GET', '/api/v1/boss/contracts');
    }

    async createContract(data: { doctor_id: string; share_percentage: number; start_date: string; end_date?: string; notes?: string }) {
        return this.request('POST', '/api/v1/boss/contracts', data);
    }

    async updateContract(id: string, data: { share_percentage?: number; end_date?: string; is_active?: boolean; notes?: string }) {
        return this.request('PUT', `/api/v1/boss/contracts/${id}`, data);
    }

    async deleteContract(id: string) {
        return this.request('DELETE', `/api/v1/boss/contracts/${id}`);
    }

    // Expenses
    async getExpenses() {
        return this.request<{ expenses: any[] }>('GET', '/api/v1/boss/expenses');
    }

    async createExpense(data: { category: string; amount: number; date: string; note?: string }) {
        return this.request('POST', '/api/v1/boss/expenses', data);
    }

    async deleteExpense(id: string) {
        return this.request('DELETE', `/api/v1/boss/expenses/${id}`);
    }

    // Staff Salaries
    async getSalaries() {
        return this.request<{ salaries: any[] }>('GET', '/api/v1/boss/salaries');
    }

    async createSalary(data: { user_id: string; monthly_amount: number; effective_from: string }) {
        return this.request('POST', '/api/v1/boss/salaries', data);
    }

    async updateSalary(id: string, data: { monthly_amount?: number; is_active?: boolean }) {
        return this.request('PUT', `/api/v1/boss/salaries/${id}`, data);
    }

    async deleteSalary(id: string) {
        return this.request('DELETE', `/api/v1/boss/salaries/${id}`);
    }

    // Audit Logs
    async getAuditLogs(params?: { doctor_id?: string; start_date?: string; end_date?: string; limit?: number }) {
        const query = new URLSearchParams();
        if (params?.doctor_id) query.append('doctor_id', params.doctor_id);
        if (params?.start_date) query.append('start_date', params.start_date);
        if (params?.end_date) query.append('end_date', params.end_date);
        if (params?.limit) query.append('limit', params.limit.toString());
        const queryString = query.toString() ? `?${query.toString()}` : '';
        return this.request<{ audit_logs: any[] }>('GET', `/api/v1/boss/audit-logs${queryString}`);
    }

    // Admin endpoints
    async getClinics() {
        return this.request<{ clinics: any[] }>('GET', '/api/v1/admin/clinics');
    }

    async createClinic(data: any) {
        return this.request('POST', '/api/v1/admin/clinics', data);
    }

    async inviteBoss(clinicId: string, email: string) {
        return this.request('POST', `/api/v1/admin/clinics/${clinicId}/invite`, { email });
    }
}

export const api = new ApiClient(API_URL);
