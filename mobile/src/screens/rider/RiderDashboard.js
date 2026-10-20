import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, updateOrderStatus } from '../../store/slices/ordersSlice';
import api from '../../services/api';
import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

export default function RiderDashboard() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.orders);
  const socketRef = useRef(null);

  useEffect(() => {
    dispatch(fetchOrders());

    const connect = async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      const socket = io(process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001', {
        auth: { token },
        transports: ['websocket'],
      });
      socketRef.current = socket;
      socket.emit('rider_online');
    };
    connect();

    return () => socketRef.current?.disconnect();
  }, []);

  const handlePickup = async (orderId) => {
    try {
      await api.patch(`/riders/orders/${orderId}/pickup`);
      dispatch(updateOrderStatus({ orderId, status: 'out_for_delivery' }));
    } catch {
      Alert.alert('Error', 'Could not update order status');
    }
  };

  const handleDeliver = async (orderId) => {
    try {
      await api.patch(`/riders/orders/${orderId}/deliver`);
      dispatch(fetchOrders());
    } catch {
      Alert.alert('Error', 'Could not mark as delivered');
    }
  };

  if (loading) return <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏍️ My Deliveries</Text>
      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active deliveries</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNum}>#{item.order_number}</Text>
                <View style={[styles.badge, item.status === 'out_for_delivery' ? styles.badgePurple : styles.badgeBlue]}>
                  <Text style={styles.badgeText}>{item.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <Text style={styles.customer}>{item.customer_name}</Text>
              <Text style={styles.address}>
                📍 {typeof item.delivery_address === 'object'
                  ? `${item.delivery_address.line1}, ${item.delivery_address.city}`
                  : item.delivery_address}
              </Text>
              {item.status === 'assigned' && (
                <TouchableOpacity style={styles.pickupBtn} onPress={() => handlePickup(item.id)}>
                  <Text style={styles.pickupText}>Pick Up Order</Text>
                </TouchableOpacity>
              )}
              {item.status === 'out_for_delivery' && (
                <TouchableOpacity style={styles.deliverBtn} onPress={() => handleDeliver(item.id)}>
                  <Text style={styles.deliverText}>✓ Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingTop: 56 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9ca3af' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeBlue: { backgroundColor: '#dbeafe' },
  badgePurple: { backgroundColor: '#ede9fe' },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', color: '#374151' },
  customer: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  address: { fontSize: 13, color: '#374151', marginBottom: 12 },
  pickupBtn: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 14, alignItems: 'center' },
  pickupText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  deliverBtn: { backgroundColor: '#10b981', borderRadius: 10, padding: 14, alignItems: 'center' },
  deliverText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
