'use client';

import { useState, createContext, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import POSSidebar from './POSSidebar';
import POSHeader from './POSHeader';

// Create cart context
const CartContext = createContext();
export { CartContext };

export default function POSLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't show sidebar on login page
  // Wait for mount to avoid SSR issues
  if (!isMounted) {
    return <>{children}</>;
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <CartContext.Provider value={{ cartCount, setCartCount }}>
      <div className="flex h-screen overflow-hidden bg-primary">
        <POSSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <POSHeader 
            onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
            cartCount={cartCount}
          />
          
        <main className="flex-1 overflow-y-auto bg-primary">
          <div className="p-6">
            {children}
          </div>
        </main>
        </div>
      </div>
    </CartContext.Provider>
  );
}

