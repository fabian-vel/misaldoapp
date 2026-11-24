import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { colores } from '@/ui/theme/tokens';

type Props = {
  etiqueta: string;
  onPress: () => void;
  seleccionado?: boolean;
  Icono?: LucideIcon;
};

export function Chip({ etiqueta, onPress, seleccionado = false, Icono }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      hitSlop={5}
      onPress={onPress}
      className={`h-[34px] flex-row items-center gap-1 rounded-full border bg-surface px-[10px] ${
        seleccionado ? 'border-accent' : 'border-border'
      }`}
    >
      {Icono ? (
        <Icono size={14} strokeWidth={1.8} color={seleccionado ? colores.accent : colores.text} />
      ) : null}
      <Text
        className={`font-body-medium text-[12px] ${seleccionado ? 'text-accent' : 'text-text'}`}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}
