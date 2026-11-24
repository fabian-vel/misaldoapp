import { fireEvent, render, screen } from '@testing-library/react-native';
import { House } from 'lucide-react-native';
import { Text } from 'react-native';

import { crearDinero, crearMonto } from '@/domain/value-objects/dinero';

import { Amount } from './Amount';
import { Card } from './Card';
import { Chip } from './Chip';
import { aplicarTecla, Keypad } from './Keypad';
import { ListRow } from './ListRow';
import { ProgressBar } from './ProgressBar';
import { Segmented } from './Segmented';

describe('aplicarTecla', () => {
  test.each([
    ['', '5', '5'],
    ['86', '4', '864'],
    ['86', '000', '86000'],
    ['86', '0', '860'],
    ['', '0', ''],
    ['', '000', ''],
    ['864', 'borrar', '86'],
    ['', 'borrar', ''],
    ['1234567890', '1', '1234567890'],
    ['12345678', '000', '12345678'],
  ])('"%s" + %s = "%s"', (digitos, tecla, esperado) => {
    expect(aplicarTecla(digitos, tecla)).toBe(esperado);
  });
});

test('Keypad entrega los dígitos nuevos', async () => {
  const onChange = jest.fn();
  await render(<Keypad valor="86" onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: '4' }));
  expect(onChange).toHaveBeenLastCalledWith('864');
  await fireEvent.press(screen.getByRole('button', { name: 'Borrar' }));
  expect(onChange).toHaveBeenLastCalledWith('8');
});

describe('Amount', () => {
  test('formatea saldo, ingreso, gasto y negativo', async () => {
    await render(
      <>
        <Amount valor={crearDinero(1840500)} tamano="hero" />
        <Amount valor={crearMonto(3200000)} signo="ingreso" />
        <Amount valor={crearMonto(86400)} signo="gasto" />
        <Amount valor={crearDinero(-30000)} />
      </>,
    );
    for (const texto of ['$ 1.840.500', '+ $ 3.200.000', '− $ 86.400', '− $ 30.000']) {
      expect(screen.getByText(texto)).toBeTruthy();
    }
  });
});

describe('ProgressBar', () => {
  test.each([
    [0.42, 42],
    [0, 0],
    [1, 100],
    [-0.5, 0],
    [1.5, 100],
    [NaN, 0],
    [Infinity, 0],
  ])('con %d muestra %d%%', async (valor, esperado) => {
    await render(<ProgressBar valor={valor} />);
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(esperado);
  });
});

test('Chip avisa al tocarlo e indica si está seleccionado', async () => {
  const onPress = jest.fn();
  await render(<Chip etiqueta="Hoy" Icono={House} seleccionado onPress={onPress} />);
  const chip = screen.getByRole('button', { name: 'Hoy', selected: true });
  await fireEvent.press(chip);
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('Segmented marca la opción activa y cambia de valor', async () => {
  const onChange = jest.fn();
  await render(
    <Segmented
      etiquetaAccesible="Tipo"
      opciones={[
        { valor: 'gasto', etiqueta: 'Gasto' },
        { valor: 'ingreso', etiqueta: 'Ingreso' },
      ]}
      valor="gasto"
      onChange={onChange}
    />,
  );
  expect(screen.getByRole('radio', { name: 'Gasto', checked: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole('radio', { name: 'Ingreso' }));
  expect(onChange).toHaveBeenCalledWith('ingreso');
});

describe('ListRow', () => {
  test('muestra su contenido y responde al toque', async () => {
    const onPress = jest.fn();
    await render(
      <ListRow
        titulo="Mercado"
        subtitulo="Hogar · Hoy"
        Icono={House}
        derecha={<Text>Derecha</Text>}
        onPress={onPress}
      />,
    );
    expect(screen.getByText('Hogar · Hoy')).toBeTruthy();
    expect(screen.getByText('Derecha')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('sin acción no se anuncia como botón', async () => {
    await render(<ListRow titulo="Mercado" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

test('Card muestra su contenido', async () => {
  await render(
    <Card grande>
      <Text>Contenido</Text>
    </Card>,
  );
  expect(screen.getByText('Contenido')).toBeTruthy();
});
