import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

export default function ProfileScreen() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <Text style={styles.name}>{user?.name}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.section}>
        {[
          { label: '📦 My Orders', onPress: () => {} },
          { label: '📍 Saved Addresses', onPress: () => {} },
          { label: '💳 Payment Methods', onPress: () => {} },
          { label: '🔔 Notifications', onPress: () => {} },
        ].map(({ label, onPress }) => (
          <TouchableOpacity key={label} style={styles.item} onPress={onPress}>
            <Text style={styles.itemText}>{label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20, paddingTop: 56 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  email: { textAlign: 'center', fontSize: 14, color: '#9ca3af', marginBottom: 32 },
  section: { backgroundColor: '#fff', borderRadius: 12 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemText: { fontSize: 15, color: '#374151' },
  chevron: { fontSize: 20, color: '#d1d5db' },
  logoutBtn: { marginTop: 24, backgroundColor: '#fee2e2', borderRadius: 12, padding: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontWeight: '700', fontSize: 16 },
});
