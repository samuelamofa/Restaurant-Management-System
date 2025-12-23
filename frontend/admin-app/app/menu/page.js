'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, X, Image as ImageIcon, Upload, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

export default function MenuManagement() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    categoryId: '',
    basePrice: '',
    isAvailable: true,
  });
  const [imageError, setImageError] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);
  const { user, token } = useAuthStore();
  const router = useRouter();
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
      return;
    }
    
    // Verify user has ADMIN role
    if (user.role !== 'ADMIN') {
      toast.error('Access denied. Admin access required.');
      router.push('/login');
      return;
    }
    
    fetchData();
  }, [user, token]);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items'),
      ]);
      setCategories(categoriesRes.data.categories);
      setItems(itemsRes.data.items);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load menu data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.put(`/menu/items/${editingItem.id}`, formData);
        toast.success('Menu item updated');
      } else {
        await api.post('/menu/items', formData);
        toast.success('Menu item created');
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        categoryId: '',
        basePrice: '',
        isAvailable: true,
      });
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save menu item');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/upload/menu-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      if (!data.url) {
        throw new Error('No URL returned from server');
      }
      
      // Construct full URL for preview
      const API_BASE = API_URL.replace('/api', '');
      const fullImageUrl = `${API_BASE}${data.url}`;
      console.log('Full image URL:', fullImageUrl);
      console.log('API_URL:', API_URL);
      console.log('API_BASE:', API_BASE);
      
      setFormData({ ...formData, image: data.url });
      setImagePreview(fullImageUrl);
      setImageError(false);
      
      // Test if image is accessible
      const testImg = new Image();
      testImg.onload = () => {
        console.log('Image test load successful:', fullImageUrl);
        setImageError(false);
      };
      testImg.onerror = (e) => {
        console.error('Image test load failed:', fullImageUrl);
        console.error('Error details:', e);
        setImageError(true);
        toast.error('Image uploaded but preview failed. Check console for details.');
      };
      testImg.src = fullImageUrl;
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      setImageError(true);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (formData.image) {
      // Optionally delete the file from server
      const filename = formData.image.split('/').pop();
      if (filename && filename.startsWith('menu-')) {
        api.delete(`/upload/menu-image/${filename}`).catch(console.error);
      }
    }
    setFormData({ ...formData, image: '' });
    setImagePreview(null);
    setImageError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      image: item.image || '',
      categoryId: item.categoryId,
      basePrice: item.basePrice.toString(),
      isAvailable: item.isAvailable,
    });
    // Set preview with full URL if it's an uploaded image
    if (item.image) {
      const API_BASE = API_URL.replace('/api', '');
      setImagePreview(
        item.image.startsWith('/uploads/')
          ? `${API_BASE}${item.image}`
          : item.image
      );
    } else {
      setImagePreview(null);
    }
    setImageError(false);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await api.delete(`/menu/items/${id}`);
      toast.success('Menu item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/items/${item.id}`, {
        isAvailable: !item.isAvailable,
      });
      toast.success('Availability updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-accent">Menu Management</h1>
          <p className="text-text/60">Manage your restaurant menu items</p>
        </div>
        <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                name: '',
                description: '',
                image: '',
                categoryId: '',
                basePrice: '',
                isAvailable: true,
              });
              setImagePreview(null);
              setImageError(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.id} className="card">
              {/* Images are hidden in admin view - only shown in POS and Customer app */}
              <h3 className="text-xl font-bold mb-2 text-accent">{item.name}</h3>
              <p className="text-text/70 mb-2 line-clamp-2">{item.description}</p>
              <p className="text-lg font-bold text-accent mb-4">₵{item.basePrice.toFixed(2)}</p>
              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    item.isAvailable
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {item.isAvailable ? 'Available' : 'Out of Stock'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                  >
                    {item.isAvailable ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-secondary rounded hover:bg-accent/20 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-danger/20 text-danger rounded hover:bg-danger/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-accent">
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-secondary rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Menu Item Image
                  </label>
                  
                  {/* File Upload Input */}
                  <div className="mb-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex items-center justify-center gap-2 px-4 py-3 bg-secondary border border-accent/20 rounded-lg cursor-pointer hover:bg-accent/10 transition-colors ${
                        uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadingImage ? 'Uploading...' : 'Choose Image File'}</span>
                    </label>
                    <p className="text-xs text-text/60 mt-1">
                      Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                    </p>
                  </div>
                  
                  {/* Image Preview */}
                  {(imagePreview || formData.image) && (
                    <div className="mt-4">
                      <div className="relative w-full max-w-md mx-auto">
                        {(() => {
                          // Determine the image source URL
                          let imageSrc = null;
                          if (imagePreview) {
                            // Use preview if available (already has full URL)
                            imageSrc = imagePreview;
                          } else if (formData.image) {
                            // Construct full URL from formData
                            if (formData.image.startsWith('/uploads/')) {
                              const API_BASE = API_URL.replace('/api', '');
                              imageSrc = `${API_BASE}${formData.image}`;
                            } else if (formData.image.startsWith('http://') || formData.image.startsWith('https://')) {
                              imageSrc = formData.image;
                            } else {
                              imageSrc = formData.image;
                            }
                          }
                          
                          if (!imageSrc) return null;
                          
                          return (
                            <>
                              {!imageError ? (
                                <img
                                  src={imageSrc}
                                  alt="Preview"
                                  className="w-full h-48 object-cover rounded-lg border border-accent/20"
                                  onError={(e) => {
                                    console.error('Image preview error - URL:', e.target.src);
                                    console.error('Image element:', e.target);
                                    setImageError(true);
                                  }}
                                  onLoad={() => {
                                    console.log('Image loaded successfully:', imageSrc);
                                    setImageError(false);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-48 bg-secondary border border-accent/20 rounded-lg items-center justify-center flex-col gap-2 flex">
                                  <ImageIcon className="w-12 h-12 text-text/40" />
                                  <p className="text-sm text-text/60">Failed to load image</p>
                                  <p className="text-xs text-text/40 break-all px-2 text-center">{imageSrc}</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Try to reload the image
                                      setImageError(false);
                                      const img = new Image();
                                      img.onload = () => setImageError(false);
                                      img.onerror = () => setImageError(true);
                                      img.src = imageSrc;
                                    }}
                                    className="mt-2 px-3 py-1 text-xs bg-accent/20 hover:bg-accent/30 rounded transition-colors"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute top-2 right-2 p-2 bg-danger/80 hover:bg-danger rounded-lg transition-colors z-10"
                          title="Remove image"
                        >
                          <XCircle className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Base Price (₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-4 py-2 bg-secondary border border-accent/20 rounded-lg focus:outline-none focus:border-accent"
                    required
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isAvailable" className="text-sm">
                    Available
                  </label>
                </div>

                <div className="flex gap-4">
                  <button type="submit" className="flex-1 btn-primary">
                    {editingItem ? 'Update' : 'Create'}
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

