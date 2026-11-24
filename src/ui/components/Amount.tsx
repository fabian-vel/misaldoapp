import { Text } from 'react-native';

import {
  formatearDinero,
  formatearGasto,
  formatearIngreso,
  type Dinero,
} from '@/domain/value-objects/dinero';

const TAMANOS = {
  hero: 'font-display text-[42px] tracking-[-1.5px]',
  total: 'font-display text-[36px] tracking-[-1px]',
  destacado: 'font-display text-[20px]',
  cuerpo: 'font-body-semibold text-[15px]',
};

type Props = {
  valor: Dinero;
  signo?: 'ingreso' | 'gasto';
  tamano?: keyof typeof TAMANOS;
  /** Color de la cifra, p. ej. `text-accent`. */
  className?: string;
};

export function Amount({ valor, signo, tamano = 'cuerpo', className = 'text-text' }: Props) {
  const texto =
    signo === 'ingreso'
      ? formatearIngreso(valor)
      : signo === 'gasto'
        ? formatearGasto(valor)
        : formatearDinero(valor);
  return (
    <Text
      adjustsFontSizeToFit
      numberOfLines={1}
      className={`${TAMANOS[tamano]} ${className}`}
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {texto}
    </Text>
  );
}
