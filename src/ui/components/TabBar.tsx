import { router, type Tabs } from 'expo-router';
import { Calendar, CreditCard, House, Plus, Settings, type LucideIcon } from 'lucide-react-native';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colores } from '@/ui/theme/tokens';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const PESTANAS: Record<string, { etiqueta: string; Icono: LucideIcon }> = {
  index: { etiqueta: 'Inicio', Icono: House },
  deudas: { etiqueta: 'Deudas', Icono: CreditCard },
  quincena: { etiqueta: 'Quincena', Icono: Calendar },
  ajustes: { etiqueta: 'Ajustes', Icono: Settings },
};

export function TabBar({ state, emitter, navigateToTab, insets }: TabBarProps) {
  const pestanas = state.routes.flatMap((ruta, indice) => {
    const pestana = PESTANAS[ruta.name];
    if (!pestana) return [];
    const activa = state.index === indice;
    const { etiqueta, Icono } = pestana;
    const alPresionar = () => {
      const evento = emitter.emit({
        type: 'tabPress',
        target: ruta.key,
        canPreventDefault: true,
      });
      if (!activa && !evento.defaultPrevented) navigateToTab(ruta.key);
    };
    return [
      <Pressable
        key={ruta.key}
        accessibilityRole="tab"
        accessibilityLabel={etiqueta}
        accessibilityState={{ selected: activa }}
        onPress={alPresionar}
        className="min-h-11 flex-1 items-center gap-1"
      >
        <Icono size={22} strokeWidth={1.8} color={activa ? colores.text : colores['text-dim']} />
        <Text
          className={`text-[11px] ${activa ? 'font-body-semibold text-text' : 'font-body-medium text-text-dim'}`}
        >
          {etiqueta}
        </Text>
      </Pressable>,
    ];
  });

  return (
    <View
      className="flex-row border-t border-border-subtle bg-bg pt-2.5"
      style={{ paddingBottom: insets.bottom + 8 }}
    >
      {pestanas.slice(0, 2)}
      <View className="flex-1 items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar movimiento"
          onPress={() => router.push('/registro')}
          className="-mt-[30px] h-[58px] w-[58px] items-center justify-center rounded-full bg-accent"
        >
          <Plus size={26} strokeWidth={2.4} color={colores['on-accent']} />
        </Pressable>
      </View>
      {pestanas.slice(2)}
    </View>
  );
}
