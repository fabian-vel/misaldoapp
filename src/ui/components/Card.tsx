import { View, type ViewProps } from 'react-native';

type Props = ViewProps & { grande?: boolean };

export function Card({ grande = false, className = '', ...props }: Props) {
  const forma = grande ? 'rounded-card-lg p-[22px]' : 'rounded-card p-4';
  return (
    <View className={`border border-border-subtle bg-surface ${forma} ${className}`} {...props} />
  );
}
