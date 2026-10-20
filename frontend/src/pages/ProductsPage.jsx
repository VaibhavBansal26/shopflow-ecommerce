import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { Filter, Grid, List } from 'lucide-react';
import { fetchProducts, searchProducts } from '../store/slices/productSlice';
import ProductCard from '../components/products/ProductCard';
import api from '../services/api';

const ProductsPage = () => {
  const dispatch = useDispatch();
  const { items, searchResults, loading } = useSelector(state => state.products);
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (filters.search) {
      dispatch(searchProducts({ query: filters.search, category: filters.category, max_price: filters.max_price || undefined }));
    } else {
      dispatch(fetchProducts({
        category: filters.category || undefined,
        min_price: filters.min_price || undefined,
        max_price: filters.max_price || undefined,
        limit: 24,
      }));
    }
  }, [filters, dispatch]);

  const displayProducts = filters.search ? searchResults : items;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 sticky top-20">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h3>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
                <option value="">All Categories</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
              <div className="flex gap-2">
                <input type="number" placeholder="Min" value={filters.min_price}
                  onChange={e => setFilters(f => ({ ...f, min_price: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                <input type="number" placeholder="Max" value={filters.max_price}
                  onChange={e => setFilters(f => ({ ...f, max_price: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>

            <button onClick={() => setFilters({ category: '', min_price: '', max_price: '', search: '' })}
              className="w-full text-sm text-indigo-600 hover:text-indigo-700 py-2">
              Clear Filters
            </button>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">{displayProducts.length} products found</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(12)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />)}
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No products found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {displayProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
