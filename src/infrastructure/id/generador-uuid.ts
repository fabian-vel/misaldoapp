import { randomUUID } from 'expo-crypto';

import type { GeneradorId } from '../../domain/ports/generador-id';

export const generarUuid: GeneradorId = () => randomUUID();
