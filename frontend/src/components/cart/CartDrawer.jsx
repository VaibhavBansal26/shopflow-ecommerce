import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';
import { toggleCart } from '../../store/slices/uiSlice';
import { imgSrc, onImgError } from '../../utils/productImage';
import { removeFromCart } from '../../store/slices/cartSlice';

const CartDrawer = () => {
  const dispatch = useDispatch();
  const { cartOpen } = useSelector(state => state.ui);
  const { items, total } = useSelector(state => state.cart);

  if (!cartOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => dispatch(toggleCart())} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Shopping Cart ({items.length})</h2>
          <button onClick={() => dispatch(toggleCart())} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag size={48} className="text-gray-300" />
            <p className="text-gray-500">Your cart is empty</p>
            <Link to="/products" onClick={() => dispatch(toggleCart())}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                  <img
                    src={imgSrc(item.default_image_url)} onError={onImgError}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                    <p className="text-indigo-600 font-semibold">₹{parseFloat(item.price).toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <button onClick={() => dispatch(removeFromCart(item.id))}
                    className="p-1 text-gray-400 hover:text-red-500 self-start">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700 font-medium">Total</span>
                <span className="text-xl font-bold text-gray-900">₹{parseFloat(total).toLocaleString()}</span>
              </div>
              <Link to="/checkout" onClick={() => dispatch(toggleCart())}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-center block hover:bg-indigo-700 transition-colors">
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
