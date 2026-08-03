'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Producto {
  id: number;
  nombre: string;
  marca: string;
  categoria: string;
  imagen_url: string;
  informacion_adicional: string;
  unidad_medida: string;
  precio_lista_1: number;
  precio_lista_2: number;
  precio_lista_3: number;
  stock_disponible: boolean;
  peso_estimado: number | null;
}

export interface CartItem {
  producto: Producto;
  cantidad: number;
  precioAplicado: number;
}

export interface ClienteActivo {
  numero_cliente: string;
  nombre_comercio: string;
  lista_asignada: number;
}

interface CartContextType {
  cart: CartItem[];
  cliente: ClienteActivo | null;
  definirCliente: (numero: string, nombre: string, lista: number) => void;
  agregarAlCarrito: (producto: Producto, cantidad: number) => void;
  eliminarDelCarrito: (productoId: number) => void;
  actualizarCantidad: (productoId: number, cantidad: number) => void;
  limpiarCarrito: () => void;
  cerrarSesion: () => void;
  obtenerTotal: () => number;
}

// ─── Helpers de sessionStorage ────────────────────────────────────────────────

const KEYS = {
  carrito: 'distribuidora_carrito',
  cliente: 'distribuidora_cliente',
} as const;

function leerSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function guardarSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage puede fallar en modo privado con cuota llena
  }
}

function eliminarSession(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // silent
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  // ✅ Siempre iniciamos con valores vacíos/null en el servidor Y en el cliente.
  // El typeof window !== 'undefined' en el inicializador de useState causaba
  // hydration mismatch: servidor devolvía [] pero cliente leía sessionStorage.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cliente, setCliente] = useState<ClienteActivo | null>(null);

  // ✅ Cargamos sessionStorage una sola vez, después de la hidratación.
  useEffect(() => {
    const carritoGuardado = leerSession<CartItem[]>(KEYS.carrito);
    const clienteGuardado = leerSession<ClienteActivo>(KEYS.cliente);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (carritoGuardado) setCart(carritoGuardado);
    if (clienteGuardado) setCliente(clienteGuardado);
  }, []);

  // ✅ Persistimos el carrito cada vez que cambia (pero no en el primer render vacío)
  useEffect(() => {
    if (cart.length > 0) {
      guardarSession(KEYS.carrito, cart);
    } else {
      eliminarSession(KEYS.carrito);
    }
  }, [cart]);

  // ─── Acciones ──────────────────────────────────────────────────────────────

  const definirCliente = useCallback((numero: string, nombre: string, lista: number) => {
    const nuevoCliente: ClienteActivo = {
      numero_cliente: numero,
      nombre_comercio: nombre,
      lista_asignada: lista,
    };
    guardarSession(KEYS.cliente, nuevoCliente);
    setCliente(nuevoCliente);
    setCart([]);
    eliminarSession(KEYS.carrito);
  }, []);

  const agregarAlCarrito = useCallback((producto: Producto, cantidad: number) => {
    setCart((prevCart) => {
      // Resolvemos el precio dentro del setter para tener acceso al cliente más reciente
      // a través del closure, sin necesidad de declararlo como dependencia.
      const listaActual = cliente?.lista_asignada ?? 3;

      const precioBase =
        listaActual === 1 ? producto.precio_lista_1 :
        listaActual === 2 ? producto.precio_lista_2 :
        producto.precio_lista_3;

      const esVentaPorPeso =
        producto.unidad_medida.toLowerCase() === 'horma' ||
        producto.unidad_medida.toLowerCase() === 'pieza';

      const precioFinalCalculado = esVentaPorPeso ? precioBase * 3.5 : precioBase;

      const itemExiste = prevCart.find((item) => item.producto.id === producto.id);

      if (itemExiste) {
        return prevCart.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }

      return [...prevCart, { producto, cantidad, precioAplicado: precioFinalCalculado }];
    });
  }, [cliente]);

  const eliminarDelCarrito = useCallback((productoId: number) => {
    setCart((prev) => prev.filter((item) => item.producto.id !== productoId));
  }, []);

  const actualizarCantidad = useCallback((productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    );
  }, [eliminarDelCarrito]);

  const limpiarCarrito = useCallback(() => {
    setCart([]);
    eliminarSession(KEYS.carrito);
  }, []);

  const cerrarSesion = useCallback(() => {
    setCart([]);
    setCliente(null);
    eliminarSession(KEYS.carrito);
    eliminarSession(KEYS.cliente);
  }, []);

  const obtenerTotal = useCallback(() => {
    return cart.reduce((acc, item) => acc + item.precioAplicado * item.cantidad, 0);
  }, [cart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cliente,
        definirCliente,
        agregarAlCarrito,
        eliminarDelCarrito,
        actualizarCantidad,
        limpiarCarrito,
        cerrarSesion,
        obtenerTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};
