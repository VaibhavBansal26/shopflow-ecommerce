import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { hideToast } from '../../store/slices/uiSlice';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const icons = {
  success: <CheckCircle size={20} className="text-green-500" />,
  error: <XCircle size={20} className="text-red-500" />,
  info: <AlertCircle size={20} className="text-blue-500" />,
};

const Toast = () => {
  const dispatch = useDispatch();
  const toast = useSelector(state => state.ui.toast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => dispatch(hideToast()), toast.duration || 3000);
    return () => clearTimeout(t);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-64">
        {icons[toast.type] || icons.info}
        <p className="text-gray-800 text-sm font-medium flex-1">{toast.message}</p>
        <button onClick={() => dispatch(hideToast())} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
