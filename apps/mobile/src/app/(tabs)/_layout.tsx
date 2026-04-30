import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslations } from '@/lib/i18n';
import { useColors } from '@/lib/colors';

export default function TabsLayout() {
  const tNav = useTranslations('navigation');
  const tDashboard = useTranslations('dashboard');
  const colors = useColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.placeholder,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tDashboard('pageTitle'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="charts"
        options={{
          title: tNav('charts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: tNav('compatibility'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="readings"
        options={{
          title: tNav('readings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tNav('settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden screens accessible via router.push */}
      <Tabs.Screen name="horoscope" options={{ href: null }} />
      <Tabs.Screen name="store" options={{ href: null }} />
      <Tabs.Screen name="calendar" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
}
