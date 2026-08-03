'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useCart, Producto } from '../context/CartContext';
import Image from 'next/image';
import { getPresignedUrl } from '../services/mediaService';

export const ImagenProductoR2 = ({ imagenKey, nombre }: { imagenKey: string | null, nombre: string }) => {
  const [urlFinal, setUrlFinal] = useState('/productos/placeholder.jpg');

  useEffect(() => {
    let activo = true;
    getPresignedUrl(imagenKey).then((url) => {
      if (activo) setUrlFinal(url);
    });
    return () => { activo = false; };
  }, [imagenKey]);

  return (
    <Image
      src={urlFinal}
      alt={nombre}
      fill
      sizes="80px"
      className="object-cover"
    />
  );
};

export default function Catalogo() {
  const { cliente, agregarAlCarrito, cart, actualizarCantidad } = useCart();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [categorias, setCategorias] = useState<string[]>([]);

  // ─── Ref y estado para las flechas del carrusel de categorías ────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [puedeIzquierda, setPuedeIzquierda] = useState(false);
  const [puedeDerecha, setPuedeDerecha] = useState(false);

  const actualizarFlechas = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPuedeIzquierda(el.scrollLeft > 4);
    setPuedeDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    actualizarFlechas();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', actualizarFlechas);
    return () => el.removeEventListener('scroll', actualizarFlechas);
  }, [categorias, actualizarFlechas]);

  const scrollear = (dir: 'izquierda' | 'derecha') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'derecha' ? 200 : -200, behavior: 'smooth' });
  };

  useEffect(() => {
    async function cargarProductos() {
      try {
        const { data, error } = await supabase
          .from('productos')
          .select('*')
          .eq('stock_disponible', true)
          .order('nombre', { ascending: true });

        if (error) throw error;

        if (data) {
          setProductos(data);
          const listaCategorias = Array.from(new Set(data.map((p) => p.categoria)));
          setCategorias(['Todos', ...listaCategorias]);
        }
      } catch (err) {
        console.error('Error al cargar productos:', err);
      } finally {
        setCargando(false);
      }
    }
    cargarProductos();
  }, []);

  // Recalcular flechas cuando cambian las categorías
  useEffect(() => {
    setTimeout(actualizarFlechas, 50);
  }, [categorias, actualizarFlechas]);

  const obtenerPrecioSegunLista = (producto: Producto): number => {
    const listaActual = cliente ? cliente.lista_asignada : 3;
    if (listaActual === 1) return producto.precio_lista_1;
    if (listaActual === 2) return producto.precio_lista_2;
    return producto.precio_lista_3;
  };

  const productosFiltrados = productos.filter((producto) => {
    const coincideBusqueda =
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.marca.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria =
      categoriaSeleccionada === 'Todos' || producto.categoria === categoriaSeleccionada;
    return coincideBusqueda && coincideCategoria;
  });

  const obtenerCantidadEnCarrito = (productoId: number): number => {
    const item = cart.find((i) => i.producto.id === productoId);
    return item ? item.cantidad : 0;
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-brand-dark/60">Cargando catálogo mayorista...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* BUSCADOR Y FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por producto o marca (Ej: Barraza, Cremoso...)"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 text-sm font-medium transition text-gray-800 bg-gray-50/50"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Categorías con flechas en desktop */}
        <div className="relative flex items-center gap-1">

          {/* Flecha izquierda — solo desktop */}
          <button
            onClick={() => scrollear('izquierda')}
            disabled={!puedeIzquierda}
            className={`hidden md:flex shrink-0 items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm transition
              ${puedeIzquierda ? 'text-brand-dark hover:bg-gray-50 hover:border-brand-blue' : 'text-gray-300 cursor-default'}`}
            aria-label="Desplazar categorías a la izquierda"
          >
            ‹
          </button>

          {/* Contenedor scrolleable */}
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x flex-1"
            onScroll={actualizarFlechas}
          >
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 whitespace-nowrap snap-start ${
                  categoriaSeleccionada === cat
                    ? 'bg-brand-dark text-white shadow-md shadow-brand-dark/10'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Flecha derecha — solo desktop */}
          <button
            onClick={() => scrollear('derecha')}
            disabled={!puedeDerecha}
            className={`hidden md:flex shrink-0 items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white shadow-sm transition
              ${puedeDerecha ? 'text-brand-dark hover:bg-gray-50 hover:border-brand-blue' : 'text-gray-300 cursor-default'}`}
            aria-label="Desplazar categorías a la derecha"
          >
            ›
          </button>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {productosFiltrados.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-200/60 rounded-2xl p-12 text-center text-gray-400">
            No se encontraron productos que coincidan con la búsqueda.
          </div>
        ) : (
          productosFiltrados.map((producto) => {
            const precioFinal = obtenerPrecioSegunLista(producto);
            const cantidadEnCarrito = obtenerCantidadEnCarrito(producto.id);

            return (
              <div
                key={producto.id}
                className="bg-white border border-gray-200/60 rounded-xl p-4 flex items-center gap-4 hover:shadow-md hover:border-gray-300/80 transition-all duration-200 relative overflow-hidden"
              >
                {/* Imagen */}
                <div className="w-20 h-20 bg-gray-100 rounded-xl shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center text-2xl relative">
                  <ImagenProductoR2 imagenKey={producto.imagen_url} nombre={producto.nombre} />
                </div>

                {/* Info */}
                <div className="grow min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-bold text-brand-dark text-base truncate leading-tight">
                      {producto.nombre}
                    </h4>
                  </div>
                  <p className="text-xs text-brand-blue font-black tracking-wide uppercase mt-0.5">
                    {producto.marca}
                  </p>
                  {producto.informacion_adicional && (
                    <span className="inline-block bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded mt-1.5 border border-green-100">
                      {producto.informacion_adicional}
                    </span>
                  )}
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Venta por <span className="text-gray-600 font-semibold">{producto.unidad_medida}</span>
                  </p>
                </div>

                {/* Precio y controles */}
                <div className="flex flex-col items-end justify-between h-full min-w-30 gap-3">
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block font-bold uppercase tracking-wider">
                      Precio por {producto.unidad_medida}
                    </span>
                    <span className="text-xl font-black text-brand-dark">
                      ${precioFinal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>

                    {/* Estimado para horma y pieza — solo si tiene peso_estimado cargado */}
                    {(producto.unidad_medida.toLowerCase() === 'horma' ||
                      producto.unidad_medida.toLowerCase() === 'pieza') &&
                      producto.peso_estimado && (
                        <span className="block text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-100">
                          Aprox: ${(precioFinal * producto.peso_estimado).toLocaleString('es-AR')} 
                          {' '}x {producto.unidad_medida} ({producto.peso_estimado}kg)
                        </span>
                    )}

                    {/* Estimado para productos vendidos por kilo con peso variable */}
                    {producto.unidad_medida.toLowerCase() === 'kilo' &&
                      producto.peso_estimado && (
                        <span className="block text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-100">
                          Aprox: ${(precioFinal * producto.peso_estimado).toLocaleString('es-AR')} 
                          {' '}x pieza ({producto.peso_estimado}kg)
                        </span>
                    )}
                  </div>

                  {cantidadEnCarrito === 0 ? (
                    <button
                      onClick={() => agregarAlCarrito(producto, 1)}
                      className="bg-brand-blue text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-brand-dark active:scale-[0.97] transition-all flex items-center gap-1 shadow-md shadow-brand-blue/10 uppercase tracking-wider"
                    >
                      <span>+</span> Agregar {producto.unidad_medida.toLowerCase() === 'horma' ? 'Horma' : 'U.'}
                    </button>
                  ) : (
                    <div className="flex items-center bg-gray-100 rounded-xl border border-gray-200 p-0.5 shadow-inner">
                      <button
                        onClick={() => actualizarCantidad(producto.id, cantidadEnCarrito - 1)}
                        className="w-8 h-8 flex items-center justify-center font-black text-gray-600 hover:bg-white rounded-lg transition"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-sm text-brand-dark">
                        {cantidadEnCarrito}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(producto.id, cantidadEnCarrito + 1)}
                        className="w-8 h-8 flex items-center justify-center font-black text-gray-600 hover:bg-white rounded-lg transition"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}