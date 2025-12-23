import './globals.css';
import { Toaster } from 'react-hot-toast';
import POSLayout from './components/POSLayout';
import HydrationHandler from './components/HydrationHandler';

export const metadata = {
  title: 'POS System - De Fusion Flame Kitchen',
  description: 'Point of Sale System for De Fusion Flame Kitchen',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <HydrationHandler />
        <POSLayout>{children}</POSLayout>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1E1E1E',
              color: '#F5F5F5',
              border: '1px solid #C59D5F',
            },
          }}
        />
      </body>
    </html>
  );
}

