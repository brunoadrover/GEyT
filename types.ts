
export interface InventoryItem {
  id: string;
  code: string;
  location: string;
  description: string;
  componentType: string;
  equipmentType: string;
  quantity: number;
}

export interface MinStockConfig {
  id: string;
  equipmentType?: string;
  componentGroup?: string; // Nuevo: Para mínimos por grupo (Desgaste, Insumos, etc)
  itemId?: string;
  minQuantity: number;
}

export type ViewType = 'inventory' | 'min-stock' | 'config';

export const COMPONENT_TYPES = [
  'Cuchillas',
  'Dientes',
  'Baldes',
  'Tren rodante',
  'Filtros',
  'Aceites',
  'Correas',
  'Batería',
  'Cubiertas',
  'Otros'
];

export const COMPONENT_GROUPS = {
  'Elementos de Desgaste': ['Cuchillas', 'Dientes', 'Baldes', 'Tren rodante'],
  'Insumos': ['Correas', 'Filtros', 'Aceites', 'Batería'],
  'Cubiertas': ['Cubiertas'],
  'Otros': ['Otros']
};

export type ComponentGroupName = keyof typeof COMPONENT_GROUPS;

export const EQUIPMENT_TYPES = [
  'Pala Cargadora',
  'Motoniveladora',
  'Retroexcavadora',
  'Camión volcador',
  'Compactador',
  'Camión Regador',
  'Terminadora de Asfalto',
  'Camioneta',
  'Automóvil'
];

export const getItemGroup = (componentType: string): ComponentGroupName => {
  if (COMPONENT_GROUPS['Elementos de Desgaste'].includes(componentType)) return 'Elementos de Desgaste';
  if (COMPONENT_GROUPS['Insumos'].includes(componentType)) return 'Insumos';
  if (COMPONENT_GROUPS['Cubiertas'].includes(componentType)) return 'Cubiertas';
  return 'Otros';
};
