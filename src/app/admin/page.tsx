'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminNav from '../../components/AdminNav';
import Link from 'next/link';

export default function AdminDashboard() {
  const [totalProductos, setTotalProductos] = useState(0);
  const [totalClientes, setTotalClientes] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargarMetricas() {
      try {
        // Consultamos la cantidad de filas en ambas tablas
        const { count: countProd } = await supabase.from('productos').select('*', { count: 'exact', head: true });
        const { count: countCli } = await supabase.from('clientes').select('*', { count: 'exact', head: true });

        setTotalProductos(countProd || 0);
        setTotalClientes(countCli || 0);
      } catch (err) {
        console.error('Error al cargar métricas de administración:', err);
      } finally {
        setCargando(false);
      }
    }

    cargarMetricas();
  }, []);

  return (
    <div className="min-h-screen bg-brand-light text-gray-800">
      <AdminNav />

      <main className="container mx-auto p-6 max-w-6xl mt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-black text-brand-dark tracking-tight">Panel de Control</h2>
          <p className="text-gray-500 text-sm mt-0.5">Bienvenido. Desde aquí puede gestionar el catálogo general de la distribuidora.</p>
        </div>

        {cargando ? (
          <div className="py-20 text-center text-sm font-bold text-gray-400">Cargando métricas...</div>
        ) : (
          <>
            {/* TARJETAS DE MÉTRICAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Productos en Catálogo</span>
                  <span className="text-4xl font-black text-brand-dark mt-1 block">{totalProductos}</span>
                </div>
                <div className="text-3xl p-4 bg-brand-light rounded-xl text-brand-blue">🧀</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Clientes Registrados</span>
                  <span className="text-4xl font-black text-brand-dark mt-1 block">{totalClientes}</span>
                </div>
                <div className="text-3xl p-4 bg-brand-light rounded-xl text-brand-blue">👥</div>
              </div>
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-xs space-y-4">
              <h3 className="font-bold text-brand-dark text-base">Acciones Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link 
                  href="/admin/productos" 
                  className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-blue hover:bg-brand-light/30 transition text-left block"
                >
                  <span className="font-bold text-brand-dark text-sm block">📦 Gestionar Lista de Precios</span>
                  <span className="text-xs text-gray-400 mt-1 block">Modificar importes de Listas 1, 2 y 3 o pausar stock de fiambres.</span>
                </Link>

                <Link 
                  href="/admin/clientes" 
                  className="p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-brand-blue hover:bg-brand-light/30 transition text-left block"
                >
                  <span className="font-bold text-brand-dark text-sm block">👥 Administrar Cuentas de Comercio</span>
                  <span className="text-xs text-gray-400 mt-1 block">Dar de alta nuevos almacenes o cambiar la tarifa asignada a un cliente.</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}