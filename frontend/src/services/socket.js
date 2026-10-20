import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket'],
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const trackOrder = (orderId) => {
  socket?.emit('track:order', orderId);
};

export const onOrderUpdate = (callback) => {
  socket?.on('order:update', callback);
  return () => socket?.off('order:update', callback);
};

export const onRiderLocation = (callback) => {
  socket?.on('rider:location:update', callback);
  return () => socket?.off('rider:location:update', callback);
};
