import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('token', data.tokens?.access || data.accessToken);
    localStorage.setItem('refreshToken', data.tokens?.refresh || data.refreshToken);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem('token');
  if (!token) return rejectWithValue('no_token');
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (err) {
    // only signal a real auth failure when the server explicitly rejects the token
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      return rejectWithValue('unauthorized');
    }
    // network error / server down — don't destroy the session
    return rejectWithValue('network_error');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout').catch(() => {});
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, loading: false, error: null, initialized: false },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; state.initialized = true; })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; state.initialized = true; })
      .addCase(fetchMe.rejected, (state, action) => {
        // network errors keep existing session; only a real 401 clears it
        if (action.payload === 'network_error') {
          state.initialized = true; // unblock the app but keep user as-is
        } else {
          state.user = null;
          state.initialized = true;
        }
      })
      .addCase(logout.fulfilled, (state) => { state.user = null; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
