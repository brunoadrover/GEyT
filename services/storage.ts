
import { InventoryItem, MinStockConfig } from '../types';

const ITEMS_KEY = 'roggio_inventory_items';
const CONFIG_KEY = 'roggio_min_stock_configs';

export const StorageService = {
  getItems: (): InventoryItem[] => {
    const data = localStorage.getItem(ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveItems: (items: InventoryItem[]) => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  },
  getConfigs: (): MinStockConfig[] => {
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveConfigs: (configs: MinStockConfig[]) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));
  }
};
