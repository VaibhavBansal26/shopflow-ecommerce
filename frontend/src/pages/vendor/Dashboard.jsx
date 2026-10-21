import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Package, ShoppingBag, DollarSign, Plus, Edit2, Trash2, X, AlertCircle, ImageOff, FolderPlus
} from 'lucide-react';
import api from '../../services/api';

const EMPTY_PRODUCT = {
  name: '', description: '', price: '', compare_at_price: '', quantity: '',
  sku: '', category_id: '', default_image_url: '', is_active: true,
};

const DEFAULT_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><rect width="36" height="36" rx="8" fill="%23f3f4f6"/><path d="M10 26l6-8 4 5 3-3 5 6H10z" fill="%23d1d5db"/><circle cx="24" cy="13" r="3" fill="%23d1d5db"/></svg>';

const VendorDashboard = () => {
  const { user } = useSelector(state => state.auth);
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, revenue: 0, pending: 0 });
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // inline category creation
  const [newCatName, setNewCatName] = useState('');
  const [catCreating, setCatCreating] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadCategories();
  }, []);

  const loadCategories = () =>
    api.get('/categories').then(r => setCategories(r.data?.categories || r.data || [])).catch(() => {});

  const loadProducts = () => {
    // use admin scoped route — returns only this vendor's products
    api.get('/admin/products?limit=100').then(r => {
      setProducts(r.data || []);
    }).catch(() => {
      // fallback to public route if somehow admin route fails
      api.get('/products?limit=100').then(r => {
        const all = r.data?.products || r.data || [];
        setProducts(all.filter(p => !p.vendor_id || p.vendor_id === user?.id));
      }).catch(() => {});
    });
  };

  const loadOrders = () => {
    api.get('/orders?limit=50').then(r => {
      const all = r.data?.orders || r.data || [];
      setOrders(all);
      setStats({
        total: all.length,
        revenue: all.reduce((s, o) => s + parseFloat(o.total || 0), 0),
        pending: all.filter(o => ['pending', 'confirmed'].includes(o.status)).length,
      });
    }).catch(() => {});
  };

  const createCategory = async () => {
    if (!newCatName.trim()) return;
    setCatCreating(true);
    try {
      const { data } = await api.post('/admin/categories', {
        name: newCatName.trim(),
        slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setCategories(prev => [...prev, data]);
      setForm(p => ({ ...p, category_id: data.id }));
      setNewCatName('');
      setShowNewCat(false);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create category');
    } finally {
      setCatCreating(false);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_PRODUCT);
    setEditId(null);
    setError('');
    setShowNewCat(false);
    setNewCatName('');
    setModal('add');
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || '', description: p.description || '',
      price: p.price || '', compare_at_price: p.compare_at_price || '',
      quantity: p.quantity || '', sku: p.sku || '',
      category_id: p.category_id || '', default_image_url: p.default_image_url || '',
      is_active: p.is_active !== false,
    });
    setEditId(p.id);
    setError('');
    setShowNewCat(false);
    setNewCatName('');
    setModal('edit');
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('A valid price is required'); return; }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : undefined,
        quantity: parseInt(form.quantity) || 0,
        category_id: form.category_id || undefined,
      };
      if (modal === 'add') {
        const { data } = await api.post('/admin/products', payload);
        // immediately prepend to table
        setProducts(prev => [data, ...prev]);
      } else {
        const { data } = await api.patch(`/admin/products/${editId}`, payload);
        setProducts(prev => prev.map(p => p.id === editId ? data : p));
      }
      setModal(null);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Failed to delete product');
    }
  };

  const statusColor = (s) => ({
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-600');

  const catName = (id) => categories.find(c => c.id === id)?.name || '—';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vendor Dashboard</h1>
            <p className="text-sm text-gray-500">{user?.name} · {user?.email}</p>
          </div>
          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium uppercase tracking-wide">Vendor</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Orders', value: stats.total, icon: ShoppingBag, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Revenue', value: `₹${stats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
            { label: 'Pending', value: stats.pending, icon: Package, color: 'text-yellow-600 bg-yellow-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
          {['products', 'orders'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {tab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">My Products ({products.length})</h2>
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                <Plus size={16} /> Add Product
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {products.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Package size={40} className="mx-auto mb-3" />
                  <p>No products yet. Click "Add Product" to get started.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Product', 'Category', 'Price', 'Stock', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.default_image_url || DEFAULT_IMG}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover bg-gray-100"
                              onError={e => { e.target.src = DEFAULT_IMG; }}
                            />
                            <div>
                              <p className="font-medium text-gray-900">{p.name}</p>
                              {p.sku && <p className="text-xs text-gray-400">{p.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{p.category_name || catName(p.category_id)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">₹{parseFloat(p.price).toLocaleString('en-IN')}</p>
                          {p.compare_at_price && (
                            <p className="text-xs text-gray-400 line-through">₹{parseFloat(p.compare_at_price).toLocaleString('en-IN')}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${p.quantity <= 10 ? 'text-red-600' : 'text-gray-700'}`}>
                            {p.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'orders' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Orders ({orders.length})</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingBag size={40} className="mx-auto mb-3" />
                  <p>No orders yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Order #', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">#{o.order_number}</td>
                        <td className="px-4 py-3 text-gray-600">{o.customer_name || o.user_name || '—'}</td>
                        <td className="px-4 py-3 font-medium">₹{parseFloat(o.total).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColor(o.status)}`}>
                            {o.status?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{modal === 'add' ? 'Add Product' : 'Edit Product'}</h3>
              <button onClick={() => setModal(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              {/* Image preview */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                  {form.default_image_url ? (
                    <img src={form.default_image_url} alt="preview"
                      className="w-full h-full object-cover"
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center text-gray-300 ${form.default_image_url ? 'hidden' : 'flex'}`}>
                    <ImageOff size={28} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input type="text" value={form.default_image_url}
                    onChange={e => setForm(p => ({ ...p, default_image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to use default placeholder</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Price row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare At (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.compare_at_price}
                    onChange={e => setForm(p => ({ ...p, compare_at_price: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Qty / SKU row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" min="0" value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={form.sku}
                    onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Category + inline create */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <button type="button" onClick={() => setShowNewCat(v => !v)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                    <FolderPlus size={13} /> {showNewCat ? 'Cancel' : 'New category'}
                  </button>
                </div>

                {showNewCat ? (
                  <div className="flex gap-2">
                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      onKeyDown={e => e.key === 'Enter' && createCategory()}
                      className="flex-1 border border-indigo-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={createCategory} disabled={catCreating || !newCatName.trim()}
                      className="bg-indigo-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {catCreating ? '…' : 'Create'}
                    </button>
                  </div>
                ) : (
                  <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600" />
                <span className="text-sm text-gray-700">Active (visible in store)</span>
              </label>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? 'Saving…' : modal === 'add' ? 'Add Product' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
