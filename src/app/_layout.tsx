import '@/global.css';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { ErrorInicio } from '@/ui/components/ErrorInicio';
import { useInicioApp } from '@/ui/hooks/use-inicio-app';
import { colores, fuentes } from '@/ui/theme/tokens';

SplashScreen.preventAutoHideAsync();

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colores.bg,
    card: colores.surface,
    border: colores.border,
    text: colores.text,
    primary: colores.accent,
  },
};

export default function RootLayout() {
  const [cargadas, error] = useFonts({
    [fuentes.display]: SpaceGrotesk_600SemiBold,
    [fuentes.cuerpo]: Inter_400Regular,
    [fuentes.cuerpoMedio]: Inter_500Medium,
    [fuentes.cuerpoSemibold]: Inter_600SemiBold,
  });
  const { estado, reintentar } = useInicioApp();
  const listo = (cargadas || !!error) && estado !== 'cargando';

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <ThemeProvider value={tema}>
      <StatusBar style="light" />
      {estado === 'error' ? (
        <ErrorInicio alReintentar={reintentar} />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="registro" options={{ presentation: 'modal' }} />
        </Stack>
      )}
    </ThemeProvider>
  );
}
