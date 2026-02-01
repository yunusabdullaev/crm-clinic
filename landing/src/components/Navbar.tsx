'use client';

import { useLanguage } from '@/lib/i18n';
import { useState } from 'react';

export default function Navbar() {
    const { language, setLanguage, t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                            <span className="text-white font-bold text-lg">C</span>
                        </div>
                        <span className="font-bold text-xl text-gray-900">CRM Clinic</span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            {t('navFeatures')}
                        </a>
                        <a href="#roles" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            {t('navRoles')}
                        </a>
                        <a href="#benefits" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            {t('navBenefits')}
                        </a>
                        <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                            {t('navContact')}
                        </a>
                    </div>

                    {/* Language Switcher + CTA */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {(['uz', 'ru', 'en'] as const).map((lang) => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${language === lang
                                            ? 'bg-white text-blue-600 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    {lang.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        <a
                            href="#contact"
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-full font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                        >
                            {t('navDemo')}
                        </a>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-100">
                        <div className="flex flex-col gap-4">
                            <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>
                                {t('navFeatures')}
                            </a>
                            <a href="#roles" className="text-gray-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>
                                {t('navRoles')}
                            </a>
                            <a href="#benefits" className="text-gray-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>
                                {t('navBenefits')}
                            </a>
                            <a href="#contact" className="text-gray-600 hover:text-blue-600 font-medium" onClick={() => setIsMenuOpen(false)}>
                                {t('navContact')}
                            </a>
                            <div className="flex gap-2 pt-4">
                                {(['uz', 'ru', 'en'] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${language === lang
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}
                                    >
                                        {lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
