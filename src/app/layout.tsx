// ============================================
// Root Layout
// ============================================

import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | MedMind',
    default: 'MedMind — AI-Powered Mind Maps for Medicine',
  },
  description: 'The smartest mind mapping tool built for medical students. AI-powered study maps, spaced repetition, and seamless exports to PDF, PPTX, and more.',
  keywords: ['mind map', 'medical education', 'AI', 'study tool', 'USMLE', 'medical student', 'anatomy', 'pharmacology'],
  openGraph: {
    title: 'MedMind — AI-Powered Mind Maps for Medicine',
    description: 'Study smarter with AI-powered mind maps designed for medical education.',
    type: 'website',
    siteName: 'MedMind',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MedMind — AI-Powered Mind Maps for Medicine',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-100 antialiased font-body min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(26,34,54,0.95)',
              border: '1px solid rgba(45,58,80,0.8)',
              color: '#e8edf5',
              fontFamily: 'var(--font-body)',
            },
          }}
        />
      </body>
    </html>
  );
}
