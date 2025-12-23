'use client';

import { Menu, X, ShoppingBag, LogOut, User, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function POSSidebar({ isOpen, setIsOpen }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { settings } = useRestaurantSettings();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-secondary border-r border-accent/20 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-accent">POS System</h1>
                  <p className="text-xs text-text/60">{settings.restaurantName || 'De Fusion Flame'}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="lg:hidden p-2 hover:bg-accent/20 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-accent/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-accent truncate">
                  {user?.firstName || user?.email || 'Staff'}
                </p>
                <p className="text-xs text-text/60 truncate">{user?.role || 'POS'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    pathname === '/'
                      ? 'bg-accent text-primary shadow-lg'
                      : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-medium">POS</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    pathname === '/dashboard'
                      ? 'bg-accent text-primary shadow-lg'
                      : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* Logout */}
          <div className="mt-auto p-4 border-t border-accent/20">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text/70 hover:bg-danger/20 hover:text-danger transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

