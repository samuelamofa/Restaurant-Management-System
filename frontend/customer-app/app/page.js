'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, User, Menu as MenuIcon, X, Plus, UtensilsCrossed, Star, Clock, MapPin, Phone } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import toast from 'react-hot-toast';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items } = useCartStore();
  const { user, logout } = useAuthStore();
  const { settings } = useRestaurantSettings();

  useEffect(() => {
    fetchCategories();
    fetchAllItems();
  }, []);

  const fetchCategories = async () => {
    try {
      setError(null);
      const response = await api.get('/menu/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      
      if (error.code === 'ECONNREFUSED' || 
          error.code === 'ERR_NETWORK' || 
          error.message?.includes('Network Error') ||
          error.code === 'ETIMEDOUT') {
        setError('Backend server is not running. Please start it with: cd backend && npm run dev');
      } else {
        setError('Failed to load menu. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllItems = async () => {
    try {
      const response = await api.get('/menu/items');
      setAllItems(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch all items:', error);
    }
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCategoryData = categories.find((c) => c.id === selectedCategory);
  const { addItem } = useCartStore();
  
  const displayItems = selectedCategory === 'all' 
    ? allItems 
    : selectedCategoryData?.items || [];

  const handleAddToCart = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    
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

  return (
    <div className="min-h-screen bg-primary">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 glass border-b border-accent/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div>
                <div className="text-base sm:text-lg md:text-xl font-bold text-accent group-hover:text-accent-light transition-colors">
                  {settings.restaurantName || 'De Fusion Flame'}
                </div>
                <div className="text-[10px] sm:text-xs text-text/60 hidden sm:block">Kitchen & Restaurant</div>
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

      {/* Hero Section with Restaurant Theme */}
      <section className="relative overflow-hidden">
        {/* Restaurant Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&h=1080&fit=crop&q=80)',
          }}
        >
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/90 to-primary/95"></div>
          {/* Additional warm overlay for restaurant ambiance */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-accent-dark/20"></div>
        </div>
        
        {/* Decorative blur effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-dark rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-24 lg:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-accent/20 rounded-full border border-accent/30 mb-4 sm:mb-6">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-accent fill-accent" />
              <span className="text-xs sm:text-sm text-accent font-medium">Authentic Flavors Since 2024</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 text-accent text-glow px-2">
              Welcome to {settings.restaurantName || 'De Fusion Flame'}
            </h1>
            <p className="text-base sm:text-lg text-text/60 mb-6 md:mb-10 max-w-2xl mx-auto px-4">
              Experience the finest fusion of authentic flavors, crafted with passion and served with excellence
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Link href="/menu" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center justify-center gap-2 group w-full sm:w-auto">
                <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
                Explore Our Menu
              </Link>
              <Link href="/orders" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                Track Orders
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Section */}
      <section className="py-12 border-y border-accent/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto px-4 sm:px-0">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="font-semibold text-accent mb-1">Fast Service</div>
                <div className="text-sm text-text/60">Quick & Fresh</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Star className="w-6 h-6 text-accent fill-accent" />
              </div>
              <div>
                <div className="font-semibold text-accent mb-1">Premium Quality</div>
                <div className="text-sm text-text/60">Finest Ingredients</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="font-semibold text-accent mb-1">Easy Ordering</div>
                <div className="text-sm text-text/60">Order Anytime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="inline-block w-16 h-16 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4"></div>
          <div className="text-accent text-xl">Loading our delicious menu...</div>
        </section>
      )}

      {/* Error State */}
      {!loading && error && (
        <section className="container mx-auto px-4 py-20">
          <div className="bg-danger/20 border border-danger/50 rounded-2xl p-8 text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-danger">Unable to Load Menu</h2>
            <p className="text-text/80 mb-6">{error}</p>
            <button
              onClick={fetchCategories}
              className="btn-primary"
            >
              Retry
            </button>
          </div>
        </section>
      )}

      {/* Categories & Menu */}
      {!loading && !error && (categories.length > 0 || allItems.length > 0) && (
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-accent px-4 sm:px-0">Our Menu</h2>
            <p className="text-lg text-text/60 max-w-2xl mx-auto">
              Discover our carefully crafted selection of authentic dishes, each prepared with the finest ingredients
            </p>
          </div>
          
          <div className="mb-10">
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  selectedCategory === 'all'
                    ? 'bg-accent text-primary shadow-lg scale-105'
                    : 'bg-secondary text-text hover:bg-accent/20 hover:scale-105 border border-accent/10'
                }`}
              >
                All Items
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                    selectedCategory === category.id
                      ? 'bg-accent text-primary shadow-lg scale-105'
                      : 'bg-secondary text-text hover:bg-accent/20 hover:scale-105 border border-accent/10'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {displayItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {displayItems.map((item) => (
                <div
                  key={item.id}
                  className="card group cursor-pointer"
                >
                  <Link href={`/menu/${item.id}`} className="block">
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
                  </Link>
                  <div>
                    <Link href={`/menu/${item.id}`}>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-accent group-hover:text-accent-light transition-colors line-clamp-1">
                  {item.name}
                </h3>
                <p className="text-text/70 mb-4 line-clamp-2 text-xs sm:text-sm leading-relaxed">
                  {item.description}
                </p>
                    </Link>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xl sm:text-2xl font-bold text-accent">
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
                      <Link
                        href={`/menu/${item.id}`}
                        className="flex-1 btn-secondary text-center text-sm py-2.5"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={(e) => handleAddToCart(e, item)}
                        disabled={!item.isAvailable}
                        className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* No Items Message */}
      {!loading && !error && displayItems.length === 0 && (
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-md mx-auto">
            <UtensilsCrossed className="w-16 h-16 text-accent/30 mx-auto mb-4" />
            <div className="text-text/60 text-lg mb-2">No menu items available</div>
            <div className="text-text/40 text-sm">Please check back later</div>
          </div>
        </section>
      )}

      {/* Modern Footer */}
      <footer className="warm-gradient border-t border-accent/10 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-accent">{settings.restaurantName || 'De Fusion Flame'}</div>
                  <div className="text-xs text-text/60">Kitchen & Restaurant</div>
                </div>
              </div>
              <p className="text-text/60 text-sm leading-relaxed">
                Experience authentic flavors and exceptional dining. We bring you the finest fusion cuisine crafted with passion.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-accent mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-text/60 hover:text-accent transition-colors text-sm">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/menu" className="text-text/60 hover:text-accent transition-colors text-sm">
                    Menu
                  </Link>
                </li>
                <li>
                  <Link href="/orders" className="text-text/60 hover:text-accent transition-colors text-sm">
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="text-text/60 hover:text-accent transition-colors text-sm">
                    Cart
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-accent mb-4">Contact Us</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-text/60 text-sm">
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>Kasoa New Market Road, Opposite Saviour Diagnostic Clinic</span>
                </li>
                <li className="flex items-center gap-3 text-text/60 text-sm">
                  <Phone className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>0551796725, 0545010103</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-accent/10 pt-8 text-center">
            <p className="text-text/60 text-sm">
              © {new Date().getFullYear()} {settings.restaurantName || 'De Fusion Flame Kitchen'}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
