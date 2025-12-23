'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

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
        </div>
      </div>
    </nav>
  );
}

