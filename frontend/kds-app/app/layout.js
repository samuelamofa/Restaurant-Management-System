import './globals.css';
import { Toaster } from 'react-hot-toast';
import AppWrapper from './components/AppWrapper';

export const metadata = {
  title: 'Kitchen Display System - De Fusion Flame Kitchen',
  description: 'Kitchen Display System for De Fusion Flame Kitchen',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppWrapper>{children}</AppWrapper>
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

