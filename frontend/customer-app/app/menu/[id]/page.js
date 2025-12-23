'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Minus, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { useAuthStore } from '@/lib/store';
import { useRestaurantSettings } from '@/lib/useRestaurantSettings';
import toast from 'react-hot-toast';

export default function MenuItemDetail() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherItems, setOtherItems] = useState([]);
  const [loadingOtherItems, setLoadingOtherItems] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();
  const { items } = useCartStore();
  const { user } = useAuthStore();
  const { settings } = useRestaurantSettings();

  useEffect(() => {
    if (params.id) {
      fetchItem();
      fetchOtherItems();
    }
  }, [params.id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/menu/items/${params.id}`);
      setItem(response.data.item);
      
      // Set default variant if available
      if (response.data.item.variants && response.data.item.variants.length > 0) {
        setSelectedVariant(response.data.item.variants[0]);
      }
    } catch (error) {
      console.error('Failed to fetch item:', error);
      toast.error('Failed to load menu item');
      router.push('/menu');
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherItems = async () => {
    try {
      setLoadingOtherItems(true);
      const response = await api.get('/menu/items');
      // Filter out the current item and only show available items
      const filtered = (response.data.items || [])
        .filter(i => i.id !== params.id && i.isAvailable)
        .slice(0, 8); // Show up to 8 other items
      setOtherItems(filtered);
    } catch (error) {
      console.error('Failed to fetch other items:', error);
      // Don't show error toast for this, it's optional
    } finally {
      setLoadingOtherItems(false);
    }
  };

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error('This item is currently out of stock');
      return;
    }

    const unitPrice = selectedVariant ? selectedVariant.price : item.basePrice;
    const totalPrice = unitPrice * quantity + selectedAddons.reduce((sum, addon) => sum + addon.price, 0) * quantity;

    const cartItem = {
      menuItemId: item.id,
      variantId: selectedVariant?.id || null,
      quantity,
      unitPrice,
      totalPrice,
      addons: selectedAddons.map(a => a.id),
      name: item.name,
      variantName: selectedVariant?.name,
    };

    addItem(cartItem);
    toast.success(`${item.name} added to cart`);
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      } else {
        return [...prev, addon];
      }
    });
  };

  const getItemImage = (item) => {
    if (item?.image) {
      // If image is a relative path (uploaded file), prepend backend URL
      if (item.image.startsWith('/uploads/')) {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${API_BASE}${item.image}`;
      }
      return item.image;
    }
    
    const category = item?.category?.name?.toLowerCase() || 'food';
    const foodImages = {
      'starters': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&q=80',
      'mains': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80',
      'drinks': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop&q=80',
      'desserts': 'https://images.unsplash.com/photo-1551024506-0bcced828b94?w=600&h=400&fit=crop&q=80',
    };
    
    return foodImages[category] || foodImages['mains'];
  };

  const cartItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-accent text-xl">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-accent">Item not found</h2>
          <Link href="/menu" className="btn-primary">
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const currentPrice = selectedVariant ? selectedVariant.price : item.basePrice;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const totalPrice = (currentPrice + addonsTotal) * quantity;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-accent/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-xl font-bold text-accent group-hover:text-accent-light transition-colors">
                  {settings.restaurantName}
                </div>
                <div className="text-xs text-text/60">Kitchen & Restaurant</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/" className="hover:text-accent transition-colors">
                Home
              </Link>
              <Link href="/menu" className="hover:text-accent transition-colors">
                Menu
              </Link>
              <Link href="/orders" className="hover:text-accent transition-colors">
                My Orders
              </Link>
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-sm">{user.firstName || user.email}</span>
                </div>
              ) : (
                <Link href="/login" className="hover:text-accent transition-colors">
                  Login
                </Link>
              )}
              <Link href="/cart" className="relative">
                <ShoppingCart className="w-6 h-6" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text/70 hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Image */}
          <div>
              <img
                src={getItemImage(item)}
                alt={item.name}
                className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80`;
              }}
            />
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-accent">{item.name}</h1>
            
            {item.description && (
              <p className="text-text/70 mb-6 text-lg">{item.description}</p>
            )}

            <div className="mb-6">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                item.isAvailable
                  ? 'bg-success/20 text-success'
                  : 'bg-danger/20 text-danger'
              }`}>
                {item.isAvailable ? 'Available' : 'Out of Stock'}
              </span>
            </div>

            {/* Variants */}
            {item.variants && item.variants.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-accent">Size</h3>
                <div className="flex gap-2 sm:gap-3 flex-wrap">
                  {item.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all ${
                        selectedVariant?.id === variant.id
                          ? 'bg-accent text-primary'
                          : 'bg-secondary text-text hover:bg-accent/20'
                      }`}
                    >
                      {variant.name} - ₵{variant.price.toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {item.addons && item.addons.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-accent">Add-ons</h3>
                <div className="space-y-2">
                  {item.addons.map((addon) => {
                    const isSelected = selectedAddons.find(a => a.id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => toggleAddon(addon)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-2 border-accent'
                            : 'bg-secondary hover:bg-accent/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{addon.name}</span>
                          <span className="text-accent font-semibold">
                            +₵{addon.price.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 text-accent">Quantity</h3>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Price and Add to Cart */}
            <div className="border-t border-accent/20 pt-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg sm:text-xl md:text-2xl font-semibold text-text/70">Total:</span>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent">₵{totalPrice.toFixed(2)}</span>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={!item.isAvailable}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>

        {/* Other Menu Items */}
        {otherItems.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-accent">Other Menu Items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {otherItems.map((otherItem) => (
                <Link
                  key={otherItem.id}
                  href={`/menu/${otherItem.id}`}
                  className="card group hover:scale-105 transition-transform duration-300"
                >
                  <div className="relative overflow-hidden rounded-lg mb-3">
                    <img
                      src={getItemImage(otherItem)}
                      alt={otherItem.name}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.src = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&q=80`;
                      }}
                    />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-accent group-hover:text-accent-light transition-colors line-clamp-1">
                    {otherItem.name}
                  </h3>
                  {otherItem.description && (
                    <p className="text-sm text-text/60 mb-3 line-clamp-2">
                      {otherItem.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-accent">
                      ₵{otherItem.basePrice.toFixed(2)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const cartItem = {
                          menuItemId: otherItem.id,
                          variantId: null,
                          quantity: 1,
                          unitPrice: otherItem.basePrice,
                          totalPrice: otherItem.basePrice,
                          addons: [],
                          name: otherItem.name,
                        };
                        addItem(cartItem);
                        toast.success(`${otherItem.name} added to cart`);
                      }}
                      className="p-2 bg-accent/10 hover:bg-accent rounded-lg transition-colors"
                    >
                      <Plus className="w-5 h-5 text-accent" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {loadingOtherItems && (
          <div className="mt-12 text-center">
            <div className="text-text/60">Loading other items...</div>
          </div>
        )}
      </div>
    </div>
  );
}

