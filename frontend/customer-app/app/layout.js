import './globals.css';
import { Toaster } from 'react-hot-toast';
import ChatProvider from './components/ChatProvider';

export const metadata = {
  title: 'De Fusion Flame Kitchen - Online Ordering',
  description: 'Order delicious meals from De Fusion Flame Kitchen',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'De Fusion Flame Kitchen',
    description: 'Order delicious meals from De Fusion Flame Kitchen',
    images: ['/logo.svg'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatProvider />
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

