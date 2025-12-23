'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, TrendingUp, Package, DollarSign, Clock, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function KitchenReportsPage() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const { user, token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    const allowedRoles = ['KITCHEN_STAFF', 'ADMIN'];
    if (!allowedRoles.includes(user.role)) {
      toast.error('Access denied. Kitchen staff access required.');
      router.push('/login');
      return;
    }
    
    fetchDashboardStats();
    fetchReports();
  }, [user, token]);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/kitchen/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch kitchen dashboard:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/kitchen/reports', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setReports(response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = () => {
    fetchReports();
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-accent">Kitchen Reports</h1>
        <p className="text-text/60">Track your order preparation performance</p>
      </div>

      {/* Today's Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text/60 text-sm mb-1">Orders Prepared Today</p>
                <p className="text-3xl font-bold text-accent">{stats.stats?.totalPrepared || 0}</p>
              </div>
              <div className="p-4 bg-accent/20 rounded-xl">
                <Package className="w-8 h-8 text-accent" />
              </div>
            </div>
          </div>

          <div className="card hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text/60 text-sm mb-1">Items Prepared</p>
                <p className="text-3xl font-bold text-accent">{stats.stats?.totalItemsPrepared || 0}</p>
              </div>
              <div className="p-4 bg-blue-500/20 rounded-xl">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text/60 text-sm mb-1">Total Value</p>
                <p className="text-3xl font-bold text-accent">₵{stats.stats?.totalValue?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-4 bg-success/20 rounded-xl">
                <DollarSign className="w-8 h-8 text-success" />
              </div>
            </div>
          </div>

          <div className="card hover:shadow-2xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text/60 text-sm mb-1">Avg Prep Time</p>
                <p className="text-3xl font-bold text-accent">{stats.stats?.avgPrepTime || 0} min</p>
              </div>
              <div className="p-4 bg-purple-500/20 rounded-xl">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="card mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <label className="text-sm font-medium">Start Date:</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="px-3 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">End Date:</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="px-3 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={handleApplyFilter}
            className="btn-primary"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Reports Data */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
        </div>
      ) : reports ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <p className="text-text/60 text-sm mb-2">Total Orders</p>
              <p className="text-3xl font-bold text-accent">{reports.stats?.totalOrders || 0}</p>
            </div>
            <div className="card">
              <p className="text-text/60 text-sm mb-2">Total Items</p>
              <p className="text-3xl font-bold text-accent">{reports.stats?.totalItems || 0}</p>
            </div>
            <div className="card">
              <p className="text-text/60 text-sm mb-2">Total Value</p>
              <p className="text-3xl font-bold text-accent">₵{reports.stats?.totalValue?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          {/* All Prepared Orders - Individual Records */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-accent">All Prepared Orders</h2>
              <p className="text-sm text-text/60">
                Showing {reports.orders?.length || 0} individual order{reports.orders?.length !== 1 ? 's' : ''}
              </p>
            </div>
            {reports.orders && reports.orders.length > 0 ? (
              <div className="space-y-4 max-h-[calc(100vh-600px)] overflow-y-auto pr-2">
                {reports.orders.map((order, index) => (
                  <div key={order.id} className="bg-secondary p-5 rounded-lg border border-accent/10 hover:border-accent/30 transition-all">
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-semibold text-text/50 bg-primary px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <p className="text-xl font-bold text-accent">Order #{order.orderNumber}</p>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            order.status === 'READY' 
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-success/20 text-success'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-text/70">
                            <span className="font-medium">Prepared at:</span>{' '}
                            {order.readyAt ? new Date(order.readyAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </p>
                          {order.createdAt && (
                            <p className="text-xs text-text/60">
                              <span className="font-medium">Order created:</span>{' '}
                              {new Date(order.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                          {order.preparedBy && (
                            <p className="text-xs text-text/60">
                              <span className="font-medium">Prepared by:</span>{' '}
                              {order.preparedBy.firstName || order.preparedBy.email || 'Kitchen Staff'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-2xl font-bold text-accent">₵{order.total.toFixed(2)}</p>
                        <p className="text-xs text-text/60 mt-1">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="border-t border-accent/20 pt-4">
                      <div className="flex items-center gap-2 mb-3 text-sm">
                        <span className="px-2 py-1 bg-primary rounded text-text/70">
                          {order.orderType.replace('_', ' ')}
                        </span>
                        {order.tableNumber && (
                          <span className="px-2 py-1 bg-primary rounded text-text/70">
                            Table {order.tableNumber}
                          </span>
                        )}
                        {order.paymentMethod && (
                          <span className="px-2 py-1 bg-primary rounded text-text/70">
                            {order.paymentMethod}
                          </span>
                        )}
                      </div>

                      {/* Order Items - Full Details */}
                      <div className="mt-3">
                        <p className="text-sm font-semibold text-accent mb-2">Order Items:</p>
                        <div className="space-y-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="bg-primary/50 p-3 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-accent text-base">{item.quantity}x</span>
                                      <span className="font-semibold text-base">{item.menuItem?.name || 'Unknown Item'}</span>
                                    </div>
                                    {item.variant && (
                                      <p className="text-xs text-text/60 ml-6">Size: {item.variant.name}</p>
                                    )}
                                    {item.addons && item.addons.length > 0 && (
                                      <p className="text-xs text-text/60 ml-6">
                                        Add-ons: {item.addons.map(a => a.addon?.name || 'Addon').join(', ')}
                                      </p>
                                    )}
                                    {item.notes && (
                                      <p className="text-xs text-text/60 ml-6 italic">Note: {item.notes}</p>
                                    )}
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-semibold text-accent">₵{(item.unitPrice * item.quantity).toFixed(2)}</p>
                                    <p className="text-xs text-text/60">₵{item.unitPrice.toFixed(2)} each</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-text/60">No items in this order</p>
                          )}
                        </div>
                      </div>

                      {/* Order Notes */}
                      {order.notes && (
                        <div className="mt-3 p-3 bg-accent/10 rounded-lg border-l-4 border-accent">
                          <p className="text-xs font-bold text-accent mb-1">Special Note:</p>
                          <p className="text-sm text-text/80">{order.notes}</p>
                        </div>
                      )}

                      {/* Preparation Time */}
                      {order.readyAt && order.createdAt && (
                        <div className="mt-3 pt-3 border-t border-accent/20">
                          <p className="text-xs text-text/60">
                            <span className="font-medium">Preparation Time:</span>{' '}
                            {Math.round((new Date(order.readyAt) - new Date(order.createdAt)) / 1000 / 60)} minutes
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-accent/50 mx-auto mb-4" />
                <p className="text-text/60">No orders found for the selected period</p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

