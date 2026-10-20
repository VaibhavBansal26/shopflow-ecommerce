import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, Star, Plus, Minus, Heart, Share2 } from 'lucide-react';
import { fetchProduct } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { showToast, toggleCart } from '../store/slices/uiSlice';
import ProductCard from '../components/products/ProductCard';
import api from '../services/api';

const ProductPage = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { current: product } = useSelector(state => state.products);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [similar, setSimilar] = useState([]);

  useEffect(() => {
    dispatch(fetchProduct(slug));
  }, [slug, dispatch]);

  useEffect(() => {
    if (product) {
      api.post('/recommendations/search', { query: product.name, limit: 4 })
        .then(r => setSimilar((r.data.results || []).filter(p => p.id !== product.id).slice(0, 4)))
        .catch(() => {});
    }
  }, [product]);

  const handleAddToCart = async () => {
    try {
      await dispatch(addToCart({ product_id: product.id, quantity: qty })).unwrap();
      dispatch(showToast({ type: 'success', message: 'Added to cart!' }));
      dispatch(toggleCart());
    } catch {
      dispatch(showToast({ type: 'error', message: 'Failed to add to cart' }));
    }
  };

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  const images = product.images?.length ? product.images : [{ url: product.default_image_url }];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        {/* Images */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-3">
            <img src={images[activeImg]?.url || '/placeholder-product.png'} alt={product.name}
              className="w-full h-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-indigo-600' : 'border-gray-200'
                  }`}>
                  <img src={img.url} alt={`view ${i}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          {product.average_rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={16} className={n <= Math.round(product.average_rating) ? 'text-yellow-400 fill-current' : 'text-gray-200 fill-current'} />
                ))}
              </div>
              <span className="text-sm text-gray-600">{parseFloat(product.average_rating).toFixed(1)} ({product.review_count} reviews)</span>
            </div>
          )}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-gray-900">₹{parseFloat(product.price).toLocaleString()}</span>
            {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
              <span className="text-lg text-gray-400 line-through">₹{parseFloat(product.compare_at_price).toLocaleString()}</span>
            )}
          </div>
          {product.short_description && (
            <p className="text-gray-600 mb-6">{product.short_description}</p>
          )}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={() => setQty(q => Math.max(1, q-1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-medium">{qty}</span>
              <button onClick={() => setQty(q => Math.min(product.quantity, q+1))} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <span className="text-sm text-gray-500">{product.quantity} in stock</span>
          </div>
          <button onClick={handleAddToCart} disabled={product.quantity === 0}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-lg mb-3">
            <ShoppingCart size={22} /> Add to Cart
          </button>
          {product.description && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {similar.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Similar Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similar.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPage;
