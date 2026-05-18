import type { Metadata } from 'next';
import './globals.css';
import './auth.css';
import { WalletProvider } from '@/context/WalletContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar/Navbar';
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <WalletProvider>
            <PreloaderWrapper>
              <Navbar />
              <main>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
              <CustomerService />
            </PreloaderWrapper>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
