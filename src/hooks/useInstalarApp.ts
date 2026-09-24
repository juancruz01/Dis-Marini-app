'use client';

import { useCallback, useEffect, useState } from 'react';

// Evento que Chrome/Edge en Android disparan cuando la web se puede instalar
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type ModoInstalacion =
  | 'instalada' // ya se abrió como app instalada
  | 'boton' // Android/escritorio: podemos mostrar el diálogo nativo
  | 'ios' // iPhone/iPad: hay que explicar "Compartir → Agregar a inicio"
  | 'manual'; // otros navegadores: desde el menú del navegador

export function useInstalarApp() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [modo, setModo] = useState<ModoInstalacion>('manual');

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModo(standalone ? 'instalada' : esIOS ? 'ios' : 'manual');

    const alPoderInstalar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
      setModo('boton');
    };
    const alInstalar = () => {
      setEvento(null);
      setModo('instalada');
    };

    window.addEventListener('beforeinstallprompt', alPoderInstalar);
    window.addEventListener('appinstalled', alInstalar);
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoderInstalar);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  const instalar = useCallback(async () => {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }, [evento]);

  return { modo, instalar };
}
