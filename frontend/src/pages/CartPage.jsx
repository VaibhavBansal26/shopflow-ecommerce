import React from 'react';
import { Link } from 'react-router-dom';
import { imgSrc, onImgError } from '../utils/productImage';
import { useDispatch, useSelector } from 'react-redux';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { removeFromCart } from '../store/slices/cartSlice';

const CartPage = () => {
  const dispatch = useDispatch();
  const { items, total } = useSelector(state => state.cart);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Your cart is empty</p>
          <Link to="/products" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
                <img src={imgSrc(item.default_image_url)} onError={onImgError} alt={item.name}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-indigo-600 font-bold mt-1">₹{parseFloat(item.price).toLocaleString()}</p>
                  <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <p className="font-bold text-gray-900">₹{parseFloat(item.line_total).toLocaleString()}</p>
                  <button onClick={() => dispatch(removeFromCart(item.id))} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-20">
              <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="flex justify-between text-gray-600 mb-2"><span>Items ({items.length})</span><span>₹{parseFloat(total).toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-600 mb-4"><span>Delivery</span><span className="text-green-600">Free</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-lg border-t pt-4 mb-4">
                <span>Total</span><span>₹{parseFloat(total).toLocaleString()}</span>
              </div>
              <Link to="/checkout" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-center block hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                Checkout <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
