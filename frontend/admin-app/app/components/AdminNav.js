'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatNotifications } from '@/lib/useChatNotifications';

export default function AdminNav() {
  const pathname = usePathname();
  const { unreadCount } = useChatNotifications();

  return (
    <nav className="bg-secondary border-b border-accent/20 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-accent">
          Admin Dashboard
        </Link>
        <div className="flex gap-4 flex-wrap">
          <Link 
            href="/" 
            className={`hover:text-accent transition-colors ${
              pathname === '/' ? 'text-accent font-semibold' : ''
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/orders" 
            className={`hover:text-accent transition-colors ${
              pathname === '/orders' ? 'text-accent font-semibold' : ''
            }`}
          >
            Orders
          </Link>
          <Link 
            href="/menu" 
            className={`hover:text-accent transition-colors ${
              pathname === '/menu' ? 'text-accent font-semibold' : ''
            }`}
          >
            Menu Items
          </Link>
          <Link 
            href="/categories" 
            className={`hover:text-accent transition-colors ${
              pathname === '/categories' ? 'text-accent font-semibold' : ''
            }`}
          >
            Categories
          </Link>
          <Link 
            href="/users" 
            className={`hover:text-accent transition-colors ${
              pathname === '/users' ? 'text-accent font-semibold' : ''
            }`}
          >
            Users & Staff
          </Link>
          <Link 
            href="/chat" 
            className={`hover:text-accent transition-colors relative inline-block ${
              pathname === '/chat' ? 'text-accent font-semibold' : ''
            }`}
          >
            Customer Support
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}

