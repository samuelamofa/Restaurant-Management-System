'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        password: formData.password,
      });

      if (response.data.user.role !== 'ADMIN') {
        toast.error('Access denied. Admin access required.');
        return;
      }

      setAuth(response.data.user, response.data.token);
      toast.success('Login successful');
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error types
      if (!error.response) {
        // Network error - backend not running
        if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
          toast.error('Cannot connect to backend server. Please ensure the backend is running on port 5000. Start it with: cd backend && npm run dev');
        } else {
          toast.error('Network error: ' + (error.message || 'Unable to connect to server'));
        }
      } else if (error.response.status === 404) {
        toast.error('API endpoint not found. The backend route /api/auth/login does not exist.');
      } else if (error.response.status === 400) {
        const errorMsg = error.response.data?.error || error.response.data?.errors?.[0]?.msg || 'Invalid credentials or validation error';
        toast.error(errorMsg);
      } else if (error.response.status === 401) {
        const errorMsg = error.response.data?.error || 'Invalid email/phone or password';
        if (errorMsg.includes('User not found') || errorMsg.includes('database is seeded')) {
          toast.error('No users found. Please seed the database: cd backend && npm run seed', { duration: 6000 });
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error(error.response?.data?.error || error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center text-accent">Admin Login</h1>
        <p className="text-center text-text/60 mb-8">De Fusion Flame Kitchen</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone (Alternative)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent text-lg"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

