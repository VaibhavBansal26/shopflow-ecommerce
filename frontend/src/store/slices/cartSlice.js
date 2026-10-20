import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  const { data } = await api.get('/cart');
  return data;
});

export const addToCart = createAsyncThunk('cart/add', async ({ product_id, quantity = 1 }) => {
  await api.post('/cart/items', { product_id, quantity });
  const { data } = await api.get('/cart');
  return data;
});

export const removeFromCart = createAsyncThunk('cart/remove', async (itemId) => {
  await api.delete(`/cart/items/${itemId}`);
  const { data } = await api.get('/cart');
  return data;
});

export const clearCart = createAsyncThunk('cart/clear', async () => {
  await api.delete('/cart');
  return { items: [], total: '0.00', count: 0 };
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: '0.00', count: 0, loading: false },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true; })
      .addCase(fetchCart.fulfilled, (state, action) => { Object.assign(state, action.payload); state.loading = false; })
      .addCase(addToCart.fulfilled, (state, action) => { Object.assign(state, action.payload); })
      .addCase(removeFromCart.fulfilled, (state, action) => { Object.assign(state, action.payload); })
      .addCase(clearCart.fulfilled, (state, action) => { Object.assign(state, action.payload); });
  },
});

export default cartSlice.reducer;
