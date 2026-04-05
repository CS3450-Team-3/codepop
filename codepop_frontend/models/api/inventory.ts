import api from "./api";
import { Inventory, PatchedInventory, InventoryReportResponse } from "@/models/types/inventory";

export async function getInventory(): Promise<Inventory[]> {
  const { data } = await api.get("inventory/");
  return data;
}

export async function getInventoryItem(inventoryId: number): Promise<Inventory> {
  const { data } = await api.get(`inventory/${inventoryId}/`);
  return data;
}

export async function updateInventoryItem(
  inventoryId: number,
  payload: Omit<Inventory, "InventoryID" | "LastUpdated">
): Promise<Inventory> {
  const { data } = await api.put(`inventory/${inventoryId}/`, payload);
  return data;
}

export async function patchInventoryItem(
  inventoryId: number,
  payload: PatchedInventory
): Promise<Inventory> {
  const { data } = await api.patch(`inventory/${inventoryId}/`, payload);
  return data;
}

export async function getInventoryReport(): Promise<InventoryReportResponse> {
  const { data } = await api.get("inventory/report/");
  return data;
}
