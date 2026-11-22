import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';

export default function InicioScreen() {
  return (
    <Screen titulo="Resumen">
      <EmptyState
        titulo="Aún no hay movimientos"
        descripcion="Aquí verás tu disponible de la quincena."
      />
    </Screen>
  );
}
