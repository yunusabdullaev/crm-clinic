'use client';

import { useLanguage } from '@/lib/i18n';

const roles = [
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        ),
        titleKey: 'roleBossTitle',
        descKey: 'roleBossDesc',
        gradient: 'from-blue-500 to-indigo-600',
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
        titleKey: 'roleDoctorTitle',
        descKey: 'roleDoctorDesc',
        gradient: 'from-green-500 to-emerald-600',
    },
    {
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        titleKey: 'roleReceptionistTitle',
        descKey: 'roleReceptionistDesc',
        gradient: 'from-purple-500 to-violet-600',
    },
];

export default function Roles() {
    const { t } = useLanguage();

    return (
        <section id="roles" className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        {t('rolesTitle')}
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        {t('rolesSubtitle')}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {roles.map((role, index) => (
                        <div
                            key={index}
                            className="relative group"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${role.gradient} rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`}></div>
                            <div className="relative bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-transparent transition-colors">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${role.gradient} flex items-center justify-center text-white mb-6`}>
                                    {role.icon}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                                    {t(role.titleKey)}
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {t(role.descKey)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
