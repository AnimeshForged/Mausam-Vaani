import type { Metadata, Viewport } from 'next';
import { Outfit, Manrope, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-devanagari',
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
  title: 'Mausam Vaani — Multimodal Weather & Agri-Advisory Platform',
  description: 'Multimodal Weather & Agri-Advisory Platform',
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
    <html lang="en" className={`${outfit.variable} ${manrope.variable} ${jetbrainsMono.variable} ${notoSansDevanagari.variable}`}>
      <body className="bg-background text-on-surface antialiased min-h-screen">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
