import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { User, Package, CreditCard, Bell } from 'lucide-react';
import api from '../services/api';

const ProfilePage = () => {
  const { user } = useSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Account</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col items-center mb-4 pb-4 border-b">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt={user.name} className="w-16 h-16 rounded-full object-cover mb-2" />
                : <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
                    <span className="text-indigo-600 font-bold text-2xl">{user?.name?.[0]}</span>
                  </div>
              }
              <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
              <p className="text-gray-500 text-xs">{user?.email}</p>
            </div>
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'orders', label: 'Orders', icon: Package },
              { id: 'payment', label: 'Payment Methods', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                  activeTab === id ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </aside>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Profile Information</h2>
              <div className="space-y-4">
                {[
                  { label: 'Full Name', value: user?.name },
                  { label: 'Email', value: user?.email },
                  { label: 'Phone', value: user?.phone || 'Not set' },
                  { label: 'Region', value: user?.region || 'Not set' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-500">View your complete order history in <a href="/orders" className="text-indigo-600">My Orders</a>.</p>
            </div>
          )}
          {activeTab === 'payment' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-2">Saved Cards</h2>
              <p className="text-gray-500 text-sm">Cards are securely tokenized via Stripe. You can save a card at checkout.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
