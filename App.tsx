
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
  Truck
} from 'lucide-react';
import { StorageService } from './services/storage';
import { InventoryItem, MinStockConfig, ViewType, EQUIPMENT_TYPES, COMPONENT_TYPES } from './types';
import { DEPT_NAME, LOGO_IMAGE, BRAND_RGB } from './constants';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('inventory');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [configs, setConfigs] = useState<MinStockConfig[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

  // Initialize data
  useEffect(() => {
    const storedItems = StorageService.getItems();
    const storedConfigs = StorageService.getConfigs();
    
    setItems(storedItems);
    
    if (storedConfigs.length === 0) {
      const defaultConfigs = EQUIPMENT_TYPES.map(type => ({
        id: generateId(),
        equipmentType: type,
        minQuantity: 5
      }));
      setConfigs(defaultConfigs);
    } else {
      setConfigs(storedConfigs);
    }
    
    setIsInitialized(true);
  }, []);

  // Persistence
  useEffect(() => {
    if (isInitialized) {
      StorageService.saveItems(items);
    }
  }, [items, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      StorageService.saveConfigs(configs);
    }
  }, [configs, isInitialized]);

  const getItemMinStock = (item: InventoryItem) => {
    const specificConfig = configs.find(c => c.itemId === item.id);
    if (specificConfig) return specificConfig.minQuantity;
    const equipmentConfig = configs.find(c => c.equipmentType === item.equipmentType);
    return equipmentConfig ? equipmentConfig.minQuantity : 0;
  };

  // Grouped items for alerts
  const criticalItems = useMemo(() => {
    return items.filter(item => {
      const min = getItemMinStock(item);
      return item.quantity < min;
    });
  }, [items, configs]);

  const atLimitItems = useMemo(() => {
    return items.filter(item => {
      const min = getItemMinStock(item);
      return item.quantity === min && min > 0;
    });
  }, [items, configs]);

  const totalAlerts = criticalItems.length + atLimitItems.length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = { ...newItem, id: generateId() };
    setItems(prev => [...prev, item]);
    setShowAddModal(false);
    setNewItem({
      code: '',
      location: '',
      description: '',
      componentType: COMPONENT_TYPES[0],
      equipmentType: EQUIPMENT_TYPES[0],
      quantity: 0
    });
  };

  const handleAdjustStock = (isAddition: boolean) => {
    if (!adjustingItem) return;
    const modifier = isAddition ? 1 : -1;
    const newQuantity = Math.max(0, adjustingItem.quantity + (adjustAmount * modifier));
    
    setItems(prev => prev.map(i => 
      i.id === adjustingItem.id ? { ...i, quantity: newQuantity } : i
    ));
    setAdjustingItem(null);
    setAdjustAmount(1);
  };

  const handleDeleteItem = (id: string) => {
    const confirmDelete = window.confirm('¿Está seguro de eliminar este elemento? Esta acción es irreversible.');
    if (confirmDelete) {
      setItems(prev => {
        const filtered = prev.filter(item => item.id !== id);
        return [...filtered];
      });
      setConfigs(prev => {
        const filtered = prev.filter(config => config.itemId !== id);
        return [...filtered];
      });
    }
  };

  const updateEquipmentConfig = (equipmentType: string, val: number) => {
    setConfigs(prev => {
      const existing = prev.find(c => c.equipmentType === equipmentType);
      if (existing) {
        return prev.map(c => c.equipmentType === equipmentType ? { ...c, minQuantity: val } : c);
      }
      return [...prev, { id: generateId(), equipmentType, minQuantity: val }];
    });
  };

  const updateItemConfig = (itemId: string, val: number) => {
    setConfigs(prev => {
      const existing = prev.find(c => c.itemId === itemId);
      if (existing) {
        return prev.map(c => c.itemId === itemId ? { ...c, minQuantity: val } : c);
      }
      return [...prev, { id: generateId(), itemId, minQuantity: val }];
    });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const todayStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const nowTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    
    // PDF Header
    doc.setFillColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]); 
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Benito Roggio e Hijos S.A.', 15, 10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(DEPT_NAME, 15, 15);
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE REPOSICIÓN DE STOCK', 15, 30);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado el: ${todayStr} a las ${nowTime}`, 15, 35);

    let currentY = 40;

    // Critical Section
    if (criticalItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]);
      doc.text('URGENTE: ELEMENTOS BAJO MÍNIMO', 15, currentY + 5);
      
      const criticalData = criticalItems.map(item => {
        const min = getItemMinStock(item);
        return [item.code, item.description, item.equipmentType, item.quantity.toString(), min.toString(), (min - item.quantity).toString()];
      });

      autoTable(doc, {
        startY: currentY + 8,
        head: [['Código', 'Descripción', 'Equipo', 'Stock', 'Mín.', 'Faltante']],
        body: criticalData,
        headStyles: { fillColor: [BRAND_RGB[0], BRAND_RGB[1], BRAND_RGB[2]], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        theme: 'striped'
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // At Limit Section
    if (atLimitItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // Darker Amber for better PDF contrast
      doc.text('ALERTA: ELEMENTOS EN LÍMITE MÍNIMO (Considerar reposición)', 15, currentY + 5);
      
      const atLimitData = atLimitItems.map(item => {
        const min = getItemMinStock(item);
        return [item.code, item.description, item.equipmentType, item.quantity.toString(), min.toString(), "0"];
      });

      autoTable(doc, {
        startY: currentY + 8,
        head: [['Código', 'Descripción', 'Equipo', 'Stock', 'Mín.', 'Faltante']],
        body: atLimitData,
        headStyles: { fillColor: [217, 119, 6], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 2 },
        theme: 'striped'
      });
    }

    doc.save(`Reposicion_Roggio_${todayStr.replace(/\//g, '-')}.pdf`);
  };

  const filteredItems = items.filter(item => 
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.equipmentType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // New Form Item initial state
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    code: '',
    location: '',
    description: '',
    componentType: COMPONENT_TYPES[0],
    equipmentType: EQUIPMENT_TYPES[0],
    quantity: 0
  });

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-red-100">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col fixed h-full transition-all border-r border-slate-800 shadow-xl z-10">
        <div className="p-8 border-b border-slate-800 flex justify-center items-center h-24 bg-slate-900 overflow-hidden">
          <div className="flex flex-col items-center">
             <div className="w-1.5 h-1.5 rounded-full bg-red-600 mb-2"></div>
             <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Panel Control</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveView('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === 'inventory' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Package size={20} />
            <span className="font-semibold tracking-wide">Depósito</span>
          </button>
          <button 
            onClick={() => setActiveView('min-stock')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === 'min-stock' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <AlertTriangle size={20} />
            <span className="font-semibold tracking-wide">Stock Crítico</span>
            {totalAlerts > 0 && (
              <span className="ml-auto bg-white text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalAlerts}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveView('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === 'config' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings size={20} />
            <span className="font-semibold tracking-wide">Configurar Mínimos</span>
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center">GE&T • BENITO ROGGIO</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">
              {activeView === 'inventory' && 'Depósito'}
              {activeView === 'min-stock' && 'Stock Crítico'}
              {activeView === 'config' && 'Configuración'}
            </h2>
            <p className="text-slate-600 mt-2 font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              {DEPT_NAME}
            </p>
          </div>

          {activeView === 'inventory' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl flex items-center gap-2 font-black shadow-2xl shadow-red-600/30 transition-all active:scale-95"
            >
              <Plus size={24} />
              Agregar Elemento
            </button>
          )}

          {(activeView === 'min-stock' && totalAlerts > 0) && (
            <button 
              onClick={exportPDF} 
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black shadow-2xl shadow-red-600/30 transition-all active:scale-95"
            >
              <FileText size={22} />
              Generar Pedido PDF
            </button>
          )}
        </header>

        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          {activeView === 'inventory' && (
            <>
              <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                <div className="relative w-[32rem]">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar en depósito..."
                    className="w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 font-bold placeholder:text-slate-400 focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-[0.2em]">
                      <th className="px-10 py-6">Item</th>
                      <th className="px-10 py-6">Ubicación</th>
                      <th className="px-10 py-6">Descripción</th>
                      <th className="px-10 py-6">Stock</th>
                      <th className="px-10 py-6">Min.</th>
                      <th className="px-10 py-6 text-center">Ajustar</th>
                      <th className="px-10 py-6 text-center">Borrar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => {
                      const min = getItemMinStock(item);
                      const isBelow = item.quantity < min;
                      const isAtLimit = item.quantity === min && min > 0;
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-6 font-mono text-xs font-black text-slate-900">{item.code}</td>
                          <td className="px-10 py-6 text-sm font-bold text-slate-600">{item.location}</td>
                          <td className="px-10 py-6 text-sm text-slate-900 font-black tracking-tight">{item.description}</td>
                          <td className="px-10 py-6">
                            <div className="flex items-center gap-2">
                              <span className={`text-base font-black ${isBelow ? 'text-red-600' : isAtLimit ? 'text-orange-500' : 'text-slate-900'}`}>{item.quantity}</span>
                              {isBelow && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>}
                              {isAtLimit && <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>}
                            </div>
                          </td>
                          <td className="px-10 py-6 text-sm font-bold text-slate-300">{min}</td>
                          <td className="px-10 py-6 text-center">
                             <button 
                              type="button"
                              onClick={() => setAdjustingItem(item)}
                              className="text-slate-400 hover:text-red-600 p-3 rounded-2xl hover:bg-red-50 transition-all"
                              title="Ajustar Stock"
                            >
                              <PlusCircle size={22} />
                            </button>
                          </td>
                          <td className="px-10 py-6 text-center">
                            <button 
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-slate-300 hover:text-red-600 p-3 rounded-2xl hover:bg-red-50 transition-all"
                              title="Eliminar Item"
                            >
                              <Trash2 size={20} />
                            </button>
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
            <div className="overflow-x-auto divide-y divide-slate-200">
              {/* Critical Group */}
              {criticalItems.length > 0 && (
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6 bg-red-50/50 p-4 rounded-2xl border border-red-100">
                    <div className="w-3 h-3 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                    <h3 className="font-black text-red-600 uppercase tracking-widest text-sm">Estado Crítico (Bajo el Mínimo)</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-700 tracking-wider">
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Descripción</th>
                        <th className="px-6 py-4 text-center">Equipo</th>
                        <th className="px-6 py-4 text-center">Existencia</th>
                        <th className="px-6 py-4 text-center">Mínimo</th>
                        <th className="px-6 py-4 text-center text-red-600">Faltante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {criticalItems.map(item => {
                        const min = getItemMinStock(item);
                        return (
                          <tr key={item.id} className="hover:bg-red-50/10">
                            <td className="px-6 py-4 font-mono text-xs font-black text-slate-900">{item.code}</td>
                            <td className="px-6 py-4 text-sm font-black text-slate-900">{item.description}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">{item.equipmentType}</td>
                            <td className="px-6 py-4 text-base font-black text-red-600 text-center">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-300 text-center">{min}</td>
                            <td className="px-6 py-4 text-base font-black text-slate-900 text-center">{min - item.quantity}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* At Limit Group */}
              {atLimitItems.length > 0 && (
                <div className="p-8 bg-slate-50/20">
                  <div className="flex items-center gap-3 mb-6 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                    <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></div>
                    <h3 className="font-black text-orange-600 uppercase tracking-widest text-sm">En Límite (Igual al Mínimo)</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-700 tracking-wider">
                        <th className="px-6 py-4">Código</th>
                        <th className="px-6 py-4">Descripción</th>
                        <th className="px-6 py-4 text-center">Equipo</th>
                        <th className="px-6 py-4 text-center">Existencia</th>
                        <th className="px-6 py-4 text-center">Mínimo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {atLimitItems.map(item => {
                        const min = getItemMinStock(item);
                        return (
                          <tr key={item.id} className="hover:bg-orange-50/10">
                            <td className="px-6 py-4 font-mono text-xs font-black text-slate-900">{item.code}</td>
                            <td className="px-6 py-4 text-sm font-black text-slate-900">{item.description}</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">{item.equipmentType}</td>
                            <td className="px-6 py-4 text-base font-black text-orange-500 text-center">{item.quantity}</td>
                            <td className="px-6 py-4 text-sm font-bold text-slate-300 text-center">{min}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-500 font-bold italic bg-white p-3 rounded-xl border border-slate-100">
                    <AlertTriangle size={14} className="text-orange-400" />
                    * La reposición de estos elementos queda puesta a consideración de la Gerencia.
                  </div>
                </div>
              )}

              {totalAlerts === 0 && (
                <div className="p-24 text-center">
                  <Package className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-black text-lg">Stock en niveles óptimos.</p>
                </div>
              )}
            </div>
          )}

          {activeView === 'config' && (
            <div className="p-12 space-y-16">
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100">
                    <Settings size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Mínimos por Equipo</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {EQUIPMENT_TYPES.map(type => {
                    const config = configs.find(c => c.equipmentType === type);
                    return (
                      <div key={type} className="p-6 rounded-3xl border-2 border-slate-50 flex items-center justify-between group hover:border-red-100 transition-all bg-white shadow-sm">
                        <span className="font-bold text-slate-700">{type}</span>
                        <input 
                          type="number" 
                          min="0"
                          value={config?.minQuantity || 0}
                          onChange={(e) => updateEquipmentConfig(type, parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black focus:border-red-500 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="pt-12 border-t-2 border-slate-50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-red-50 rounded-2xl text-red-600 border border-red-100">
                    <Truck size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900">Gestión de Cubiertas</h3>
                </div>
                <div className="overflow-hidden border-2 border-slate-50 rounded-[2rem] bg-white shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase text-slate-700 tracking-widest">
                        <th className="px-10 py-6">Código</th>
                        <th className="px-10 py-6">Descripción</th>
                        <th className="px-10 py-6 text-center">Min. Personalizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.filter(i => i.componentType === 'Cubiertas').map(item => (
                        <tr key={item.id}>
                          <td className="px-10 py-6 font-mono text-xs font-black">{item.code}</td>
                          <td className="px-10 py-6 text-sm font-black">{item.description}</td>
                          <td className="px-10 py-6 text-center">
                            <input 
                              type="number" 
                              min="0"
                              value={configs.find(c => c.itemId === item.id)?.minQuantity || ''}
                              onChange={(e) => updateItemConfig(item.id, parseInt(e.target.value) || 0)}
                              className="w-24 px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-center font-black text-red-600 focus:border-red-500 outline-none"
                              placeholder="Global"
                            />
                          </td>
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

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[60] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-slate-50/50 px-10 py-10 border-b border-slate-100 text-center">
              <span className="text-[11px] font-black text-red-600 uppercase tracking-[0.3em] mb-3 block">Movimiento Depósito</span>
              <h3 className="text-3xl font-black text-slate-900 leading-tight">{adjustingItem.description}</h3>
              <p className="text-slate-400 text-sm font-bold mt-2 font-mono">{adjustingItem.code}</p>
            </div>
            
            <div className="p-12 space-y-10 bg-white">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Stock Actual</span>
                <div className="text-7xl font-black text-slate-900 tracking-tighter">{adjustingItem.quantity}</div>
              </div>
              
              <div className="bg-slate-50/80 p-8 rounded-[2rem] border border-slate-100 flex items-center justify-center gap-8">
                <button type="button" onClick={() => setAdjustAmount(Math.max(1, adjustAmount - 1))} className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all hover:shadow-md">
                  <MinusCircle size={28} />
                </button>
                <input 
                  type="number" 
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 text-center text-5xl font-black text-slate-900 bg-transparent focus:outline-none border-b-2 border-red-200"
                />
                <button type="button" onClick={() => setAdjustAmount(adjustAmount + 1)} className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all hover:shadow-md">
                  <PlusCircle size={28} />
                </button>
              </div>
              
              <div className="flex gap-5">
                <button type="button" onClick={() => handleAdjustStock(false)} disabled={adjustingItem.quantity < adjustAmount} className="flex-1 px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-20 shadow-lg">Egresar</button>
                <button type="button" onClick={() => handleAdjustStock(true)} className="flex-1 px-8 py-5 bg-red-600 text-white rounded-3xl font-black text-lg hover:bg-red-700 shadow-xl transition-all active:scale-95">Ingresar</button>
              </div>
              
              <button type="button" onClick={() => setAdjustingItem(null)} className="w-full text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-3xl overflow-hidden my-auto animate-in slide-in-from-bottom-8 duration-500">
            <div className="bg-slate-50/50 px-12 py-10 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-black text-red-600 uppercase tracking-[0.3em] mb-2 block">Nuevo Ingreso</span>
                <h3 className="text-4xl font-black text-slate-900">Alta de Material</h3>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="w-12 h-12 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-900 transition-all">
                <Plus size={32} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-12 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Código</label>
                  <input required type="text" placeholder="E.g. AX-203" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-red-500 transition-all" value={newItem.code} onChange={(e) => setNewItem({...newItem, code: e.target.value})}/>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Ubicación</label>
                  <input required type="text" placeholder="Estante B-12" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-red-500 transition-all" value={newItem.location} onChange={(e) => setNewItem({...newItem, location: e.target.value})}/>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Descripción</label>
                <input required type="text" placeholder="Filtro de Aire - Motor Caterpillar" className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:border-red-500 transition-all" value={newItem.description} onChange={(e) => setNewItem({...newItem, description: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Categoría</label>
                  <select className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold appearance-none focus:outline-none focus:border-red-500 transition-all pr-14" value={newItem.componentType} onChange={(e) => setNewItem({...newItem, componentType: e.target.value})}>
                    {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 bottom-5 text-slate-300 pointer-events-none" size={24} />
                </div>
                <div className="space-y-3 relative">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Equipo</label>
                  <select className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 font-bold appearance-none focus:outline-none focus:border-red-500 transition-all pr-14" value={newItem.equipmentType} onChange={(e) => setNewItem({...newItem, equipmentType: e.target.value})}>
                    {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 bottom-5 text-slate-300 pointer-events-none" size={24} />
                </div>
              </div>
              <div className="space-y-3 text-center">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Stock Inicial</label>
                <input required type="number" min="0" className="w-full px-8 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-4xl focus:outline-none text-center" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}/>
              </div>
              <div className="pt-10 flex gap-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-10 py-5 border-2 border-slate-100 rounded-[2rem] font-black text-slate-400 hover:bg-slate-50 transition-all">CANCELAR</button>
                <button type="submit" className="flex-1 px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black text-xl hover:bg-red-700 shadow-2xl transition-all">REGISTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
