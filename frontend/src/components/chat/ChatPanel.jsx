import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Send, Bot, User, Loader } from 'lucide-react';
import { toggleChat } from '../../store/slices/uiSlice';
import api from '../../services/api';

const ChatPanel = () => {
  const dispatch = useDispatch();
  const { chatOpen } = useSelector(state => state.ui);
  const { user } = useSelector(state => state.auth);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m your ShopFlow assistant. I can help you find products, manage your cart, and track orders. What can I help you with today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/chat/message', {
        message: userMessage,
        session_id: sessionId,
        history,
      });
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try again later.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!chatOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => dispatch(toggleChat())} />
      <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-96 h-full md:h-[600px] bg-white md:rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-200">
        <div className="flex items-center gap-3 p-4 bg-indigo-600 md:rounded-t-2xl">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">ShopFlow AI</p>
            <p className="text-indigo-200 text-xs">Always here to help</p>
          </div>
          <button onClick={() => dispatch(toggleChat())} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot size={14} className="text-indigo-600" />
                </div>
              )}
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bot size={14} className="text-indigo-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                <Loader size={16} className="text-gray-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={user ? 'Ask me anything...' : 'Sign in to use chat...'}
            disabled={!user || loading}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!user || !input.trim() || loading}
            className="w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors">
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatPanel;
