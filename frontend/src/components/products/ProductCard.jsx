import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ShoppingCart, Star } from 'lucide-react';
import { addToCart } from '../../store/slices/cartSlice';
import { showToast } from '../../store/slices/uiSlice';
import { imgSrc, onImgError } from '../../utils/productImage';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    try {
      await dispatch(addToCart({ product_id: product.id })).unwrap();
      dispatch(showToast({ type: 'success', message: `${product.name} added to cart!` }));
    } catch {
      dispatch(showToast({ type: 'error', message: 'Failed to add to cart' }));
    }
  };

  const discount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price)
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : null;

  return (
    <Link to={`/products/${product.slug}`} className="group">
      <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
        <div className="relative overflow-hidden aspect-square bg-gray-50">
          <img
            src={imgSrc(product.default_image_url)}
            alt={product.name}
            onError={onImgError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {discount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              -{discount}%
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{product.name}</h3>
          {product.short_description && (
            <p className="text-gray-500 text-xs line-clamp-2 mb-2">{product.short_description}</p>
          )}
          {product.average_rating > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star size={12} className="text-yellow-400 fill-current" />
              <span className="text-xs text-gray-600">{parseFloat(product.average_rating).toFixed(1)} ({product.review_count})</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-900">₹{parseFloat(product.price).toLocaleString()}</span>
              {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                <span className="text-xs text-gray-400 line-through ml-1">₹{parseFloat(product.compare_at_price).toLocaleString()}</span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm">
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
