import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchOrders = createAsyncThunk('orders/fetch', async () => {
  const { data } = await api.get('/orders');
  return data;
});

export const fetchOrder = createAsyncThunk('orders/fetchOne', async (id) => {
  const { data } = await api.get(`/orders/${id}`);
  return data;
});

export const placeOrder = createAsyncThunk('orders/place', async (orderData, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/orders', orderData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Order failed');
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: { items: [], current: null, loading: false, error: null },
  reducers: {
    updateOrderStatus: (state, action) => {
      const { orderId, ...updates } = action.payload;
      const order = state.items.find(o => o.id === orderId);
      if (order) Object.assign(order, updates);
      if (state.current?.id === orderId) Object.assign(state.current, updates);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.fulfilled, (state, action) => { state.items = action.payload; })
      .addCase(fetchOrder.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(placeOrder.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(placeOrder.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(placeOrder.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { updateOrderStatus } = orderSlice.actions;
export default orderSlice.reducer;
