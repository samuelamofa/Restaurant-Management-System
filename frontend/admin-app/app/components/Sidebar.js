'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  FolderTree, 
  Users, 
  Menu,
  Settings,
  MessageCircle,
  X,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { useChatNotifications } from '@/lib/useChatNotifications';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [restaurantName, setRestaurantName] = useState('De Fusion Flame');
  const { unreadCount } = useChatNotifications();

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingBag,
    },
    {
      name: 'Menu Items',
      href: '/menu',
      icon: UtensilsCrossed,
    },
    {
      name: 'Categories',
      href: '/categories',
      icon: FolderTree,
    },
    {
      name: 'Users & Staff',
      href: '/users',
      icon: Users,
    },
    {
      name: 'Customer Support',
      href: '/chat',
      icon: MessageCircle,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  // Fetch restaurant name from settings
  useEffect(() => {
    // Only fetch if authenticated
    if (!token) {
      return;
    }
    
    const fetchRestaurantName = async () => {
      try {
        const response = await api.get('/settings');
        if (response.data?.settings?.restaurantName) {
          setRestaurantName(response.data.settings.restaurantName);
        }
      } catch (error) {
        // Silently fail - default name will be used
        // 401 errors are handled by the API interceptor
      }
    };

    fetchRestaurantName();
    
    // Refresh restaurant name every 30 seconds to catch updates
    const interval = setInterval(fetchRestaurantName, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Listen for settings updates via custom event
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      if (event.detail?.restaurantName) {
        setRestaurantName(event.detail.restaurantName);
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

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
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-accent">{restaurantName}</h1>
                  <p className="text-xs text-text/60">Admin Panel</p>
                </div>
              </Link>
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
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-accent truncate">
                  {user?.firstName || user?.email || 'Admin'}
                </p>
                <p className="text-xs text-text/60 truncate">{user?.role || 'ADMIN'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
                        isActive
                          ? 'bg-accent text-primary shadow-lg'
                          : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                      <span className="font-medium flex-1">{item.name}</span>
                      {item.href === '/chat' && unreadCount > 0 && (
                        <span className="bg-danger text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-accent/20">
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

