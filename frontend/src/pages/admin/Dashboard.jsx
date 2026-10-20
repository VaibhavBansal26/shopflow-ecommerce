import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart3, Package, Users, Tag, Settings, TrendingUp } from 'lucide-react';
import api from '../../services/api';

const DashboardHome = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const tiles = stats ? [
    { label: 'Orders This Month', value: stats.orders_this_month, icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Revenue This Month', value: `₹${stats.revenue_this_month?.toLocaleString()}`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'New Users', value: stats.new_users, icon: Users, color: 'bg-purple-50 text-purple-600' },
    { label: 'Active Products', value: stats.active_products, icon: Tag, color: 'bg-orange-50 text-orange-600' },
  ] : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/admin/orders').then(r => setOrders(r.data)).catch(() => {}); }, []);
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">All Orders</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Order', 'Customer', 'Total', 'Status', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono">#{o.order_number}</td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3 font-semibold">₹{parseFloat(o.total).toLocaleString()}</td>
                <td className="px-4 py-3"><span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{o.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const location = useLocation();
  const nav = [
    { to: '/admin', label: 'Overview', icon: BarChart3, exact: true },
    { to: '/admin/orders', label: 'Orders', icon: Package },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/riders', label: 'Riders', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
      <aside className="w-56 flex-shrink-0">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-bold text-gray-900 mb-4 px-2">Admin Panel</p>
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm mb-1 transition-colors ${
                location.pathname === to ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
        </div>
      </aside>
      <div className="flex-1">
        <Routes>
          <Route index element={<DashboardHome />} />
          <Route path="orders" element={<AdminOrders />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
