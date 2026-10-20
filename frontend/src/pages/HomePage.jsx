import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, RefreshCw, MessageCircle } from 'lucide-react';
import { fetchProducts } from '../store/slices/productSlice';
import ProductCard from '../components/products/ProductCard';
import api from '../services/api';

const HomePage = () => {
  const dispatch = useDispatch();
  const { items: products, loading } = useSelector(state => state.products);
  const { user } = useSelector(state => state.auth);
  const [categories, setCategories] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 8, featured: true }));
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
    api.post('/recommendations/trending', { limit: 6 }).then(r => setTrending(r.data.recommendations || [])).catch(() => {});
    if (user) {
      api.post('/recommendations/for-you', { limit: 8, region: user.region }).then(r => setRecommended(r.data.recommendations || [])).catch(() => {});
    }
  }, [dispatch, user]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Shop Smarter,<br />Deliver Faster
          </h1>
          <p className="text-indigo-200 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            AI-powered recommendations, real-time order tracking, and 10-minute delivery.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/products"
              className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold hover:bg-indigo-50 transition-colors flex items-center gap-2">
              Shop Now <ArrowRight size={18} />
            </Link>
            <Link to="/products?featured=true"
              className="bg-white/10 text-white border border-white/30 px-8 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors">
              View Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12 border-b">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Truck, label: 'Fast Delivery', sub: 'As fast as 10 min' },
            { icon: Shield, label: 'Secure Pay', sub: 'PCI-DSS certified' },
            { icon: RefreshCw, label: 'Easy Returns', sub: '7-day no hassle' },
            { icon: MessageCircle, label: 'AI Support', sub: '24/7 chat assistant' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Icon size={22} className="text-indigo-600" />
              </div>
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 12).map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`}
                  className="bg-white rounded-2xl p-4 text-center hover:shadow-md transition-all border border-gray-100 hover:border-indigo-200">
                  {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-cover rounded-xl mx-auto mb-2" />}
                  <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            <Link to="/products" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-sm font-medium">
              View All <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Recommendations */}
      {user && recommended.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Recommended for You</h2>
            <p className="text-gray-500 text-sm mb-6">Based on your preferences and purchase history</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommended.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trending in Your Area</h2>
            <p className="text-gray-500 text-sm mb-6">Popular items in your region this week</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {trending.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
