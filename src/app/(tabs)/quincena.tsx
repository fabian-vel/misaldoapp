import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';

export default function QuincenaScreen() {
  return (
    <Screen titulo="Quincena">
      <EmptyState titulo="Sin quincena activa" descripcion="Aquí verás pagos, sobrante y corte." />
    </Screen>
  );
}
