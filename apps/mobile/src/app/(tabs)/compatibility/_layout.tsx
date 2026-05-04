import { Stack } from 'expo-router';

export default function CompatibilityLayout() {
  return (
    <Stack
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    />
  );
}
