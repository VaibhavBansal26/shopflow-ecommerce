import React from 'react';
import { useSelector } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import ShopperTabs from './ShopperTabs';
import RiderTabs from './RiderTabs';
import OrderTrackingScreen from '../screens/shopper/OrderTrackingScreen';
import ProductDetailScreen from '../screens/shopper/ProductDetailScreen';
import CheckoutScreen from '../screens/shopper/CheckoutScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const user = useSelector((s) => s.auth.user);

  if (!user) return <AuthNavigator />;

  if (user.role === 'rider') return <RiderTabs />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={ShopperTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Checkout' }} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ headerShown: true, title: 'Track Order' }} />
    </Stack.Navigator>
  );
}
