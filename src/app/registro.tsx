import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';

export default function RegistroScreen() {
  return (
    <Screen titulo="Registro rápido">
      <EmptyState titulo="Próximamente" descripcion="Se implementa en la Fase 1." />
    </Screen>
  );
}
