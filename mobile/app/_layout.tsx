import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Görevlerim',
          headerStyle: { backgroundColor: '#3B82F6' },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}
