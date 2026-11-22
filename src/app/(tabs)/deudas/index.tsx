import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';

export default function DeudasScreen() {
  return (
    <Screen titulo="Deudas">
      <EmptyState titulo="Sin deudas registradas" descripcion="Aquí verás saldos y cuotas." />
    </Screen>
  );
}
