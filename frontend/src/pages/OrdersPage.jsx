import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Package, ChevronRight, MapPin } from 'lucide-react';
import { fetchOrders } from '../store/slices/orderSlice';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const OrdersPage = () => {
  const dispatch = useDispatch();
  const { items: orders } = useSelector(state => state.orders);

  useEffect(() => { dispatch(fetchOrders()); }, [dispatch]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">You haven't placed any orders yet</p>
          <Link to="/products" className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">#{order.order_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              {order.item_names && (
                <p className="text-sm text-gray-600 mb-3 truncate">{order.item_names.join(', ')}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">₹{parseFloat(order.total).toLocaleString()}</span>
                <Link to={`/orders/${order.id}/track`}
                  className="flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-700">
                  {['out_for_delivery', 'confirmed', 'preparing'].includes(order.status)
                    ? <><MapPin size={14} /> Track Order</>
                    : <>View Details <ChevronRight size={14} /></>}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
