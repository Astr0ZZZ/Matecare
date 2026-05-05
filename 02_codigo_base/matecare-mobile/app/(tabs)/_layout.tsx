import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#1A531A' }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="chat" 
        options={{ 
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="calendar" 
        options={{ 
          title: 'Calendario',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />
        }} 
      />
    </Tabs>
  )
}
