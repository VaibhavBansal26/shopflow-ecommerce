import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { fetchOrder } from '../store/slices/orderSlice';
import { updateOrderStatus } from '../store/slices/orderSlice';
import { connectSocket, trackOrder, onOrderUpdate, onRiderLocation } from '../services/socket';

const STEPS = [
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

const StatusBadge = ({ status }) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
};

const OrderTrackingPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: order } = useSelector(state => state.orders);
  const token = localStorage.getItem('token');
  const [riderLocation, setRiderLocation] = useState(null);

  useEffect(() => {
    dispatch(fetchOrder(id));
    const socket = connectSocket(token);
    trackOrder(id);
    const unsubOrder = onOrderUpdate(data => {
      dispatch(updateOrderStatus({ orderId: id, ...data }));
    });
    const unsubRider = onRiderLocation(data => {
      if (data.rider_location) setRiderLocation(data.rider_location);
    });
    return () => { unsubOrder(); unsubRider(); };
  }, [id, dispatch, token]);

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  const currentStepIdx = STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Order #{order.order_number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-gray-500 text-sm">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-6">Delivery Progress</h2>
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
          <div className="absolute top-5 left-5 h-0.5 bg-indigo-600 transition-all"
            style={{ width: `${(currentStepIdx / (STEPS.length - 1)) * 100}%` }} />
          <div className="relative flex justify-between">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i <= currentStepIdx;
              return (
                <div key={step.key} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${
                    done ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <p className={`text-xs font-medium text-center max-w-16 ${done ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
        {order.estimated_delivery && (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-600 bg-indigo-50 rounded-xl px-4 py-3">
            <Clock size={16} className="text-indigo-600" />
            <span>Estimated delivery: <strong>{new Date(order.estimated_delivery).toLocaleString('en-IN')}</strong></span>
          </div>
        )}
      </div>

      {/* Rider */}
      {order.rider_name && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Your Delivery Agent</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-indigo-600 font-bold">{order.rider_name[0]}</span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{order.rider_name}</p>
              {riderLocation && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={12} className="text-indigo-600" />
                  Location updated live
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-3">
          {order.items?.map(item => (
            <div key={item.id} className="flex items-center gap-3">
              <img src={item.default_image_url || '/placeholder-product.png'} alt={item.product_name}
                className="w-12 h-12 object-cover rounded-xl" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                <p className="text-xs text-gray-500">×{item.quantity}</p>
              </div>
              <span className="font-medium text-gray-900">₹{parseFloat(item.total_price).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-4 mt-4 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span>₹{parseFloat(order.total).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
