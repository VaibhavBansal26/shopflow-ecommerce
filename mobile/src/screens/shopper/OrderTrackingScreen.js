import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrder } from '../../store/slices/ordersSlice';
import { updateOrderStatus } from '../../store/slices/ordersSlice';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const STEPS = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderTrackingScreen({ route }) {
  const dispatch = useDispatch();
  const { orderId } = route.params;
  const order = useSelector((s) => s.orders.current);
  const socketRef = useRef(null);

  useEffect(() => {
    dispatch(fetchOrder(orderId));

    const connect = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      const socket = io(process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.emit('join_order', orderId);

      socket.on('order_status_update', (data) => {
        dispatch(updateOrderStatus({ orderId: data.orderId, status: data.status }));
      });

      socket.on('rider_location', (data) => {
        dispatch(updateOrderStatus({ orderId, riderLocation: data.location }));
      });
    };

    connect();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [orderId]);

  if (!order || order.id !== orderId) {
    return <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />;
  }

  const currentStep = STEPS.indexOf(order.status);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.orderNum}>Order #{order.order_number}</Text>
        <Text style={styles.amount}>${parseFloat(order.total_amount).toFixed(2)}</Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[
              styles.dot,
              i < currentStep && styles.dotDone,
              i === currentStep && styles.dotActive,
            ]}>
              <Text style={styles.dotText}>{i < currentStep ? '✓' : i + 1}</Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[styles.line, i < currentStep && styles.lineDone]} />
            )}
            <Text style={[styles.stepLabel, i === currentStep && styles.stepLabelActive]}>
              {step.replace(/_/g, ' ')}
            </Text>
          </View>
        ))}
      </View>

      {order.riderLocation && (
        <View style={styles.riderCard}>
          <Text style={styles.riderTitle}>🏍️ Rider Location</Text>
          <Text style={styles.riderCoords}>
            {order.riderLocation.lat?.toFixed(4)}, {order.riderLocation.lng?.toFixed(4)}
          </Text>
        </View>
      )}

      <View style={styles.addressCard}>
        <Text style={styles.addressLabel}>Delivering to</Text>
        <Text style={styles.address}>
          {typeof order.delivery_address === 'object'
            ? `${order.delivery_address.line1}, ${order.delivery_address.city}`
            : order.delivery_address}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, alignItems: 'center' },
  orderNum: { fontSize: 17, fontWeight: '700', color: '#111827' },
  amount: { fontSize: 22, fontWeight: '800', color: '#4f46e5', marginTop: 4 },
  steps: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16 },
  step: { alignItems: 'center', marginBottom: 4 },
  dot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#10b981' },
  dotActive: { backgroundColor: '#4f46e5' },
  dotText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  line: { width: 2, height: 24, backgroundColor: '#e5e7eb', marginVertical: 2 },
  lineDone: { backgroundColor: '#10b981' },
  stepLabel: { fontSize: 13, color: '#9ca3af', textTransform: 'capitalize', marginTop: 4 },
  stepLabelActive: { color: '#4f46e5', fontWeight: '600' },
  riderCard: { backgroundColor: '#ede9fe', borderRadius: 12, padding: 16, marginBottom: 16 },
  riderTitle: { fontSize: 15, fontWeight: '600', color: '#4f46e5', marginBottom: 4 },
  riderCoords: { fontSize: 13, color: '#6b7280' },
  addressCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  addressLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 4 },
  address: { fontSize: 15, color: '#111827', fontWeight: '500' },
});
