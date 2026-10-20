import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <span className="text-white font-bold text-xl">ShopFlow</span>
          </div>
          <p className="text-sm">Your one-stop shop for everything. Fast delivery, great prices.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Shop</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/products" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link to="/products?featured=true" className="hover:text-white transition-colors">Featured</Link></li>
            <li><Link to="/products?new=true" className="hover:text-white transition-colors">New Arrivals</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Account</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/profile" className="hover:text-white transition-colors">My Profile</Link></li>
            <li><Link to="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Support</h3>
          <ul className="space-y-2 text-sm">
            <li><span>24/7 AI Chat Support</span></li>
            <li><span>Cash on Delivery Available</span></li>
            <li><span>Free Returns within 7 days</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 pt-6 text-center text-sm">
        <p>© 2024 ShopFlow. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
