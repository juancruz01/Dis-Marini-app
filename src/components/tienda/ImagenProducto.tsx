'use client';

import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

// Foto del producto (URL firmada precargada) o un recuadro neutro si no tiene
export default function ImagenProducto({
  url,
  nombre,
  sizes,
}: {
  url: string | undefined;
  nombre: string;
  sizes: string;
}) {
  if (!url) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[#EAF0F6] text-[#9AAABB]">
        <ImageIcon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return <Image src={url} alt={nombre} fill sizes={sizes} className="object-cover" />;
}
