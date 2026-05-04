import { Stack } from 'expo-router';

export default function ReadingsLayout() {
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
