import React from 'react';
import Image from 'next/image';

// Franja azul de arriba de cada pantalla. En celular lleva el logo; en escritorio
// el logo ya está en la barra superior fija.
export default function EncabezadoVista({
  children,
  extra,
}: {
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <header className="bg-brand-dark px-4 pb-5 pt-3 md:pt-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3.5">
        <div className="flex min-h-9 items-center justify-between gap-3 md:hidden">
          <Image src="/marini-logo-blanco.png" alt="Distribuidora Marini" width={122} height={26} priority />
          {extra}
        </div>
        {extra && <div className="hidden md:flex md:justify-end">{extra}</div>}
        {children}
      </div>
    </header>
  );
}
