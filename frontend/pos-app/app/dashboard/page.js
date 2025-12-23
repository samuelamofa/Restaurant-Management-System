'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, ShoppingBag, Package, TrendingUp, CreditCard, Smartphone, Banknote, UtensilsCrossed, ShoppingCart } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user, token, _hasHydrated, logout } = useAuthStore();
  const router = useRouter();

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Wait for hydration to complete
    if (!_hasHydrated || !mounted) {
      return;
    }

    // Check authentication after hydration
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    // Verify user has POS access
    const allowedRoles = ['RECEPTIONIST', 'CASHIER', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      toast.error('Access denied. POS access required.');
      router.push('/login');
      return;
    }
    
    fetchDashboardData();
  }, [user, token, _hasHydrated, mounted, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/staff/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Handle 401 specifically - don't show error toast, let the auth check handle it
      if (error.response?.status === 401) {
        // Token expired or invalid - clear auth and redirect
        logout();
        router.push('/login');
        return;
      }
      
      toast.error(error.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while hydrating or fetching data
  if (!mounted || !_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  // If no user/token after hydration, show login prompt (will redirect)
  if (!user || !token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-accent text-xl">Redirecting to login...</div>
        </div>
      </div>
    );
  }

  const getPaymentMethodIcon = (method) => {
    const icons = {
      'CASH': Banknote,
      'CARD': CreditCard,
      'MOMO': Smartphone,
    };
    return icons[method] || DollarSign;
  };

  const getOrderTypeIcon = (type) => {
    if (type === 'DINE_IN') return UtensilsCrossed;
    if (type === 'TAKEAWAY') return ShoppingCart;
    return ShoppingBag;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-accent">Today's Sales Dashboard</h1>
        <p className="text-text/60">Welcome back, {user?.firstName || user?.email || 'Staff'}! Here's your performance today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-accent">₵{stats?.stats?.totalSales?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-text/60 mt-2">Today's revenue</p>
            </div>
            <div className="p-4 bg-accent/20 rounded-xl">
              <DollarSign className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-accent">{stats?.stats?.totalOrders || 0}</p>
              <p className="text-xs text-text/60 mt-2">Number of transactions</p>
            </div>
            <div className="p-4 bg-blue-500/20 rounded-xl">
              <ShoppingBag className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Items Sold</p>
              <p className="text-3xl font-bold text-accent">{stats?.stats?.totalItems || 0}</p>
              <p className="text-xs text-text/60 mt-2">
                {stats?.stats?.totalOrders > 0 
                  ? `~${(stats.stats.totalItems / stats.stats.totalOrders).toFixed(1)} items per order`
                  : 'Total quantity sold'}
              </p>
            </div>
            <div className="p-4 bg-success/20 rounded-xl">
              <Package className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-accent">₵{stats?.stats?.averageOrderValue?.toFixed(2) || '0.00'}</p>
              <p className="text-xs text-text/60 mt-2">Per order average</p>
            </div>
            <div className="p-4 bg-purple-500/20 rounded-xl">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment Methods */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent">Payment Methods</h2>
          </div>
          <div className="space-y-4">
            {stats?.paymentMethods && Object.entries(stats.paymentMethods).map(([method, amount]) => {
              if (amount === 0) return null;
              const Icon = getPaymentMethodIcon(method);
              return (
                <div key={method} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">{method === 'MOMO' ? 'Mobile Money' : method}</p>
                      <p className="text-sm text-text/60">
                        {stats.recentOrders?.filter(o => o.paymentMethod === method).length || 0} transactions
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-accent">₵{amount.toFixed(2)}</p>
                </div>
              );
            })}
            {(!stats?.paymentMethods || Object.values(stats.paymentMethods).every(v => v === 0)) && (
              <p className="text-center text-text/60 py-8">No payments today</p>
            )}
          </div>
        </div>

        {/* Order Types */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent">Order Types</h2>
          </div>
          <div className="space-y-4">
            {stats?.orderTypes && Object.entries(stats.orderTypes).map(([type, count]) => {
              if (count === 0) return null;
              const Icon = getOrderTypeIcon(type);
              return (
                <div key={type} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg">
                      <Icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {type === 'DINE_IN' ? 'Dine In' : type === 'TAKEAWAY' ? 'Takeaway' : 'Online'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-accent">{count} orders</p>
                </div>
              );
            })}
            {(!stats?.orderTypes || Object.values(stats.orderTypes).every(v => v === 0)) && (
              <p className="text-center text-text/60 py-8">No orders today</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-accent">Recent Orders</h2>
        </div>
        {stats?.recentOrders && stats.recentOrders.length > 0 ? (
          <div className="space-y-3">
            {stats.recentOrders.map((order) => (
              <div key={order.id} className="bg-secondary p-4 rounded-lg border border-accent/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-accent">Order #{order.orderNumber}</p>
                    <p className="text-sm text-text/60">
                      {new Date(order.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-accent">₵{order.total.toFixed(2)}</p>
                    <p className="text-xs text-text/60">{order.paymentMethod || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-text/70 mb-2">
                  <span className="px-2 py-1 bg-primary rounded">
                    {order.orderType === 'DINE_IN' ? 'Dine In' : order.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Online'}
                  </span>
                  {order.tableNumber && (
                    <span className="px-2 py-1 bg-primary rounded">Table {order.tableNumber}</span>
                  )}
                  <span className="px-2 py-1 bg-accent/20 text-accent rounded font-semibold">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'items'}
                  </span>
                </div>
                {order.items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-accent/10">
                    <p className="text-xs text-text/60 mb-1">Items in this order:</p>
                    <div className="flex flex-wrap gap-1">
                      {order.items.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-primary rounded">
                          {item.quantity}x {item.menuItem?.name || 'Item'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-text/60 py-12">No orders today</p>
        )}
      </div>
    </div>
  );
}

