import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const PLACEHOLDER = 'https://via.placeholder.com/300x300?text=No+Image';

export default function ProductCard({ product, onPress, style }) {
  const image = product.images?.[0] || PLACEHOLDER;
  const price = parseFloat(product.sale_price || product.price);
  const originalPrice = product.sale_price ? parseFloat(product.price) : null;

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>${price.toFixed(2)}</Text>
          {originalPrice && (
            <Text style={styles.original}>${originalPrice.toFixed(2)}</Text>
          )}
        </View>
        {product.rating && (
          <Text style={styles.rating}>⭐ {parseFloat(product.rating).toFixed(1)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 8,
  },
  image: { width: '100%', height: 140 },
  body: { padding: 10 },
  name: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 15, fontWeight: '700', color: '#4f46e5' },
  original: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' },
  rating: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
