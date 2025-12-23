'use client';

import { useContext } from 'react';
import { Menu, X, ChefHat, LogOut, User, FileText, AlertCircle, CheckCircle, Utensils, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { OrderCountsContext } from './KDSLayout';

export default function KDSSidebar({ isOpen, setIsOpen }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const { settings } = useRestaurantSettings();
  
  // Get order counts from context
  const contextValue = useContext(OrderCountsContext);
  const orderCountsData = contextValue?.orderCounts || { 
    ONLINE: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 },
    IN_RESTAURANT: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 }
  };
  
  // Get active order type from URL
  const activeOrderType = searchParams?.get('type') || 'all';
  
  // Calculate order counts based on active type
  const getOrderCounts = () => {
    if (activeOrderType === 'online') {
      return orderCountsData.ONLINE || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
    } else if (activeOrderType === 'in-restaurant') {
      return orderCountsData.IN_RESTAURANT || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
    } else {
      // Combined counts
      const online = orderCountsData.ONLINE || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
      const inRestaurant = orderCountsData.IN_RESTAURANT || { PENDING: 0, CONFIRMED: 0, PREPARING: 0, READY: 0, COMPLETED: 0 };
      return {
        PENDING: online.PENDING + inRestaurant.PENDING,
        CONFIRMED: online.CONFIRMED + inRestaurant.CONFIRMED,
        PREPARING: online.PREPARING + inRestaurant.PREPARING,
        READY: online.READY + inRestaurant.READY,
        COMPLETED: online.COMPLETED + inRestaurant.COMPLETED,
      };
    }
  };
  
  const orderCounts = getOrderCounts();
  
  // Calculate total for "All Orders"
  const totalOrders = orderCounts.PENDING + orderCounts.CONFIRMED + orderCounts.PREPARING + orderCounts.READY + orderCounts.COMPLETED;

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
                  <ChefHat className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-accent">Kitchen Display</h1>
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
                  {user?.firstName || user?.email || 'Kitchen Staff'}
                </p>
                <p className="text-xs text-text/60 truncate">{user?.role || 'KITCHEN_STAFF'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="mb-4">
              <p className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2 px-2">Orders</p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/?status=all&type=all"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      (pathname === '/' && !searchParams?.get('status') && !searchParams?.get('type')) || 
                      (searchParams?.get('status') === 'all' && (!searchParams?.get('type') || searchParams?.get('type') === 'all'))
                        ? 'bg-accent text-primary shadow-lg'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ChefHat className="w-4 h-4" />
                      <span className="font-medium">All Orders</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      (pathname === '/' && !searchParams?.get('status') && !searchParams?.get('type')) || 
                      (searchParams?.get('status') === 'all' && (!searchParams?.get('type') || searchParams?.get('type') === 'all'))
                        ? 'bg-primary text-accent'
                        : 'bg-accent text-primary'
                    }`}>
                      {totalOrders}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=${searchParams?.get('status') || 'all'}&type=online`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('type') === 'online'
                        ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                        : 'text-text/70 hover:bg-blue-500/10 hover:text-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span className="font-medium">Online</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('type') === 'online'
                        ? (orderCountsData.ONLINE?.PENDING + orderCountsData.ONLINE?.CONFIRMED + orderCountsData.ONLINE?.PREPARING + orderCountsData.ONLINE?.READY + orderCountsData.ONLINE?.COMPLETED || 0) > 0
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-500/30 text-blue-400'
                        : (orderCountsData.ONLINE?.PENDING + orderCountsData.ONLINE?.CONFIRMED + orderCountsData.ONLINE?.PREPARING + orderCountsData.ONLINE?.READY + orderCountsData.ONLINE?.COMPLETED || 0) > 0
                          ? 'bg-blue-500/80 text-white'
                          : 'bg-blue-500/20 text-blue-400/60'
                    }`}>
                      {orderCountsData.ONLINE?.PENDING + orderCountsData.ONLINE?.CONFIRMED + orderCountsData.ONLINE?.PREPARING + orderCountsData.ONLINE?.READY + orderCountsData.ONLINE?.COMPLETED || 0}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=${searchParams?.get('status') || 'all'}&type=in-restaurant`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('type') === 'in-restaurant'
                        ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500'
                        : 'text-text/70 hover:bg-orange-500/10 hover:text-orange-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Utensils className="w-4 h-4" />
                      <span className="font-medium">In-Restaurant</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('type') === 'in-restaurant'
                        ? (orderCountsData.IN_RESTAURANT?.PENDING + orderCountsData.IN_RESTAURANT?.CONFIRMED + orderCountsData.IN_RESTAURANT?.PREPARING + orderCountsData.IN_RESTAURANT?.READY + orderCountsData.IN_RESTAURANT?.COMPLETED || 0) > 0
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-500/30 text-orange-400'
                        : (orderCountsData.IN_RESTAURANT?.PENDING + orderCountsData.IN_RESTAURANT?.CONFIRMED + orderCountsData.IN_RESTAURANT?.PREPARING + orderCountsData.IN_RESTAURANT?.READY + orderCountsData.IN_RESTAURANT?.COMPLETED || 0) > 0
                          ? 'bg-orange-500/80 text-white'
                          : 'bg-orange-500/20 text-orange-400/60'
                    }`}>
                      {orderCountsData.IN_RESTAURANT?.PENDING + orderCountsData.IN_RESTAURANT?.CONFIRMED + orderCountsData.IN_RESTAURANT?.PREPARING + orderCountsData.IN_RESTAURANT?.READY + orderCountsData.IN_RESTAURANT?.COMPLETED || 0}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=pending&type=${activeOrderType}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('status') === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400 border-l-2 border-yellow-500'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Pending</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('status') === 'pending'
                        ? orderCounts.PENDING > 0 
                          ? 'bg-yellow-500 text-white'
                          : 'bg-yellow-500/30 text-yellow-400'
                        : orderCounts.PENDING > 0
                          ? 'bg-yellow-500/80 text-white'
                          : 'bg-yellow-500/20 text-yellow-400/60'
                    }`}>
                      {orderCounts.PENDING}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=confirmed&type=${activeOrderType}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('status') === 'confirmed'
                        ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Confirmed</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('status') === 'confirmed'
                        ? orderCounts.CONFIRMED > 0 
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-500/30 text-blue-400'
                        : orderCounts.CONFIRMED > 0
                          ? 'bg-blue-500/80 text-white'
                          : 'bg-blue-500/20 text-blue-400/60'
                    }`}>
                      {orderCounts.CONFIRMED}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=preparing&type=${activeOrderType}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('status') === 'preparing'
                        ? 'bg-orange-500/20 text-orange-400 border-l-2 border-orange-500'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Utensils className="w-4 h-4" />
                      <span className="font-medium">Preparing</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('status') === 'preparing'
                        ? orderCounts.PREPARING > 0 
                          ? 'bg-orange-500 text-white'
                          : 'bg-orange-500/30 text-orange-400'
                        : orderCounts.PREPARING > 0
                          ? 'bg-orange-500/80 text-white'
                          : 'bg-orange-500/20 text-orange-400/60'
                    }`}>
                      {orderCounts.PREPARING}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=ready&type=${activeOrderType}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('status') === 'ready'
                        ? 'bg-green-500/20 text-green-400 border-l-2 border-green-500'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Ready</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('status') === 'ready'
                        ? orderCounts.READY > 0 
                          ? 'bg-green-500 text-white'
                          : 'bg-green-500/30 text-green-400'
                        : orderCounts.READY > 0
                          ? 'bg-green-500/80 text-white'
                          : 'bg-green-500/20 text-green-400/60'
                    }`}>
                      {orderCounts.READY}
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/?status=completed&type=${activeOrderType}`}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      searchParams?.get('status') === 'completed'
                        ? 'bg-success/20 text-success border-l-2 border-success'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Completed</span>
                    </div>
                    <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      searchParams?.get('status') === 'completed'
                        ? orderCounts.COMPLETED > 0 
                          ? 'bg-success text-white'
                          : 'bg-success/30 text-success'
                        : orderCounts.COMPLETED > 0
                          ? 'bg-success/80 text-white'
                          : 'bg-success/20 text-success/60'
                    }`}>
                      {orderCounts.COMPLETED}
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
            
            <div className="mt-4 pt-4 border-t border-accent/20">
              <p className="text-xs font-semibold text-text/50 uppercase tracking-wider mb-2 px-2">Other</p>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="/reports"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 text-sm ${
                      pathname === '/reports'
                        ? 'bg-accent text-primary shadow-lg'
                        : 'text-text/70 hover:bg-accent/10 hover:text-accent'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Reports</span>
                  </Link>
                </li>
              </ul>
            </div>
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

