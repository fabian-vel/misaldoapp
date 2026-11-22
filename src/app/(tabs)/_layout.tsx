import { Tabs } from 'expo-router';

import { TabBar } from '@/ui/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="deudas" />
      <Tabs.Screen name="quincena" />
      <Tabs.Screen name="ajustes" />
    </Tabs>
  );
}
