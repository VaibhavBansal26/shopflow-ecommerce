import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TextInput,
  TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, searchProducts } from '../../store/slices/productsSlice';
import ProductCard from '../../components/ProductCard';
import api from '../../services/api';

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.products);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 20, sort: 'popular' }));
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/recommendations').then((r) => setRecommendations(r.data.recommendations || [])).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (search.trim()) dispatch(searchProducts(search.trim()));
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 ShopFlow</Text>
        <TextInput
          style={styles.search}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {categories.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(i) => i.id}
            contentContainerStyle={styles.catList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.catChip}
                onPress={() => navigation.navigate('Products', { categorySlug: item.slug })}
              >
                <Text style={styles.catText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Popular Products</Text>
      {loading ? (
        <ActivityIndicator color="#4f46e5" style={{ margin: 24 }} />
      ) : (
        <FlatList
          scrollEnabled={false}
          data={list}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })} />
          )}
        />
      )}

      {recommendations.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recommendations}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                style={styles.recCard}
                onPress={() => navigation.navigate('ProductDetail', { slug: item.slug })}
              />
            )}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#4f46e5', padding: 20, paddingTop: 56 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  catList: { paddingHorizontal: 16, gap: 8 },
  catChip: { backgroundColor: '#ede9fe', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  catText: { color: '#4f46e5', fontWeight: '600', fontSize: 13 },
  row: { paddingHorizontal: 12, gap: 8 },
  recCard: { width: 160, marginRight: 12 },
});
