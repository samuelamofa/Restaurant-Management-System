'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Plus, User, Menu as MenuIcon, X, UtensilsCrossed, ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fetching, setFetching] = useState(false); // Prevent duplicate requests
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { addItem, items } = useCartStore();
  const { user, logout } = useAuthStore();
  const { settings } = useRestaurantSettings();

  useEffect(() => {
    // Only fetch once on mount
    if (categories.length === 0 && allItems.length === 0 && !fetching) {
      fetchCategories();
      fetchAllItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const fetchCategories = async () => {
    if (fetching) return; // Prevent duplicate requests
    
    try {
      setFetching(true);
      setError(null);
      const response = await api.get('/menu/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      
      // Check for specific error types
      let errorMessage = 'Failed to load menu';
      if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        // Wait before allowing retry
        setTimeout(() => setFetching(false), 5000);
      } else if (error.code === 'ECONNREFUSED' || 
          error.code === 'ERR_NETWORK' || 
          error.message?.includes('Network Error') ||
          error.code === 'ETIMEDOUT') {
        errorMessage = 'Backend server is not running. Please start it with: cd backend && npm run dev';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please check backend logs.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      if (error.response?.status !== 429) {
        toast.error(errorMessage);
      } else {
        toast.error('Too many requests. Please wait a moment...');
      }
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const fetchAllItems = async () => {
    if (fetching) return; // Prevent duplicate requests
    
    try {
      setFetching(true);
      const response = await api.get('/menu/items');
      setAllItems(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch all items:', error);
      // Don't show toast for this as categories error is more important
      // Just log it silently
      if (error.response?.status === 429) {
        // Wait before allowing retry
        setTimeout(() => setFetching(false), 5000);
      } else {
        setFetching(false);
      }
    }
  };

  const handleAddToCart = (item) => {
    if (!item.isAvailable) {
      toast.error('This item is currently out of stock');
      return;
    }

    const cartItem = {
      menuItemId: item.id,
      variantId: null,
      quantity: 1,
      unitPrice: item.basePrice,
      totalPrice: item.basePrice,
      addons: [],
      name: item.name,
    };

    addItem(cartItem);
    toast.success(`${item.name} added to cart`);
  };

  const getItemImage = (item) => {
    if (item.image) {
      // If image is a relative path (uploaded file), prepend backend URL
      if (item.image.startsWith('/uploads/')) {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${API_BASE}${item.image}`;
      }
      return item.image;
    }
    
    const category = item.category?.name?.toLowerCase() || 'food';
    const foodImages = {
      'starters': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&q=80',
      'mains': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80',
      'drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop&q=80',
      'desserts': 'https://images.unsplash.com/photo-1551024506-0bcced828b94?w=600&h=400&fit=crop&q=80',
    };
    
    return foodImages[category] || foodImages['mains'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
          <div className="text-accent text-xl">Loading menu...</div>
          <div className="text-text/60 text-sm mt-2">Connecting to server...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-accent/20">
          <div className="container mx-auto px-4 py-4">
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
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div className="card">
              <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UtensilsCrossed className="w-8 h-8 text-danger" />
              </div>
              <h2 className="text-2xl font-bold text-accent mb-4">Failed to Load Menu</h2>
              <p className="text-text/70 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    setFetching(false);
                    fetchCategories();
                    fetchAllItems();
                  }}
                  disabled={fetching}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetching ? 'Retrying...' : 'Retry'}
                </button>
                <Link href="/" className="btn-secondary">
                  Go to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Get items to display based on selected category
  let categoryFilteredItems = selectedCategory === 'all' 
    ? allItems 
    : selectedCategoryData?.items || [];
  
  // Filter items based on search query
  const displayItems = searchQuery.trim() === '' 
    ? categoryFilteredItems
    : categoryFilteredItems.filter(item => {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = item.name?.toLowerCase().includes(query);
        const descriptionMatch = item.description?.toLowerCase().includes(query);
        const categoryMatch = item.category?.name?.toLowerCase().includes(query);
        return nameMatch || descriptionMatch || categoryMatch;
      });

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
        </div>
      </header>

      {/* Page Header */}
      <div className="warm-gradient border-b border-accent/10 py-12">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-accent hover:text-accent-light transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-accent mb-2 px-4 sm:px-0">Our Complete Menu</h1>
          <p className="text-base sm:text-lg text-text/60 px-4 sm:px-0 mb-6">Explore our full selection of delicious dishes</p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto px-4 sm:px-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text/50" />
              <input
                type="text"
                placeholder="Search menu items by name, description, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-secondary/80 border border-accent/20 rounded-xl focus:outline-none focus:border-accent focus:bg-secondary text-text placeholder:text-text/50 transition-all text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-accent/20 rounded-lg transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5 text-text/70" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-sm text-text/60 mt-3 px-4 sm:px-0">
                Found {displayItems.length} {displayItems.length === 1 ? 'item' : 'items'} matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-8 sm:mb-12 px-4 sm:px-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              selectedCategory === 'all'
                ? 'bg-accent text-primary shadow-lg scale-105'
                : 'bg-secondary text-text hover:bg-accent/20 hover:scale-105 border border-accent/10'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 ${
                selectedCategory === category.id
                  ? 'bg-accent text-primary shadow-lg scale-105'
                  : 'bg-secondary text-text hover:bg-accent/20 hover:scale-105 border border-accent/10'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        {displayItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {displayItems.map((item) => (
              <div key={item.id} className="card group">
                <div className="relative overflow-hidden rounded-xl mb-4 food-overlay">
                  <img
                    src={getItemImage(item)}
                    alt={item.name}
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80`;
                    }}
                    loading="lazy"
                  />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <span className="bg-danger text-white px-4 py-2 rounded-lg font-semibold">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2 text-accent group-hover:text-accent-light transition-colors line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-text/70 mb-4 line-clamp-2 text-sm leading-relaxed">
                  {item.description}
                </p>

                {/* Variants */}
                {item.variants && item.variants.length > 0 && (
                  <div className="mb-4 p-3 bg-secondary/50 rounded-lg border border-accent/10">
                    <p className="text-xs text-text/60 mb-2 font-medium">Available Sizes:</p>
                    <div className="flex gap-2 flex-wrap">
                      {item.variants.map((variant) => (
                        <span
                          key={variant.id}
                          className="px-2 py-1 bg-accent/10 rounded text-xs text-accent border border-accent/20"
                        >
                          {variant.name}: ₵{variant.price.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-accent">
                    ₵{item.basePrice.toFixed(2)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.isAvailable
                        ? 'bg-success/20 text-success border border-success/30'
                        : 'bg-danger/20 text-danger border border-danger/30'
                    }`}
                  >
                    {item.isAvailable ? 'Available' : 'Out of Stock'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/menu/${item.id}`)}
                    className="flex-1 btn-secondary text-center text-sm py-2.5"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.isAvailable}
                    className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {displayItems.length === 0 && (
          <div className="text-center py-20">
            <UtensilsCrossed className="w-16 h-16 text-accent/30 mx-auto mb-4" />
            <div className="text-text/60 text-lg mb-2">
              {searchQuery.trim() !== '' 
                ? `No items found matching "${searchQuery}"`
                : selectedCategory === 'all' 
                  ? 'No items available' 
                  : 'No items available in this category'}
            </div>
            {searchQuery.trim() !== '' && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-accent hover:text-accent-light transition-colors text-sm font-medium mt-2"
              >
                Clear search
              </button>
            )}
            {searchQuery.trim() === '' && (
              <div className="text-text/40 text-sm">Please check back later</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
