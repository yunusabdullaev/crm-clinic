'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type Language = 'en' | 'uz' | 'ru';

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Translations
const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navigation
        'nav.dashboard': 'Dashboard',
        'nav.patients': 'Patients',
        'nav.appointments': 'Appointments',
        'nav.visits': 'Visits',
        'nav.services': 'Services',
        'nav.staff': 'Staff',
        'nav.contracts': 'Contracts',
        'nav.expenses': 'Expenses',
        'nav.salaries': 'Salaries',
        'nav.reports': 'Reports',
        'nav.activity': 'Activity',
        'nav.settings': 'Settings',
        'nav.logout': 'Logout',
        // Common
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.create': 'Create',
        'common.add': 'Add',
        'common.search': 'Search',
        'common.loading': 'Loading...',
        'common.noData': 'No data available',
        // Settings
        'settings.title': 'Settings',
        'settings.appearance': 'Appearance',
        'settings.theme': 'Theme',
        'settings.themeLight': 'Light',
        'settings.themeDark': 'Dark',
        'settings.themeSystem': 'System',
        'settings.language': 'Language',
        // Dashboard
        'dashboard.title': 'Dashboard',
        'dashboard.patientsToday': 'New Patients Today',
        'dashboard.visitsToday': 'Visits Today',
        'dashboard.revenueToday': 'Revenue Today',
        // Reports
        'reports.financialReports': 'Financial Reports',
        'reports.subtitle': 'Monthly financial overview and profit analysis',
        'reports.totalRevenue': 'Total Revenue',
        'reports.doctorEarnings': 'Doctor Earnings',
        'reports.expenses': 'Total Expenses',
        'reports.salaries': 'Staff Salaries',
        'reports.grossProfit': 'Gross Profit',
        'reports.netProfit': 'Net Profit',
        'reports.revenueByDoctor': 'Revenue by Doctor',
        'reports.expensesByCategory': 'Expenses by Category',
        'reports.profitBreakdown': 'Financial Breakdown',
        'reports.additionalStats': 'Additional Statistics',
        'reports.visitsCount': 'Total Visits',
        'reports.patientsCount': 'Patients',
        'reports.totalDiscount': 'Total Discounts',
        'reports.avgPerVisit': 'Avg. per Visit',
        'reports.noData': 'No data available for the selected period',
        'common.refresh': 'Refresh',
    },
    uz: {
        // Navigation
        'nav.dashboard': 'Boshqaruv paneli',
        'nav.patients': 'Bemorlar',
        'nav.appointments': 'Uchrashuvlar',
        'nav.visits': 'Tashriflar',
        'nav.services': 'Xizmatlar',
        'nav.staff': 'Xodimlar',
        'nav.contracts': 'Shartnomalar',
        'nav.expenses': 'Xarajatlar',
        'nav.salaries': 'Maoshlar',
        'nav.reports': 'Hisobotlar',
        'nav.activity': 'Faoliyat',
        'nav.settings': 'Sozlamalar',
        'nav.logout': 'Chiqish',
        // Common
        'common.save': 'Saqlash',
        'common.cancel': 'Bekor qilish',
        'common.delete': "O'chirish",
        'common.edit': 'Tahrirlash',
        'common.create': 'Yaratish',
        'common.add': "Qo'shish",
        'common.search': 'Qidirish',
        'common.loading': 'Yuklanmoqda...',
        'common.noData': "Ma'lumot yo'q",
        // Settings
        'settings.title': 'Sozlamalar',
        'settings.appearance': "Ko'rinish",
        'settings.theme': 'Mavzu',
        'settings.themeLight': 'Yorug',
        'settings.themeDark': 'Qorong\'u',
        'settings.themeSystem': 'Tizim',
        'settings.language': 'Til',
        // Dashboard
        'dashboard.title': 'Boshqaruv paneli',
        'dashboard.patientsToday': 'Bugungi yangi bemorlar',
        'dashboard.visitsToday': 'Bugungi tashriflar',
        'dashboard.revenueToday': 'Bugungi daromad',
        // Reports
        'reports.financialReports': 'Moliyaviy hisobotlar',
        'reports.subtitle': 'Oylik moliyaviy sharh va foyda tahlili',
        'reports.totalRevenue': 'Jami daromad',
        'reports.doctorEarnings': 'Shifokor ulushi',
        'reports.expenses': 'Jami xarajatlar',
        'reports.salaries': 'Xodimlar maoshi',
        'reports.grossProfit': 'Yalpi foyda',
        'reports.netProfit': 'Sof foyda',
        'reports.revenueByDoctor': 'Shifokorlar bo\'yicha daromad',
        'reports.expensesByCategory': 'Toifalar bo\'yicha xarajatlar',
        'reports.profitBreakdown': 'Moliyaviy taqsimot',
        'reports.additionalStats': 'Qo\'shimcha statistika',
        'reports.visitsCount': 'Jami tashriflar',
        'reports.patientsCount': 'Bemorlar',
        'reports.totalDiscount': 'Jami chegirmalar',
        'reports.avgPerVisit': 'Tashrif uchun o\'rtacha',
        'reports.noData': 'Tanlangan davr uchun ma\'lumot yo\'q',
        'common.refresh': 'Yangilash',
    },
    ru: {
        // Navigation
        'nav.dashboard': 'Панель управления',
        'nav.patients': 'Пациенты',
        'nav.appointments': 'Записи',
        'nav.visits': 'Визиты',
        'nav.services': 'Услуги',
        'nav.staff': 'Персонал',
        'nav.contracts': 'Контракты',
        'nav.expenses': 'Расходы',
        'nav.salaries': 'Зарплаты',
        'nav.reports': 'Отчёты',
        'nav.activity': 'Активность',
        'nav.settings': 'Настройки',
        'nav.logout': 'Выход',
        // Common
        'common.save': 'Сохранить',
        'common.cancel': 'Отмена',
        'common.delete': 'Удалить',
        'common.edit': 'Редактировать',
        'common.create': 'Создать',
        'common.add': 'Добавить',
        'common.search': 'Поиск',
        'common.loading': 'Загрузка...',
        'common.noData': 'Нет данных',
        // Settings
        'settings.title': 'Настройки',
        'settings.appearance': 'Оформление',
        'settings.theme': 'Тема',
        'settings.themeLight': 'Светлая',
        'settings.themeDark': 'Тёмная',
        'settings.themeSystem': 'Системная',
        'settings.language': 'Язык',
        // Dashboard
        'dashboard.title': 'Панель управления',
        'dashboard.patientsToday': 'Новых пациентов сегодня',
        'dashboard.visitsToday': 'Визитов сегодня',
        'dashboard.revenueToday': 'Выручка сегодня',
        // Reports
        'reports.financialReports': 'Финансовые отчёты',
        'reports.subtitle': 'Ежемесячный финансовый обзор и анализ прибыли',
        'reports.totalRevenue': 'Общий доход',
        'reports.doctorEarnings': 'Заработок врачей',
        'reports.expenses': 'Общие расходы',
        'reports.salaries': 'Зарплаты персонала',
        'reports.grossProfit': 'Валовая прибыль',
        'reports.netProfit': 'Чистая прибыль',
        'reports.revenueByDoctor': 'Доход по врачам',
        'reports.expensesByCategory': 'Расходы по категориям',
        'reports.profitBreakdown': 'Финансовая структура',
        'reports.additionalStats': 'Дополнительная статистика',
        'reports.visitsCount': 'Всего визитов',
        'reports.patientsCount': 'Пациенты',
        'reports.totalDiscount': 'Всего скидок',
        'reports.avgPerVisit': 'Средний чек',
        'reports.noData': 'Нет данных за выбранный период',
        'common.refresh': 'Обновить',
    },
};

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light');
    const [language, setLanguageState] = useState<Language>('en');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load saved settings
        const savedTheme = localStorage.getItem('theme') as Theme;
        const savedLang = localStorage.getItem('language') as Language;
        if (savedTheme) setThemeState(savedTheme);
        if (savedLang) setLanguageState(savedLang);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply theme
        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('language', lang);
    };

    const t = (key: string): string => {
        return translations[language][key] || key;
    };

    if (!mounted) {
        return null;
    }

    return (
        <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
