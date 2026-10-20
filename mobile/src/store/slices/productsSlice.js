import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchProducts = createAsyncThunk('products/fetch', async (params = {}) => {
  const { data } = await api.get('/products', { params });
  return data;
});

export const fetchProduct = createAsyncThunk('products/fetchOne', async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
});

export const searchProducts = createAsyncThunk('products/search', async (query) => {
  const { data } = await api.get('/products/search', { params: { query } });
  return data;
});

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    list: [],
    current: null,
    pagination: {},
    loading: false,
    searchResults: [],
  },
  reducers: {
    clearCurrent: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.list = action.payload.products;
        state.pagination = action.payload.pagination;
        state.loading = false;
      })
      .addCase(fetchProducts.rejected, (state) => { state.loading = false; })
      .addCase(fetchProduct.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.searchResults = action.payload.products || [];
      });
  },
});

export const { clearCurrent } = productsSlice.actions;
export default productsSlice.reducer;
