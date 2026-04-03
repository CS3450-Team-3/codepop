export type ItemType = "Soda" | "Syrup" | "Add In" | "Physical";

export interface Inventory {
  InventoryID: number;
  ItemName: string;
  ItemType: ItemType;
  Quantity: number;
  ThresholdLevel: number;
  LastUpdated: string;
}

export interface PatchedInventory {
  ItemName?: string;
  ItemType?: ItemType;
  Quantity?: number;
  ThresholdLevel?: number;
}

export interface InventoryReportItem {
  InventoryID: number;
  ItemName: string;
  Quantity: number;
  ThresholdLevel: number;
}

export interface InventoryReportResponse {
  inventory_items: InventoryReportItem[];
  total_items: number;
  out_of_stock: number;
  below_threshold: number;
}
