'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, User, Menu as MenuIcon, X, UtensilsCrossed, Package } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useCartStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, token, _hasHydrated, logout } = useAuthStore();
  const { items } = useCartStore();
  const { settings } = useRestaurantSettings();
  const router = useRouter();
  
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage before checking auth
    if (!_hasHydrated) {
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }
    fetchOrders();
  }, [user, token, _hasHydrated, router]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-500/20 text-yellow-500',
      CONFIRMED: 'bg-blue-500/20 text-blue-500',
      PREPARING: 'bg-orange-500/20 text-orange-500',
      READY: 'bg-green-500/20 text-green-500',
      COMPLETED: 'bg-success/20 text-success',
      CANCELLED: 'bg-danger/20 text-danger',
    };
    return colors[status] || 'bg-secondary text-text';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-accent text-xl">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 glass border-b border-accent/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-accent group-hover:text-accent-light transition-colors">
                  {settings.restaurantName || 'De Fusion Flame'}
                </div>
                <div className="text-xs text-text/60">Kitchen & Restaurant</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-sm font-medium hover:text-accent transition-colors relative group">
                Home
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link href="/menu" className="text-sm font-medium hover:text-accent transition-colors relative group">
                Menu
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
              </Link>
              <Link href="/orders" className="text-sm font-medium hover:text-accent transition-colors relative group">
                My Orders
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
              </Link>
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 rounded-lg border border-accent/20">
                    <User className="w-4 h-4 text-accent" />
                    <span className="text-sm text-accent">{user.firstName || user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-sm hover:text-accent transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" className="text-sm font-medium hover:text-accent transition-colors">
                  Login
                </Link>
              )}
              <Link href="/cart" className="relative group">
                <div className="p-2 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors border border-accent/20">
                  <ShoppingCart className="w-5 h-5 text-accent" />
                </div>
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg animate-pulse">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>

            <div className="md:hidden flex items-center gap-2">
              {/* Cart Icon - Always visible on mobile */}
              <Link href="/cart" className="relative p-2 rounded-lg hover:bg-accent/10 transition-colors">
                <ShoppingCart className="w-6 h-6 text-accent" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow-lg">
                    {cartItemCount}
                  </span>
                )}
              </Link>
              {/* Mobile Menu Button */}
              <button
                className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-accent/20">
              <div className="flex flex-col gap-4">
                <Link href="/" className="text-sm font-medium hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Home
                </Link>
                <Link href="/menu" className="text-sm font-medium hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  Menu
                </Link>
                <Link href="/orders" className="text-sm font-medium hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  My Orders
                </Link>
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 rounded-lg border border-accent/20">
                      <User className="w-4 h-4 text-accent" />
                      <span className="text-sm text-accent">{user.firstName || user.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="text-sm hover:text-accent transition-colors text-left"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-sm font-medium hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                )}
                <Link href="/cart" className="flex items-center gap-2 text-sm font-medium hover:text-accent transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <ShoppingCart className="w-4 h-4" />
                  Cart {cartItemCount > 0 && `(${cartItemCount})`}
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Page Header */}
      <div className="warm-gradient border-b border-accent/10 py-12">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-accent hover:text-accent-light transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-accent mb-2 px-4 sm:px-0">My Orders</h1>
              <p className="text-base sm:text-lg text-text/60 px-4 sm:px-0">View and track your order history</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text/60 text-xl mb-4">No orders yet</p>
            <button
              onClick={() => router.push('/menu')}
              className="btn-primary"
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-accent">Order #{order.orderNumber}</h3>
                    <p className="text-sm text-text/60">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <p className="text-lg font-bold mt-2 text-accent">₵{order.total.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border-t border-accent/20 pt-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <ul className="space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm text-text/70">
                        {item.quantity}x {item.menuItem.name}
                        {item.variant && ` (${item.variant.name})`}
                        {item.addons.length > 0 &&
                          ` + ${item.addons.map((a) => a.addon.name).join(', ')}`}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

