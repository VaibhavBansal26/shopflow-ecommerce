import React, { useEffect, useState } from 'react';
import { MapPin, Package, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const RiderDashboard = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/riders/my-orders').then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const handlePickup = async (orderId) => {
    await api.patch(`/riders/orders/${orderId}/pickup`);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'out_for_delivery' } : o));
  };

  const handleDeliver = async (orderId) => {
    await api.patch(`/riders/orders/${orderId}/deliver`);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Deliveries</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No active deliveries</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">#{order.order_number}</p>
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>{order.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
                <MapPin size={16} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                <span>{typeof order.delivery_address === 'object'
                  ? `${order.delivery_address.line1}, ${order.delivery_address.city}`
                  : order.delivery_address}</span>
              </div>
              <div className="flex gap-3">
                {order.status === 'assigned' && (
                  <button onClick={() => handlePickup(order.id)}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                    Pick Up Order
                  </button>
                )}
                {order.status === 'out_for_delivery' && (
                  <button onClick={() => handleDeliver(order.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                    <CheckCircle size={16} /> Mark Delivered
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiderDashboard;
