import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProduct } from '../../store/slices/productsSlice';
import { addToCart } from '../../store/slices/cartSlice';

export default function ProductDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const { slug } = route.params;
  const product = useSelector((s) => s.products.current);
  const [activeImg, setActiveImg] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    dispatch(fetchProduct(slug));
  }, [slug]);

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await dispatch(addToCart({ productId: product.id, quantity: 1 }));
    setAdding(false);
    if (result.meta.requestStatus === 'fulfilled') {
      Alert.alert('Added to cart', product.name);
    }
  };

  if (!product || product.slug !== slug) {
    return <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />;
  }

  const images = product.images?.length ? product.images : ['https://via.placeholder.com/400'];

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {images.map((img, i) => (
          <Image key={i} source={{ uri: img }} style={styles.image} resizeMode="cover" />
        ))}
      </ScrollView>

      <View style={styles.body}>
        <Text style={styles.name}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ${parseFloat(product.sale_price || product.price).toFixed(2)}
          </Text>
          {product.sale_price && (
            <Text style={styles.originalPrice}>${parseFloat(product.price).toFixed(2)}</Text>
          )}
          {product.rating && <Text style={styles.rating}>⭐ {parseFloat(product.rating).toFixed(1)}</Text>}
        </View>

        <Text style={styles.sectionLabel}>Description</Text>
        <Text style={styles.description}>{product.description}</Text>

        <Text style={styles.stock}>
          {product.stock_quantity > 0 ? `✅ ${product.stock_quantity} in stock` : '❌ Out of stock'}
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cartBtn, !product.stock_quantity && styles.disabled]}
          onPress={handleAddToCart}
          disabled={!product.stock_quantity || adding}
        >
          <Text style={styles.cartBtnText}>{adding ? 'Adding…' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  image: { width: 380, height: 320 },
  body: { padding: 20 },
  name: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  price: { fontSize: 24, fontWeight: '800', color: '#4f46e5' },
  originalPrice: { fontSize: 16, color: '#9ca3af', textDecorationLine: 'line-through' },
  rating: { fontSize: 14, color: '#6b7280', marginLeft: 'auto' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 22 },
  stock: { marginTop: 12, fontSize: 14, color: '#374151' },
  footer: { padding: 20 },
  cartBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 18, alignItems: 'center' },
  cartBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { backgroundColor: '#d1d5db' },
});
