'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat } from 'lucide-react';
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

      // Check if user has kitchen access
      const userRole = response.data.user.role;
      if (!['KITCHEN_STAFF', 'ADMIN'].includes(userRole)) {
        toast.error('Access denied. Kitchen staff access required.');
        return;
      }

      setAuth(response.data.user, response.data.token);
      toast.success('Login successful');
      router.push('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ChefHat className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-accent">Kitchen Display System</h1>
          </div>
          <p className="text-sm text-text/60 mt-1">De Fusion Flame Kitchen</p>
        </div>

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

