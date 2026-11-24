import { Delete } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colores } from '@/ui/theme/tokens';

const FILAS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['000', '0', 'borrar'],
];
const MAX_DIGITOS = 10;

export function aplicarTecla(digitos: string, tecla: string): string {
  if (tecla === 'borrar') return digitos.slice(0, -1);
  if (digitos === '' && /^0+$/.test(tecla)) return '';
  const nuevo = digitos + tecla;
  return nuevo.length <= MAX_DIGITOS ? nuevo : digitos;
}

type Props = {
  /** Dígitos escritos, sin formato. */
  valor: string;
  onChange: (digitos: string) => void;
};

export function Keypad({ valor, onChange }: Props) {
  return (
    <View className="gap-2">
      {FILAS.map((fila) => (
        <View key={fila.join()} className="flex-row gap-2">
          {fila.map((tecla) => (
            <Pressable
              key={tecla}
              accessibilityRole="button"
              accessibilityLabel={tecla === 'borrar' ? 'Borrar' : tecla}
              onPress={() => onChange(aplicarTecla(valor, tecla))}
              className="h-[58px] flex-1 items-center justify-center rounded-[18px] bg-surface-2"
            >
              {tecla === 'borrar' ? (
                <Delete size={24} strokeWidth={1.8} color={colores.text} />
              ) : (
                <Text className="font-display text-[24px] text-text">{tecla}</Text>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}
