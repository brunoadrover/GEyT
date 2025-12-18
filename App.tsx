
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Settings, 
  Plus, 
  Trash2, 
  FileText,
  Search,
  ChevronDown,
  MinusCircle,
  PlusCircle,
  X,
  Layers,
  Lock,
  ArrowRight
} from 'lucide-react';
import { StorageService } from './services/storage';
import { 
  InventoryItem, 
  MinStockConfig, 
  ViewType, 
  EQUIPMENT_TYPES, 
  COMPONENT_TYPES, 
  COMPONENT_GROUPS, 
  ComponentGroupName, 
  getItemGroup 
} from './types';
import { DEPT_NAME, BRAND_RGB, LOGO_IMAGE } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [configs, setConfigs] = useState<MinStockConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    code: '',
    location: '',
    description: '',
    componentType: COMPONENT_TYPES[0],
    equipmentType: EQUIPMENT_TYPES[0],
    quantity: 0
  });

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  useEffect(() => {
    const storedItems = StorageService.getItems();
    const storedConfigs = StorageService.getConfigs();
    setItems(storedItems);
    setConfigs(storedConfigs);
    setIsInitialized(true);
    
    const authStatus = sessionStorage.getItem('roggio_auth');
    if (authStatus === 'true') setIsAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isInitialized) StorageService.saveItems(items);
  }, [items, isInitialized]);

  useEffect(() => {
    if (isInitialized) StorageService.saveConfigs(configs);
  }, [configs, isInitialized]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'deposito2026') {
      setIsAuthenticated(true);
      sessionStorage.setItem('roggio_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
      setPasswordInput('');
    }
  };

  const getItemMinStock = (item: InventoryItem) => {
    const itemSpecific = configs.find(c => c.itemId === item.id);
    if (itemSpecific) return itemSpecific.minQuantity;
    const group = getItemGroup(item.componentType);
    const groupConfig = configs.find(c => c.equipmentType === item.equipmentType && c.componentGroup === group);
    if (groupConfig) return groupConfig.minQuantity;
    const equipmentOnly = configs.find(c => c.equipmentType === item.equipmentType && !c.componentGroup && !c.itemId);
    return equipmentOnly ? equipmentOnly.minQuantity : 0;
  };

  const criticalItems = useMemo(() => items.filter(item => item.quantity < getItemMinStock(item)), [items, configs]);
  const atLimitItems = useMemo(() => items.filter(item => {
    const min = getItemMinStock(item);
    return item.quantity === min && min > 0;
  }), [items, configs]);
  const totalAlerts = criticalItems.length + atLimitItems.length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = { ...newItem, id: generateId() };
    setItems(prev => [...prev, item]);
    setShowAddModal(false);
    setNewItem({ code: '', location: '', description: '', componentType: COMPONENT_TYPES[0], equipmentType: EQUIPMENT_TYPES[0], quantity: 0 });
  };

  const handleAdjustStock = (isAddition: boolean) => {
    if (!adjustingItem) return;
    const modifier = isAddition ? 1 : -1;
    const newQuantity = Math.max(0, adjustingItem.quantity + (adjustAmount * modifier));
    setItems(prev => prev.map(i => i.id === adjustingItem.id ? { ...i, quantity: newQuantity } : i));
    setAdjustingItem(null);
    setAdjustAmount(1);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setItems(prev => prev.filter(item => item.id !== itemToDelete.id));
    setConfigs(prev => prev.filter(config => config.itemId !== itemToDelete.id));
    setItemToDelete(null);
  };

  const updateMatrixConfig = (equipment: string, group: ComponentGroupName, val: number) => {
    setConfigs(prev => {
      const filtered = prev.filter(c => !(c.equipmentType === equipment && c.componentGroup === group));
      return [...filtered, { id: generateId(), equipmentType: equipment, componentGroup: group, minQuantity: val }];
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFillColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]); 
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14).setFont('helvetica', 'bold').text('Benito Roggio e Hijos S.A.', 15, 10);
    doc.setFontSize(7).setFont('helvetica', 'normal').text(DEPT_NAME, 15, 15);
    doc.setTextColor(30, 41, 59).setFontSize(12).setFont('helvetica', 'bold').text('REPORTE DE REPOSICIÓN DE STOCK', 15, 30);
    let currentY = 40;
    if (criticalItems.length > 0) {
      doc.setTextColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]).setFontSize(10).text('URGENTE: ELEMENTOS BAJO EL MÍNIMO', 15, currentY + 5);
      const data = criticalItems.map(item => [item.code, item.description, getItemGroup(item.componentType), item.quantity.toString(), getItemMinStock(item).toString()]);
      autoTable(doc, { 
        startY: currentY + 8, 
        head: [['Código', 'Descripción', 'Grupo', 'Stock', 'Mínimo']], 
        body: data, 
        theme: 'striped',
        headStyles: { fillColor: [175, 43, 30] }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }
    if (atLimitItems.length > 0) {
      doc.setTextColor(249, 115, 22).setFontSize(10).text('EN LÍMITE: CONSIDERAR REPOSICIÓN', 15, currentY + 5);
      const data = atLimitItems.map(item => [item.code, item.description, getItemGroup(item.componentType), item.quantity.toString(), getItemMinStock(item).toString()]);
      autoTable(doc, { 
        startY: currentY + 8, 
        head: [['Código', 'Descripción', 'Grupo', 'Stock', 'Mínimo']], 
        body: data, 
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] }
      });
    }
    doc.save(`Reposicion_Roggio_${todayStr.replace(/\//g, '-')}.pdf`);
  };

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center p-6 z-[200]">
        <div className="max-w-md w-full animate-in zoom-in">
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border">
            <div className="p-12 text-center bg-slate-900">
              <img 
                src={LOGO_IMAGE} 
                alt="Roggio Logo" 
                className="m-auto mb-8 w-48 h-auto brightness-0 invert" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://www.roggio.com.ar/img/logo-benito-roggio.png';
                }}
              />
              <div className="space-y-2">
                <h1 className="text-white text-xl font-black uppercase tracking-[0.2em]">Gestión de Stock</h1>
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">{DEPT_NAME}</p>
              </div>
            </div>
            
            <form onSubmit={handleLogin} className="p-12 gap-8 flex flex-col">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center m-auto mb-4">
                  <Lock size={20} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Acceso Restringido</h2>
                <p className="text-slate-400 text-sm font-bold">Por favor, ingrese su clave de acceso para continuar.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="relative">
                  <input 
                    autoFocus
                    type="password" 
                    placeholder="Ingrese clave..." 
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (loginError) setLoginError(false);
                    }}
                    className={`w-full px-8 py-5 bg-slate-50 border-2 rounded-2xl text-center font-black tracking-widest text-slate-900 outline-none transition-all ${loginError ? 'border-red-500 shake-animation' : 'border-slate-100'}`}
                  />
                  {loginError && (
                    <p className="text-red-500 text-[11px] font-bold text-center mt-3 animate-bounce">Clave incorrecta. Reintente.</p>
                  )}
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  INGRESAR AL PANEL
                  <ArrowRight size={20} />
                </button>
              </div>

              <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Benito Roggio e Hijos S.A. &copy; 2024
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 text-slate-900 selection:bg-red-100 animate-in">
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed h-full border-r border-slate-800 z-10">
        <div className="p-8 border-b border-slate-800 flex justify-center items-center h-24">
          <div className="flex flex-col items-center">
             <div className="w-1.5 h-1.5 rounded-full bg-red-600 mb-2"></div>
             <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Panel Control</span>
          </div>
        </div>
        <nav className="flex-1 p-4 gap-2 flex flex-col mt-4">
          {[
            { id: 'inventory', label: 'Depósito', icon: Package },
            { id: 'min-stock', label: 'Stock Crítico', icon: AlertTriangle, badge: totalAlerts },
            { id: 'config', label: 'Configuración', icon: Settings }
          ].map(view => (
            <button key={view.id} onClick={() => setActiveView(view.id as ViewType)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === view.id ? 'bg-red-600 shadow-lg' : 'text-slate-400'}`}>
              <view.icon size={20} />
              <span className="font-semibold tracking-wide">{view.label}</span>
              {view.badge ? <span className="ml-auto bg-white text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{view.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold tracking-widest uppercase">GE&T • ROGGIO</div>
      </aside>

      <main className="flex-1 ml-72 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight capitalize">{activeView === 'inventory' ? 'Depósito' : activeView === 'min-stock' ? 'Stock Crítico' : 'Configuración'}</h2>
            <p className="text-slate-600 mt-2 font-bold flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>{DEPT_NAME}</p>
          </div>
          {activeView === 'inventory' && (
            <button onClick={() => setShowAddModal(true)} className="bg-red-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black shadow-xl shadow-red-600/30 transition-all active:scale-95">
              <Plus size={24} /> Agregar Elemento
            </button>
          )}
          {activeView === 'min-stock' && totalAlerts > 0 && (
            <button onClick={exportPDF} className="bg-red-600 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-xl shadow-red-600/30 transition-all active:scale-95">
              <FileText size={22} /> Generar Pedido PDF
            </button>
          )}
        </header>

        <div className="bg-white rounded-[2rem] shadow-xl border overflow-hidden">
          {activeView === 'inventory' && (
            <>
              <div className="p-8 border-b bg-slate-50">
                <div className="relative w-[32rem]">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                  <input type="text" placeholder="Buscar por código o descripción..." className="w-full pl-20 pr-6 py-4 bg-white border-2 rounded-2xl text-slate-900 font-bold outline-none transition-all focus:border-red-600/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-widest">
                      <th className="px-10 py-6">Código</th>
                      <th className="px-10 py-6">Descripción</th>
                      <th className="px-10 py-6">Equipo</th>
                      <th className="px-10 py-6">Grupo</th>
                      <th className="px-10 py-6">Stock</th>
                      <th className="px-10 py-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => {
                      const min = getItemMinStock(item);
                      const isBelow = item.quantity < min;
                      const isAtLimit = item.quantity === min && min > 0;
                      const group = getItemGroup(item.componentType);
                      return (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-10 py-6 font-mono text-xs font-black text-slate-950">{item.code}</td>
                          <td className="px-10 py-6 text-sm text-slate-950 font-black">{item.description}</td>
                          <td className="px-10 py-6 text-sm font-bold text-slate-500">{item.equipmentType}</td>
                          <td className="px-10 py-6">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500">{group}</span>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-black ${isBelow ? 'text-red-600' : isAtLimit ? 'text-orange-500' : 'text-slate-950'}`}>
                                {item.quantity}
                              </span>
                              {isBelow && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                              {isAtLimit && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                            </div>
                          </td>
                          <td className="px-10 py-6 text-center gap-2 flex justify-center">
                            <button onClick={() => setAdjustingItem(item)} className="p-3 bg-slate-50 text-slate-400 rounded-xl transition-all hover:text-red-600"><PlusCircle size={20}/></button>
                            <button onClick={() => setItemToDelete(item)} className="p-3 bg-slate-50 text-slate-400 rounded-xl transition-all hover:text-red-600"><Trash2 size={20}/></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeView === 'min-stock' && (
            <div className="p-8 gap-28 flex flex-col">
              {criticalItems.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6 bg-red-50 p-4 rounded-2xl border border-red-100">
                    <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
                    <h3 className="font-black text-red-600 uppercase tracking-widest text-sm">Urgente (Bajo el Mínimo)</h3>
                  </div>
                  <div className="overflow-x-auto border rounded-2xl shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-200 text-[10px] font-black uppercase text-slate-900 tracking-wider">
                          <th className="px-6 py-4">Código</th>
                          <th className="px-6 py-4">Descripción</th>
                          <th className="px-6 py-4 text-center">Grupo</th>
                          <th className="px-6 py-4 text-center">Stock</th>
                          <th className="px-6 py-4 text-center">Mínimo</th>
                          <th className="px-6 py-4 text-center text-red-700">Faltante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {criticalItems.map(item => {
                          const min = getItemMinStock(item);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-mono text-xs font-black text-black">{item.code}</td>
                              <td className="px-6 py-4 text-sm font-black text-black">{item.description}</td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{getItemGroup(item.componentType)}</td>
                              <td className="px-6 py-4 text-center font-black text-red-600">{item.quantity}</td>
                              <td className="px-6 py-4 text-center text-slate-400">{min}</td>
                              <td className="px-6 py-4 text-center font-black text-slate-950">{min - item.quantity}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {atLimitItems.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <h3 className="font-black text-orange-600 uppercase tracking-widest text-sm">En Umbral (Considerar Reposición)</h3>
                  </div>
                  <div className="overflow-x-auto border rounded-2xl shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-200 text-[10px] font-black uppercase text-slate-900 tracking-wider">
                          <th className="px-6 py-4">Código</th>
                          <th className="px-6 py-4">Descripción</th>
                          <th className="px-6 py-4 text-center">Grupo</th>
                          <th className="px-6 py-4 text-center">Stock</th>
                          <th className="px-6 py-4 text-center">Mínimo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {atLimitItems.map(item => {
                          const min = getItemMinStock(item);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-mono text-xs font-black text-black">{item.code}</td>
                              <td className="px-6 py-4 text-sm font-black text-black">{item.description}</td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{getItemGroup(item.componentType)}</td>
                              <td className="px-6 py-4 text-center font-black text-orange-600">{item.quantity}</td>
                              <td className="px-6 py-4 text-center text-slate-400">{min}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-500 font-bold flex items-center gap-2 px-2">
                    <AlertTriangle size={14} className="text-orange-500" />
                    * La adquisición de estos elementos está sujeta a revisión de stock proyectado.
                  </p>
                </section>
              )}

              {totalAlerts === 0 && (
                <div className="py-24 text-center">
                  <Package className="m-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-black text-lg">Depósito con niveles suficientes.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'config' && (
            <div className="p-12 gap-16 flex flex-col">
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100"><Layers size={32} /></div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900">Configuración de Matriz</h3>
                    <p className="text-slate-500 font-bold">Determina el stock mínimo para cada intersección de Equipo y Grupo.</p>
                  </div>
                </div>
                <div className="overflow-x-auto border-2 border-slate-50 rounded-[2rem] shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        <th className="p-6 text-left">Tipo de Equipo</th>
                        {Object.keys(COMPONENT_GROUPS).map(g => <th key={g} className="p-6 text-center">{g}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {EQUIPMENT_TYPES.map(eq => (
                        <tr key={eq} className="hover:bg-slate-50/50">
                          <td className="p-6 font-black text-slate-700 text-sm">{eq}</td>
                          {(Object.keys(COMPONENT_GROUPS) as ComponentGroupName[]).map(group => {
                            const config = configs.find(c => c.equipmentType === eq && c.componentGroup === group);
                            return (
                              <td key={group} className="p-4 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  value={config?.minQuantity || 0}
                                  onChange={(e) => updateMatrixConfig(eq, group, parseInt(e.target.value) || 0)}
                                  className="w-full max-w-[80px] m-auto block px-3 py-2 bg-white border-2 rounded-xl text-center font-black outline-none text-slate-950 focus:border-red-600/50"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* MODAL BORRAR */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900 z-[110] flex items-center justify-center p-6" style={{backgroundColor: 'rgba(15, 23, 42, 0.9)'}}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden p-10 text-center animate-in zoom-in">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center m-auto mb-6 border-4 border-red-100"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">¿Eliminar elemento?</h3>
            <p className="text-slate-500 font-bold mb-8">Confirmas la baja de <span className="text-slate-900">"{itemToDelete.description}"</span>.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">ELIMINAR AHORA</button>
              <button onClick={() => setItemToDelete(null)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black transition-all">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJUSTAR STOCK */}
      {adjustingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{backgroundColor: 'rgba(15, 23, 42, 0.95)'}}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in">
            <div className="bg-slate-50 px-10 py-10 border-b text-center">
              <span className="text-[11px] font-black text-red-600 uppercase tracking-widest mb-3 block">Movimiento Depósito</span>
              <h3 className="text-3xl font-black text-slate-900">{adjustingItem.description}</h3>
              <p className="text-slate-400 font-mono text-sm mt-1">{adjustingItem.code}</p>
            </div>
            <div className="p-12 gap-8 flex flex-col bg-white text-center">
              <div className="text-7xl font-black text-slate-900 tracking-tighter mb-10">{adjustingItem.quantity}</div>
              <div className="bg-slate-950 p-10 rounded-[2rem] flex flex-col items-center justify-center gap-6 border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-8">
                  <button onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))} className="w-14 h-14 bg-slate-800 border-none rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all"><MinusCircle size={32}/></button>
                  <input type="number" min="1" value={adjustAmount} onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))} className="w-32 text-center text-8xl font-black bg-transparent outline-none text-white selection:bg-red-900 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]"/>
                  <button onClick={() => setAdjustAmount(adjustAmount + 1)} className="w-14 h-14 bg-slate-800 border-none rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all"><PlusCircle size={32}/></button>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cantidad a Transaccionar</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button onClick={() => handleAdjustStock(false)} disabled={adjustingItem.quantity < adjustAmount} className="py-5 bg-slate-900 text-white rounded-3xl font-black text-lg transition-all hover:bg-black disabled:opacity-20">EGRESAR</button>
                <button onClick={() => handleAdjustStock(true)} className="py-5 bg-red-600 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all hover:bg-red-700">INGRESAR</button>
              </div>
              <button onClick={() => setAdjustingItem(null)} className="text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-900 transition-colors mt-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto" style={{backgroundColor: 'rgba(15, 23, 42, 0.9)'}}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden m-auto animate-in slide-in-from-bottom-8">
            <div className="bg-slate-50 px-16 py-10 border-b flex justify-center items-center relative">
              <div className="flex flex-col items-center w-full text-center">
                <span className="text-[11px] font-black text-red-600 uppercase tracking-widest mb-1 block">Nuevo Ingreso</span>
                <h3 className="text-4xl font-black text-slate-900">Alta de Material</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="absolute right-10 top-1/2 -translate-y-1/2 w-12 h-12 border rounded-full flex items-center justify-center text-slate-300 transition-all hover:text-slate-900 hover:border-slate-900"><X size={32}/></button>
            </div>
            <form onSubmit={handleAddItem} className="p-16 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Código</label><input required type="text" className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-slate-900 focus:border-red-600/50" value={newItem.code} onChange={(e) => setNewItem({...newItem, code: e.target.value})}/></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Ubicación</label><input required type="text" className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-slate-900 focus:border-red-600/50" value={newItem.location} onChange={(e) => setNewItem({...newItem, location: e.target.value})}/></div>
              </div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Descripción</label><input required type="text" className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-slate-900 focus:border-red-600/50" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})}/></div>
              <div className="grid grid-cols-2 gap-8">
                <div className="relative"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Categoría</label><select className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none appearance-none text-slate-900 focus:border-red-600/50" value={newItem.componentType} onChange={(e) => setNewItem({...newItem, componentType: e.target.value})}>{COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown className="absolute right-6 bottom-5 text-slate-300 pointer-events-none" size={20}/></div>
                <div className="relative"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1">Equipo Destino</label><select className="w-full px-6 py-5 bg-slate-50 border-2 rounded-2xl font-bold outline-none appearance-none text-slate-900 focus:border-red-600/50" value={newItem.equipmentType} onChange={(e) => setNewItem({...newItem, equipmentType: e.target.value})}>{EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronDown className="absolute right-6 bottom-5 text-slate-300 pointer-events-none" size={20}/></div>
              </div>
              <div className="pt-6 flex flex-col items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block mb-4">Stock Inicial</label>
                <input required type="number" min="0" className="w-full max-w-[110px] py-4 bg-slate-900 text-white rounded-[1.5rem] text-4xl font-black text-center outline-none shadow-2xl border border-slate-700" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}/>
              </div>
              <div className="flex gap-4 pt-10">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-5 border-2 rounded-[2rem] font-black text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-colors">CANCELAR</button>
                <button type="submit" className="flex-1 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xl shadow-xl active:scale-95 transition-all hover:bg-red-700">REGISTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake-animation {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default App;
