import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../../store/slices/ordersSlice';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  out_for_delivery: '#6366f1',
  delivered: '#10b981',
  cancelled: '#ef4444',
};

export default function OrdersScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.orders);

  useEffect(() => { dispatch(fetchOrders()); }, []);

  if (loading) return <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Orders</Text>
      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>📦 No orders yet</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('OrderTracking', { orderId: item.id })}
            >
              <View style={styles.row}>
                <Text style={styles.number}>#{item.order_number}</Text>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#6b7280') + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#6b7280' }]}>
                    {item.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
              <Text style={styles.amount}>${parseFloat(item.total_amount).toFixed(2)}</Text>
            </TouchableOpacity>
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
  emptyText: { fontSize: 18, color: '#9ca3af' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  number: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  date: { fontSize: 13, color: '#9ca3af', marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: '#4f46e5' },
});
