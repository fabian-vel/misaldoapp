import { useEffect, useState } from 'react';

import { iniciarAplicacion } from '@/di/contenedor';

type EstadoInicio = 'cargando' | 'listo' | 'error';

export function useInicioApp() {
  const [estado, setEstado] = useState<EstadoInicio>('cargando');
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    iniciarAplicacion().then(
      () => {
        if (activo) setEstado('listo');
      },
      (error: unknown) => {
        console.error('No se pudo iniciar la base de datos', error);
        if (activo) setEstado('error');
      },
    );
    return () => {
      activo = false;
    };
  }, [intento]);

  const reintentar = () => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  };

  return { estado, reintentar };
}
