import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CRM Clinic - Tibbiyot klinikalari uchun CRM",
  description: "Bemorlar, navbatlar, shifokorlar va moliyaviy hisobotlarni bir joyda boshqaring. Tibbiyot klinikalari uchun zamonaviy boshqaruv tizimi.",
  keywords: ["CRM", "Clinic", "Medical", "Healthcare", "Tibbiyot", "Klinika", "Bemor", "Shifokor"],
  authors: [{ name: "CRM Clinic Team" }],
  openGraph: {
    title: "CRM Clinic - Tibbiyot klinikalari uchun CRM",
    description: "Bemorlar, navbatlar, shifokorlar va moliyaviy hisobotlarni bir joyda boshqaring.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz" className="scroll-smooth">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
