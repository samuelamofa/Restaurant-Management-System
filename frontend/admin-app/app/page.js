'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, DollarSign, ShoppingBag, Users, TrendingUp, Calendar, Filter } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when fetching
  const [mounted, setMounted] = useState(false);
  const [dateFilter, setDateFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { user, token } = useAuthStore();

  // Track client-side mounting to avoid SSR mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (dateFilter === 'today') {
        // Backend will default to today, but we can also explicitly set it
        params.append('period', 'today');
      } else if (dateFilter === 'all') {
        params.append('period', 'all');
      } else if (dateFilter === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      
      const response = await api.get(`/admin/dashboard?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      if (error.response?.status !== 401) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [dateFilter, startDate, endDate, token]);

  // Fetch data when authenticated (auth check handled by AuthGuard in layout)
  useEffect(() => {
    if (!mounted || !user || !token) {
      return;
    }
    
    fetchDashboardData();
  }, [mounted, user, token, fetchDashboardData]);

  // Show loading state during SSR or initial mount
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Show loading state only during initial fetch, but allow rendering if stats exist
  const paymentColors = ['#C59D5F', '#2ECC71', '#E74C3C', '#3498DB'];
  
  // Render dashboard even if stats is null (will show zeros)
  // Only show loading spinner if actively loading AND no stats yet
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-accent">Dashboard Overview</h1>
            <p className="text-text/60">Welcome back! Here's what's happening at your restaurant.</p>
          </div>
          
          {/* Date Filter */}
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 glass rounded-lg p-2">
              <Filter className="w-5 h-5 text-accent" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  const newFilter = e.target.value;
                  setDateFilter(newFilter);
                  if (newFilter !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="bg-secondary border border-accent/20 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
              >
                <option value="today">Today</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 glass rounded-lg p-2">
                <Calendar className="w-5 h-5 text-accent" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-secondary border border-accent/20 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
                />
                <span className="text-text/60">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="bg-secondary border border-accent/20 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-accent">₵{(stats?.stats?.totalSales ?? 0).toFixed(2)}</p>
              <p className="text-xs text-success mt-2">+12.5% from last month</p>
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
              <p className="text-xs text-text/60 mt-2">
                {dateFilter === 'today' ? "Today's orders" : dateFilter === 'all' ? 'All time orders' : 'Filtered orders'}
              </p>
            </div>
            <div className="p-4 bg-blue-500/20 rounded-xl">
              <ShoppingBag className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Completed</p>
              <p className="text-3xl font-bold text-accent">{stats?.stats?.completedOrders || 0}</p>
              <p className="text-xs text-success mt-2">Successfully delivered</p>
            </div>
            <div className="p-4 bg-success/20 rounded-xl">
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text/60 text-sm mb-1">Avg Order Value</p>
              <p className="text-3xl font-bold text-accent">₵{((stats?.stats?.averageOrderValue) ?? 0).toFixed(2)}</p>
              <p className="text-xs text-text/60 mt-2">Per order average</p>
            </div>
            <div className="p-4 bg-purple-500/20 rounded-xl">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment Method Breakdown */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent">Payment Methods</h2>
          </div>
            {stats?.paymentBreakdown && stats.paymentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.paymentBreakdown}
                    dataKey="_sum.amount"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {stats.paymentBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={paymentColors[index % paymentColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text/60 text-center py-12">No payment data available</p>
            )}
          </div>

        {/* Orders by Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-accent">Orders by Status</h2>
          </div>
            {stats?.ordersByStatus && stats.ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#C59D5F" opacity={0.2} />
                  <XAxis dataKey="status" stroke="#C59D5F" />
                  <YAxis stroke="#C59D5F" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #C59D5F',
                      color: '#F5F5F5',
                    }}
                  />
                  <Bar dataKey="_count.id" fill="#C59D5F" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text/60 text-center py-12">No order data available</p>
            )}
          </div>
        </div>

      {/* Best Selling Items */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-accent">Best Selling Items</h2>
        </div>
          {stats?.bestSellingItems && stats.bestSellingItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-accent/20">
                    <th className="text-left py-3 px-4">Item</th>
                    <th className="text-right py-3 px-4">Quantity Sold</th>
                    <th className="text-right py-3 px-4">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bestSellingItems.map((item, index) => (
                    <tr key={index} className="border-b border-accent/10">
                      <td className="py-3 px-4">{item.menuItem?.name || 'Unknown'}</td>
                      <td className="text-right py-3 px-4">{item._sum.quantity || 0}</td>
                      <td className="text-right py-3 px-4">{item._count.id || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text/60 text-center py-12">No sales data available</p>
          )}
      </div>
    </div>
  );
}

