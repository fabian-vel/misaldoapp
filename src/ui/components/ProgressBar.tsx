import { View } from 'react-native';

type Props = {
  /** Progreso de 0 a 1; los valores fuera de rango se ajustan. */
  valor: number;
  alto?: 6 | 8;
};

export function ProgressBar({ valor, alto = 8 }: Props) {
  const porcentaje = Math.round(Math.min(Math.max(Number.isFinite(valor) ? valor : 0, 0), 1) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
      className={`${alto === 6 ? 'h-1.5' : 'h-2'} overflow-hidden rounded-full bg-border`}
    >
      <View className="h-full rounded-full bg-accent" style={{ width: `${porcentaje}%` }} />
    </View>
  );
}
