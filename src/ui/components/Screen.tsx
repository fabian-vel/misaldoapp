import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { titulo: string; children?: ReactNode };

export function Screen({ titulo, children }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-bg px-5" style={{ paddingTop: top + 16 }}>
      <Text accessibilityRole="header" className="font-display text-[26px] text-text">
        {titulo}
      </Text>
      {children}
    </View>
  );
}
