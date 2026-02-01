'use client';

import { useLanguage } from '@/lib/i18n';

export default function Hero() {
    const { t } = useLanguage();

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 via-white to-white pt-16">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
                    <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                    Tibbiyot klinikalari uchun CRM
                </div>

                {/* Main heading */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 max-w-4xl mx-auto">
                    {t('heroTitle')}
                </h1>

                <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                    {t('heroSubtitle')}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a
                        href="#contact"
                        className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                    >
                        {t('heroCTA')}
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </a>
                    <a
                        href="#features"
                        className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-full text-lg font-semibold hover:border-blue-200 hover:text-blue-600 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('heroDemo')}
                    </a>
                </div>

                {/* Stats */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
                    {[
                        { value: '50+', label: 'Klinikalar' },
                        { value: '10K+', label: 'Bemorlar' },
                        { value: '99.9%', label: 'Uptime' },
                        { value: '24/7', label: 'Qo\'llab-quvvatlash' },
                    ].map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                            <div className="text-gray-500 text-sm mt-1">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
            </div>
        </section>
    );
}
