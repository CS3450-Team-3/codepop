import api from "./api";
import { Inventory, PatchedInventory, InventoryReportResponse, AggregateInventoryResponse } from "@/models/types/inventory";
import { Revenue } from "@/models/types/revenue";
import { Notification, CreateNotificationPayload } from "@/models/types/notification";
import { TransferRequest, CreateTransferRequestPayload } from "@/models/types/transfer";

export async function getManagerInventory(): Promise<Inventory[]> {
  const { data } = await api.get("inventory/");
  return data;
}

export async function updateManagerInventoryItem(
  inventoryId: number,
  payload: Omit<Inventory, "InventoryID" | "LastUpdated">
): Promise<Inventory> {
  const { data } = await api.put(`inventory/${inventoryId}/`, payload);
  return data;
}

export async function patchManagerInventoryItem(
  inventoryId: number,
  payload: PatchedInventory
): Promise<Inventory> {
  const { data } = await api.patch(`inventory/${inventoryId}/`, payload);
  return data;
}

export async function getManagerInventoryReport(): Promise<InventoryReportResponse> {
  const { data } = await api.get("inventory/report/");
  return data;
}

export async function getManagerRevenues(): Promise<Revenue[]> {
  const { data } = await api.get("revenues/");
  return data;
}

export async function getRegionalInventory(): Promise<AggregateInventoryResponse> {
  const { data } = await api.get("inventory/aggregate/");
  return data;
}

export async function updatePeerInventoryThreshold(
  serverId: string,
  itemId: number,
  thresholdLevel: number
): Promise<Inventory> {
  const { data } = await api.patch(`inventory/peer/${serverId}/${itemId}/`, { ThresholdLevel: thresholdLevel });
  return data;
}

export async function getTransferRequests(): Promise<TransferRequest[]> {
  const { data } = await api.get("transfer-requests/");
  return data;
}

export async function createTransferRequest(payload: CreateTransferRequestPayload): Promise<TransferRequest> {
  const { data } = await api.post("transfer-requests/", payload);
  return data;
}

export async function broadcastNotification(payload: CreateNotificationPayload): Promise<Notification> {
  const { data } = await api.post("notifications/", payload);
  return data;
}
