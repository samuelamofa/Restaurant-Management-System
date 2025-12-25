import './globals.css';
import { Toaster } from 'react-hot-toast';
import AdminLayout from './components/AdminLayout';

export const metadata = {
  title: 'Admin Dashboard - De Fusion Flame Kitchen',
  description: 'Admin Dashboard for De Fusion Flame Kitchen',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AdminLayout>{children}</AdminLayout>
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

