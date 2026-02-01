import './globals.css';
import type { Metadata } from 'next';
import { SettingsProvider } from '@/lib/settings';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
    title: 'Medical CRM',
    description: 'Multi-tenant Medical CRM System',
    icons: {
        icon: '/icon.png',
        apple: '/icon.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <I18nProvider>
                    <SettingsProvider>
                        {children}
                    </SettingsProvider>
                </I18nProvider>
            </body>
        </html>
    );
}
