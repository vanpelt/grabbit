import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Text, TouchableOpacity } from 'react-native';
import { TrackingProvider } from '../hooks/useTracking';

export default function RootLayout() {
  return (
    <TrackingProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: 'Grabbit',
            headerTransparent: true,
            headerTintColor: '#fff',
            headerRight: () => (
              <TouchableOpacity onPress={() => router.push('/settings')}>
                <Ionicons name="settings-outline" size={24} color="white" style={{ marginRight: 15 }} />
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            presentation: 'modal', 
            title: 'Settings',
            headerRight: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                <Text style={{ color: '#007AFF', fontSize: 17 }}>Done</Text>
              </TouchableOpacity>
            )
          }} 
        />
      </Stack>
    </TrackingProvider>
  );
}
