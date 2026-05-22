'use client';

import { useState, useEffect } from 'react';

interface IngredienteFeria {
  ingrediente: string;
  totalNecesario: number;
  enDespensa: number;
  cantidadAComprar: number;
  unidad: string;
}

interface Plato {
  id: number;
  nombre: string;
}

interface RegistroPlan {
  id?: number;
  fecha: string;
  plato_id: number | null;
  nro_personas: number;
}

interface IngredienteForm {
  nombre: string;
  cantidad: number;
  unidad: string;
}

export default function Home() {
  // Pestaña activa en móvil ('menu' o 'compras')
  const [tabActiva, setTabActiva] = useState<'menu' | 'compras'>('menu');

  // Parámetros globales del período
  const [fechaInicio, setFechaInicio] = useState('2026-05-15');
  const [fechaFin, setFechaFin] = useState('2026-05-30'); 
  const [personas, setPersonas] = useState(4);
  
  // Estados de datos
  const [listaFeria, setListaFeria] = useState<IngredienteFeria[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [planPeriodo, setPlanPeriodo] = useState<Record<string, number | null>>({});
  
  // Estados de carga
  const [loadingFeria, setLoadingFeria] = useState(false);
  const [guardandoDia, setGuardandoDia] = useState<string | null>(null);

  // Módulos de gestión (Modales)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [nuevoNombrePlato, setNuevoNombrePlato] = useState('');
  const [ingredientesPlato, setIngredientesPlato] = useState<IngredienteForm[]>([
    { nombre: '', cantidad: 1, unidad: 'kg' }
  ]);
  const [guardandoPlato, setGuardandoPlato] = useState(false);

  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [platoAEditar, setPlatoAEditar] = useState<Plato | null>(null);
  const [ingredientesEditar, setIngredientesEditar] = useState<IngredienteForm[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const generarDiasRango = () => {
    const dias: string[] = [];
    const fechaActual = new Date(fechaInicio + 'T00:00:00');
    const fechaTermino = new Date(fechaFin + 'T00:00:00');
    while (fechaActual <= fechaTermino) {
      dias.push(fechaActual.toISOString().split('T')[0]);
      fechaActual.setDate(fechaActual.getDate() + 1);
    }
    return dias;
  };

  const cargarListaFeria = async () => {
    setLoadingFeria(true);
    try {
      const response = await fetch(`/api/feria?inicio=${fechaInicio}&fin=${fechaFin}`);
      const data = await response.json();
      if (Array.isArray(data)) setListaFeria(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFeria(false);
    }
  };

  const cargarDatosConfig = async () => {
    try {
      const resPlatos = await fetch('/api/platos');
      const dataPlatos = await resPlatos.json();
      if (Array.isArray(dataPlatos)) setPlatos(dataPlatos);

      const resPlan = await fetch(`/api/planificador?inicio=${fechaInicio}&fin=${fechaFin}`);
      const dataPlan: RegistroPlan[] = await resPlan.json();
      
      const mapaPlan: Record<string, number | null> = {};
      if (Array.isArray(dataPlan)) {
        dataPlan.forEach(reg => { mapaPlan[reg.fecha] = reg.plato_id; });
      }
      setPlanPeriodo(mapaPlan);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarListaFeria();
    cargarDatosConfig();
  }, [fechaInicio, fechaFin]);

  const handleCambioPlato = async (fecha: string, platoIdStr: string) => {
    const plato_id = platoIdStr === '' ? null : Number(platoIdStr);
    setGuardandoDia(fecha);
    setPlanPeriodo(prev => ({ ...prev, [fecha]: plato_id }));
    try {
      const response = await fetch('/api/planificador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, plato_id, nro_personas: personas })
      });
      if (response.ok) await cargarListaFeria();
    } catch (error) {
      console.error(error);
    } finally {
      setGuardandoDia(null);
    }
  };

  const agregarFilaIngrediente = () => {
    setIngredientesPlato([...ingredientesPlato, { nombre: '', cantidad: 1, unidad: 'kg' }]);
  };

  const handleIngredienteChange = (index: number, campo: string, valor: any) => {
    const nuevosIngredientes = [...ingredientesPlato];
    nuevosIngredientes[index] = { ...nuevosIngredientes[index], [campo]: valor };
    setIngredientesPlato(nuevosIngredientes);
  };

  const guardarNuevoPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoPlato(true);
    const ingValidos = ingredientesPlato.filter(i => i.nombre.trim() !== '');
    try {
      const response = await fetch('/api/platos/nuevo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombrePlato: nuevoNombrePlato, 
          ingredientes: ingValidos 
        })
      });
      if (response.ok) {
        setNuevoNombrePlato('');
        setIngredientesPlato([{ nombre: '', cantidad: 1, unidad: 'kg' }]);
        setModalAbierto(false);
        await cargarDatosConfig();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGuardandoPlato(false);
    }
  };

  const abrirEditorPlato = async (plato: Plato) => {
    setPlatoAEditar(plato);
    setModalEditarAbierto(true);
    setLoadingDetalle(true);
    try {
      const res = await fetch(`/api/platos/detalle?id=${plato.id}`);
      const data = await res.json();
      if (Array.isArray(data)) setIngredientesEditar(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const guardarEdicionPlato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platoAEditar) return;
    const ingValidos = ingredientesEditar.filter(i => i.nombre.trim() !== '');
    try {
      const response = await fetch('/api/platos/detalle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platoId: platoAEditar.id, ingredientes: ingValidos })
      });
      if (response.ok) {
        setModalEditarAbierto(false);
        await cargarDatosConfig();
        await cargarListaFeria();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const eliminarPlato = async () => {
    if (!platoAEditar || !confirm(`¿Estás seguro de eliminar permanentemente "${platoAEditar.nombre}"?`)) return;
    try {
      const response = await fetch(`/api/platos/eliminar?id=${platoAEditar.id}`, { method: 'DELETE' });
      if (response.ok) {
        setModalEditarAbierto(false);
        await cargarDatosConfig();
        await cargarListaFeria();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const listaDias = generarDiasRango();
  const itemsPendientes = listaFeria.filter(item => item.cantidadAComprar > 0).length;

  return (
    <main className="min-h-screen bg-slate-50/70 text-slate-900 font-sans antialiased pb-24 selection:bg-emerald-100">
      
      {/* HEADER DE LA APP */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 px-4 py-4 shadow-2xs">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase">Smart Shopping</span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">Mi Feria</h1>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-xs hover:bg-slate-800 active:scale-95 transition-all shrink-0"
          >
            ＋ Nuevo Plato
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        
        {/* NAVEGACIÓN POR PESTAÑAS (TABS) */}
        <div className="flex bg-slate-200/60 p-1 rounded-2xl mb-6 max-w-md mx-auto">
          <button
            onClick={() => setTabActiva('menu')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all ${
              tabActiva === 'menu' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🗓️ Plan de Menú
          </button>
          <button
            onClick={() => setTabActiva('compras')}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              tabActiva === 'compras' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🛒 Lista de Compras
            {itemsPendientes > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {itemsPendientes}
              </span>
            )}
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL CENTRADO */}
        <div className="space-y-6 max-w-2xl mx-auto">
          
          {/* SECCIÓN 1: PLANIFICADOR */}
          <div className={`space-y-6 ${tabActiva === 'menu' ? 'block' : 'hidden'}`}>
            
            {/* Panel de Período Optimizado para iPhone */}
            <section className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Configuración del Período</h2>
              
              <div className="space-y-4">
                {/* Fila 1: Inputs de Fechas con ancho completo para no apretarse */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Desde</label>
                    <input 
                      type="date" 
                      value={fechaInicio} 
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 appearance-none min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hasta</label>
                    <input 
                      type="date" 
                      value={fechaFin} 
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 appearance-none min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Fila 2: Control de Personas Táctil (Stepper) */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/70 p-3 rounded-2xl min-h-[52px]">
                  <div>
                    <p className="text-xs font-black text-slate-800">Comensales</p>
                    <p className="text-[10px] text-slate-400 font-medium">Recetas calculadas para:</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Botón Disminuir */}
                    <button
                      type="button"
                      onClick={() => setPersonas(Math.max(1, personas - 1))}
                      className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-base text-slate-700 shadow-3xs active:bg-slate-100 active:scale-90 transition-all select-none"
                    >
                      －
                    </button>
                    
                    {/* Visualizador del número */}
                    <span className="w-8 text-center text-sm font-black text-slate-900">
                      {personas}
                    </span>
                    
                    {/* Botón Aumentar */}
                    <button
                      type="button"
                      onClick={() => setPersonas(personas + 1)}
                      className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-base text-slate-700 shadow-3xs active:bg-slate-100 active:scale-90 transition-all select-none"
                    >
                      ＋
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Listado del Menú Diario */}
            <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h2 className="text-sm font-black text-slate-800 mb-4 flex justify-between items-center">
                <span>Cronograma Diario</span>
                <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">{listaDias.length} días</span>
              </h2>
              
              <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1 scrollbar-thin">
                {listaDias.map((fecha) => {
                  const objetoFecha = new Date(fecha + 'T00:00:00');
                  const nombreDia = objetoFecha.toLocaleDateString('es-ES', { weekday: 'short' });
                  const nroDia = objetoFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                  const valorSeleccionado = planPeriodo[fecha] !== undefined && planPeriodo[fecha] !== null ? String(planPeriodo[fecha]) : '';
                  const estaCocinando = valorSeleccionado !== '';

                  return (
                    <div 
                      key={fecha} 
                      className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${
                        estaCocinando ? 'bg-emerald-50/40 border-emerald-100 shadow-3xs' : 'bg-slate-50/50 border-slate-200/60'
                      }`}
                    >
                      <div className={`text-center min-w-[52px] rounded-xl p-2 border shadow-3xs ${
                        estaCocinando ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        <p className={`text-[9px] font-black uppercase ${estaCocinando ? 'text-emerald-100' : 'text-emerald-600'}`}>{nombreDia}</p>
                        <p className="text-xs font-black tracking-tight leading-none mt-0.5">{nroDia}</p>
                      </div>

                      <div className="flex-1">
                        <select
                          value={valorSeleccionado}
                          onChange={(e) => handleCambioPlato(fecha, e.target.value)}
                          disabled={guardandoDia === fecha}
                          className="w-full bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer p-1"
                        >
                          <option value="">✨ Sin planificar (Día libre)</option>
                          {platos.map(plato => (
                            <option key={plato.id} value={plato.id}>{plato.nombre}</option>
                          ))}
                        </select>
                      </div>
                      {guardandoDia === fecha && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Catálogo de Recetas */}
            <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h2 className="text-sm font-black text-slate-800 mb-1">Catálogo de Recetas</h2>
              <p className="text-xs text-slate-400 font-medium mb-4">Administra los ingredientes base de tus comidas</p>
              <div className="flex flex-wrap gap-2 max-h-[22vh] overflow-y-auto pr-1">
                {platos.map(plato => (
                  <button
                    key={plato.id} onClick={() => abrirEditorPlato(plato)}
                    className="bg-slate-50 hover:bg-slate-900 border border-slate-200 text-slate-700 hover:text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    {plato.nombre}
                    <span className="text-[10px] opacity-40">⚙️</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* SECCIÓN 2: LISTA DE COMPRAS */}
          <div className={`${tabActiva === 'compras' ? 'block' : 'hidden'}`}>
            <section className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-base font-black text-slate-900">Lista Netiada</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Restando el stock de tu despensa</p>
                </div>
                <button 
                  onClick={cargarListaFeria}
                  className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-2 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  {loadingFeria ? 'Calculando...' : '🔄 Recargar'}
                </button>
              </div>

              {listaFeria.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center border border-dashed border-slate-200 py-12">
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">Asigna platos en el calendario para ver qué necesitas comprar.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[66vh] overflow-y-auto pr-1 scrollbar-thin">
                  {listaFeria.map((item, idx) => {
                    const listoEnCasa = item.cantidadAComprar === 0;

                    return (
                      <div 
                        key={idx} 
                        className={`rounded-2xl p-3.5 flex justify-between items-center border transition-all ${
                          listoEnCasa 
                            ? 'border-slate-100 bg-slate-50/60 opacity-40' 
                            : 'bg-white border-slate-200/70 shadow-2xs'
                        }`}
                      >
                        <div>
                          <h3 className={`font-black text-sm ${listoEnCasa ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.ingrediente}</h3>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                            Feria: {Number(item.totalNecesario).toFixed(2)} {item.unidad} | Casa: {Number(item.enDespensa).toFixed(2)}
                          </p>
                        </div>
                        
                        <div>
                          {listoEnCasa ? (
                            <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-md">✓ Cubierto</span>
                          ) : (
                            <span className="bg-amber-50 text-amber-800 text-xs font-black px-3 py-1.5 rounded-xl border border-amber-100/50">
                              {/* Corregido: Removido el fallback redundante a amountToBuy */}
                              {Number(item.cantidadAComprar).toFixed(2)} {item.unidad}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

        </div>
      </div>

      {/* MODAL 1: REGISTRAR NUEVOS PLATOS */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 mb-4">Nuevo Plato en Recetario</h3>
            <form onSubmit={guardarNuevoPlato} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre Comercial</label>
                <input
                  type="text" required placeholder="Ej. Seco de Pollo" value={nuevoNombrePlato}
                  onChange={(e) => setNuevoNombrePlato(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ingredientes (1 Persona)</label>
                  <button type="button" onClick={agregarFilaIngrediente} className="text-emerald-600 text-xs font-bold hover:underline">＋ Añadir fila</button>
                </div>
                <div className="space-y-2">
                  {ingredientesPlato.map((ing, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text" placeholder="Insumo" required value={ing.nombre}
                        onChange={(e) => handleIngredienteChange(index, 'nombre', e.target.value)}
                        className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                      <input
                        type="number" step="0.001" required value={ing.cantidad}
                        onChange={(e) => handleIngredienteChange(index, 'cantidad', Number(e.target.value))}
                        className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-center font-black"
                      />
                      <select value={ing.unidad} onChange={(e) => handleIngredienteChange(index, 'unidad', e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded-xl py-2 text-xs font-bold text-slate-600">
                        <option value="kg">kg</option><option value="und">und</option><option value="litro">litro</option><option value="paquete">paq</option><option value="pieza">pz</option><option value="sol">sol</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setModalAbierto(false)} className="flex-1 bg-slate-100 text-slate-500 font-bold text-xs py-3 rounded-xl active:scale-95 transition-all">Cancelar</button>
                <button type="submit" disabled={guardandoPlato} className="flex-1 bg-emerald-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-xs">{guardandoPlato ? 'Guardando...' : 'Crear Plato'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR / ELIMINAR PLATO EXISTENTE */}
      {modalEditarAbierto && platoAEditar && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto border border-slate-100">
            <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editor de Receta</span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{platoAEditar.nombre}</h3>
              </div>
              <button
                type="button" onClick={eliminarPlato}
                className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-2 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors active:scale-95"
              >
                🗑️ Eliminar
              </button>
            </div>

            {loadingDetalle ? (
              <p className="text-slate-400 text-xs font-bold text-center py-8">Consultando TiDB Cloud...</p>
            ) : (
              <form onSubmit={guardarEdicionPlato} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Insumos Requeridos</label>
                    <button
                      type="button"
                      onClick={() => setIngredientesEditar([...ingredientesEditar, { nombre: '', cantidad: 1, unidad: 'kg' }])}
                      className="text-emerald-600 text-xs font-bold hover:underline"
                    >
                      ＋ Añadir fila
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ingredientesEditar.map((ing, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text" required value={ing.nombre}
                          onChange={(e) => { const n = [...ingredientesEditar]; n[index].nombre = e.target.value; setIngredientesEditar(n); }}
                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                        />
                        <input
                          type="number" step="0.001" required value={ing.cantidad}
                          onChange={(e) => { const n = [...ingredientesEditar]; n[index].cantidad = Number(e.target.value); setIngredientesEditar(n); }}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-center font-black"
                        />
                        <select
                          value={ing.unidad}
                          onChange={(e) => { const n = [...ingredientesEditar]; n[index].unidad = e.target.value; setIngredientesEditar(n); }}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-xl py-2 text-xs font-bold text-slate-600"
                        >
                          {/* Corregido: Agregadas unidades locales faltantes para consistencia en la edición */}
                          <option value="kg">kg</option><option value="und">und</option><option value="litro">litro</option><option value="paquete">paq</option><option value="pieza">pz</option><option value="sol">sol</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button" onClick={() => setModalEditarAbierto(false)}
                    className="flex-1 bg-slate-100 text-slate-500 font-bold text-xs py-3 rounded-xl active:scale-95 transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}