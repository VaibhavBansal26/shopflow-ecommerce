import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api';

export const loadUser = createAsyncThunk('auth/loadUser', async (_, { rejectWithValue }) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) return rejectWithValue('No token');
  const { data } = await api.get('/users/me');
  return data;
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.error || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload);
    await SecureStore.setItemAsync('accessToken', data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync('refreshToken', data.refreshToken);
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.error || 'Registration failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.fulfilled, (state, action) => { state.user = action.payload; state.loading = false; })
      .addCase(loadUser.rejected, (state) => { state.user = null; state.loading = false; })
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => { state.user = action.payload.user; state.loading = false; })
      .addCase(login.rejected, (state, action) => { state.error = action.payload; state.loading = false; })
      .addCase(register.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(register.fulfilled, (state, action) => { state.user = action.payload.user; state.loading = false; })
      .addCase(register.rejected, (state, action) => { state.error = action.payload; state.loading = false; })
      .addCase(logout.fulfilled, (state) => { state.user = null; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
