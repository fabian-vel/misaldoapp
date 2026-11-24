import { Pressable, Text, View } from 'react-native';

type Props<T extends string> = {
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T;
  onChange: (valor: T) => void;
  /** Resalta la opción activa con el color de acento en vez de blanco. */
  acento?: boolean;
  etiquetaAccesible: string;
};

export function Segmented<T extends string>({
  opciones,
  valor,
  onChange,
  acento = false,
  etiquetaAccesible,
}: Props<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={etiquetaAccesible}
      className="flex-row gap-1 rounded-full border border-border bg-surface p-1"
    >
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        const fondo = acento ? 'bg-accent' : 'bg-text';
        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="radio"
            accessibilityState={{ checked: activa }}
            hitSlop={{ top: 3, bottom: 3 }}
            onPress={() => onChange(opcion.valor)}
            className={`h-[38px] grow items-center justify-center rounded-full px-2 ${
              activa ? fondo : ''
            }`}
          >
            <Text
              numberOfLines={1}
              className={`font-body-semibold text-[13px] ${
                activa ? 'text-on-accent' : 'text-text-muted'
              }`}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
