
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
  id: string; // unique id for the config
  equipmentType?: string; // If set, applies to all items of this equipment type
  itemId?: string; // If set, applies to a specific item (used for tires)
  minQuantity: number;
}

export type ViewType = 'inventory' | 'min-stock' | 'config';

export const COMPONENT_TYPES = [
  'Cuchillas',
  'Dientes',
  'Baldes',
  'Filtros',
  'Aceites',
  'Correas',
  'Cubiertas',
  'Otros'
];

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
