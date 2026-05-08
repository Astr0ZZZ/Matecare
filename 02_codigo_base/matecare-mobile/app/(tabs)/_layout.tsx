import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.background, // Sólido, no transparente
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: theme.typography.boldFont,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: `Centro ${theme.visuals.emojiSet.tabs?.centro || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={theme.visuals.tabIcons.centro as any} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: `Táctica AI ${theme.visuals.emojiSet.tabs?.chat || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={theme.visuals.tabIcons.chat as any} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vision-scan"
        options={{
          title: `Escaneo ${theme.visuals.emojiSet.tabs?.vision || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="camera" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: `Matriz ${theme.visuals.emojiSet.tabs?.matriz || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={theme.visuals.tabIcons.calendar as any} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: `Ranking ${theme.visuals.emojiSet.tabs?.ranking || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: `Perfil ${theme.visuals.emojiSet.tabs?.profile || ''}`,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={theme.visuals.tabIcons.profile as any} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile_partner"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile_cycle"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
