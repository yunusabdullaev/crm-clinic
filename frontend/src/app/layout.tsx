import './globals.css';
import type { Metadata } from 'next';
import { SettingsProvider } from '@/lib/settings';

export const metadata: Metadata = {
    title: 'Medical CRM',
    description: 'Multi-tenant Medical CRM System',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <SettingsProvider>
                    {children}
                </SettingsProvider>
            </body>
        </html>
    );
}
