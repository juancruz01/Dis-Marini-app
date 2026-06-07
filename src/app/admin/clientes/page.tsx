'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminNav from '../../../components/AdminNav';
import { useRouter } from 'next/navigation';

// Definimos la interfaz local para el Cliente de la base de datos
interface ClienteDB {
  id: number;
  numero_cliente: string;
  nombre_comercio: string;
  lista_asignada: number;
  telefono?: string;
  created_at?: string;
}

export default function GestionClientes() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);

  // Estados del Formulario (Alta / Edición)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [numeroCliente, setNumeroCliente] = useState('');
  const [nombreComercio, setNombreComercio] = useState('');
  const [listaAsignada, setListaAsignada] = useState(3);
  const [telefono, setTelefono] = useState('');

  // 1. Validar sesión de administrador
  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setAutenticado(true);
        cargarClientes();
      }
    }
    verificarSesion();
  }, [router]);

  // 2. Traer todos los clientes ordenados por nombre de comercio
  async function cargarClientes() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nombre_comercio', { ascending: true });

      if (error) throw error;
      if (data) setClientes(data);
    } catch (err) {
      console.error('Error al cargar listado de clientes:', err);
    } finally {
      setCargando(false);
    }
  }

  // 3. Limpiar formulario para nuevo cliente
  const abrirAlta = () => {
    setIdEditando(null);
    // Sugerimos un número de cliente al azar de 4 dígitos para agilizar, el admin puede cambiarlo
    const sugerido = Math.floor(1000 + Math.random() * 9000).toString();
    setNumeroCliente(sugerido);
    setNombreComercio('');
    setListaAsignada(3);
    setTelefono('');
    setModalAbierto(true);
  };

  // 4. Cargar datos para edición
  const abrirEdicion = (c: ClienteDB) => {
    setIdEditando(c.id);
    setNumeroCliente(c.numero_cliente);
    setNombreComercio(c.nombre_comercio);
    setListaAsignada(c.lista_asignada);
    setTelefono(c.telefono || '');
    setModalAbierto(true);
  };

  // 5. Guardar o Actualizar Cliente
  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const datosCliente = {
      numero_cliente: numeroCliente.trim(),
      nombre_comercio: nombreComercio.trim(),
      lista_asignada: Number(listaAsignada),
      telefono: telefono.trim() || null,
    };

    try {
      if (idEditando) {
        // Modificar comercio existente
        const { error } = await supabase
          .from('clientes')
          .update(datosCliente)
          .eq('id', idEditando);
        if (error) throw error;
      } else {
        // Validar primero que el código de cliente no esté repetido
        const { data: existe } = await supabase
          .from('clientes')
          .select('id')
          .eq('numero_cliente', datosCliente.numero_cliente)
          .maybeSingle();

        if (existe) {
          alert('⚠️ El Número de Cliente (Código de ingreso) ya está asignado a otro comercio. Elija uno diferente.');
          setCargando(false);
          return;
        }

        // Insertar nuevo comercio
        const { error } = await supabase
          .from('clientes')
          .insert([datosCliente]);
        if (error) throw error;
      }

      setModalAbierto(false);
      cargarClientes();
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      alert('Hubo un error al guardar los datos en Supabase.');
    } finally {
      setCargando(false);
    }
  };

  // 6. Eliminar Cliente (Baja de la distribuidora)
  const eliminarCliente = async (id: number, nombre: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar al comercio "${nombre}"? Ya no podrá loguearse a la aplicación.`)) return;
    setCargando(true);

    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      cargarClientes();
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      alert('No se pudo eliminar el cliente.');
    } finally {
      setCargando(false);
    }
  };

  if (!autenticado) return null;

  return (
    <div className="min-h-screen bg-brand-light text-gray-800">
      <AdminNav />

      <main className="container mx-auto p-6 max-w-6xl mt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-brand-dark tracking-tight">Administración de Clientes</h2>
            <p className="text-xs text-gray-400">Dé de alta comercios habilitados y controle qué lista de precios se les aplica al ingresar.</p>
          </div>
          <button
            onClick={abrirAlta}
            className="bg-brand-blue text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/10"
          >
            👥 Nuevo Cliente
          </button>
        </div>

        {/* TABLA DE CLIENTES REGISTRADOS */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Comercio / Razón Social</th>
                  <th className="p-4">Código de Acceso</th>
                  <th className="p-4">Tarifa Asignada</th>
                  <th className="p-4">Teléfono contacto</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {cargando && clientes.length === 0 ? (
                  <tr key="loading">
                    <td colSpan={5} className="p-10 text-center text-gray-400 font-bold">Consultando base de datos...</td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr key="empty">
                    <td colSpan={5} className="p-10 text-center text-gray-400">No hay clientes dados de alta en el sistema.</td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-brand-dark text-sm block">{c.nombre_comercio}</span>
                        <span className="text-[9px] text-gray-400 font-normal">Registrado en la plataforma</span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono bg-brand-light text-brand-dark px-2.5 py-1 rounded-md font-bold text-xs border border-gray-200/40">
                          {c.numero_cliente}
                        </span>
                      </td>
                      <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase ${
                                c.lista_asignada === 1 ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                c.lista_asignada === 2 ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                                Lista {c.lista_asignada}
                            </span>
                        </td>
                      <td className="p-4 text-gray-500 font-semibold">{c.telefono || '—'}</td>
                      <td className="p-4 text-center space-x-1">
                        <button onClick={() => abrirEdicion(c)} className="p-1.5 hover:bg-gray-100 rounded text-brand-blue font-bold" title="Editar">📝</button>
                        <button onClick={() => eliminarCliente(c.id, c.nombre_comercio)} className="p-1.5 hover:bg-gray-100 rounded text-red-500" title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL FORMULARIO CLIENTES */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-brand-dark">
              {idEditando ? 'Modificar Datos del Cliente' : 'Registrar Nuevo Comercio'}
            </h3>
            
            <form onSubmit={guardarCliente} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre del Comercio / Almacén</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Fiambrería Los Dos Chinos" 
                  className="w-full p-2.5 border rounded-xl outline-none focus:border-brand-blue" 
                  value={nombreComercio} 
                  onChange={(e) => setNombreComercio(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Código de Ingreso (N°)</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={10}
                    placeholder="Ej: 1024" 
                    className="w-full p-2.5 border rounded-xl font-mono font-bold text-brand-dark outline-none focus:border-brand-blue" 
                    value={numeroCliente} 
                    onChange={(e) => setNumeroCliente(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número de Teléfono</label>
                  <input 
                    type="text" 
                    placeholder="Ej: 1123456789" 
                    className="w-full p-2.5 border rounded-xl outline-none focus:border-brand-blue" 
                    value={telefono} 
                    onChange={(e) => setTelefono(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Lista de Precios Mayorista Asignada</label>
                <select 
                  className="w-full p-2.5 border rounded-xl bg-white font-bold text-gray-700" 
                  value={listaAsignada} 
                  onChange={(e) => setListaAsignada(Number(e.target.value))}
                >
                  <option value={1}>Lista 1 (Tarifa Super Mayorista / Distribuidores)</option>
                  <option value={2}>Lista 2 (Tarifa Intermedia / Almacenes Grandes)</option>
                  <option value={3}>Lista 3 (Tarifa Estándar / Minoristas e Invitados)</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Este comercio verá automáticamente los precios vinculados a esta lista al loguearse en la web.</p>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-dark transition">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}