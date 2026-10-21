import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart3, Package, Users, Tag, Settings, TrendingUp, Store, Truck, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import api from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const Badge = ({ label, color = 'gray' }) => {
  const map = { green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700', blue: 'bg-blue-100 text-blue-700', gray: 'bg-gray-100 text-gray-600', yellow: 'bg-yellow-100 text-yellow-700' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[color] || map.gray}`}>{label}</span>;
};

const Toggle = ({ value, onChange }) => (
  <button onClick={onChange} className={`w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-gray-300'} relative`}>
    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
  </button>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
  </div>
);

const Input = (props) => <input {...props} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />;
const Select = ({ children, ...props }) => <select {...props} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">{children}</select>;
const Textarea = (props) => <textarea {...props} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />;

const Th = ({ children }) => <th className="text-left px-4 py-3 font-medium text-gray-600 text-sm">{children}</th>;
const Td = ({ children, className = '' }) => <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;

// ── Overview ─────────────────────────────────────────────────────────────────

const DashboardHome = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {}); }, []);

  const tiles = stats ? [
    { label: 'Orders This Month', value: stats.orders_this_month, icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Revenue This Month', value: `₹${parseFloat(stats.revenue_this_month || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'New Users', value: stats.new_users, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Products', value: stats.active_products, icon: Tag, color: 'bg-orange-50 text-orange-600' },
  ] : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Overview</h2>
      {!stats && <p className="text-gray-400 text-sm">Loading stats…</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={20} /></div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Orders ────────────────────────────────────────────────────────────────────

const STATUSES = ['pending','confirmed','processing','out_for_delivery','delivered','cancelled'];
const statusColor = s => ({ delivered:'green', cancelled:'red', out_for_delivery:'blue', pending:'yellow' }[s] || 'gray');

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [riders, setRiders] = useState([]);

  const load = useCallback(() => {
    const q = filter ? `?status=${filter}` : '';
    api.get(`/admin/orders${q}`).then(r => setOrders(r.data)).catch(() => {});
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/admin/riders').then(r => setRiders(r.data)).catch(() => {}); }, []);

  const updateStatus = async (id, status, rider_id) => {
    await api.patch(`/admin/orders/${id}/status`, { status, rider_id });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Orders</h2>
        <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-48">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            {['Order','Customer','Total','Status','Date','Action'].map(h => <Th key={h}>{h}</Th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {orders.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No orders found</td></tr>}
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50">
                <Td><span className="font-mono text-xs">#{o.order_number}</span></Td>
                <Td><div>{o.customer_name}</div><div className="text-gray-400 text-xs">{o.email}</div></Td>
                <Td className="font-semibold">₹{parseFloat(o.total || 0).toLocaleString()}</Td>
                <Td><Badge label={o.status} color={statusColor(o.status)} /></Td>
                <Td className="text-gray-500">{new Date(o.created_at).toLocaleDateString()}</Td>
                <Td>
                  <select onChange={e => updateStatus(o.id, e.target.value)} defaultValue=""
                    className="text-xs border rounded px-2 py-1 focus:outline-none">
                    <option value="" disabled>Change status</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Products ──────────────────────────────────────────────────────────────────

const emptyProduct = { name: '', description: '', price: '', compare_at_price: '', quantity: '', category_id: '', vendor_id: '', is_active: true };

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [modal, setModal] = useState(null); // null | 'add' | product obj
  const [form, setForm] = useState(emptyProduct);
  const [vendorFilter, setVendorFilter] = useState('');

  const load = useCallback(() => {
    const q = vendorFilter ? `?vendor_id=${vendorFilter}` : '';
    api.get(`/admin/products${q}`).then(r => setProducts(r.data)).catch(() => {});
  }, [vendorFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/categories').then(r => setCategories(r.data)).catch(() => {});
    api.get('/admin/vendors').then(r => setVendors(r.data)).catch(() => {});
  }, []);

  const openAdd = () => { setForm(emptyProduct); setModal('add'); };
  const openEdit = (p) => { setForm({ ...p, price: p.price, compare_at_price: p.compare_at_price || '', quantity: p.quantity }); setModal(p); };

  const save = async () => {
    const payload = { ...form, price: parseFloat(form.price), quantity: parseInt(form.quantity) || 0,
      compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
      category_id: form.category_id || null, vendor_id: form.vendor_id || null };
    if (modal === 'add') await api.post('/admin/products', payload);
    else await api.patch(`/admin/products/${modal.id}`, payload);
    setModal(null); load();
  };

  const del = async (id) => { if (window.confirm('Deactivate this product?')) { await api.delete(`/admin/products/${id}`); load(); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Products</h2>
        <div className="flex gap-2">
          <Select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="w-44">
            <option value="">All vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </Select>
          <button onClick={openAdd} className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            {['Name','Category','Vendor','Price','Stock','Status','Actions'].map(h => <Th key={h}>{h}</Th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {products.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No products found</td></tr>}
            {products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <Td><div className="font-medium">{p.name}</div><div className="text-gray-400 text-xs">{p.sku}</div></Td>
                <Td className="text-gray-500">{p.category_name || '—'}</Td>
                <Td className="text-gray-500">{p.vendor_name || '—'}</Td>
                <Td className="font-semibold">₹{parseFloat(p.price).toLocaleString()}</Td>
                <Td><Badge label={p.quantity} color={p.quantity < 10 ? 'red' : 'green'} /></Td>
                <Td><Badge label={p.is_active ? 'Active' : 'Inactive'} color={p.is_active ? 'green' : 'red'} /></Td>
                <Td>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-indigo-500 hover:text-indigo-700"><Edit2 size={15} /></button>
                    <button onClick={() => del(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Product' : 'Edit Product'} onClose={() => setModal(null)}>
          <Field label="Name"><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)"><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></Field>
            <Field label="Compare Price (₹)"><Input type="number" value={form.compare_at_price} onChange={e => setForm(f => ({ ...f, compare_at_price: e.target.value }))} /></Field>
          </div>
          <Field label="Stock Quantity"><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></Field>
          <Field label="Category">
            <Select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Vendor">
            <Select value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))}>
              <option value="">No vendor</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <div className="flex items-center gap-3">
              <Toggle value={form.is_active} onChange={() => setForm(f => ({ ...f, is_active: !f.is_active }))} />
              <span className="text-sm text-gray-600">{form.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </Field>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-50">Cancel</button>
            <button onClick={save} className="px-4 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Vendors ───────────────────────────────────────────────────────────────────

const AdminVendors = () => {
  const [vendors, setVendors] = useState([]);

  const load = () => api.get('/admin/vendors').then(r => setVendors(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async (id) => { await api.patch(`/admin/vendors/${id}/status`); load(); };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Vendors</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            {['Name','Email/Phone','Products','Joined','Active'].map(h => <Th key={h}>{h}</Th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {vendors.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No vendors yet</td></tr>}
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <Td className="font-medium">{v.name}</Td>
                <Td className="text-gray-500"><div>{v.email}</div><div>{v.phone}</div></Td>
                <Td><Badge label={v.product_count} color="blue" /></Td>
                <Td className="text-gray-500">{new Date(v.created_at).toLocaleDateString()}</Td>
                <Td><Toggle value={v.is_active} onChange={() => toggle(v.id)} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Riders ────────────────────────────────────────────────────────────────────

const AdminRiders = () => {
  const [riders, setRiders] = useState([]);

  const load = () => api.get('/admin/riders').then(r => setRiders(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async (id) => { await api.patch(`/admin/riders/${id}/status`); load(); };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Riders</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            {['Name','Phone','Active Deliveries','Total Delivered','Active'].map(h => <Th key={h}>{h}</Th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {riders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No riders yet</td></tr>}
            {riders.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-gray-500">{r.phone}</Td>
                <Td><Badge label={r.active_deliveries || 0} color={r.active_deliveries > 0 ? 'blue' : 'gray'} /></Td>
                <Td><Badge label={r.total_delivered || 0} color="green" /></Td>
                <Td><Toggle value={r.is_active} onChange={() => toggle(r.id)} /></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Users / Shoppers ──────────────────────────────────────────────────────────

const ROLES = ['customer', 'vendor', 'rider', 'admin'];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('customer');

  const load = useCallback(() => {
    api.get(`/admin/users${roleFilter ? `?role=${roleFilter}` : ''}`).then(r => setUsers(r.data)).catch(() => {});
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const changeRole = async (id, role) => { await api.patch(`/admin/users/${id}/role`, { role }); load(); };
  const toggleStatus = async (id) => { await api.patch(`/admin/users/${id}/status`); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Users</h2>
        <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-40">
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            {['Name','Email / Phone','Role','Joined','Active','Change Role'].map(h => <Th key={h}>{h}</Th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No users found</td></tr>}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <Td className="font-medium">{u.name}</Td>
                <Td className="text-gray-500"><div>{u.email}</div><div>{u.phone}</div></Td>
                <Td><Badge label={u.role} color={{ admin:'red', vendor:'blue', rider:'yellow', customer:'gray' }[u.role] || 'gray'} /></Td>
                <Td className="text-gray-500">{new Date(u.created_at).toLocaleDateString()}</Td>
                <Td><Toggle value={u.is_active} onChange={() => toggleStatus(u.id)} /></Td>
                <Td>
                  <Select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="w-28 text-xs py-1">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </Select>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Shell ─────────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const location = useLocation();
  const nav = [
    { to: '/admin', label: 'Overview', icon: BarChart3 },
    { to: '/admin/orders', label: 'Orders', icon: Package },
    { to: '/admin/products', label: 'Products', icon: Tag },
    { to: '/admin/vendors', label: 'Vendors', icon: Store },
    { to: '/admin/riders', label: 'Riders', icon: Truck },
    { to: '/admin/users', label: 'Users', icon: Users },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
      <aside className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 sticky top-8">
          <p className="font-bold text-gray-900 mb-4 px-2">Admin Panel</p>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === '/admin' ? location.pathname === to : location.pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm mb-1 transition-colors ${active ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={16} /> {label}
              </Link>
            );
          })}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="riders" element={<AdminRiders />} />
          <Route path="users" element={<AdminUsers />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
