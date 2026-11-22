import { Text, View } from 'react-native';

type Props = { titulo: string; descripcion: string };

export function EmptyState({ titulo, descripcion }: Props) {
  return (
    <View className="mt-4 gap-1 rounded-card border border-border-subtle bg-surface p-5">
      <Text className="font-body-semibold text-[15px] text-text">{titulo}</Text>
      <Text className="font-body text-[13px] text-text-muted">{descripcion}</Text>
    </View>
  );
}
