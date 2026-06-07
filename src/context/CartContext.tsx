'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  
  // 1. Inicialización diferida para el carrito
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const carritoGuardado = sessionStorage.getItem('distribuidora_carrito');
      return carritoGuardado ? JSON.parse(carritoGuardado) : [];
    }
    return [];
  });
  
  // 2. Inicialización diferida para el cliente (¡Adiós useEffect erróneo!)
  const [cliente, setCliente] = useState<ClienteActivo | null>(() => {
    if (typeof window !== 'undefined') {
      const clienteGuardado = sessionStorage.getItem('distribuidora_cliente');
      return clienteGuardado ? JSON.parse(clienteGuardado) : null;
    }
    return null;
  });

  // 3. Este useEffect SOLO se activa para GUARDAR en sessionStorage cuando el carrito cambia
  useEffect(() => {
    if (cart.length > 0) {
      sessionStorage.setItem('distribuidora_carrito', JSON.stringify(cart));
    } else {
      sessionStorage.removeItem('distribuidora_carrito');
    }
  }, [cart]);

  const definirCliente = (numero: string, nombre: string, lista: number) => {
    const nuevoCliente = {
      numero_cliente: numero,
      nombre_comercio: nombre,
      lista_asignada: lista,
    };

    sessionStorage.setItem('distribuidora_cliente', JSON.stringify(nuevoCliente));
    setCliente(nuevoCliente);
    
    setCart([]);
    sessionStorage.removeItem('distribuidora_carrito');
  };

  const agregarAlCarrito = (producto: Producto, cantidad: number) => {
  const listaActual = cliente ? cliente.lista_asignada : 3;
  
  const precioBase = 
    listaActual === 1 ? producto.precio_lista_1 :
    listaActual === 2 ? producto.precio_lista_2 : 
    producto.precio_lista_3;

  // Si se vende por Horma o Pieza, multiplicamos el precio base del kilo por el peso estimado (3.5kg)
  const esVentaPorPeso = producto.unidad_medida.toLowerCase() === 'horma' || producto.unidad_medida.toLowerCase() === 'pieza';
  const precioFinalCalculado = esVentaPorPeso ? (precioBase * 3.5) : precioBase;

  setCart((prevCart) => {
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
};

  const eliminarDelCarrito = (productoId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productoId));
  };

  const actualizarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(productoId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.producto.id === productoId ? { ...item, cantidad } : item
      )
    );
  };

  const limpiarCarrito = () => {
    setCart([]);
    sessionStorage.removeItem('distribuidora_carrito');
  };

  const cerrarSesion = () => {
  setCart([]);
  setCliente(null);
  sessionStorage.removeItem('distribuidora_carrito');
  sessionStorage.removeItem('distribuidora_cliente');
};

  const obtenerTotal = () => {
    return cart.reduce((acc, item) => acc + item.precioAplicado * item.cantidad, 0);
  };

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

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
};