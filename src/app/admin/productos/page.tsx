'use client';

import { getPresignedUploadUrl, deleteFileFromR2 } from '../../../services/mediaService';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminNav from '../../../components/AdminNav';
import { Producto } from '../../../context/CartContext';
import { useRouter } from 'next/navigation';

export default function GestionProductos() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [imagenUrl, setImagenUrl] = useState('');
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Buscador y selección ──────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [porcentaje, setPorcentaje] = useState<string>('');
  const [operacion, setOperacion] = useState<'subir' | 'bajar'>('subir');
  const [aplicandoAjuste, setAplicandoAjuste] = useState(false);
  const [mensajeAjuste, setMensajeAjuste] = useState<string | null>(null);

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

  // ─── Productos filtrados por búsqueda ─────────────────────────────────────
  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  // ─── Selección ────────────────────────────────────────────────────────────
  const toggleSeleccion = (id: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === productosFiltrados.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productosFiltrados.map((p) => p.id)));
    }
  };

  const limpiarSeleccion = () => {
    setSeleccionados(new Set());
    setPorcentaje('');
    setMensajeAjuste(null);
  };

  // ─── Aplicar ajuste porcentual ────────────────────────────────────────────
  const aplicarAjuste = async () => {
    const pct = parseFloat(porcentaje);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setMensajeAjuste('❌ Ingresá un porcentaje válido entre 0.1 y 100.');
      return;
    }
    if (seleccionados.size === 0) {
      setMensajeAjuste('❌ Seleccioná al menos un producto.');
      return;
    }

    const factor = operacion === 'subir' ? 1 + pct / 100 : 1 - pct / 100;
    setAplicandoAjuste(true);
    setMensajeAjuste(null);

    let errores = 0;

    for (const id of seleccionados) {
      const prod = productos.find((p) => p.id === id);
      if (!prod) continue;

      const { error } = await supabase
        .from('productos')
        .update({
          precio_lista_1: Math.round(prod.precio_lista_1 * factor),
          precio_lista_2: Math.round(prod.precio_lista_2 * factor),
          precio_lista_3: Math.round(prod.precio_lista_3 * factor),
        })
        .eq('id', id);

      if (error) errores++;
    }

    await cargarProductos();
    setAplicandoAjuste(false);

    if (errores === 0) {
      setMensajeAjuste(`✅ ${seleccionados.size} producto(s) actualizados correctamente.`);
    } else {
      setMensajeAjuste(`⚠️ ${seleccionados.size - errores} OK, ${errores} con error.`);
    }

    setSeleccionados(new Set());
    setPorcentaje('');
  };

  // ─── Alta / edición ───────────────────────────────────────────────────────
  const abrirAlta = () => {
    setIdEditando(null);
    setNombre(''); setMarca(''); setCategoria('');
    setUnidadMedida('Kilo');
    setPrecio1(0); setPrecio2(0); setPrecio3(0);
    setStock(true); setInfoAdicional(''); setImagenUrl('');
    setModalAbierto(true);
  };

  const abrirEdicion = (p: Producto) => {
    setIdEditando(p.id);
    setNombre(p.nombre); setMarca(p.marca); setCategoria(p.categoria);
    setUnidadMedida(p.unidad_medida);
    setPrecio1(p.precio_lista_1); setPrecio2(p.precio_lista_2); setPrecio3(p.precio_lista_3);
    setStock(p.stock_disponible);
    setInfoAdicional(p.informacion_adicional || '');
    setImagenUrl(p.imagen_url || '');
    setModalAbierto(true);
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    const datosProducto = {
      nombre, marca, categoria,
      unidad_medida: unidadMedida,
      precio_lista_1: Number(precio1),
      precio_lista_2: Number(precio2),
      precio_lista_3: Number(precio3),
      stock_disponible: stock,
      informacion_adicional: infoAdicional.trim() || null,
      imagen_url: imagenUrl.trim(),
    };
    try {
      if (idEditando) {
        const { error } = await supabase.from('productos').update(datosProducto).eq('id', idEditando);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('productos').insert([datosProducto]);
        if (error) throw error;
      }
      setModalAbierto(false);
      cargarProductos();
    } catch (err) {
      const errorDeSupabase = err as { message?: string };
      alert(`Hubo un error: ${errorDeSupabase.message || 'Consulte la consola para más detalles.'}`);
    } finally {
      setCargando(false);
    }
  };

  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Está seguro de que desea eliminar permanentemente este producto del catálogo?')) return;
    setCargando(true);
    try {
      const productoAEliminar = productos.find((p) => p.id === id);
      if (productoAEliminar?.imagen_url) await deleteFileFromR2(productoAEliminar.imagen_url);
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

  const manejarSubidaImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;
    const archivo = archivos[0];
    setSubiendoImagen(true);
    const extension = archivo.name.split('.').pop() || 'jpg';
    const idUnico = crypto.randomUUID();
    const r2Key = `productos/${Date.now()}_${idUnico}.${extension}`;
    try {
      const presignedUrl = await getPresignedUploadUrl(r2Key, archivo.type);
      const respuesta = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': archivo.type },
        body: archivo,
      });
      if (!respuesta.ok) throw new Error('Error al empujar el archivo a R2');
      if (imagenUrl && imagenUrl !== r2Key) await deleteFileFromR2(imagenUrl);
      setImagenUrl(r2Key);
      alert('¡Imagen subida a Cloudflare con éxito!');
    } catch (err) {
      console.error(err);
      alert('No se pudo subir la imagen.');
    } finally {
      setSubiendoImagen(false);
    }
  };

  if (!autenticado) return null;

  const todosSeleccionados =
    productosFiltrados.length > 0 && seleccionados.size === productosFiltrados.length;

  return (
    <div className="min-h-screen bg-brand-light text-gray-800">
      <AdminNav />

      <main className="container mx-auto p-6 max-w-6xl mt-4 space-y-4">

        {/* Header */}
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

        {/* ── Buscador ────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, marca o categoría..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setSeleccionados(new Set());
                setMensajeAjuste(null);
              }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-brand-dark placeholder-gray-400 focus:outline-none focus:border-brand-blue bg-white"
            />
          </div>
          <p className="text-xs text-gray-400 self-center shrink-0">
            {productosFiltrados.length} de {productos.length} productos
          </p>
        </div>

        {/* ── Panel de ajuste porcentual ───────────────────────────────────── */}
        {seleccionados.size > 0 && (
          <div className="bg-white border border-brand-blue/30 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-brand-dark uppercase tracking-wider">
                ✏️ {seleccionados.size} producto(s) seleccionado(s)
              </p>
              <button
                onClick={limpiarSeleccion}
                className="text-[10px] text-gray-400 hover:text-red-500 font-bold transition"
              >
                ✕ Limpiar selección
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Subir / Bajar */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold shrink-0">
                <button
                  onClick={() => setOperacion('subir')}
                  className={`px-4 py-2 transition ${
                    operacion === 'subir'
                      ? 'bg-green-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  ▲ Subir
                </button>
                <button
                  onClick={() => setOperacion('bajar')}
                  className={`px-4 py-2 transition ${
                    operacion === 'bajar'
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  ▼ Bajar
                </button>
              </div>

              {/* Porcentaje */}
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  placeholder="Ej: 6"
                  value={porcentaje}
                  onChange={(e) => setPorcentaje(e.target.value)}
                  className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm text-brand-dark focus:outline-none focus:border-brand-blue bg-white"
                />
                <span className="text-sm font-bold text-gray-500">%</span>
              </div>

              {/* Botón aplicar */}
              <button
                onClick={aplicarAjuste}
                disabled={aplicandoAjuste || !porcentaje}
                className="bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-brand-blue transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {aplicandoAjuste
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Aplicando...</>
                  : `Aplicar a las 3 listas`
                }
              </button>
            </div>

            {/* Feedback */}
            {mensajeAjuste && (
              <p className={`text-xs font-bold ${mensajeAjuste.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
                {mensajeAjuste}
              </p>
            )}
          </div>
        )}

        {/* ── Tabla ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 uppercase tracking-wider">
                  {/* Checkbox seleccionar todos */}
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleTodos}
                      className="w-4 h-4 accent-brand-blue cursor-pointer"
                      title="Seleccionar todos"
                    />
                  </th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Medida</th>
                  <th className="p-4">Lista 1</th>
                  <th className="p-4">Lista 2</th>
                  <th className="p-4">Lista 3</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {cargando && productos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-gray-400 font-bold">Consultando base de datos...</td>
                  </tr>
                ) : productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-gray-400">
                      {busqueda ? `No se encontraron productos para "${busqueda}".` : 'No hay productos en la base de datos.'}
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((p) => {
                    const estaSeleccionado = seleccionados.has(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${estaSeleccionado ? 'bg-brand-blue/5 border-l-2 border-brand-blue' : ''}`}
                        onClick={() => toggleSeleccion(p.id)}
                      >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={estaSeleccionado}
                            onChange={() => toggleSeleccion(p.id)}
                            className="w-4 h-4 accent-brand-blue cursor-pointer"
                          />
                        </td>
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
                            p.stock_disponible
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {p.stock_disponible ? 'Activo' : 'Pausado'}
                          </span>
                        </td>
                        <td className="p-4 text-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => abrirEdicion(p)} className="p-1.5 hover:bg-gray-100 rounded text-brand-blue font-bold" title="Editar">📝</button>
                          <button onClick={() => eliminarProducto(p.id)} className="p-1.5 hover:bg-gray-100 rounded text-red-500" title="Eliminar">🗑️</button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL ALTA/EDICIÓN */}
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
                    <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Lista 3 ($)</label>
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
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={manejarSubidaImagen} />
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