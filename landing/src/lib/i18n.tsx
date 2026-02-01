'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'uz' | 'ru' | 'en';

interface Translations {
    [key: string]: {
        uz: string;
        ru: string;
        en: string;
    };
}

const translations: Translations = {
    // Navbar
    navFeatures: { uz: 'Xususiyatlar', ru: 'Возможности', en: 'Features' },
    navRoles: { uz: 'Foydalanuvchilar', ru: 'Пользователи', en: 'Users' },
    navBenefits: { uz: 'Afzalliklar', ru: 'Преимущества', en: 'Benefits' },
    navContact: { uz: 'Aloqa', ru: 'Контакты', en: 'Contact' },
    navDemo: { uz: 'Demo so\'rash', ru: 'Запросить демо', en: 'Request Demo' },

    // Hero
    heroTitle: { uz: 'Klinikangizni zamonaviy boshqaring', ru: 'Управляйте клиникой современно', en: 'Manage Your Clinic Smartly' },
    heroSubtitle: { uz: 'Bemorlar, navbatlar, shifokorlar va moliyaviy hisobotlarni bir joyda boshqaring', ru: 'Управляйте пациентами, очередями, врачами и финансовыми отчетами в одном месте', en: 'Manage patients, appointments, doctors and financial reports in one place' },
    heroCTA: { uz: 'Bepul sinab ko\'ring', ru: 'Попробовать бесплатно', en: 'Try for Free' },
    heroDemo: { uz: 'Demo ko\'rish', ru: 'Посмотреть демо', en: 'Watch Demo' },

    // Features
    featuresTitle: { uz: 'Platformaning imkoniyatlari', ru: 'Возможности платформы', en: 'Platform Features' },
    featuresSubtitle: { uz: 'Klinikangiz uchun zarur barcha funksiyalar', ru: 'Все необходимые функции для вашей клиники', en: 'All the features your clinic needs' },

    feature1Title: { uz: 'Dashboard', ru: 'Панель управления', en: 'Dashboard' },
    feature1Desc: { uz: 'Barcha ma\'lumotlar bir joyda - tez va qulay', ru: 'Все данные в одном месте - быстро и удобно', en: 'All data in one place - fast and convenient' },

    feature2Title: { uz: 'Navbatlar', ru: 'Записи', en: 'Appointments' },
    feature2Desc: { uz: 'Onlayn navbat boshqaruvi va eslatmalar', ru: 'Онлайн управление записями и напоминания', en: 'Online appointment management and reminders' },

    feature3Title: { uz: 'Bemorlar', ru: 'Пациенты', en: 'Patients' },
    feature3Desc: { uz: 'Excel import/export va to\'liq tarix', ru: 'Импорт/экспорт Excel и полная история', en: 'Excel import/export and complete history' },

    feature4Title: { uz: 'Hisobotlar', ru: 'Отчёты', en: 'Reports' },
    feature4Desc: { uz: 'Moliyaviy tahlil va statistika', ru: 'Финансовый анализ и статистика', en: 'Financial analysis and statistics' },

    feature5Title: { uz: 'Shifokorlar', ru: 'Врачи', en: 'Doctors' },
    feature5Desc: { uz: 'Ish vaqti va yuklanish boshqaruvi', ru: 'Управление рабочим временем и нагрузкой', en: 'Work schedule and workload management' },

    feature6Title: { uz: 'Xavfsizlik', ru: 'Безопасность', en: 'Security' },
    feature6Desc: { uz: 'Multi-tenant izolyatsiya va shifrlash', ru: 'Мульти-тенант изоляция и шифрование', en: 'Multi-tenant isolation and encryption' },

    // Roles
    rolesTitle: { uz: 'Qanday rollar uchun?', ru: 'Для каких ролей?', en: 'For Which Roles?' },
    rolesSubtitle: { uz: 'Har bir foydalanuvchi o\'z vazifasiga moslashtirilgan interfeys oladi', ru: 'Каждый пользователь получает интерфейс под свою роль', en: 'Each user gets an interface tailored to their role' },

    roleBossTitle: { uz: 'Klinika rahbari', ru: 'Руководитель клиники', en: 'Clinic Owner' },
    roleBossDesc: { uz: 'Moliyaviy hisobotlar, xodimlar boshqaruvi, xizmatlar narxlari', ru: 'Финансовые отчеты, управление персоналом, цены на услуги', en: 'Financial reports, staff management, service pricing' },

    roleDoctorTitle: { uz: 'Shifokor', ru: 'Врач', en: 'Doctor' },
    roleDoctorDesc: { uz: 'Bemorlar ro\'yxati, vizitlar tarixi, tashxis qo\'yish', ru: 'Список пациентов, история визитов, постановка диагноза', en: 'Patient list, visit history, diagnosis' },

    roleReceptionistTitle: { uz: 'Resepsionist', ru: 'Регистратор', en: 'Receptionist' },
    roleReceptionistDesc: { uz: 'Navbatlar, bemor ro\'yxatga olish, kutilyotganlar', ru: 'Записи, регистрация пациентов, ожидающие', en: 'Appointments, patient registration, waiting list' },

    // Benefits
    benefitsTitle: { uz: 'Nima uchun bizni tanlash kerak?', ru: 'Почему выбирают нас?', en: 'Why Choose Us?' },

    benefit1Title: { uz: 'Tez sozlash', ru: 'Быстрая настройка', en: 'Quick Setup' },
    benefit1Desc: { uz: '5 daqiqada tizimni sozlab, ishni boshlang', ru: 'Настройте систему за 5 минут и начните работу', en: 'Set up the system in 5 minutes and start working' },

    benefit2Title: { uz: '24/7 qo\'llab-quvvatlash', ru: 'Поддержка 24/7', en: '24/7 Support' },
    benefit2Desc: { uz: 'Har qanday savollaringizga tez javob beramiz', ru: 'Быстро ответим на любые ваши вопросы', en: 'We quickly answer all your questions' },

    benefit3Title: { uz: 'Xavfsiz saqlash', ru: 'Безопасное хранение', en: 'Secure Storage' },
    benefit3Desc: { uz: 'Ma\'lumotlaringiz shifrlangan va himoyalangan', ru: 'Ваши данные зашифрованы и защищены', en: 'Your data is encrypted and protected' },

    benefit4Title: { uz: 'Mobil moslik', ru: 'Мобильная совместимость', en: 'Mobile Compatible' },
    benefit4Desc: { uz: 'Istalgan qurilmadan foydalaning', ru: 'Используйте с любого устройства', en: 'Use from any device' },

    // Contact
    contactTitle: { uz: 'Bog\'lanish', ru: 'Связаться с нами', en: 'Contact Us' },
    contactSubtitle: { uz: 'Savollaringiz bormi? Biz bilan bog\'laning!', ru: 'Есть вопросы? Свяжитесь с нами!', en: 'Have questions? Get in touch!' },
    contactName: { uz: 'Ismingiz', ru: 'Ваше имя', en: 'Your Name' },
    contactPhone: { uz: 'Telefon raqam', ru: 'Номер телефона', en: 'Phone Number' },
    contactClinic: { uz: 'Klinika nomi', ru: 'Название клиники', en: 'Clinic Name' },
    contactMessage: { uz: 'Xabar', ru: 'Сообщение', en: 'Message' },
    contactSend: { uz: 'Yuborish', ru: 'Отправить', en: 'Send' },
    contactSuccess: { uz: 'Xabaringiz yuborildi!', ru: 'Сообщение отправлено!', en: 'Message sent!' },

    // Footer
    footerRights: { uz: 'Barcha huquqlar himoyalangan', ru: 'Все права защищены', en: 'All rights reserved' },
    footerMadeWith: { uz: 'Muhabbat bilan yaratilgan', ru: 'Сделано с любовью', en: 'Made with love' },
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('uz');

    const t = (key: string): string => {
        return translations[key]?.[language] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
