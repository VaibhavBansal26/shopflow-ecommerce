import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchProducts = createAsyncThunk('products/fetch', async (params) => {
  const { data } = await api.get('/products', { params });
  return data;
});

export const fetchProduct = createAsyncThunk('products/fetchOne', async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
});

export const searchProducts = createAsyncThunk('products/search', async (params) => {
  const { data } = await api.post('/recommendations/search', params);
  return data.results;
});

const productSlice = createSlice({
  name: 'products',
  initialState: { items: [], current: null, searchResults: [], loading: false, pagination: {} },
  reducers: { clearSearch: (state) => { state.searchResults = []; } },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.pagination = { total: action.payload.total, page: action.payload.page, limit: action.payload.limit };
      })
      .addCase(fetchProduct.fulfilled, (state, action) => { state.current = action.payload; })
      .addCase(searchProducts.fulfilled, (state, action) => { state.searchResults = action.payload; });
  },
});

export const { clearSearch } = productSlice.actions;
export default productSlice.reducer;
