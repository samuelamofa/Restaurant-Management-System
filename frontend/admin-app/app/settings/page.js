'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, Building2, Phone, Mail, MapPin, Percent, DollarSign, Hash, CheckCircle, CreditCard, Key, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPaystackKeys, setShowPaystackKeys] = useState({
    secretKey: false,
    publicKey: false,
    webhookSecret: false,
  });
  const [formData, setFormData] = useState({
    restaurantName: '',
    restaurantAddress: '',
    restaurantPhone: '',
    restaurantEmail: '',
    taxRate: 0.05,
    currency: 'GHS',
    currencySymbol: '₵',
    orderPrefix: 'ORD',
    autoConfirmOrders: false,
    requirePaymentBeforePrep: false,
    paystackSecretKey: '',
    paystackPublicKey: '',
    paystackWebhookSecret: '',
  });
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    if (!user || !token) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      toast.error('Access denied. Admin access required.');
      router.push('/login');
      return;
    }

    fetchSettings();
  }, [user, token, _hasHydrated, router]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      const fetchedSettings = response.data.settings;
      setSettings(fetchedSettings);
      setFormData({
        restaurantName: fetchedSettings.restaurantName || '',
        restaurantAddress: fetchedSettings.restaurantAddress || '',
        restaurantPhone: fetchedSettings.restaurantPhone || '',
        restaurantEmail: fetchedSettings.restaurantEmail || '',
        taxRate: fetchedSettings.taxRate || 0.05,
        currency: fetchedSettings.currency || 'GHS',
        currencySymbol: fetchedSettings.currencySymbol || '₵',
        orderPrefix: fetchedSettings.orderPrefix || 'ORD',
        autoConfirmOrders: fetchedSettings.autoConfirmOrders || false,
        requirePaymentBeforePrep: fetchedSettings.requirePaymentBeforePrep || false,
        paystackSecretKey: fetchedSettings.paystackSecretKey || '',
        paystackPublicKey: fetchedSettings.paystackPublicKey || '',
        paystackWebhookSecret: fetchedSettings.paystackWebhookSecret || '',
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to load settings';
      toast.error(errorMessage);
      
      // If it's a database migration error, show more details
      if (error.response?.data?.details) {
        console.error('Database migration required:', error.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await api.put('/settings', formData);
      setSettings(response.data.settings);
      
      // Update formData with the saved settings to ensure consistency
      if (response.data.settings) {
        setFormData({
          restaurantName: response.data.settings.restaurantName || '',
          restaurantAddress: response.data.settings.restaurantAddress || '',
          restaurantPhone: response.data.settings.restaurantPhone || '',
          restaurantEmail: response.data.settings.restaurantEmail || '',
          taxRate: response.data.settings.taxRate || 0.05,
          currency: response.data.settings.currency || 'GHS',
          currencySymbol: response.data.settings.currencySymbol || '₵',
          orderPrefix: response.data.settings.orderPrefix || 'ORD',
          autoConfirmOrders: response.data.settings.autoConfirmOrders || false,
          requirePaymentBeforePrep: response.data.settings.requirePaymentBeforePrep || false,
          paystackSecretKey: response.data.settings.paystackSecretKey || '',
          paystackPublicKey: response.data.settings.paystackPublicKey || '',
          paystackWebhookSecret: response.data.settings.paystackWebhookSecret || '',
        });
      }
      
      // Dispatch custom event to notify all apps of the update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settingsUpdated', {
          detail: { settings: response.data.settings }
        }));
        // Also dispatch to localStorage for cross-tab communication
        try {
          localStorage.setItem('restaurantSettings', JSON.stringify(response.data.settings));
          localStorage.setItem('restaurantSettingsUpdated', Date.now().toString());
        } catch (e) {
          console.error('Failed to save settings to localStorage:', e);
        }
      }
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      console.error('Error response:', error.response?.data);
      
      // Get detailed error message
      let errorMessage = 'Failed to save settings';
      if (error.response?.data?.details) {
        errorMessage = error.response.data.details;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Validation errors
        const validationErrors = error.response.data.errors.map(e => e.msg || e.message).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (!_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-accent text-xl">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-bold text-accent">System Settings</h1>
        </div>
        <p className="text-text/60">Configure your restaurant system settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Restaurant Information */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold text-accent">Restaurant Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Restaurant Name</label>
              <input
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </label>
              <textarea
                name="restaurantAddress"
                value={formData.restaurantAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  name="restaurantPhone"
                  value={formData.restaurantPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </label>
                <input
                  type="email"
                  name="restaurantEmail"
                  value={formData.restaurantEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold text-accent">Financial Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Tax Rate (as decimal, e.g., 0.05 for 5%)
              </label>
              <input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.01"
                required
                className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-xs text-text/60 mt-1">
                Current tax rate: {(formData.taxRate * 100).toFixed(2)}%
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Currency Code</label>
                <input
                  type="text"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                  placeholder="GHS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Currency Symbol</label>
                <input
                  type="text"
                  name="currencySymbol"
                  value={formData.currencySymbol}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                  placeholder="₵"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Gateway Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold text-accent">Payment Gateway (Paystack)</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-text/60 mb-4">
              Configure your Paystack API keys to enable online payments. Get your keys from{' '}
              <a 
                href="https://dashboard.paystack.com/#/settings/developer" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Paystack Dashboard
              </a>
            </p>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Paystack Secret Key
              </label>
              <div className="relative">
                <input
                  type={showPaystackKeys.secretKey ? "text" : "password"}
                  name="paystackSecretKey"
                  value={formData.paystackSecretKey}
                  onChange={handleChange}
                  placeholder="sk_live_... or sk_test_..."
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPaystackKeys(prev => ({ ...prev, secretKey: !prev.secretKey }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/60 hover:text-text transition-colors"
                >
                  {showPaystackKeys.secretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text/60 mt-1">
                Your Paystack secret key (starts with sk_live_ or sk_test_)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Paystack Public Key
              </label>
              <div className="relative">
                <input
                  type={showPaystackKeys.publicKey ? "text" : "password"}
                  name="paystackPublicKey"
                  value={formData.paystackPublicKey}
                  onChange={handleChange}
                  placeholder="pk_live_... or pk_test_..."
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPaystackKeys(prev => ({ ...prev, publicKey: !prev.publicKey }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/60 hover:text-text transition-colors"
                >
                  {showPaystackKeys.publicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text/60 mt-1">
                Your Paystack public key (starts with pk_live_ or pk_test_)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Paystack Webhook Secret
              </label>
              <div className="relative">
                <input
                  type={showPaystackKeys.webhookSecret ? "text" : "password"}
                  name="paystackWebhookSecret"
                  value={formData.paystackWebhookSecret}
                  onChange={handleChange}
                  placeholder="Your webhook secret"
                  className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPaystackKeys(prev => ({ ...prev, webhookSecret: !prev.webhookSecret }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text/60 hover:text-text transition-colors"
                >
                  {showPaystackKeys.webhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-text/60 mt-1">
                Webhook secret for verifying Paystack webhook requests (optional but recommended)
              </p>
            </div>
          </div>
        </div>

        {/* Order Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Hash className="w-5 h-5 text-accent" />
            <h2 className="text-2xl font-bold text-accent">Order Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Order Number Prefix</label>
              <input
                type="text"
                name="orderPrefix"
                value={formData.orderPrefix}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent transition-colors"
                placeholder="ORD"
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="autoConfirmOrders"
                  checked={formData.autoConfirmOrders}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-accent/20 bg-secondary text-accent focus:ring-accent"
                />
                <div>
                  <span className="font-medium">Auto-confirm Orders</span>
                  <p className="text-sm text-text/60">
                    Automatically confirm orders when they are created
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="requirePaymentBeforePrep"
                  checked={formData.requirePaymentBeforePrep}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-accent/20 bg-secondary text-accent focus:ring-accent"
                />
                <div>
                  <span className="font-medium">Require Payment Before Preparation</span>
                  <p className="text-sm text-text/60">
                    Kitchen staff can only start preparing orders that are paid
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => fetchSettings()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

