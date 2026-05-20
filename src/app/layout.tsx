import type { Metadata, Viewport } from 'next';
import './globals.css';
import './auth.css';
import { WalletProvider } from '@/context/WalletContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import Navbar from '@/components/Navbar/Navbar';
import Sidebar from '@/components/Sidebar/Sidebar';
import PreloaderWrapper from '@/components/Preloader/PreloaderWrapper';
import CustomerService from '@/components/CustomerService/CustomerService';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';

export const metadata: Metadata = {
  title: 'BlastPay - Premium NGN Virtual Games & Payouts',
  description: 'Experience the ultimate virtual gaming application with BlastPay instant payouts.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F1923',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <WalletProvider>
              <PreloaderWrapper>
              <Navbar />
              <div className="app-layout">
                <Sidebar />
                <main className="app-main">
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </main>
              </div>
              <CustomerService />
            </PreloaderWrapper>
          </WalletProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
