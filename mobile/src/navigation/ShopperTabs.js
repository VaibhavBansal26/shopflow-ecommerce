import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import HomeScreen from '../screens/shopper/HomeScreen';
import ProductsScreen from '../screens/shopper/ProductsScreen';
import CartScreen from '../screens/shopper/CartScreen';
import OrdersScreen from '../screens/shopper/OrdersScreen';
import ChatScreen from '../screens/shopper/ChatScreen';
import ProfileScreen from '../screens/shopper/ProfileScreen';
import { selectCartCount } from '../store/slices/cartSlice';

const Tab = createBottomTabNavigator();

const icon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
);

export default function ShopperTabs() {
  const cartCount = useSelector(selectCartCount);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ tabBarIcon: icon('🛍️') }} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: icon('🛒'),
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
        }}
      />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ tabBarIcon: icon('📦') }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarIcon: icon('💬') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
