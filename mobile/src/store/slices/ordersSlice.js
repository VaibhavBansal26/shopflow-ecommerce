import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOrders = createAsyncThunk('orders/fetch', async () => {
  const { data } = await api.get('/orders');
  return data;
});

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (orderId) => {
  const { data } = await api.get(`/orders/${orderId}`);
  return data;
});

export const placeOrder = createAsyncThunk('orders/place', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders', payload);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.error || 'Order failed');
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { list: [], current: null, loading: false, error: null },
  reducers: {
    updateOrderStatus: (state, action) => {
      const { orderId, status, riderLocation } = action.payload;
      const order = state.list.find((o) => o.id === orderId);
      if (order) { order.status = status; if (riderLocation) order.riderLocation = riderLocation; }
      if (state.current?.id === orderId) {
        state.current.status = status;
        if (riderLocation) state.current.riderLocation = riderLocation;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchOrders.fulfilled, (state, action) => { state.list = action.payload; state.loading = false; })
      .addCase(fetchOrders.rejected, (state) => { state.loading = false; })
      .addCase(fetchOrder.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(placeOrder.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.list.unshift(action.payload.order);
        state.loading = false;
      })
      .addCase(placeOrder.rejected, (state, action) => { state.error = action.payload; state.loading = false; });
  },
});

export const { updateOrderStatus } = ordersSlice.actions;
export default ordersSlice.reducer;
