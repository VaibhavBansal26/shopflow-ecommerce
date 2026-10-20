import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProductCard from '../src/components/ProductCard';

const mockProduct = {
  id: 'prod-1',
  name: 'Blue Wireless Headphones',
  price: '79.99',
  sale_price: '59.99',
  images: ['https://example.com/headphones.jpg'],
  rating: '4.7',
  stock_quantity: 15,
};

describe('ProductCard', () => {
  it('renders product name', () => {
    const { getByText } = render(<ProductCard product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('Blue Wireless Headphones')).toBeTruthy();
  });

  it('renders sale price when available', () => {
    const { getByText } = render(<ProductCard product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('$59.99')).toBeTruthy();
  });

  it('renders original price with strikethrough when on sale', () => {
    const { getByText } = render(<ProductCard product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('$79.99')).toBeTruthy();
  });

  it('renders rating', () => {
    const { getByText } = render(<ProductCard product={mockProduct} onPress={jest.fn()} />);
    expect(getByText(/4.7/)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProductCard product={mockProduct} onPress={onPress} />);
    fireEvent.press(getByText('Blue Wireless Headphones'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders product without sale price', () => {
    const product = { ...mockProduct, sale_price: null };
    const { getByText } = render(<ProductCard product={product} onPress={jest.fn()} />);
    expect(getByText('$79.99')).toBeTruthy();
  });

  it('renders placeholder image when no images provided', () => {
    const product = { ...mockProduct, images: [] };
    const { UNSAFE_getByType } = render(<ProductCard product={product} onPress={jest.fn()} />);
    const image = UNSAFE_getByType('Image');
    expect(image.props.source.uri).toContain('placeholder');
  });
});
