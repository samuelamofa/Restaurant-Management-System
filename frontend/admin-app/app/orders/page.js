'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    orderType: '',
    search: '',
  });
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { user, token } = useAuthStore();
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.orderType) params.append('orderType', filters.orderType);
      
      // Add date filter parameters
      if (dateFilter === 'today') {
        params.append('period', 'today');
      } else if (dateFilter === 'all') {
        params.append('period', 'all');
      } else if (dateFilter === 'custom') {
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
      }
      
      const response = await api.get(`/orders?${params.toString()}`);
      let filteredOrders = response.data.orders;
      
      if (filters.search) {
        filteredOrders = filteredOrders.filter(order => 
          order.orderNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
          order.customer?.firstName?.toLowerCase().includes(filters.search.toLowerCase()) ||
          order.customer?.lastName?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      setOrders(filteredOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters, dateFilter, startDate, endDate]);

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'ADMIN') {
      toast.error('Access denied. Admin access required.');
      router.push('/login');
      return;
    }
    
    fetchOrders();
  }, [user, token, fetchOrders]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('Order status updated');
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-yellow-500/20 text-yellow-500',
      'CONFIRMED': 'bg-blue-500/20 text-blue-500',
      'PREPARING': 'bg-orange-500/20 text-orange-500',
      'READY': 'bg-purple-500/20 text-purple-500',
      'COMPLETED': 'bg-success/20 text-success',
      'CANCELLED': 'bg-danger/20 text-danger',
    };
    return colors[status] || 'bg-secondary text-text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-accent">Orders Management</h1>
        <p className="text-text/60">View and manage all restaurant orders</p>
      </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="space-y-4">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
                <input
                  type="text"
                  placeholder="Search by order number or customer..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={filters.orderType}
                onChange={(e) => setFilters({ ...filters, orderType: e.target.value })}
                className="px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">All Types</option>
                <option value="DINE_IN">Dine In</option>
                <option value="TAKEAWAY">Takeaway</option>
                <option value="ONLINE">Online</option>
              </select>
              <button
                onClick={() => {
                  setFilters({ status: '', orderType: '', search: '' });
                  setDateFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
            
            {/* Date Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-accent/20">
              <div className="flex items-center gap-2 glass rounded-lg p-2">
                <Calendar className="w-5 h-5 text-accent" />
                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                  className="bg-secondary border border-accent/20 rounded-lg px-3 py-2 text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              
              {dateFilter === 'custom' && (
                <div className="flex items-center gap-2 glass rounded-lg p-2">
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

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-text/60 text-lg">No orders found</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-accent mb-2">
                      Order #{order.orderNumber}
                    </h3>
                    <div className="space-y-1 text-sm text-text/70">
                      <p>
                        Customer: {order.customer 
                          ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.phone || 'Guest'
                          : 'Guest'}
                      </p>
                      <p>Type: {order.orderType}</p>
                      {order.tableNumber && <p>Table: {order.tableNumber}</p>}
                      <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent mb-2">
                      ₵{order.total.toFixed(2)}
                    </p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <p className="text-sm text-text/60 mt-2">
                      Payment: {order.paymentStatus || 'PENDING'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-accent/20 pt-4 mb-4">
                  <h4 className="font-semibold mb-2">Items:</h4>
                  <ul className="space-y-1">
                    {order.items.map((item, index) => (
                      <li key={index} className="text-sm">
                        {item.quantity}x {item.menuItem.name}
                        {item.variant && ` (${item.variant.name})`}
                        {item.addons.length > 0 && 
                          ` + ${item.addons.map(a => a.addon.name).join(', ')}`}
                        - ₵{item.totalPrice.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                  {order.notes && (
                    <p className="mt-2 text-sm text-text/60 italic">Note: {order.notes}</p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {order.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Confirm
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'CANCELLED')}
                        className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {order.status === 'CONFIRMED' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="btn-primary"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="btn-primary"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="btn-primary flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete Order
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {selectedOrder?.id === order.id ? 'Hide' : 'View'} Details
                  </button>
                </div>

                {selectedOrder?.id === order.id && (
                  <div className="mt-4 pt-4 border-t border-accent/20">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-text/60">Subtotal:</p>
                        <p className="font-semibold">₵{order.subtotal.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text/60">Discount:</p>
                        <p className="font-semibold">₵{order.discount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text/60">Tax:</p>
                        <p className="font-semibold">₵{order.tax.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text/60">Total:</p>
                        <p className="font-semibold text-accent">₵{order.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
    </div>
  );
}

