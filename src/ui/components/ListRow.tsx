import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colores } from '@/ui/theme/tokens';

type Props = {
  titulo: string;
  subtitulo?: string;
  Icono?: LucideIcon;
  /** Contenido a la derecha, normalmente un `Amount`. */
  derecha?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ titulo, subtitulo, Icono, derecha, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3 py-2"
    >
      {Icono ? (
        <View className="h-[42px] w-[42px] items-center justify-center rounded-chip bg-surface-2">
          <Icono size={20} strokeWidth={1.8} color={colores.text} />
        </View>
      ) : null}
      <View className="flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-body-medium text-[15px] text-text">
          {titulo}
        </Text>
        {subtitulo ? (
          <Text numberOfLines={1} className="font-body text-[12px] text-text-muted">
            {subtitulo}
          </Text>
        ) : null}
      </View>
      {derecha}
    </Pressable>
  );
}
