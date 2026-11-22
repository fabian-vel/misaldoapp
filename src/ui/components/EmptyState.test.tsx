import { render, screen } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';

test('muestra título y descripción', async () => {
  await render(<EmptyState titulo="Sin deudas" descripcion="Agrega la primera" />);

  expect(screen.getByText('Sin deudas')).toBeTruthy();
  expect(screen.getByText('Agrega la primera')).toBeTruthy();
});
