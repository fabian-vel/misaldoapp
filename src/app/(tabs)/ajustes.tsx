import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';

export default function AjustesScreen() {
  return (
    <Screen titulo="Ajustes">
      <EmptyState titulo="Próximamente" descripcion="Cuentas, avisos y backup." />
    </Screen>
  );
}
