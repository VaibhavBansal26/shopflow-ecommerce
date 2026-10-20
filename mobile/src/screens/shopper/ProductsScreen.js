import React, { useEffect, useState } from 'react';
import { View, FlatList, TextInput, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts } from '../../store/slices/productsSlice';
import ProductCard from '../../components/ProductCard';

export default function ProductsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.products);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchProducts({ category: route.params?.categorySlug, limit: 40 }));
  }, [route.params?.categorySlug]);

  const filtered = search
    ? list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search..."
        value={search}
        onChangeText={setSearch}
      />
      {loading ? (
        <ActivityIndicator color="#4f46e5" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  search: { margin: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { gap: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
