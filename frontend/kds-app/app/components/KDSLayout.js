'use client';

import { useState, createContext, useContext, Suspense } from 'react';
import { usePathname } from 'next/navigation';
import KDSSidebar from './KDSSidebar';
import KDSHeader from './KDSHeader';

// Create context for order counts
export const OrderCountsContext = createContext();
// Create context for search
export const SearchContext = createContext();

export default function KDSLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderCounts, setOrderCounts] = useState({ 
    ONLINE: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 },
    IN_RESTAURANT: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 }
  });
  const pathname = usePathname();

  const handleSearchChange = (query) => {
    setSearchQuery(query);
  };

  // Always provide context, even on login page
  return (
    <OrderCountsContext.Provider value={{ orderCounts, setOrderCounts }}>
      <SearchContext.Provider value={{ searchQuery, setSearchQuery: handleSearchChange }}>
        {pathname === '/login' ? (
          <>{children}</>
        ) : (
          <div className="flex h-screen overflow-hidden bg-primary">
            <Suspense fallback={<div className="w-64 bg-secondary border-r border-accent/20" />}>
              <KDSSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            </Suspense>
            
            <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-64 transition-all duration-300">
              <KDSHeader 
                onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
                orderCounts={orderCounts}
                onSearchChange={handleSearchChange}
              />
              
              <main className="flex-1 overflow-y-auto bg-primary min-w-0">
                <div className="p-6 md:p-8 max-w-full">
                  {children}
                </div>
              </main>
            </div>
          </div>
        )}
      </SearchContext.Provider>
    </OrderCountsContext.Provider>
  );
}

