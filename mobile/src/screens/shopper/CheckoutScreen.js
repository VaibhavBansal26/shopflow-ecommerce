import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { placeOrder } from '../../store/slices/ordersSlice';
import { fetchCart, selectCartTotal } from '../../store/slices/cartSlice';

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading } = useSelector((s) => s.orders);
  const total = useSelector(selectCartTotal);
  const [address, setAddress] = useState({ line1: '', city: '', zip: '' });
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(null);

  const set = (key) => (val) => setAddress((a) => ({ ...a, [key]: val }));

  const handlePlaceOrder = async () => {
    if (!address.line1 || !address.city) return Alert.alert('Error', 'Please fill delivery address');
    const result = await dispatch(placeOrder({
      deliveryAddress: address,
      paymentMethod,
      couponCode: coupon || undefined,
    }));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(fetchCart());
      navigation.navigate('OrderTracking', { orderId: result.payload.order.id });
    } else {
      Alert.alert('Order failed', result.payload || 'Please try again');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.section}>Delivery Address</Text>
      <TextInput style={styles.input} placeholder="Street address" value={address.line1} onChangeText={set('line1')} />
      <TextInput style={styles.input} placeholder="City" value={address.city} onChangeText={set('city')} />
      <TextInput style={styles.input} placeholder="ZIP Code" value={address.zip} onChangeText={set('zip')} keyboardType="numeric" />

      <Text style={styles.section}>Payment Method</Text>
      {['card', 'cash', 'gpay'].map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.methodBtn, paymentMethod === m && styles.methodActive]}
          onPress={() => setPaymentMethod(m)}
        >
          <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
            {m === 'card' ? '💳 Card' : m === 'cash' ? '💵 Cash on Delivery' : '📱 Google Pay'}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.section}>Coupon Code</Text>
      <View style={styles.couponRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Enter code"
          value={coupon}
          onChangeText={setCoupon}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.applyBtn}>
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${total.toFixed(2)}</Text>
        </View>
        {discount && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Discount</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>-${discount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { fontWeight: '700' }]}>Total</Text>
          <Text style={[styles.summaryValue, { fontWeight: '800', fontSize: 18 }]}>
            ${(total - (discount || 0)).toFixed(2)}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.placeBtn} onPress={handlePlaceOrder} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeBtnText}>Place Order</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  section: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 10 },
  methodBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 16, marginBottom: 8 },
  methodActive: { borderColor: '#4f46e5', backgroundColor: '#ede9fe' },
  methodText: { fontSize: 15, color: '#374151' },
  methodTextActive: { color: '#4f46e5', fontWeight: '600' },
  couponRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  applyBtn: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '600' },
  summary: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 20, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 15, color: '#6b7280' },
  summaryValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  placeBtn: { backgroundColor: '#4f46e5', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  placeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
