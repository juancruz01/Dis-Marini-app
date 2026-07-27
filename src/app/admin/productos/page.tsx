'use client';

import { getPresignedUploadUrl, deleteFileFromR2 } from '../../../services/mediaService';
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminNav from '../../../components/AdminNav';
import { Producto } from '../../../context/CartContext';
import { useRouter } from 'next/navigation';

export default function GestionProductos() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [imagenUrl, setImagenUrl] = useState(''); // Aquí guardaremos la "Key" del archivo (ej: "productos/queso-123.jpg")
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados del Formulario (Alta / Edición)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidadMedida, setUnidadMedida] = useState('Kilo');
  const [precio1, setPrecio1] = useState(0);
  const [precio2, setPrecio2] = useState(0);
  const [precio3, setPrecio3] = useState(0);
  const [stock, setStock] = useState(true);
  const [infoAdicional, setInfoAdicional] = useState('');

  // Validar sesión de administrador
  useEffect(() => {
    async function verificarSesion() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setAutenticado(true);
        cargarProductos();
      }
    }
    verificarSesion();
  }, [router]);

  // Traer todos los productos (incluyendo los pausados sin stock)
  async function cargarProductos() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      if (data) setProductos(data);
    } catch (err) {
      console.error('Error al cargar catálogo de administración:', err);
    } finally {
      setCargando(false);
    }
  }

  // Limpiar formulario y abrir modal para nuevo producto
  const abrirAlta = () => {
    setIdEditando(null);
    setNombre('');
    setMarca('');
    setCategoria('');
    setUnidadMedida('Kilo');
    setPrecio1(0);
    setPrecio2(0);
    setPrecio3(0);
    setStock(true);
    setInfoAdicional('');
    setImagenUrl('');
    setModalAbierto(true);
  };

  // Cargar datos del producto para edición
  const abrirEdicion = (p: Producto) => {
    setIdEditando(p.id);
    setNombre(p.nombre);
    setMarca(p.marca);
    setCategoria(p.categoria);
    setUnidadMedida(p.unidad_medida);
    setPrecio1(p.precio_lista_1);
    setPrecio2(p.precio_lista_2);
    setPrecio3(p.precio_lista_3);
    setStock(p.stock_disponible);
    setInfoAdicional(p.informacion_adicional || '');
    setImagenUrl(p.imagen_url || '');
    setModalAbierto(true);
  };

  // 5. Guardar Cambios (Insert o Update)
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    const datosProducto = {
      nombre,
      marca,
      categoria,
      unidad_medida: unidadMedida,
      precio_lista_1: Number(precio1),
      precio_lista_2: Number(precio2),
      precio_lista_3: Number(precio3),
      stock_disponible: stock,
      informacion_adicional: infoAdicional.trim() || null,
      imagen_url: imagenUrl.trim()
    };

    try {
      if (idEditando) {
        // Actualizar existente
        const { error } = await supabase
          .from('productos')
          .update(datosProducto)
          .eq('id', idEditando);
        if (error) throw error;
      } else {
      // Insertar nuevo
      const { error } = await supabase
        .from('productos')
        .insert([datosProducto]);
      if (error) throw error;
    }

      setModalAbierto(false);
      cargarProductos();
    } catch (err) {
      // Conversión segura para evitar el "any" y que ESLint no proteste
      const errorDeSupabase = err as { message?: string };
      
      console.error('Error detallado de Supabase:', errorDeSupabase);
      alert(`Hubo un error: ${errorDeSupabase.message || 'Consulte la consola para más detalles.'}`);
    } finally {
      setCargando(false);
    }
  };

  // 6. Eliminar Producto (Baja)
  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar permanentemente este producto del catálogo?')) return;
    setCargando(true);

    try {
      // 1. Buscamos el producto para obtener la ruta de su imagen
      const productoAEliminar = productos.find(p => p.id === id);

      // 2. Si tenía una imagen en R2, la borramos primero
      if (productoAEliminar?.imagen_url) {
        await deleteFileFromR2(productoAEliminar.imagen_url);
      }

      // 3. Borramos el producto de Supabase
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;

      cargarProductos();
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      alert('No se pudo eliminar el producto.');
    } finally {
      setCargando(false);
    }
  };

  if (!autenticado) return null;
  
  
  // MANEJO DE IMAGENES EN CLOUDFLARE (CORREGIDO)
  const manejarSubidaImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;

    const archivo = archivos[0];
    setSubiendoImagen(true);

    // 1. Extraemos la extensión original (.jpg, .png, etc.)
    const extension = archivo.name.split('.').pop() || 'jpg';
    
    // 2. Generamos un ID 100% ÚNICO global usando UUID + Timestamp
    const idUnico = crypto.randomUUID(); 
    const r2Key = `productos/${Date.now()}_${idUnico}.${extension}`;

    try {
      // Pedimos la URL firmada
      const presignedUrl = await getPresignedUploadUrl(r2Key, archivo.type);

      // Subimos el archivo a Cloudflare R2
      const respuesta = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': archivo.type },
        body: archivo,
      });

      if (!respuesta.ok) throw new Error('Error al empujar el archivo a R2');

      if (imagenUrl && imagenUrl !== r2Key) {
        await deleteFileFromR2(imagenUrl);
      }

      // Guardamos la nueva key única
      setImagenUrl(r2Key);
      alert('¡Imagen subida a Cloudflare con éxito!');
    } catch (err) {
      console.error(err);
      alert('No se pudo subir la imagen.');
    } finally {
      setSubiendoImagen(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light text-gray-800">
      <AdminNav />

      <main className="container mx-auto p-6 max-w-6xl mt-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-brand-dark tracking-tight">Catálogo General de Productos</h2>
            <p className="text-xs text-gray-400">Modifique precios de las 3 listas mayoristas o pause el stock en tiempo real.</p>
          </div>
          <button
            onClick={abrirAlta}
            className="bg-brand-blue text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-brand-dark transition-all shadow-md shadow-brand-blue/10"
          >
            ➕ Nuevo Producto
          </button>
        </div>

        {/* TABLA DE PRODUCTOS */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Medida</th>
                  <th className="p-4">Lista 1</th>
                  <th className="p-4">Lista 2</th>
                  <th className="p-4">Lista 3 (Inv.)</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {cargando && productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400 font-bold">Consultando base de datos...</td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400">No hay productos en la base de datos.</td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-brand-dark text-sm block">{p.nombre}</span>
                        <span className="text-[10px] text-brand-blue font-black uppercase tracking-wide">{p.marca} | {p.categoria}</span>
                        {p.informacion_adicional && (
                          <span className="block text-[9px] text-green-600 font-bold mt-0.5">{p.informacion_adicional}</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 font-semibold">{p.unidad_medida}</td>
                      <td className="p-4 font-bold text-brand-dark">${p.precio_lista_1.toLocaleString('es-AR')}</td>
                      <td className="p-4 font-bold text-brand-dark">${p.precio_lista_2.toLocaleString('es-AR')}</td>
                      <td className="p-4 font-bold text-brand-dark">${p.precio_lista_3.toLocaleString('es-AR')}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.stock_disponible ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {p.stock_disponible ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-1">
                        <button onClick={() => abrirEdicion(p)} className="p-1.5 hover:bg-gray-100 rounded text-brand-blue font-bold" title="Editar">📝</button>
                        <button onClick={() => eliminarProducto(p.id)} className="p-1.5 hover:bg-gray-100 rounded text-red-500" title="Eliminar">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL ACCESIBLE FORMULARIO ALTA/EDICIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 space-y-4">
            <h3 className="text-lg font-black text-brand-dark">{idEditando ? 'Modificar Ítem' : 'Cargar Nuevo Ítem'}</h3>
            
            <form onSubmit={guardarProducto} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Comercial</label>
                  <input type="text" required placeholder="Ej: Queso Cremoso" className="w-full p-2.5 border rounded-xl" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Marca</label>
                  <input type="text" required placeholder="Ej: Barraza" className="w-full p-2.5 border rounded-xl" value={marca} onChange={(e) => setMarca(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Categoría</label>
                  <input type="text" required placeholder="Ej: Quesos Blandos" className="w-full p-2.5 border rounded-xl" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unidad de Medida</label>
                  <select className="w-full p-2.5 border rounded-xl bg-white" value={unidadMedida} onChange={(e) => setUnidadMedida(e.target.value)}>
                    <option value="Kilo">Kilo</option>
                    <option value="Horma">Horma</option>
                    <option value="Pieza">Pieza</option>
                    <option value="Unidad">Unidad</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN PRECIOS DE LAS 3 LISTAS */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-3">
                <span className="block font-bold text-brand-dark text-[10px] uppercase tracking-wider">Configuración de Listas Mayoristas (Precio Base x Kilo/U.)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Lista 1 ($)</label>
                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg bg-white" value={precio1} onChange={(e) => setPrecio1(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Lista 2 ($)</label>
                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg bg-white" value={precio2} onChange={(e) => setPrecio2(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Lista 3 / Invitados ($)</label>
                    <input type="number" step="0.01" required className="w-full p-2 border rounded-lg bg-white" value={precio3} onChange={(e) => setPrecio3(Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Información Adicional (Opcional)</label>
                <input type="text" placeholder="Ej: Sin TACC / Horma reducida en sal" className="w-full p-2.5 border rounded-xl" value={infoAdicional} onChange={(e) => setInfoAdicional(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase">Imagen del Producto</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={manejarSubidaImagen} 
                  />
                  <button
                    type="button"
                    disabled={subiendoImagen}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-dark rounded-xl font-bold text-xs transition"
                  >
                    {subiendoImagen ? '🔄 Subiendo...' : '📁 Seleccionar Foto'}
                  </button>
                  
                  {imagenUrl && (
                    <span className="text-[10px] text-green-600 font-mono truncate max-w-50">
                      ✓ {imagenUrl.split('/').pop()}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-gray-400">La foto se alojará de forma segura en Cloudflare R2 y quedará vinculada permanentemente al ítem.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Disponibilidad de Stock</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 font-bold text-gray-600">
                    <input type="radio" checked={stock === true} onChange={() => setStock(true)} /> Disponible (Visible en Catálogo)
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-gray-600">
                    <input type="radio" checked={stock === false} onChange={() => setStock(false)} /> Pausado (Sin Stock)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setModalAbierto(false)} className="px-4 py-2 bg-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-dark transition">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}