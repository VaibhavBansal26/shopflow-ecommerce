import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import cartReducer from '../src/store/slices/cartSlice';
import authReducer from '../src/store/slices/authSlice';
import CartScreen from '../src/screens/shopper/CartScreen';

jest.mock('../src/services/api', () => ({
  get: jest.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
  delete: jest.fn().mockResolvedValue({ data: {} }),
  patch: jest.fn().mockResolvedValue({ data: {} }),
}));

const makeStore = (cartState = {}) =>
  configureStore({
    reducer: { cart: cartReducer, auth: authReducer },
    preloadedState: {
      cart: { items: [], total: 0, loading: false, error: null, ...cartState },
      auth: { user: { id: 'u1', name: 'Test' }, loading: false, error: null },
    },
  });

const renderWithStore = (store) =>
  render(
    <Provider store={store}>
      <CartScreen navigation={{ navigate: jest.fn() }} />
    </Provider>
  );

describe('CartScreen', () => {
  it('shows empty state when cart is empty', () => {
    const { getByText } = renderWithStore(makeStore());
    expect(getByText(/empty/i)).toBeTruthy();
  });

  it('renders cart items', () => {
    const store = makeStore({
      items: [
        { id: 'ci-1', product_id: 'p1', name: 'Widget', price: '9.99', quantity: 2, images: [] },
      ],
    });
    const { getByText } = renderWithStore(store);
    expect(getByText('Widget')).toBeTruthy();
    expect(getByText('$9.99')).toBeTruthy();
  });

  it('shows total price', () => {
    const store = makeStore({
      items: [
        { id: 'ci-1', product_id: 'p1', name: 'Widget', price: '9.99', quantity: 2, images: [] },
        { id: 'ci-2', product_id: 'p2', name: 'Gadget', price: '5.00', quantity: 1, images: [] },
      ],
    });
    const { getByText } = renderWithStore(store);
    // total = 9.99*2 + 5.00 = 24.98
    expect(getByText(/24\.98/)).toBeTruthy();
  });

  it('shows checkout button when cart has items', () => {
    const store = makeStore({
      items: [{ id: 'ci-1', product_id: 'p1', name: 'Widget', price: '9.99', quantity: 1, images: [] }],
    });
    const { getByText } = renderWithStore(store);
    expect(getByText(/checkout/i)).toBeTruthy();
  });
});
