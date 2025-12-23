'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, UserPlus, Shield, ChefHat, ShoppingBag } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'RECEPTIONIST',
  });
  const { user, token } = useAuthStore();
  const router = useRouter();

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
    
    fetchUsers();
  }, [user, token, filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = filterRole ? `?role=${filterRole}` : '';
      const response = await api.get(`/admin/users${params}`);
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user (don't send password if empty)
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.put(`/admin/users/${editingUser.id}`, updateData);
        toast.success('User updated successfully');
      } else {
        // Create new user
        if (!formData.password) {
          toast.error('Password is required for new users');
          return;
        }
        await api.post('/admin/users', formData);
        toast.success('User created successfully');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({
        email: '',
        phone: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'RECEPTIONIST',
      });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      role: user.role,
    });
    setShowModal(true);
  };

  const toggleUserStatus = async (user) => {
    try {
      await api.put(`/admin/users/${user.id}`, {
        isActive: !user.isActive,
      });
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      'ADMIN': Shield,
      'RECEPTIONIST': UserPlus,
      'CASHIER': ShoppingBag,
      'KITCHEN_STAFF': ChefHat,
      'CUSTOMER': UserPlus,
    };
    const Icon = icons[role] || UserPlus;
    return <Icon className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading users...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-accent">Users & Staff Management</h1>
          <p className="text-text/60">Manage staff members and user accounts</p>
        </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                email: '',
                phone: '',
                password: '',
                firstName: '',
                lastName: '',
                role: 'RECEPTIONIST',
              });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Staff
          </button>
        </div>

        {/* Filter */}
        <div className="card mb-6">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="CASHIER">Cashier</option>
            <option value="KITCHEN_STAFF">Kitchen Staff</option>
            <option value="CUSTOMER">Customers</option>
          </select>
        </div>

        {/* Users List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => (
            <div key={u.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-accent/20 rounded-lg">
                    {getRoleIcon(u.role)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-accent">
                      {u.firstName || u.lastName 
                        ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                        : 'No Name'}
                    </h3>
                    <p className="text-sm text-text/60">{u.role}</p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    u.isActive
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {u.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {u.email && <p className="text-text/70">📧 {u.email}</p>}
                {u.phone && <p className="text-text/70">📱 {u.phone}</p>}
                <p className="text-text/60">
                  Joined: {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleUserStatus(u)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    u.isActive
                      ? 'bg-danger/20 text-danger hover:bg-danger/30'
                      : 'bg-success/20 text-success hover:bg-success/30'
                  }`}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleEdit(u)}
                  className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-text/60 text-lg">No users found</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent">
                  {editingUser ? 'Edit User' : 'Add New Staff Member'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-secondary rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    required
                  >
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="KITCHEN_STAFF">Kitchen Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary">
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}

