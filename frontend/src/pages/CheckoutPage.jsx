import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { imgSrc, onImgError } from '../utils/productImage';
import { placeOrder } from '../store/slices/orderSlice';
import { clearCart } from '../store/slices/cartSlice';
import { showToast } from '../store/slices/uiSlice';
import ProductCard from '../components/products/ProductCard';
import api from '../services/api';

const CheckoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total } = useSelector(state => state.cart);
  const { user } = useSelector(state => state.auth);
  const { loading } = useSelector(state => state.orders);
  const [recommendations, setRecommendations] = useState([]);
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [scheduledDate, setScheduledDate] = useState('');
  const [address, setAddress] = useState({
    line1: '', city: '', state: '', pincode: '', phone: user?.phone || '',
  });

  useEffect(() => {
    if (items.length) {
      api.post('/recommendations/checkout', {
        cart_product_ids: items.map(i => i.product_id),
        region: user?.region,
        limit: 4,
      }).then(r => setRecommendations(r.data.recommendations || [])).catch(() => {});
    }
  }, [items]);

  const applyCoupon = async () => {
    try {
      const { data } = await api.post('/discounts/validate', { code: coupon, order_amount: parseFloat(total) });
      setDiscount(data);
      dispatch(showToast({ type: 'success', message: data.message }));
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err.response?.data?.message || 'Invalid coupon' }));
    }
  };

  const handlePlaceOrder = async () => {
    if (!address.line1 || !address.city || !address.pincode) {
      return dispatch(showToast({ type: 'error', message: 'Please fill in your delivery address' }));
    }
    try {
      const result = await dispatch(placeOrder({
        payment_method: paymentMethod,
        delivery_address: address,
        discount_id: discount?.discount_id,
        scheduled_for: scheduledDate || undefined,
      })).unwrap();
      await dispatch(clearCart());
      dispatch(showToast({ type: 'success', message: 'Order placed successfully!' }));
      navigate(`/orders/${result.id}/track`);
    } catch (err) {
      dispatch(showToast({ type: 'error', message: err || 'Failed to place order' }));
    }
  };

  const finalTotal = discount
    ? Math.max(0, parseFloat(total) - discount.discount_amount).toFixed(2)
    : total;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'line1', label: 'Street Address', full: true },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State' },
                { key: 'pincode', label: 'PIN Code' },
                { key: 'phone', label: 'Phone Number' },
              ].map(({ key, label, full }) => (
                <div key={key} className={full ? 'sm:col-span-2' : ''}>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">{label}</label>
                  <input
                    value={address[key]}
                    onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'card', label: 'Card / GPay', emoji: '💳' },
                { id: 'cod', label: 'Cash on Delivery', emoji: '💵' },
                { id: 'upi', label: 'UPI', emoji: '📱' },
              ].map(m => (
                <label key={m.id} className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  paymentMethod === m.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input type="radio" value={m.id} checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)} className="hidden" />
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-xs font-medium text-center text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Scheduled Delivery */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-2">Schedule Delivery (Optional)</h2>
            <p className="text-gray-500 text-sm mb-4">Leave empty for immediate delivery</p>
            <input type="datetime-local" value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-20">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={imgSrc(item.default_image_url)} onError={onImgError} alt={item.name}
                    className="w-10 h-10 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">×{item.quantity}</p>
                  </div>
                  <span className="text-sm font-medium">₹{parseFloat(item.line_total).toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="flex gap-2 mb-4">
              <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
              <button onClick={applyCoupon}
                className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-indigo-700 transition-colors">
                Apply
              </button>
            </div>

            <div className="space-y-2 text-sm border-t pt-4 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span><span>₹{parseFloat(total).toLocaleString()}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>-₹{discount.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Delivery</span><span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t">
                <span>Total</span><span>₹{parseFloat(finalTotal).toLocaleString()}</span>
              </div>
            </div>

            <button onClick={handlePlaceOrder} disabled={loading || items.length === 0}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Frequently Bought Together</h2>
          <p className="text-gray-500 text-sm mb-6">Customers who bought items in your cart also bought these</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
