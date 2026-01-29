'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import translations
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import uz from '../locales/uz.json';

type Locale = 'en' | 'ru' | 'uz';
type Translations = typeof en;

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
    translations: Translations;
}

const translations: Record<Locale, Translations> = { en, ru, uz };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>('en');

    useEffect(() => {
        // Load saved locale from localStorage
        const saved = localStorage.getItem('locale') as Locale;
        if (saved && translations[saved]) {
            setLocaleState(saved);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
    };

    const t = (key: string): string => {
        const keys = key.split('.');
        let result: any = translations[locale];
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) return key;
        }
        return typeof result === 'string' ? result : key;
    };

    return (
        <I18nContext.Provider value={{ locale, setLocale, t, translations: translations[locale] }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

// Language Switcher Component
export function LanguageSwitcher() {
    const { locale, setLocale } = useI18n();

    const languages: { code: Locale; label: string; flag: string }[] = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'ru', label: 'Русский', flag: '🇷🇺' },
        { code: 'uz', label: "O'zbek", flag: '🇺🇿' },
    ];

    return (
        <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
            }}
        >
            {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.label}
                </option>
            ))}
        </select>
    );
}
