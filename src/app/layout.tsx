import type { Metadata, Viewport } from 'next';
import { Noto_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const notoSans = Noto_Sans({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0f5238',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Mausam Vaani — AI-Powered Multilingual Weather & Agri-Advisory Platform',
  description: 'AI-Powered Multilingual Weather & Agri-Advisory Platform (SIH 2026 PS SIH26068)',
  icons: {
    icon: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${notoSans.variable} ${plusJakartaSans.variable}`}>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
