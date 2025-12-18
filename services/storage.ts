
import { InventoryItem, MinStockConfig } from '../types';

const ITEMS_KEY = 'roggio_inventory_items';
const CONFIG_KEY = 'roggio_min_stock_configs';

export const StorageService = {
  getItems: (): InventoryItem[] => {
    try {
      const data = localStorage.getItem(ITEMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading items from storage", e);
      return [];
    }
  },
  saveItems: (items: InventoryItem[]) => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  },
  getConfigs: (): MinStockConfig[] => {
    try {
      const data = localStorage.getItem(CONFIG_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading configs from storage", e);
      return [];
    }
  },
  saveConfigs: (configs: MinStockConfig[]) => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));
  }
};
