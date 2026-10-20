import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { cartOpen: false, chatOpen: false, searchOpen: false, toast: null },
  reducers: {
    toggleCart: (state) => { state.cartOpen = !state.cartOpen; },
    toggleChat: (state) => { state.chatOpen = !state.chatOpen; },
    toggleSearch: (state) => { state.searchOpen = !state.searchOpen; },
    showToast: (state, action) => { state.toast = action.payload; },
    hideToast: (state) => { state.toast = null; },
  },
});

export const { toggleCart, toggleChat, toggleSearch, showToast, hideToast } = uiSlice.actions;
export default uiSlice.reducer;
