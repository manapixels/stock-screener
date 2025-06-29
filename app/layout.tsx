import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Signal App',
  description: 'Intelligent Stock Monitoring & Alerting Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col items-center justify-between p-4 md:p-8 lg:p-12">
            {children}
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}