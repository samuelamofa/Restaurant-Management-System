'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthGuard from './AuthGuard';

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Don't show sidebar on login page - render children directly
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // For all other routes, wrap in AuthGuard and show full layout
  // AuthGuard will handle mounting and auth checks
  return (
    <AuthGuard requireAuth={true}>
      <div className="flex h-screen overflow-hidden bg-primary">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          
          <main className="flex-1 overflow-y-auto bg-primary">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

