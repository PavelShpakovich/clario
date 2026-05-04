import { Stack } from 'expo-router';

export default function ChartsLayout() {
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
