import { Pressable, Text, View } from 'react-native';

export function ErrorInicio({ alReintentar }: { alReintentar: () => void }) {
  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-5">
      <Text accessibilityRole="header" className="font-display text-[26px] text-text">
        No pudimos abrir tus datos
      </Text>
      <Text className="font-body text-[15px] text-text-muted">
        Tu información no se ha borrado. Intenta de nuevo.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={alReintentar}
        className="h-14 items-center justify-center rounded-tile bg-accent"
      >
        <Text className="font-body-semibold text-[16px] text-on-accent">Reintentar</Text>
      </Pressable>
    </View>
  );
}
