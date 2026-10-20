import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import RiderDashboard from '../screens/rider/RiderDashboard';
import RiderProfileScreen from '../screens/rider/RiderProfileScreen';

const Tab = createBottomTabNavigator();
const icon = (emoji) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function RiderTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: '#4f46e5', headerShown: false }}>
      <Tab.Screen name="Deliveries" component={RiderDashboard} options={{ tabBarIcon: icon('🏍️') }} />
      <Tab.Screen name="Profile" component={RiderProfileScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
