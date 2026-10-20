import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '../../store/slices/authSlice';

export default function RegisterScreen({ navigation }) {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = () => {
    if (!form.name || !form.email || !form.password) return;
    dispatch(register(form));
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.logo}>🛒 ShopFlow</Text>
        <Text style={styles.title}>Create account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {[
          { key: 'name', placeholder: 'Full Name' },
          { key: 'email', placeholder: 'Email', keyboardType: 'email-address', autoCapitalize: 'none' },
          { key: 'phone', placeholder: 'Phone (optional)', keyboardType: 'phone-pad' },
          { key: 'password', placeholder: 'Password', secureTextEntry: true },
        ].map(({ key, ...props }) => (
          <TextInput
            key={key}
            style={styles.input}
            value={form[key]}
            onChangeText={set(key)}
            {...props}
          />
        ))}

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 24, justifyContent: 'center', flexGrow: 1 },
  logo: { fontSize: 28, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#111827', marginBottom: 20 },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 12, fontSize: 14 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15, backgroundColor: '#fff' },
  btn: { backgroundColor: '#4f46e5', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { textAlign: 'center', color: '#6b7280', marginTop: 16, fontSize: 14 },
  linkBold: { color: '#4f46e5', fontWeight: '600' },
});
