import React, { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, removeFromCart, updateCartItem, selectCartTotal } from '../../store/slices/cartSlice';

export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((s) => s.cart);
  const total = useSelector(selectCartTotal);

  useEffect(() => { dispatch(fetchCart()); }, []);

  if (loading) return <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Cart</Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>🛒 Your cart is empty</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Image
                  source={{ uri: item.images?.[0] || 'https://via.placeholder.com/80' }}
                  style={styles.img}
                />
                <View style={styles.details}>
                  <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.price}>${parseFloat(item.price).toFixed(2)}</Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => item.quantity > 1
                        ? dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity - 1 }))
                        : dispatch(removeFromCart(item.id))
                      }
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => dispatch(updateCartItem({ itemId: item.id, quantity: item.quantity + 1 }))}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity onPress={() => dispatch(removeFromCart(item.id))}>
                  <Text style={styles.remove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          />
          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingTop: 56 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#9ca3af' },
  list: { padding: 16 },
  item: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, gap: 12, alignItems: 'flex-start' },
  img: { width: 72, height: 72, borderRadius: 8 },
  details: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  price: { fontSize: 15, fontWeight: '700', color: '#4f46e5', marginBottom: 6 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, color: '#4f46e5', fontWeight: '700' },
  qty: { fontSize: 15, fontWeight: '600', color: '#111827', minWidth: 20, textAlign: 'center' },
  remove: { fontSize: 18, color: '#d1d5db', padding: 4 },
  footer: { backgroundColor: '#fff', padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  totalLabel: { fontSize: 17, color: '#374151', fontWeight: '600' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#111827' },
  checkoutBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 18, alignItems: 'center' },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
