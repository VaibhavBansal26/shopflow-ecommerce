import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCart = createAsyncThunk('cart/fetch', async () => {
  const { data } = await api.get('/cart');
  return data;
});

export const addToCart = createAsyncThunk('cart/add', async ({ productId, quantity = 1 }) => {
  const { data } = await api.post('/cart/add', { productId, quantity });
  return data;
});

export const removeFromCart = createAsyncThunk('cart/remove', async (itemId) => {
  await api.delete(`/cart/${itemId}`);
  return itemId;
});

export const updateCartItem = createAsyncThunk('cart/update', async ({ itemId, quantity }) => {
  const { data } = await api.patch(`/cart/${itemId}`, { quantity });
  return data;
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true; })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.loading = false;
      })
      .addCase(fetchCart.rejected, (state) => { state.loading = false; })
      .addCase(addToCart.fulfilled, (state, action) => {
        const existing = state.items.findIndex((i) => i.product_id === action.payload.product_id);
        if (existing >= 0) state.items[existing] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      });
  },
});

export const selectCartCount = (state) => state.cart.items.reduce((sum, i) => sum + i.quantity, 0);
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);

export default cartSlice.reducer;
