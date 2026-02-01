'use client';

import { LanguageProvider } from '@/lib/i18n';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Roles from '@/components/Roles';
import Benefits from '@/components/Benefits';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <Hero />
        <Features />
        <Roles />
        <Benefits />
        <Contact />
        <Footer />
      </div>
    </LanguageProvider>
  );
}
