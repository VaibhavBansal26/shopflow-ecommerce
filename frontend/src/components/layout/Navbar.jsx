import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingCart, MessageCircle, Search, User, LogOut, Package, Menu, X } from 'lucide-react';
import { toggleCart, toggleChat, toggleSearch } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { count } = useSelector(state => state.cart);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SF</span>
            </div>
            <span className="text-xl font-bold text-gray-900">ShopFlow</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/products" className="text-gray-600 hover:text-indigo-600 transition-colors">Products</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-600 hover:text-indigo-600 transition-colors">Admin</Link>
            )}
            {user?.role === 'rider' && (
              <Link to="/rider" className="text-gray-600 hover:text-indigo-600 transition-colors">Deliveries</Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => dispatch(toggleSearch())}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Search size={20} />
            </button>

            <button onClick={() => dispatch(toggleChat())}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <MessageCircle size={20} />
            </button>

            <button onClick={() => dispatch(toggleCart())}
              className="relative p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs rounded-full flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenu(!userMenu)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    : <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-semibold text-sm">{user.name?.[0]?.toUpperCase()}</span>
                      </div>
                  }
                </button>
                {userMenu && (
                  <div className="absolute right-0 top-12 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                    <Link to="/profile" onClick={() => setUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50">
                      <User size={16} /> Profile
                    </Link>
                    <Link to="/orders" onClick={() => setUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50">
                      <Package size={16} /> My Orders
                    </Link>
                    <hr className="my-1" />
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 w-full">
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
